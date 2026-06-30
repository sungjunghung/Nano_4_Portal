import type { JanusStreamerOptions, StreamState } from '../types/camera'
import { markPhase } from './janusTiming'
import { defaultIceServers } from './iceServers'

export class JanusStreamer {
  private readonly opts: Required<Omit<JanusStreamerOptions, 'onStateChange' | 'existingJanus'>> & {
    onStateChange: (s: StreamState) => void
  }

  private janus: Janus | null = null
  private sfutest: JanusPluginHandle | null = null
  private remoteFeeds = new Map<number, JanusPluginHandle>()
  private readonly opaqueId = 'videoroomtest-' + Janus.randomString(12)
  private mypvtid: number | null = null
  private myid: number | null = null

  private isDestroying = false
  private cleanupPromise: Promise<void> | null = null
  private shouldRetry = true
  private hasDisconnected = false
  /** Set on first disconnect() call; never cleared. Prevents ghost sessions when Janus.init callback fires after cleanup. */
  private permanentlyDestroyed = false
  /** Prevents concurrent Janus.init calls when connect() is called while an init is in flight. */
  private isConnecting = false
  /** Last received video track; kept so we can re-attach when the video element is recreated (e.g. after pagination). */
  private currentVideoTrack: MediaStreamTrack | null = null
  /** T1 共享 session（由 pool 擁有）；非 null 時跳過自建 session，且絕不 destroy 此 instance。 */
  private readonly sharedJanus: Janus | null

  // NOTE: roomId:streamName is NOT unique across reconnects of the same camera; call resetTimings() between measurement runs (see janusTiming NOTE).
  private get streamKey(): string {
    return `${this.opts.roomId}:${this.opts.streamName}`
  }

  private static readonly RETRY_INTERVAL_MS = 500
  private static readonly LEAVE_TIMEOUT_MS = 3_000
  private static readonly DETACH_TIMEOUT_MS = 2_000
  private static readonly DESTROY_TIMEOUT_MS = 5_000

  constructor(opts: JanusStreamerOptions) {
    this.opts = {
      janusUrl: opts.janusUrl,
      roomId: opts.roomId,
      streamName: opts.streamName,
      videoElementId: opts.videoElementId,
      token: opts.token ?? import.meta.env.VITE_JANUS_TOKEN ?? '',
      iceServers: opts.iceServers ?? defaultIceServers(),
      onStateChange: opts.onStateChange ?? (() => {}),
    }
    this.sharedJanus = opts.existingJanus ?? null
  }

  connect(): void {
    if (this.permanentlyDestroyed || this.isConnecting) return
    this.isConnecting = true
    console.debug(`[JanusStreamer] connect() called — room:${this.opts.roomId}, stream:${this.opts.streamName}`)
    this.hasDisconnected = false
    this.opts.onStateChange('connecting')
    markPhase(this.streamKey, 'connect-start')
    // T1 共享模式：session 由 pool 擁有，跳過 Janus.init/new Janus 與 init/session 埋點。
    if (this.sharedJanus) {
      this.isConnecting = false
      if (this.permanentlyDestroyed) return        // 鏡像 self-mode 的 ghost-session 守衛
      this.janus = this.sharedJanus
      this.attachPlugin()
      return
    }
    Janus.init({
      debug: 'info',
      callback: () => {
        this.isConnecting = false
        if (this.permanentlyDestroyed) return
        markPhase(this.streamKey, 'init')
        console.debug(`[JanusStreamer] Janus.init callback fired`)
        let pendingAttach = false
        const instance = new Janus({
          server: this.opts.janusUrl,
          token: this.opts.token,
          iceServers: this.opts.iceServers,
          success: () => {
            markPhase(this.streamKey, 'session')
            // success may fire synchronously (e.g. in tests) before the
            // assignment below, so guard with pendingAttach flag.
            if (this.janus) {
              this.attachPlugin()
            } else {
              pendingAttach = true
            }
          },
          error: (e) => {
            console.error('[JanusStreamer] init error:', e)
            if (!this.isDestroying) this.scheduleRetry()
          },
          destroyed: () => {
            console.log('[JanusStreamer] session destroyed')
          },
        })
        this.janus = instance
        if (pendingAttach) this.attachPlugin()
      },
    })
  }

  async disconnect(): Promise<void> {
    if (this.permanentlyDestroyed || this.isDestroying) return this.cleanupPromise ?? Promise.resolve()
    this.permanentlyDestroyed = true
    this.isDestroying = true
    this.shouldRetry = false
    this.cleanupPromise = this.performCleanup()
    return this.cleanupPromise
  }

  private async performCleanup(): Promise<void> {
    try {
      const el = document.getElementById(this.opts.videoElementId) as HTMLVideoElement | null
      if (el) {
        el.srcObject = null
        el.removeAttribute('src')
        el.load()
      }

      for (const [, feed] of this.remoteFeeds) {
        await this.detachFeed(feed)
      }
      this.remoteFeeds.clear()

      if (this.sfutest) await this.sendLeave()
      if (this.sharedJanus) {
        // 共享模式：detach 自己的 publisher handle（subscriber feeds 上方迴圈已 detach），但不 destroy 共享 session
        if (this.sfutest) { await this.detachFeed(this.sfutest); this.sfutest = null }
        this.janus = null
      } else if (this.janus) {
        await this.destroySession()
      }
    } catch (e) {
      console.error('[JanusStreamer] cleanup error:', e)
    } finally {
      this.resetState()
      this.opts.onStateChange('offline')
    }
  }

  private sendLeave(): Promise<void> {
    return new Promise(resolve => {
      const tid = setTimeout(resolve, JanusStreamer.LEAVE_TIMEOUT_MS)
      this.sfutest!.send({
        message: { request: 'leave' },
        success: () => { clearTimeout(tid); resolve() },
        error: () => { clearTimeout(tid); resolve() },
      })
    })
  }

  private detachFeed(feed: JanusPluginHandle): Promise<void> {
    return new Promise(resolve => {
      const tid = setTimeout(resolve, JanusStreamer.DETACH_TIMEOUT_MS)
      try {
        feed.detach({
          success: () => { clearTimeout(tid); resolve() },
          error: () => { clearTimeout(tid); resolve() },
        })
      } catch {
        clearTimeout(tid)
        resolve()
      }
    })
  }

  private destroySession(): Promise<void> {
    return new Promise(resolve => {
      const tid = setTimeout(() => { this.janus = null; resolve() }, JanusStreamer.DESTROY_TIMEOUT_MS)
      try {
        this.janus!.destroy({
          success: () => { this.janus = null; clearTimeout(tid); resolve() },
          error: () => { this.janus = null; clearTimeout(tid); resolve() },
          cleanupHandles: true,
          unload: true,
        })
      } catch {
        this.janus = null
        clearTimeout(tid)
        resolve()
      }
    })
  }

  private resetState(): void {
    this.janus = null
    this.sfutest = null
    this.remoteFeeds.clear()
    this.myid = null
    this.mypvtid = null
    this.isDestroying = false
    this.isConnecting = false
    this.cleanupPromise = null
    this.shouldRetry = true
    this.currentVideoTrack = null
    // permanentlyDestroyed is intentionally NOT reset
  }

  /**
   * Re-attach the current video track to the video element.
   * Call this after a page switch that destroys and recreates the <video> DOM element.
   */
  reattachVideo(): void {
    if (this.permanentlyDestroyed || !this.currentVideoTrack) return
    const el = document.getElementById(this.opts.videoElementId) as HTMLVideoElement | null
    if (el) Janus.attachMediaStream(el, new MediaStream([this.currentVideoTrack]))
  }

  getBitrate(): string {
    // remoteFeeds 只有一個 subscriber feed；取第一個即可
    const feed = this.remoteFeeds.values().next().value
    return feed?.getBitrate?.() ?? ''
  }

  private attachPlugin(): void {
    if (this.permanentlyDestroyed || this.isDestroying) return
    this.janus!.attach({
      plugin: 'janus.plugin.videoroom',
      opaqueId: this.opaqueId,
      success: (handle) => {
        markPhase(this.streamKey, 'pub-attach')
        this.sfutest = handle
        console.debug(`[JanusStreamer][room:${this.opts.roomId}][stream:${this.opts.streamName}] joining as publisher_viewer`)
        handle.send({ message: { request: 'join', room: this.opts.roomId, ptype: 'publisher', display: `${this.opts.streamName}_viewer` } })
      },
      error: (e) => {
        console.error('[JanusStreamer] attach error:', e)
        if (!this.isDestroying) this.scheduleRetry()
      },
      webrtcState: () => {},
      connectionState: () => {},
      onmessage: (msg, jsep) => {
        const event = msg['videoroom'] as string | undefined
        if (event === 'joined') {
          markPhase(this.streamKey, 'pub-joined')
          this.mypvtid = msg['private_id'] as number
          this.myid = msg['id'] as number
          const publishers = msg['publishers'] as Array<{ id: number; display: string }> | undefined
          console.debug(`[JanusStreamer][room:${this.opts.roomId}] joined, myid=${this.myid}, publishers:`, publishers?.map(p => `${p.display}(id=${p.id})`))
          if (publishers) {
            for (const p of publishers) {
              if (p.display === this.opts.streamName && p.id !== this.myid) {
                console.debug(`[JanusStreamer][room:${this.opts.roomId}] publisher match → subscribeToFeed(${p.id})`)
                this.subscribeToFeed(p.id)
                break
              }
            }
          }
        } else if (event === 'event') {
          const publishers = msg['publishers'] as Array<{ id: number; display: string }> | undefined
          if (publishers) {
            console.debug(`[JanusStreamer][room:${this.opts.roomId}] event publishers:`, publishers.map(p => `${p.display}(id=${p.id})`))
            for (const p of publishers) {
              if (p.display === this.opts.streamName && p.id !== this.myid && !this.remoteFeeds.has(p.id)) {
                console.debug(`[JanusStreamer][room:${this.opts.roomId}] event publisher match → subscribeToFeed(${p.id})`)
                this.subscribeToFeed(p.id)
                break
              }
            }
          }
          const leaving = msg['leaving'] as number | undefined
          if (leaving) this.handlePublisherLeft(leaving)
          const unpublished = msg['unpublished'] as number | 'ok' | undefined
          if (unpublished && unpublished !== 'ok') this.handlePublisherLeft(unpublished)
        }
        if (jsep) {
          this.sfutest!.createAnswer({
            jsep,
            media: { audioSend: false, videoSend: false },
            success: (answerJsep) => {
              this.sfutest!.send({ message: { request: 'start' }, jsep: answerJsep })
            },
            error: (e) => {
              console.error('[JanusStreamer] createAnswer error:', e)
              if (!this.isDestroying) this.scheduleRetry()
            },
          })
        }
      },
      onremotetrack: (track, _mid, on) => {
        console.debug(`[JanusStreamer][room:${this.opts.roomId}] publisher-handle onremotetrack: kind=${track.kind}, on=${on}`)
        if (this.permanentlyDestroyed || !on || track.kind !== 'video') return
        this.currentVideoTrack = track
        const el = document.getElementById(this.opts.videoElementId) as HTMLVideoElement | null
        if (el) Janus.attachMediaStream(el, new MediaStream([track]))
      },
      onlocaltrack: () => {},
      oncleanup: () => {},
    })
  }

  private subscribeToFeed(feedId: number): void {
    if (this.permanentlyDestroyed || this.isDestroying) return
    markPhase(this.streamKey, 'sub-attach-start')
    console.debug(`[JanusStreamer][room:${this.opts.roomId}] subscribeToFeed(feedId=${feedId})`)
    this.janus!.attach({
      plugin: 'janus.plugin.videoroom',
      opaqueId: this.opaqueId,
      success: (handle) => {
        markPhase(this.streamKey, 'sub-attach')
        this.remoteFeeds.set(feedId, handle)
        console.debug(`[JanusStreamer][room:${this.opts.roomId}] subscriber handle attached, joining as subscriber for feed=${feedId}`)
        handle.send({ message: { request: 'join', room: this.opts.roomId, ptype: 'subscriber', feed: feedId, private_id: this.mypvtid } })
      },
      error: (e) => {
        console.error('[JanusStreamer] subscribe error:', e)
        if (!this.isDestroying) this.scheduleRetry()
      },
      webrtcState: (on) => {
        if (on) {
          markPhase(this.streamKey, 'online')
          this.opts.onStateChange('online')
        }
      },
      connectionState: (cs) => {
        if (cs === 'disconnected') {
          this.hasDisconnected = true
          this.opts.onStateChange('stalled')
          if (!this.isDestroying) this.scheduleRetry()
        }
        if ((cs === 'failed' || cs === 'closed') && !this.hasDisconnected) {
          this.opts.onStateChange('error')
          if (!this.isDestroying) this.scheduleRetry()
        }
      },
      onmessage: (msg, jsep) => {
        console.debug(`[JanusStreamer][room:${this.opts.roomId}] subscriber onmessage, event:`, msg['videoroom'], 'hasJsep:', !!jsep)
        if (jsep) {
          markPhase(this.streamKey, 'sub-offer')
          console.debug(`[JanusStreamer][room:${this.opts.roomId}] subscriber received jsep offer, creating answer`)
          const feed = this.remoteFeeds.get(feedId)
          feed?.createAnswer({
            jsep,
            media: { audioSend: false, videoSend: false },
            success: (answerJsep) => {
              markPhase(this.streamKey, 'sub-answer')
              feed.send({ message: { request: 'start', room: this.opts.roomId }, jsep: answerJsep })
            },
            error: (e) => {
              console.error('[JanusStreamer] subscriber createAnswer error:', e)
              if (!this.isDestroying) this.scheduleRetry()
            },
          })
        }
      },
      onremotetrack: (track, _mid, on) => {
        console.debug(`[JanusStreamer][room:${this.opts.roomId}] subscriber onremotetrack: kind=${track.kind}, on=${on}, el=${this.opts.videoElementId}`)
        if (this.permanentlyDestroyed) return
        if (track.kind !== 'video') return
        if (!on) {
          // Publisher muted/disconnected — clear the stale frame and retry
          this.currentVideoTrack = null
          const el = document.getElementById(this.opts.videoElementId) as HTMLVideoElement | null
          if (el) { el.srcObject = null }
          if (!this.isDestroying) {
            this.opts.onStateChange('stalled')
            this.scheduleRetry()
          }
          return
        }
        // NOTE: first-track→online segment may be negative if online (webrtcup) arrives before first-track (pc.ontrack); such samples are excluded by getTimingReport.
        markPhase(this.streamKey, 'first-track')
        this.currentVideoTrack = track
        const el = document.getElementById(this.opts.videoElementId) as HTMLVideoElement | null
        if (el) Janus.attachMediaStream(el, new MediaStream([track]))
      },
      onlocaltrack: () => {},
      oncleanup: () => { this.remoteFeeds.delete(feedId) },
    })
  }

  private handlePublisherLeft(publisherId: number): void {
    const feed = this.remoteFeeds.get(publisherId)
    if (!feed) return
    this.detachFeed(feed).then(() => {
      this.remoteFeeds.delete(publisherId)
      // Belt-and-suspenders: if onremotetrack on=false didn't already fire,
      // ensure we transition to stalled and retry so the camera doesn't freeze.
      if (!this.isDestroying) {
        const el = document.getElementById(this.opts.videoElementId) as HTMLVideoElement | null
        if (el) el.srcObject = null
        this.opts.onStateChange('stalled')
        this.scheduleRetry()
      }
    }).catch(() => {
      this.remoteFeeds.delete(publisherId)
    })
  }

  private scheduleRetry(): void {
    if (this.permanentlyDestroyed || this.isDestroying) return
    // 共享模式：streamer 不擁有 session，禁止 destroy 共享 session、也不自行重連（會拆掉其他攝影機）。
    // 上拋 error 由 grid 決定是否 reconnect（reconnect 會重新 acquire）。
    if (this.sharedJanus) {
      // 共享模式：session 由 pool 擁有，不可 destroy、不自行重連。先 detach 自己的 handle（session 還活著，否則洩漏），再上拋 error 由 grid 處理。
      for (const [, feed] of this.remoteFeeds) this.detachFeed(feed).catch(() => {})
      this.remoteFeeds.clear()
      if (this.sfutest) { this.detachFeed(this.sfutest).catch(() => {}); this.sfutest = null }
      this.opts.onStateChange('error')
      return
    }
    setTimeout(async () => {
      if (this.permanentlyDestroyed || this.isDestroying) return
      if (this.janus) {
        try { this.janus.destroy({ cleanupHandles: true, unload: true }) } catch {}
        this.janus = null
      }
      this.sfutest = null
      for (const [, feed] of this.remoteFeeds) this.detachFeed(feed).catch(() => {})
      this.remoteFeeds.clear()
      this.myid = null
      this.mypvtid = null
      if (this.shouldRetry && !this.isDestroying) {
        console.info('[JanusStreamer] retrying connection...')
        this.connect()
      }
    }, JanusStreamer.RETRY_INTERVAL_MS)
  }
}
