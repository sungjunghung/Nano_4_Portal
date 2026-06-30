export type CameraClass = 'DDSCam' | 'IPCam' | 'Omniverse'
export type CameraStatus = 'online' | 'offline' | 'loading' | 'error' | 'stalled'
export type StreamState = 'connecting' | 'online' | 'stalled' | 'error' | 'offline'

export interface PaaS {
  id: string
  label: string
  isAlive: boolean
}

export interface Camera {
  id: string           // 對應舊版 source 欄位
  name: string         // 對應舊版 SourceName / displayName
  class: CameraClass
  /**
   * DDSCam：Janus VideoRoom 房間 ID（整數，舊版存在 url 欄位）
   * IPCam：RTSP / HLS 串流 URL
   */
  url: string
  /**
   * IPCam：IPv4 位址。
   * DDSCam：undefined，用 paasId 查詢 Janus URL。
   * ⚠️ 舊版曾混用此欄位存 PaaS UUID，新版禁止混用。
   */
  ip?: string
  /** DDSCam 專用：所屬 PaaS UUID，用來查詢 Janus URL */
  paasId?: string
  /** API 回傳的裝置識別名，對應 WS heartbeat source_device_id */
  common_id?: string
  longitude?: number | null
  latitude?: number | null
  isRecord?: boolean
  createdAt?: string
  /** API 回傳的靜態初始值，只用來初始化 videoStates，禁止在 UI 直接讀取 */
  status?: CameraStatus
  /** Janus publisher display name；未指定時以 `100-{id}` 推導 */
  streamName?: string
}

export interface JanusStreamerOptions {
  janusUrl: string
  /** Janus VideoRoom 房間 ID */
  roomId: number
  /** 要訂閱的 publisher display name（即 camera.name） */
  streamName: string
  /** `<video>` 元素的 DOM id */
  videoElementId: string
  /** Janus auth token，預設從 VITE_JANUS_TOKEN 讀取 */
  token?: string
  /** TURN server 設定，預設從 VITE_TURN_* 讀取 */
  iceServers?: RTCIceServer[]
  /** 串流狀態變更 callback */
  onStateChange?: (state: StreamState) => void
  /** 共享 session 模式（T1 pool）：提供則跳過自身 Janus.init/new Janus，直接在此 instance 上 attach。 */
  existingJanus?: Janus
}

/** IStreamer 從 useCameraDetail.ts 搬入，統一管理 */
export interface IStreamer {
  connect(): void
  disconnect(): Promise<void>
}

/** 下行指令 item 編號，使用具名常數避免魔術數字 */
export const CameraCommandItem = {
  ZOOM:          0,
  BITRATE:       1,
  FPS:           2,
  RESOLUTION:    3,
  FOCUS:         4,
  RESTART:       5,
  REALTIME_AI:   6,
  HISTORY_AI:    7,
  UPDATE_CRL:    8,
  RESET:         9,
  QUERY_PARAMS: 10,
} as const
export type CommandItem = typeof CameraCommandItem[keyof typeof CameraCommandItem]

export type CommandChannelState = 'idle' | 'connecting' | 'open' | 'error' | 'closed'

export interface CameraParams {
  zoom: 0 | 2 | 4 | 8
  bitrate: 1 | 2 | 3 | 4 | 5
  fps: 15 | 20 | 30
  resolution: '640x480' | '1280x720' | '1920x1080'
}

export interface CameraControlMessage {
  event: 'camera_control'
  timestamp: string
  serial_num?: string
  data: string
}

/** WS broker routing envelope — 由 useCameraCommand 建構後傳入 channel.send() */
export interface CameraWsEnvelope {
  event: 'send_to_message'
  target_client_id: string
  message: CameraControlMessage
  timestamp: string
}

export interface CameraCommandResponse {
  event: 'camera_control'
  source_device_id: string
  result: 'OK' | 'FAIL'
  item: CommandItem
  value?: number | string | CameraParams
  message?: string
}

/** PTZ pan/tilt 佔位型別，等後端確認 item code 後實作 */
export interface PtzDirection {
  panX: number
  tiltY: number
}

export interface HeartbeatCameraEntry {
  reason: string
  room_id: number | null
  source_device_id: string
  status: 'online' | 'offline'
  timestamp: string
}

export interface HeartbeatEvent {
  cameras: HeartbeatCameraEntry[]
  event: 'heartbeat'
  paas_id: string
  timestamp: string
  token: string
}

export interface CameraStatusChangeEvent {
  event: 'camera_status_change'
  paas_id: string
  camera_serial: string
  camera_id: string
  is_online: boolean
}

export interface DeviceConnectionChangeEvent {
  event: 'device_connection_change'
  paas_id: string
  camera_serial: string
  camera_id: string
  room_id: number
}

/**
 * 下行指令的生命週期狀態，供 UI 顯示使用。
 * - 'idle': 尚未發送任何指令（初始或重置後）
 * - 'pending': 指令已送出，等待 broker ACK
 * - 'delivered': broker 確認已送達相機，等待相機回應
 * - 'failed': 送達失敗（broker failed）、相機回應錯誤、或 8 秒 timeout
 * - 'success': 相機回應 OK（目前只有 QUERY_PARAMS 會到此狀態）
 *
 * 注意：'idle' 在此表示「尚未發送指令」，與 channelState 的 'idle'（尚未 connect）語意不同。
 */
export type CommandState = 'idle' | 'pending' | 'delivered' | 'failed' | 'success'

/**
 * Broker 轉發狀態，是 CommandState 的子集。
 * 使用 Extract 確保與 CommandState 的字串值強制同步。
 */
export type BrokerDeliveryStatus = Extract<CommandState, 'delivered' | 'failed'>

/** ICommandChannel.connect() 的 options 參數型別 */
export interface ICommandChannelOptions {
  onStateChange: (state: CommandChannelState) => void
  onHeartbeat?: (msg: HeartbeatEvent) => void
  /** Fired when server broadcasts camera online/offline status change */
  onCameraStatusChange?: (msg: CameraStatusChangeEvent) => void
  /** Fired when server broadcasts camera room assignment change (online path) */
  onDeviceConnectionChange?: (msg: DeviceConnectionChangeEvent) => void
  onBrokerEvent?: (status: BrokerDeliveryStatus, targetClientId: string, message?: string) => void
}

/**
 * 傳輸層介面。
 * connect() 同時傳入 handler（消除 onMessage race）與 options（供 useCameraCommand 維護 reactive channelState）。
 * send() 接收已建構的 CameraWsEnvelope，由 useCameraCommand 負責組裝 envelope。
 */
export interface ICommandChannel {
  readonly state: CommandChannelState
  connect(
    wsUrl: string,
    handler: (msg: CameraCommandResponse) => void,
    options: ICommandChannelOptions,
  ): void
  disconnect(): void
  send(payload: CameraWsEnvelope): void
}

export interface ObjectClass {
  classId: number    // DB class_id
  className: string  // DB class_name
}

export interface CameraGroup {
  id: string
  name: string
  description?: string
  cameraIds: string[]
  createdAt: string
  updatedAt: string
}
