import { fetchData, API_BASE } from '../utils/fetchData'

/** 每個 paasId 的已完成快取（SPA session 內共用） */
const urlCache = new Map<string, string>()
/** 進行中的請求快取（防止同一 paasId 並發打多次 API） */
const pendingCache = new Map<string, Promise<string>>()

const DEFAULT_JANUS_URL = import.meta.env.VITE_DEFAULT_JANUS_URL ?? ''

/**
 * 查詢指定 PaaS 的 Janus WebSocket URL。
 * 同一 paasId 的 API 只打一次，後續直接回傳快取。
 */
export async function resolveJanusUrl(paasId: string): Promise<string> {
  if (!paasId) return DEFAULT_JANUS_URL

  if (urlCache.has(paasId)) return urlCache.get(paasId)!

  if (pendingCache.has(paasId)) return pendingCache.get(paasId)!

  const promise = fetchData(
    // mock：直接回傳 env 預設值
    async () => import.meta.env.VITE_DEFAULT_JANUS_URL ?? 'wss://mock-janus.local:443',
    // 真實 API：呼叫後端取得 Janus URL
    async () => {
      const res = await fetch(`${API_BASE}/socket-api/paas/${paasId}/janus-url`)
      if (!res.ok) throw new Error(`Janus URL API error: ${res.status}`)
      const data = await res.json()
      const janusUrl: string = data.response?.janusUrl
      if (!janusUrl) throw new Error('API 回傳空 JanusUrl')
      return janusUrl
    },
  ).then(url => {
    urlCache.set(paasId, url)
    pendingCache.delete(paasId)
    return url
  }).catch(e => {
    console.warn('[useJanusUrl] 查詢失敗，使用 fallback:', e?.message)
    pendingCache.delete(paasId)
    const fallback = DEFAULT_JANUS_URL
    if (fallback) urlCache.set(paasId, fallback) // only cache valid fallback; empty string → allow retry
    return fallback
  })

  pendingCache.set(paasId, promise)
  return promise
}

/** 清除快取（PaaS 切換或登出時呼叫） */
export function clearJanusUrlCache(): void {
  urlCache.clear()
  pendingCache.clear()
}
