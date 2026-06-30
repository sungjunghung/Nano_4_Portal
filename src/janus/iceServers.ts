// src/janus/iceServers.ts
// 共用 ICE/TURN 設定來源（JanusStreamer 與 janusSessionPool 皆使用）。
// 抽成獨立 module 避免 pool import JanusStreamer 時，被測試的 vi.mock('JanusStreamer')
// 連帶遮蔽 defaultIceServers（mock factory 不會 re-export 此函式）。

/** 從 Vite env 讀取 TURN 設定，如未設定則不使用 TURN */
export function defaultIceServers(): RTCIceServer[] {
  const url = import.meta.env.VITE_TURN_URL
  const username = import.meta.env.VITE_TURN_USERNAME
  const credential = import.meta.env.VITE_TURN_CREDENTIAL
  if (!url) return []
  return [{ urls: url, username, credential }]
}
