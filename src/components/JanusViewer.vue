<script setup>
/**
 * Janus 單格串流檢視器（只顯示 4010-03）。
 * 自原 janus-demo 抽出串流生命週期主線：resolveJanusUrl → new JanusStreamer → connect()，
 * 狀態機 connecting/online/stalled/error/offline 由 streamer 回呼驅動。
 */
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import adapter from 'webrtc-adapter'
import Icon from './Icon.vue'
import { JanusStreamer } from '../janus/JanusStreamer'
import { JanusControl, deriveCtrlId } from '../janus/JanusControl'
import { defaultIceServers } from '../janus/iceServers'
import { resolveJanusUrl } from '../janus/useJanusUrl'
import { useOnlineCount } from '../composables/useOnlineCount'
import camerasMock from '../mock/cameras.json'

const { online, capacity, enter, leave } = useOnlineCount()

const STATUS_MAP = {
  connecting: 'loading',
  online: 'online',
  stalled: 'stalled',
  error: 'error',
  offline: 'offline',
}

const cam = camerasMock.find((c) => c.name === '4010-03')
const status = ref('offline')
const controlState = ref('offline')
const txCount = ref(0)
const videoWrap = ref(null)

let streamer = null
let control = null
let bgSyncTimer = null
let isUnmounted = false

// 動態注入 janus.js（全域 window.Janus），只有開啟此檢視器時才載入
let janusLoading = null
function ensureJanusLoaded() {
  if (window.Janus) return Promise.resolve()
  if (janusLoading) return janusLoading
  janusLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = import.meta.env.BASE_URL + 'janus.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('janus.js 載入失敗'))
    document.head.appendChild(s)
  })
  return janusLoading
}

async function start() {
  if (!cam) { status.value = 'error'; return }
  const roomId = parseInt(cam.url, 10)
  if (Number.isNaN(roomId)) { status.value = 'error'; return }

  const janusUrl = await resolveJanusUrl(cam.paasId)
  if (isUnmounted) return

  streamer = new JanusStreamer({
    janusUrl,
    roomId,
    streamName: cam.streamName ?? `100-${cam.id}`,
    videoElementId: cam.id,
    onStateChange: (s) => { status.value = STATUS_MAP[s] ?? 'offline' },
  })
  streamer.connect()

  // 控制通道（textroom）：向同一 room 的控制目標送出移動/視角/縮放指令
  // 只建立一次（reconnect 只重連影像，控制 session 獨立保留）
  if (!control && cam.class === 'Omniverse' && cam.streamName) {
    control = new JanusControl({
      janusUrl,
      roomId,
      username: cam.streamName,
      ctrlId: deriveCtrlId(cam.streamName),
      token: import.meta.env.VITE_JANUS_TOKEN ?? '',
      iceServers: defaultIceServers(),
      targetEl: videoWrap.value,
      onState: (s) => { controlState.value = s },
      onSend: () => { txCount.value++ },
    })
    control.connect()
      .then(() => control.start(10))
      .catch((e) => { console.error('[JanusViewer] 控制連線失敗:', e); controlState.value = 'error' })
  }
}

async function reconnect() {
  if (status.value === 'loading') return
  status.value = 'loading'
  if (streamer) { await streamer.disconnect(); streamer = null }
  if (isUnmounted) return
  await start()
}

// 拖曳搖桿（仿 Omniverse 控制面板）：輸出 -1..1 → JanusControl
function makeJoystick(onUpdate, onEnd) {
  const pos = reactive({ cx: 100, cy: 100 })
  let active = false
  const maxR = 60
  const down = (ev) => { active = true; try { ev.currentTarget.setPointerCapture?.(ev.pointerId) } catch {} drag(ev) }
  const drag = (ev) => {
    if (!active) return
    const rect = ev.currentTarget.getBoundingClientRect()
    const scale = 200 / rect.width
    let dx = (ev.clientX - (rect.left + rect.width / 2)) * scale
    let dy = (ev.clientY - (rect.top + rect.height / 2)) * scale
    const dist = Math.hypot(dx, dy)
    if (dist > maxR) { dx *= maxR / dist; dy *= maxR / dist }
    pos.cx = 100 + dx; pos.cy = 100 + dy
    onUpdate(dx / maxR, dy / maxR)
  }
  const up = (ev) => { active = false; try { ev.currentTarget.releasePointerCapture?.(ev.pointerId) } catch {} pos.cx = 100; pos.cy = 100; onEnd() }
  return { pos, down, drag, up }
}
// Look 靈敏度（搖桿輸出縮放，避免轉太快）
const LOOK_SENS = 0.22
// Move：右=+x、上=+y（與鍵盤 d/w 對齊）；Look：右=-yaw、上=+pitch（翻轉上下）並降速
const moveJoy = makeJoystick((x, y) => control?.setMove(x, -y), () => control?.endMove())
const lookJoy = makeJoystick((x, y) => control?.setLook(-x * LOOK_SENS, -y * LOOK_SENS), () => control?.endLook())
const resetView = () => control?.resetView()

onMounted(async () => {
  enter() // 進入示範場景 → 場域在線 +1
  // janus.js 執行期需要全域 adapter，須在任何連線前設定
  window.adapter = adapter
  status.value = 'loading'
  try {
    await ensureJanusLoaded()
    if (isUnmounted) return
    await start()
  } catch (e) {
    console.error('[JanusViewer] 啟動失敗:', e)
    status.value = 'error'
  }

  // 背景模糊層：把主 video 的串流鏡像到模糊背景
  bgSyncTimer = setInterval(() => {
    const main = document.getElementById(cam?.id)
    const bg = document.getElementById((cam?.id ?? '') + '-bg')
    if (main && bg && main.srcObject !== bg.srcObject) bg.srcObject = main.srcObject
  }, 300)
})

onBeforeUnmount(async () => {
  isUnmounted = true
  leave() // 離開示範場域 → 場域在線 -1
  if (bgSyncTimer) clearInterval(bgSyncTimer)
  if (control) { control.disconnect(); control = null }
  if (streamer) { await streamer.disconnect(); streamer = null }
})
</script>

<template>
  <div class="janus-root">
    <div class="cell">
      <!-- 標題列 -->
      <div class="cell-bar">
        <span class="cam-name"><Icon name="video" class="w-4 h-4" />{{ cam?.name ?? '—' }}</span>
        <span class="online-tag"><Icon name="users" class="w-3.5 h-3.5" />場域在線 {{ online }}/{{ capacity }}</span>
        <div class="cell-actions">
          <span class="ctrl-badge" :class="`ctrl-${controlState}`" title="控制通道狀態">
            <Icon name="gamepad" class="w-3.5 h-3.5" />{{ controlState === 'ready' ? 'CTRL' : controlState.toUpperCase() }}
          </span>
          <span class="ctrl-badge" title="已送出的控制指令數">TX {{ txCount }}</span>
          <button class="btn-reconnect flex justify-center items-center" title="重新連線" :disabled="status === 'loading'" @click="reconnect">
            <span v-if="status === 'loading'">…</span>
            <Icon v-else name="loading" class="w-3.5 h-3.5" />
          </button>
          <span class="dot" :class="`dot-${status}`"></span>
          <span class="status-text" :class="`txt-${status}`">
            {{ status === 'loading' ? 'WAIT' : status.toUpperCase() }}
          </span>
        </div>
      </div>

      <!-- 影像區（可拖曳控制視角） -->
      <div ref="videoWrap" class="video-wrap" :class="{ off: status === 'offline', grab: controlState === 'ready' }">
        <video :id="(cam?.id ?? '') + '-bg'" autoplay muted playsinline
          v-show="status === 'online'" class="video-bg" />
        <video :id="cam?.id" autoplay muted playsinline
          v-show="status === 'online'" class="video-main" />
        <div v-if="status !== 'online'" class="placeholder">
          <span v-if="status === 'loading'" class="inline-flex items-center gap-2"><Icon name="loading" class="w-5 h-5 animate-spin" />嘗試建立連線…</span>
          <span v-else-if="status === 'stalled'" class="inline-flex items-center gap-2"><Icon name="warning" class="w-5 h-5" />串流中斷，重試中…</span>
          <span v-else-if="status === 'error'" class="inline-flex items-center gap-2"><Icon name="error" class="w-5 h-5" />連線錯誤</span>
          <span v-else class="inline-flex items-center gap-2"><Icon name="offline" class="w-5 h-5" />訊號遺失 / 設備離線</span>
        </div>

        <!-- 螢幕控制介面（仿 Omniverse 搖桿面板；控制通道就緒才顯示，皆實際送指令）
             pointerdown.stop：避免操作面板時誤觸影像區的滑鼠視角控制 -->
        <div v-if="controlState === 'ready'" class="ctrl-panel" @pointerdown.stop @wheel.stop>
          <!-- Move 搖桿 -->
          <div class="control-group">
            <span class="label-text">Move</span>
            <svg class="joy" viewBox="0 0 200 200"
              @pointerdown="moveJoy.down" @pointermove="moveJoy.drag" @pointerup="moveJoy.up" @pointercancel="moveJoy.up">
              <circle cx="100" cy="100" r="80" class="joystick-base" />
              <g stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round">
                <line x1="100" y1="30" x2="100" y2="45" /><line x1="100" y1="155" x2="100" y2="170" />
                <line x1="30" y1="100" x2="45" y2="100" /><line x1="155" y1="100" x2="170" y2="100" />
              </g>
              <circle :cx="moveJoy.pos.cx" :cy="moveJoy.pos.cy" r="34" class="handle-move" />
            </svg>
          </div>

          <!-- Look 搖桿 -->
          <div class="control-group">
            <span class="label-text">Look</span>
            <svg class="joy" viewBox="0 0 200 200"
              @pointerdown="lookJoy.down" @pointermove="lookJoy.drag" @pointerup="lookJoy.up" @pointercancel="lookJoy.up">
              <circle cx="100" cy="100" r="80" class="joystick-base" />
              <g stroke="rgba(255,255,255,0.3)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="160,94 166,100 160,106" /><polyline points="40,94 34,100 40,106" />
                <polyline points="94,40 100,34 106,40" /><polyline points="94,160 100,166 106,160" />
              </g>
              <circle :cx="lookJoy.pos.cx" :cy="lookJoy.pos.cy" r="34" class="handle-look" />
            </svg>
          </div>

          <!-- 重置視角（回出生點，救回飛出場景的鏡頭）-->
          <div class="control-group side">
            <span class="label-text">重置</span>
            <button class="pk pk-reset" title="重置視角（R）" @click="resetView">
              <Icon name="reset" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- 常駐操作說明 -->
        <div class="ctrl-hint">
          <span><b>WASD</b> 移動</span>
          <span><b>拖曳 / IJKL</b> 視角</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.janus-root {
  position: absolute;
  inset: 0;
  background: #0f172a;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
  display: flex;
}
.cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #0b1220;
}
.cell-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 10px 14px;
  font-size: 13px;
  border-bottom: 1px solid #1e293b;
}
.cam-name { display: inline-flex; align-items: center; gap: 6px; font-family: monospace; font-weight: 700; }
.online-tag { display: inline-flex; align-items: center; gap: 5px; font-family: monospace; font-size: 11px; color: #38bdf8; font-variant-numeric: tabular-nums; }
.cell-actions { display: flex; align-items: center; gap: 8px; }
.btn-reconnect {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 4px;
  width: 26px; height: 26px;
  cursor: pointer;
  line-height: 1;
}
.btn-reconnect:disabled { opacity: 0.4; cursor: default; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot-online  { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
.dot-loading { background: #eab308; animation: janus-pulse 1s infinite; }
.dot-stalled { background: #f97316; }
.dot-error   { background: #ef4444; }
.dot-offline { background: #475569; }
.status-text { font-size: 10px; font-weight: 700; letter-spacing: 1px; min-width: 52px; text-align: right; }
.txt-online  { color: #22c55e; }
.txt-loading { color: #eab308; }
.txt-stalled { color: #f97316; }
.txt-error   { color: #ef4444; }
.txt-offline { color: #94a3b8; }

.video-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
  background: #020617;
}
.video-wrap.off { filter: grayscale(1); opacity: 0.7; }
.video-wrap.grab { cursor: grab; touch-action: none; }
.video-wrap.grab:active { cursor: grabbing; }

/* 控制通道狀態徽章 */
.ctrl-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 9px; font-weight: 700; letter-spacing: 1px;
  padding: 2px 6px; border-radius: 4px;
  border: 1px solid #334155; color: #94a3b8;
}
.ctrl-badge.ctrl-ready { color: #22c55e; border-color: #166534; }
.ctrl-badge.ctrl-connecting { color: #eab308; border-color: #854d0e; }
.ctrl-badge.ctrl-error { color: #ef4444; border-color: #7f1d1d; }

/* 螢幕控制介面（仿 Omniverse 搖桿面板）*/
.ctrl-panel {
  position: absolute; right: 16px; bottom: 16px; z-index: 5;
  display: flex; align-items: flex-start; gap: 14px;
  padding: 16px 18px;
  background: rgba(2, 6, 23, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 22px;
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  user-select: none;
}
.control-group { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.label-text {
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: rgba(255, 255, 255, 0.5);
}
.joy { width: 110px; height: 110px; touch-action: none; cursor: grab; }
.joy:active { cursor: grabbing; }
.joystick-base { fill: rgba(255, 255, 255, 0.05); stroke: rgba(255, 255, 255, 0.2); stroke-width: 2; }
.handle-move { fill: #3b82f6; filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5)); }
.handle-look { fill: #ec4899; filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.5)); }

/* 小螢幕：縮小控制面板與搖桿，避免佔滿畫面 */
@media (max-width: 640px) {
  .ctrl-panel { right: 10px; bottom: 10px; padding: 10px 12px; gap: 8px; border-radius: 16px; }
  .control-group { gap: 6px; }
  .joy { width: 82px; height: 82px; }
}

.pk {
  width: 46px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  color: #e2e8f0; font-size: 12px; font-weight: 700; font-family: monospace;
  cursor: pointer; touch-action: none;
  transition: background 0.12s, transform 0.08s;
}
.pk:hover { background: rgba(255, 255, 255, 0.18); }
.pk:active { transform: scale(0.92); background: #38bdf8; color: #04263a; }
.pk-stop { width: 46px; height: 46px; background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; }
.pk-stop:active { background: #ef4444; color: #fff; }
.pk-reset { width: 46px; height: 46px; }
.pk-reset:active { background: #38bdf8; color: #04263a; }

/* 常駐操作說明 */
.ctrl-hint {
  position: absolute; left: 16px; bottom: 16px; z-index: 4; pointer-events: none;
  display: flex; flex-direction: column; gap: 3px;
  padding: 8px 11px; border-radius: 10px;
  background: rgba(2, 6, 23, 0.5); backdrop-filter: blur(8px);
  font-size: 11px; color: #cbd5e1;
}
.ctrl-hint b { color: #38bdf8; font-family: monospace; }
.video-bg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  transform: scale(1.15);
  filter: blur(24px);
  z-index: 0;
}
.video-main {
  position: absolute; inset: 0; margin: auto;
  max-width: 100%; max-height: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  z-index: 2;
}
.placeholder {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: #64748b; text-align: center; padding: 8px;
  z-index: 3;
}
@keyframes janus-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>
