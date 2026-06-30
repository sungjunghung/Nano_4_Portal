// src/janus/global.d.ts
// Janus 核心庫以 <script> 全域載入，宣告型別以通過 TS 檢查

declare class Janus {
  static init(options: { debug?: string | boolean; callback: () => void }): void
  static randomString(length: number): string
  static attachMediaStream(element: HTMLVideoElement, stream: MediaStream): void
  constructor(options: {
    server: string
    token?: string
    iceServers?: RTCIceServer[]
    success: () => void
    error: (error: unknown) => void
    destroyed: () => void
  })
  attach(options: JanusPluginHandleOptions): void
  destroy(options?: { success?: () => void; error?: (e: unknown) => void; cleanupHandles?: boolean; unload?: boolean }): void
}

interface JanusPluginHandle {
  getPlugin(): string
  getId(): string
  send(options: { message: Record<string, unknown>; jsep?: unknown; success?: () => void; error?: (e: unknown) => void }): void
  createAnswer(options: { jsep: unknown; media: { audioSend: boolean; videoSend: boolean }; success: (jsep: unknown) => void; error: (e: unknown) => void }): void
  detach(options?: { success?: () => void; error?: (e: unknown) => void }): void
  getBitrate?(): string
  data(options: { text: string; success?: () => void; error?: (e: unknown) => void }): void
}

interface JanusPluginHandleOptions {
  plugin: string
  opaqueId: string
  success: (handle: JanusPluginHandle) => void
  error: (error: unknown) => void
  iceState?: (state: string) => void
  slowLink?: (uplink: boolean, lost: number, mid: string) => void
  webrtcState?: (on: boolean) => void
  connectionState?: (state: string) => void
  onmessage?: (msg: Record<string, unknown>, jsep: unknown) => void
  onlocaltrack?: (track: MediaStreamTrack, on: boolean) => void
  onremotetrack?: (track: MediaStreamTrack, mid: string, on: boolean) => void
  oncleanup?: () => void
  ondata?: (data: string) => void
}
