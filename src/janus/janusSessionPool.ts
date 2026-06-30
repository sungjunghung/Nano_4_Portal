// src/janus/janusSessionPool.ts
// Janus session sharing by paasId, with refcounting (T1 session-pooling spike).
// 同一個 paasId 的 cameras 共用一個 Janus session；pool 管理 refcount，
// 最後一個 user release 時才 destroy session。
//
// ── Known spike-scope limitations (async-destroy, T1 measurement only) ──────
//
// 1. getActiveSessionCount() tracks pool bookkeeping, NOT gateway truth.
//    destroy() is called fire-and-forget (no await); if it silently fails the
//    pool entry is already gone but the gateway session is still alive and
//    untracked.  Metric is accurate enough for relative A/B comparison; not a
//    hard guarantee of gateway-session count.
//
// 2. Interleave assumption: the pool assumes release→acquire for the SAME
//    paasId do not interleave within a destroy round-trip.  The A/B measurement
//    protocol reloads the page between runs, so this holds in practice.
//
// 3. No zombie eviction: a session that dies AFTER pool registration (late
//    transport error, etc.) is NOT auto-evicted.  A zombie entry would be
//    returned to new acquirers until the pool is reset.  Acceptable for the
//    client-side session-count spike; proper fixes (await-destroy, draining
//    state, destroyed-callback eviction) are deferred to post-spike full T1.

import { defaultIceServers } from './iceServers'

interface PooledEntry { janus: Janus; refcount: number; janusUrl: string }

const pool = new Map<string, PooledEntry>()
const pending = new Map<string, Promise<Janus>>()
let sessionsCreated = 0
let enabled = false // A/B gate consulted by useCameraGrid (later task); acquire() intentionally does NOT consult it.
let initPromise: Promise<void> | null = null
let initDone = false

export function setPoolEnabled(v: boolean): void { enabled = v }
export function isPoolEnabled(): boolean { return enabled }
/** 累計建立的 session 數（含已銷毀）。 */
export function getSessionsCreated(): number { return sessionsCreated }
/** 目前仍存活的 session 數（pool.size）——leak 檢查：全 release 後應為 0。 */
export function getActiveSessionCount(): number { return pool.size }

/** 銷毀所有 session 並清空（測試/手動量測重置用）。 */
export function resetPool(): void {
  for (const [paasId, entry] of pool) {
    try { entry.janus.destroy({ cleanupHandles: true, unload: true }) }
    catch (e) { console.warn('[janusSessionPool] resetPool destroy failed:', paasId, e) }
  }
  pool.clear(); pending.clear(); sessionsCreated = 0; initPromise = null; initDone = false
}

/** single-flight：Janus.init 全程只被呼叫一次。 */
function ensureInit(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = new Promise<void>((resolve, reject) => {
    // NOTE: global Janus.init typing doesn't declare an `error` field; the real
    // janus-gateway lib accepts one, so pass it via a widened cast.
    Janus.init({ debug: 'info', callback: () => { initDone = true; resolve() }, error: (e: unknown) => { initPromise = null; initDone = false; reject(e) } } as Parameters<typeof Janus.init>[0] & { error: (e: unknown) => void })
  })
  return initPromise
}

function createSession(paasId: string, janusUrl: string): Promise<Janus> {
  return new Promise<Janus>((resolve, reject) => {
    // success() may fire synchronously during `new Janus(...)` (e.g. in tests),
    // i.e. BEFORE the `instance` assignment below runs — so the success callback
    // cannot capture `instance` directly. Track success separately and register
    // exactly once, when both the instance exists AND success has fired.
    let instance: Janus | null = null
    let succeeded = false
    let registered = false
    const tryRegister = () => {
      if (registered || !succeeded || !instance) return
      registered = true
      pool.set(paasId, { janus: instance, refcount: 0, janusUrl })
      sessionsCreated++
      resolve(instance)
    }
    // 真實 Janus server 需要 token，否則回 "Unauthorized request (wrong or missing
    // secret/token)" 導致 pooled session 全數失敗（live A/B 量測證實：0 sessions / 0 online）。
    // token + iceServers 與 JanusStreamer.connect() 對齊（DRY：iceServers 共用 defaultIceServers）。
    instance = new Janus({
      server: janusUrl,
      token: import.meta.env.VITE_JANUS_TOKEN ?? '',
      iceServers: defaultIceServers(),
      success: () => { succeeded = true; tryRegister() },
      error: (e: unknown) => reject(e instanceof Error ? e : new Error(String(e))),
      destroyed: () => { /* noop */ },
    })
    tryRegister()
  })
}

/** 取得（或建立）某 paasId 的共享 session，refcount++。回傳 { janus, release }；release 須恰呼叫一次（idempotent）。 */
export async function acquire(paasId: string, janusUrl: string): Promise<{ janus: Janus; release: () => void }> {
  // Single-flight: register the session-creation promise synchronously so
  // concurrent acquires for the same paasId share ONE pending promise (and thus
  // ONE Janus constructor). When Janus.init has already completed we MUST run
  // createSession synchronously (no `.then` microtask boundary) so the Janus
  // constructor fires within the synchronous portion of acquire() — this is what
  // lets a caller drive a deferred `success` immediately after the acquire() call
  // returns, and keeps the dedup window covering every concurrent synchronous
  // caller rather than only those arriving after a later microtask.
  if (!pool.has(paasId) && !pending.has(paasId)) {
    const initP = ensureInit()
    const p = (initDone ? createSession(paasId, janusUrl) : initP.then(() => createSession(paasId, janusUrl)))
      .finally(() => pending.delete(paasId))
    pending.set(paasId, p)
  }
  if (pending.has(paasId)) await pending.get(paasId)!
  const entry = pool.get(paasId)
  if (entry && entry.janusUrl !== janusUrl) {
    console.warn('[janusSessionPool] paasId reused with different janusUrl (sharing first session):', paasId, entry.janusUrl, janusUrl)
  }
  if (!entry) throw new Error(`[janusSessionPool] session 建立失敗: ${paasId}`)
  entry.refcount++
  let released = false
  const release = () => {
    if (released) return
    released = true
    const e = pool.get(paasId)
    if (!e) return
    e.refcount--
    if (e.refcount <= 0) {
      pool.delete(paasId)
      try { e.janus.destroy({ cleanupHandles: true, unload: true }) }
      catch (err) { console.warn('[janusSessionPool] release destroy failed:', paasId, err) }
    }
  }
  return { janus: entry.janus, release }
}

if ((import.meta.env.DEV || import.meta.env.VITE_JANUS_TIMING === 'true') && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__janusPool = {
    setEnabled: setPoolEnabled, isEnabled: isPoolEnabled, getSessionsCreated, getActiveSessionCount, resetPool,
  }
}
