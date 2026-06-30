export type TimingPhase =
  | 'connect-start' | 'init' | 'session' | 'pub-attach' | 'pub-joined'
  | 'sub-attach-start' | 'sub-attach' | 'sub-offer' | 'sub-answer'
  | 'first-track' | 'online'

const PHASE_ORDER: TimingPhase[] = [
  'connect-start', 'init', 'session', 'pub-attach', 'pub-joined',
  'sub-attach-start', 'sub-attach', 'sub-offer', 'sub-answer',
  'first-track', 'online',
]

interface CompletedTiming {
  key: string
  marks: Partial<Record<TimingPhase, number>>
  total: number | null
}

// NOTE: entries for streams that never reach 'online' are never evicted from this Map.
// Call resetTimings() between measurement runs to avoid stale inflight accumulation.
const inflight = new Map<string, Partial<Record<TimingPhase, number>>>()
const completed: CompletedTiming[] = []
let droppedNoStart = 0

let enabled = import.meta.env.DEV || import.meta.env.VITE_JANUS_TIMING === 'true'
let clock: () => number = () => performance.now()

export function setTimingEnabled(v: boolean): void { enabled = v }
export function setTimingClock(fn: () => number): void { clock = fn }
export function resetTimings(): void {
  inflight.clear(); completed.length = 0; droppedNoStart = 0
  clock = () => performance.now()
}
export function getDroppedNoStartCount(): number { return droppedNoStart }

/** 已達 online 的完成台數（A/B 兩模式須相等，否則 wall time 不可比）。 */
export function getOnlineCount(): number { return completed.length }

/** 整頁 wall time：末台 'online' − 首台 'connect-start'（只算已 online 的台；無則 0）。 */
export function getPageLoadSpan(): number {
  let minStart = Infinity, maxOnline = -Infinity
  for (const rec of completed) {
    const s = rec.marks['connect-start']
    const o = rec.marks['online']
    if (s !== undefined) minStart = Math.min(minStart, s)
    if (o !== undefined) maxOnline = Math.max(maxOnline, o)
  }
  if (minStart === Infinity || maxOnline === -Infinity) return 0
  return Math.max(0, maxOnline - minStart)
}

// NOTE: streamKey should be unique per stream session (e.g. include a reconnect/session id)
// so that a reconnect does not overwrite a prior session's intermediate marks.
export function markPhase(streamKey: string, phase: TimingPhase): void {
  if (!enabled) return
  try {
    let marks = inflight.get(streamKey)
    if (!marks) { marks = {}; inflight.set(streamKey, marks) }
    marks[phase] = clock()
    if (phase === 'online') {
      const start = marks['connect-start']
      const total = start !== undefined ? marks['online']! - start : null
      if (total === null) droppedNoStart++
      completed.push({ key: streamKey, marks: { ...marks }, total })
      inflight.delete(streamKey)
    }
  } catch { /* 量測絕不影響串流 */ }
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

export interface SegmentStat { segment: string; count: number; p50: number; p95: number }

export function getTimingReport(): SegmentStat[] {
  const stats: SegmentStat[] = []
  for (let i = 1; i < PHASE_ORDER.length; i++) {
    const from = PHASE_ORDER[i - 1], to = PHASE_ORDER[i]
    const durations: number[] = []
    for (const rec of completed) {
      const a = rec.marks[from], b = rec.marks[to]
      // Negative durations (out-of-order mark arrival, e.g. webrtcup before ontrack) are excluded as event-ordering noise.
      if (a !== undefined && b !== undefined && b - a >= 0) durations.push(b - a)
    }
    if (durations.length === 0) continue
    durations.sort((x, y) => x - y)
    stats.push({ segment: `${from}→${to}`, count: durations.length, p50: percentile(durations, 50), p95: percentile(durations, 95) })
  }
  // total: include zero-duration (same-timestamp) records; exclude null (no connect-start,
  // already counted in droppedNoStart) and negative (non-monotonic clock anomaly).
  const totals = completed.map(r => r.total).filter((t): t is number => t !== null && t >= 0).sort((a, b) => a - b)
  if (totals.length) {
    stats.push({ segment: 'connect-start→online (total)', count: totals.length, p50: percentile(totals, 50), p95: percentile(totals, 95) })
  }
  return stats
}

export function logTimingReport(): SegmentStat[] {
  const stats = getTimingReport()
  if (typeof console !== 'undefined') {
    console.table(stats)
    if (droppedNoStart > 0) console.warn(`[janusTiming] ${droppedNoStart} 筆缺 connect-start，未計入 total`)
  }
  return stats
}

if (enabled && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__janusTiming = { getTimingReport, logTimingReport, resetTimings, getDroppedNoStartCount, getPageLoadSpan, getOnlineCount }
}
