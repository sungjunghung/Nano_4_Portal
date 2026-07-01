// Janus Omniverse 控制：以 janus.plugin.textroom 資料通道，向同一 room 的控制目標（ctrlId）
// 以 ~10Hz 送出 { sen, key, accl, torq, scroll } 控制指令。
// 自 janus-controller/index.html 的 OmniverseTextRoomController 抽出（鍵盤 + 滑鼠拖曳 + 滾輪）。
// 依賴全域 Janus（janus.js）。

const ACCL_RELEASE = [0, 0, 0.001]

/** 由 streamName 推導控制 whisper 目標：user_xxx → ctrl_xxx */
export function deriveCtrlId(streamName) {
  const raw = String(streamName || '').replace(/^user_/, '')
  return `ctrl_${raw}`
}

export class JanusControl {
  constructor(opts) {
    this.janusUrl = opts.janusUrl
    this.roomId = Number(opts.roomId)
    this.username = opts.username
    this.ctrlId = opts.ctrlId
    this.token = opts.token ?? ''
    this.iceServers = opts.iceServers ?? []
    this.targetEl = opts.targetEl ?? window
    this.onState = opts.onState ?? (() => {})
    this.onSend = opts.onSend ?? (() => {})
    this.onInfo = opts.onInfo ?? (() => {})

    this.moveSpeed = opts.moveSpeed ?? 300
    this.torqSpeed = opts.torqSpeed ?? 100
    this.pitchRate = opts.pitchRate ?? 100

    // 前端開環估算的相機朝向（弧度），用來把 Move 旋轉成「面向前方」。
    // turnRate：滿舵 yaw 指令時每秒轉多少弧度（校準用；正負可翻轉轉向）。
    this.turnRate = opts.turnRate ?? 1.5
    this.yawSign = opts.yawSign ?? 1  // 若閉環校正後前後仍反，改成 -1
    this._yaw = 0
    // 最後一次收到後端真值朝向的時間；逾 yawTruthTtl 未更新就停用旋轉，
    // 避免純開環估算漂移到 ~180° 時把前後翻面（無真值時退回不旋轉、穩定）。
    this._yawTruthAt = 0
    this.yawTruthTtl = opts.yawTruthTtl ?? 1500
    this.infoTimer = null

    this.janus = null
    this.handle = null
    this.joined = false
    this.dataOpen = false
    this.pendingJoinTxn = null
    this.controlHz = 10
    this.timer = null
    this.tuningDirty = true

    this.pressed = new Set()
    this.keyStr = null
    this.keyupCountKeys = 0
    this.keyupCountMove = 0
    this.keyupCountTorq = 0

    this.mouseDown = false
    this.mouseDx = 0
    this.mouseDy = 0
    this.mouseZeroTicks = 0
    this.pointerId = null
    this.scrollAccum = 0

    // 螢幕控制介面（UI）輸入：-1..1
    this._uiX = 0
    this._uiY = 0
    this._uiZ = 0
    this._uiYaw = 0
    this._uiPitch = 0
    this._uiSteer = 0
    this._stopPulse = 0
    this._tapKey = null
    this._tapTicks = 0

    this.moveKeys = new Set(['w', 'a', 's', 'd', 'q', 'e'])
    this.rotKeys = new Set(['i', 'j', 'k', 'l'])
    this.keyPattern = /^[a-z0-9]$/

    this._bind()
    this._updateMaps()
  }

  _bind() {
    for (const m of ['onKeyDown', 'onKeyUp', 'onPointerDown', 'onPointerMove', 'onPointerUp', 'onWheel']) {
      this[m] = this[m].bind(this)
    }
  }

  _updateMaps() {
    this.moveMap = {
      a: [-this.moveSpeed, 0, 0], d: [this.moveSpeed, 0, 0],
      w: [0, this.moveSpeed, 0], s: [0, -this.moveSpeed, 0],
      q: [0, 0, -this.moveSpeed], e: [0, 0, this.moveSpeed],
    }
    this.rotMap = {
      j: [this.torqSpeed, 0, 0], l: [-this.torqSpeed, 0, 0],
      i: [0, -this.pitchRate, 0], k: [0, this.pitchRate, 0],
    }
  }

  _releaseTicks() { return Math.max(1, Math.round(this.controlHz)) }

  async connect() {
    this.onState('connecting')
    await new Promise((resolve) => Janus.init({ debug: 'error', callback: resolve }))
    this.janus = await new Promise((resolve, reject) => {
      const j = new Janus({
        server: this.janusUrl,
        token: this.token,
        iceServers: this.iceServers,
        success: () => resolve(j),
        error: reject,
        destroyed: () => {},
      })
    })
    await this._attachTextroom()
    this._installHandlers()
  }

  _attachTextroom() {
    return new Promise((resolve, reject) => {
      this.janus.attach({
        plugin: 'janus.plugin.textroom',
        opaqueId: 'textroom-' + Janus.randomString(12),
        success: (handle) => {
          this.handle = handle
          handle.send({ message: { request: 'setup' } })
          resolve()
        },
        error: reject,
        onmessage: (msg, jsep) => {
          if (jsep) {
            this.handle.createAnswer({
              jsep,
              tracks: [{ type: 'data' }],
              success: (ourJsep) => this.handle.send({ message: { request: 'ack' }, jsep: ourJsep }),
              error: (e) => console.warn('[JanusControl] answer error', e),
            })
          }
        },
        ondataopen: () => this._onDataOpen(),
        ondata: (data) => this._onData(data),
        oncleanup: () => { this.joined = false },
      })
    })
  }

  _onDataOpen() {
    this.dataOpen = true
    const txn = Janus.randomString(12)
    this.pendingJoinTxn = txn
    this.handle.data({
      text: JSON.stringify({
        textroom: 'join', transaction: txn, room: this.roomId,
        username: this.username, display: this.username,
      }),
    })
  }

  _onData(data) {
    let msg
    try { msg = JSON.parse(data) } catch { return }
    if (msg.transaction && msg.transaction === this.pendingJoinTxn && msg.textroom !== 'error') {
      this.joined = true
      this.pendingJoinTxn = null
      this.onState('ready')
    } else if (msg.textroom === 'error') {
      console.warn('[JanusControl] textroom error', msg.error || msg)
      this.onState('error')
    } else if (msg.textroom === 'message') {
      this._applyInfo(msg)
    }
  }

  // 收到後端資訊回應（來自 key:"t"）→ 用真實朝向覆蓋估算 yaw，消除漂移
  _applyInfo(msg) {
    const raw = msg.text
    let info
    try { info = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { console.log('[JanusControl] info(raw)', raw); this.onInfo(raw); return }
    console.log('[JanusControl] info', info)
    this.onInfo(info)
    if (!info || typeof info !== 'object') return
    const d = info.dir ?? info.direction ?? info.forward
    if (Array.isArray(d) && d.length >= 2) {
      // 假設 dir 是世界前向量；yaw = atan2(x, y)（對齊 accl 的 x=right, y=forward）
      const yaw = Math.atan2(Number(d[0]), Number(d[1]))
      if (Number.isFinite(yaw)) { this._yaw = yaw * this.yawSign; this._yawTruthAt = Date.now() }
    } else if (typeof info.yaw === 'number') {
      this._yaw = info.yaw * this.yawSign
      this._yawTruthAt = Date.now()
    }
  }

  _sendInfoRequest() {
    if (!this.joined || !this.handle?.webrtcStuff?.dataChannel) return
    const wire = {
      textroom: 'message', transaction: Janus.randomString(12),
      room: this.roomId, to: this.ctrlId, text: JSON.stringify({ key: 't' }),
    }
    this.handle.data({ text: JSON.stringify(wire) })
  }

  // ── 輸入處理 ────────────────────────────────────────────────────────────
  _installHandlers() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    this.targetEl.addEventListener('pointerdown', this.onPointerDown)
    this.targetEl.addEventListener('contextmenu', preventCtx)
  }

  _removeHandlers() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.targetEl.removeEventListener('pointerdown', this.onPointerDown)
    this.targetEl.removeEventListener('contextmenu', preventCtx)
    this._stopPointer()
  }

  _normKey(key) {
    const k = String(key || '').toLowerCase()
    return this.keyPattern.test(k) ? k : null
  }

  onKeyDown(ev) {
    const k = this._normKey(ev.key)
    if (!k) return
    if (this.moveKeys.has(k) || this.rotKeys.has(k) || k === 'x') ev.preventDefault()
    if (this.pressed.has(k)) return
    this.pressed.add(k)
    this.keyStr = Array.from(this.pressed).join('')
  }

  onKeyUp(ev) {
    const k = this._normKey(ev.key)
    if (!k) return
    const was = this.pressed.delete(k)
    this.keyStr = this.pressed.size ? Array.from(this.pressed).join('') : null
    if (was) this.keyupCountKeys = this._releaseTicks()
    if (this.moveKeys.has(k)) this.keyupCountMove = this._releaseTicks()
    if (this.rotKeys.has(k)) this.keyupCountTorq = this._releaseTicks()
  }

  onPointerDown(ev) {
    if (ev.pointerType && ev.pointerType !== 'mouse') return
    if (ev.button !== 0) return
    this.mouseDown = true
    this.pointerId = ev.pointerId
    try { this.targetEl.setPointerCapture?.(ev.pointerId) } catch {}
    this.targetEl.addEventListener('pointermove', this.onPointerMove)
    this.targetEl.addEventListener('pointerup', this.onPointerUp)
    this.targetEl.addEventListener('pointercancel', this.onPointerUp)
    this.mouseDx = 0; this.mouseDy = 0
  }

  onPointerMove(ev) {
    if (this.pointerId !== null && ev.pointerId !== this.pointerId) return
    if (!this.mouseDown) return
    this.mouseDx += ev.movementX || 0
    this.mouseDy += ev.movementY || 0
  }

  onPointerUp() {
    if (this.mouseDown) this.mouseZeroTicks = this._releaseTicks()
    this.mouseDown = false
    this._stopPointer()
    this.mouseDx = 0; this.mouseDy = 0
  }

  _stopPointer() {
    this.targetEl.removeEventListener('pointermove', this.onPointerMove)
    this.targetEl.removeEventListener('pointerup', this.onPointerUp)
    this.targetEl.removeEventListener('pointercancel', this.onPointerUp)
    if (this.pointerId !== null) { try { this.targetEl.releasePointerCapture?.(this.pointerId) } catch {} }
    this.pointerId = null
  }

  onWheel(ev) {
    ev.preventDefault()
    this.scrollAccum += ev.deltaY || 0
  }

  _consumeMouseTorq() {
    if (this.mouseDown) {
      const dx = this.mouseDx, dy = this.mouseDy
      this.mouseDx = 0; this.mouseDy = 0
      const limit = this.torqSpeed
      const yaw = Math.max(-limit, Math.min(limit, -dx * (this.torqSpeed / 10)))
      const pitch = Math.round((-dy * (this.pitchRate / 10)) * 1000) / 1000
      return [yaw, pitch, 0]
    }
    if (this.mouseZeroTicks > 0) { this.mouseZeroTicks -= 1; return [0, 0, 0] }
    return null
  }

  _consumeScroll() {
    if (!this.scrollAccum) return null
    const scroll = this.scrollAccum * -0.001 * this.moveSpeed
    this.scrollAccum = 0
    return [scroll]
  }

  // ── 送出迴圈 ────────────────────────────────────────────────────────────
  _buildPayload() {
    const cmd = { sen: [this.torqSpeed, this.pitchRate, this.moveSpeed] }
    let has = this.tuningDirty

    if (this.keyStr) { cmd.key = this.keyStr; has = true }
    else if (this._tapTicks > 0) { cmd.key = this._tapKey; this._tapTicks -= 1; if (this._tapTicks === 0) this._tapKey = null; has = true }
    else if (this.keyupCountKeys) { cmd.key = ''; this.keyupCountKeys -= 1; has = true }

    const scroll = this._consumeScroll()
    if (scroll) { cmd.scroll = scroll; has = true }

    let vx = 0, vy = 0, vz = 0, rx = 0, ry = 0
    let hasMove = false, hasRot = false, stop = false
    for (const k of this.pressed) {
      const mv = this.moveMap[k]
      if (mv) { hasMove = true; vx += mv[0]; vy += mv[1]; vz += mv[2] }
      const rt = this.rotMap[k]
      if (rt) { hasRot = true; rx += rt[0]; ry += rt[1] }
      if (k === 'x') stop = true
    }

    const uiMoveActive = this._uiX || this._uiY || this._uiZ
    if (this._stopPulse > 0 || stop) { cmd.accl = [0, 0, 0]; this._stopPulse = Math.max(0, this._stopPulse - 1); this.keyupCountMove = 0; has = true }
    else if (uiMoveActive) { cmd.accl = [this._uiX * this.moveSpeed, this._uiY * this.moveSpeed, this._uiZ * this.moveSpeed]; this.keyupCountMove = this._releaseTicks(); has = true }
    else if (hasMove) { cmd.accl = [vx, vy, vz]; this.keyupCountMove = this._releaseTicks(); has = true }
    else if (this.keyupCountMove) { cmd.accl = ACCL_RELEASE; this.keyupCountMove -= 1; has = true }

    const mouseTorq = this._consumeMouseTorq()
    const yawInput = this._uiYaw + this._uiSteer // Look yaw + Move 轉向
    const uiTorqActive = yawInput || this._uiPitch
    if (mouseTorq) { cmd.torq = mouseTorq; has = true }
    else if (uiTorqActive) { cmd.torq = [yawInput * this.torqSpeed, this._uiPitch * this.pitchRate, 0]; this.keyupCountTorq = this._releaseTicks(); has = true }
    else if (hasRot) { cmd.torq = [rx, ry, 0]; this.keyupCountTorq = this._releaseTicks(); has = true }
    else if (this.keyupCountTorq) { cmd.torq = [0, 0, 0]; this.keyupCountTorq -= 1; has = true }

    // ── 開環估算相機 yaw，並把 Move 旋轉成相機相對（面向前方）──────────────
    // 把當前 yaw 指令（正規化）當角速度積分；只有在轉頭時累加。
    const yawCmd = cmd.torq ? cmd.torq[0] / (this.torqSpeed || 1) : 0
    this._yaw += yawCmd * this.turnRate / (this.controlHz || 10)
    // 只有在後端真值朝向仍新鮮時才把 Move 旋轉成相機相對；真值過期就送原始
    // accl（不旋轉），寧可少一點「面向前方」也不要開環漂移導致前後顛倒。
    const yawFresh = (Date.now() - this._yawTruthAt) < this.yawTruthTtl
    if (cmd.accl && yawFresh) {
      const c = Math.cos(this._yaw), s = Math.sin(this._yaw)
      const [ax, ay, az] = cmd.accl
      cmd.accl = [ax * c - ay * s, ax * s + ay * c, az]
    }

    return has ? cmd : null
  }

  _sendOnce() {
    const payload = this._buildPayload()
    if (!payload) return
    if (!this.joined || !this.handle?.webrtcStuff?.dataChannel) {
      console.debug('[JanusControl] 未送出（textroom 尚未連上）', payload)
      return
    }
    const wire = {
      textroom: 'message', transaction: Janus.randomString(12),
      room: this.roomId, to: this.ctrlId, text: JSON.stringify(payload),
    }
    this.handle.data({ text: JSON.stringify(wire) })
    console.debug('[JanusControl] →', this.ctrlId, payload)
    this.onSend(payload)
    this.tuningDirty = false
  }

  start(hz = 10) {
    this.stop()
    this.controlHz = hz
    this.timer = setInterval(() => this._sendOnce(), 1000 / hz)
    // 每 400ms 向後端要一次相機朝向，用真值校正估算 yaw（消除漂移）
    this.infoTimer = setInterval(() => this._sendInfoRequest(), 400)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    if (this.infoTimer) clearInterval(this.infoTimer)
    this.infoTimer = null
  }

  // ── 螢幕控制介面 API（press-hold）────────────────────────────────────────
  setMove(x, y) { this._uiX = x; this._uiY = y }
  endMove() { this._uiX = 0; this._uiY = 0; if (!this._uiZ) this.keyupCountMove = this._releaseTicks() }
  setVertical(z) { this._uiZ = z }
  endVertical() { this._uiZ = 0; if (!this._uiX && !this._uiY) this.keyupCountMove = this._releaseTicks() }
  setLook(yaw, pitch) { this._uiYaw = yaw; this._uiPitch = pitch }
  endLook() { this._uiYaw = 0; this._uiPitch = 0; this.keyupCountTorq = this._releaseTicks() }
  // 開車感轉向：Move 搖桿左右 → 併入 yaw
  setSteer(s) { this._uiSteer = s }
  endSteer() { this._uiSteer = 0; if (!this._uiYaw && !this._uiPitch) this.keyupCountTorq = this._releaseTicks() }
  zoom(dir) { this.scrollAccum += dir * 120 }
  stopMotion() { this._stopPulse = this._releaseTicks() }
  // 單次送出按鍵（連送幾個 tick 確保送達）；'r' = 重置回出生點
  tapKey(k) { this._tapKey = k; this._tapTicks = this._releaseTicks() }
  resetView() { this._yaw = 0; this.tapKey('r') }

  setTuning({ moveSpeed, torqSpeed, pitchRate }) {
    if (moveSpeed !== undefined) this.moveSpeed = Number(moveSpeed)
    if (torqSpeed !== undefined) this.torqSpeed = Number(torqSpeed)
    if (pitchRate !== undefined) this.pitchRate = Number(pitchRate)
    this._updateMaps()
    this.tuningDirty = true
  }

  disconnect() {
    this.stop()
    this._removeHandlers()
    try {
      if (this.dataOpen && this.handle) {
        this.handle.data({
          text: JSON.stringify({ textroom: 'leave', transaction: Janus.randomString(12), room: this.roomId, username: this.username }),
        })
      }
    } catch {}
    try { this.handle?.detach() } catch {}
    try { this.janus?.destroy({ cleanupHandles: true }) } catch {}
    this.handle = null
    this.janus = null
    this.joined = false
    this.dataOpen = false
    this.onState('offline')
  }
}

function preventCtx(ev) { ev.preventDefault() }
