<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'

const root = ref(null)
const canvasContainer = ref(null)

let scene, camera, renderer, sphere, trailLine
let rafId = null
let resizeObserver = null
const cleanups = []

// 控制狀態
const ctl = {
  moveInput: { x: 0, y: 0 },
  lookInput: { x: 0, y: 0 },
  leverInput: 0,
  zoomDist: 25,
  camRotationH: Math.PI / 4,
  camRotationV: Math.PI / 6,
}
const MAX_TRAIL_POINTS = 80
let trailPoints = []

// 移動範圍：邊長 AREA 的方形格間區，球體被夾在邊界內
const AREA = 40
const AREA_HALF = AREA / 2
const SPHERE_R = 1

// 室內隔間牆
const WALL_H = 3
const DOOR = 4 // 中央門口寬度
let walls = [] // 碰撞用：{ cx, cz, hx, hz }（中心與半長）

// 在組件根節點內查詢，避免全域 id 衝突
const $ = (sel) => root.value.querySelector(sel)
// 統一登記事件，卸載時一併移除
const on = (target, type, handler, opts) => {
  target.addEventListener(type, handler, opts)
  cleanups.push(() => target.removeEventListener(type, handler, opts))
}

function sizeOf() {
  const el = canvasContainer.value
  return { w: el.clientWidth || 1, h: el.clientHeight || 1 }
}

function initThree() {
  const { w, h } = sizeOf()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a1120)
  scene.fog = new THREE.Fog(0x0a1120, 30, 200)

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  canvasContainer.value.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const sunLight = new THREE.DirectionalLight(0xffffff, 0.9)
  sunLight.position.set(20, 50, 20)
  sunLight.castShadow = true
  scene.add(sunLight)

  const pointLight = new THREE.PointLight(0x3b82f6, 4, 100)
  pointLight.position.set(-20, 30, -20)
  scene.add(pointLight)

  // 格間地板：每格 2 單位
  scene.add(new THREE.GridHelper(AREA, AREA / 2, 0x3b82f6, 0x1e293b))

  // 範圍邊界框（藍色發光線）
  const border = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-AREA_HALF, 0.05, -AREA_HALF),
      new THREE.Vector3(AREA_HALF, 0.05, -AREA_HALF),
      new THREE.Vector3(AREA_HALF, 0.05, AREA_HALF),
      new THREE.Vector3(-AREA_HALF, 0.05, AREA_HALF),
      new THREE.Vector3(-AREA_HALF, 0.05, -AREA_HALF),
    ]),
    new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.7 }),
  )
  scene.add(border)

  buildRooms()

  sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.05, emissive: 0x1d4ed8, emissiveIntensity: 0.2 }),
  )
  sphere.position.y = 1
  sphere.castShadow = true
  scene.add(sphere)

  const trailGeometry = new THREE.BufferGeometry()
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRAIL_POINTS * 3), 3))
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_TRAIL_POINTS * 3), 3))
  trailLine = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 }))
  scene.add(trailLine)

  // 改用 ResizeObserver 跟著容器（modal）大小
  resizeObserver = new ResizeObserver(() => {
    const { w, h } = sizeOf()
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
  resizeObserver.observe(canvasContainer.value)
}

// 正常四房平面圖：外牆一圈 + 十字內牆（中央實心交叉），門口開在各內牆中段
function buildRooms() {
  walls = []
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, metalness: 0.2, roughness: 0.85,
    transparent: true, opacity: 0.9, emissive: 0x0b1220,
  })
  const addWall = (cx, cz, hx, hz) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, WALL_H, hz * 2), mat)
    mesh.position.set(cx, WALL_H / 2, cz)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    walls.push({ cx, cz, hx, hz })
  }

  const t = 0.3                                  // 牆半厚
  const dp = AREA_HALF / 2                        // 門口中心（離原點 10）
  const gap = DOOR / 2
  const outerHalf = (AREA_HALF - dp - gap) / 2    // 門口外側那段牆的半長
  const outerCenter = (AREA_HALF + dp + gap) / 2  // 該段的中心
  const innerHalf = dp - gap                      // 跨越中央那段的半長

  // 外牆一圈
  addWall(0, -AREA_HALF, AREA_HALF, t)
  addWall(0, AREA_HALF, AREA_HALF, t)
  addWall(-AREA_HALF, 0, t, AREA_HALF)
  addWall(AREA_HALF, 0, t, AREA_HALF)

  // 內部垂直牆（x=0）：門口在 z = ±dp
  addWall(0, -outerCenter, t, outerHalf)
  addWall(0, 0, t, innerHalf)
  addWall(0, outerCenter, t, outerHalf)

  // 內部水平牆（z=0）：門口在 x = ±dp
  addWall(-outerCenter, 0, outerHalf, t)
  addWall(0, 0, innerHalf, t)
  addWall(outerCenter, 0, outerHalf, t)
}

// 球體（圓）對每道牆（AABB）做碰撞解算，碰到就推回
function resolveWalls() {
  const r = SPHERE_R
  for (const w of walls) {
    const minX = w.cx - w.hx, maxX = w.cx + w.hx
    const minZ = w.cz - w.hz, maxZ = w.cz + w.hz
    const nx = Math.max(minX, Math.min(maxX, sphere.position.x))
    const nz = Math.max(minZ, Math.min(maxZ, sphere.position.z))
    const dx = sphere.position.x - nx
    const dz = sphere.position.z - nz
    const dist2 = dx * dx + dz * dz
    if (dist2 >= r * r) continue
    if (dist2 > 1e-6) {
      const dist = Math.sqrt(dist2)
      sphere.position.x = nx + (dx / dist) * r
      sphere.position.z = nz + (dz / dist) * r
    } else {
      // 中心落在牆內：往最近的牆面推出
      const pen = [sphere.position.x - minX, maxX - sphere.position.x, sphere.position.z - minZ, maxZ - sphere.position.z]
      const m = Math.min(...pen)
      if (m === pen[0]) sphere.position.x = minX - r
      else if (m === pen[1]) sphere.position.x = maxX + r
      else if (m === pen[2]) sphere.position.z = minZ - r
      else sphere.position.z = maxZ + r
    }
  }
}

function setupJoystick(areaSel, handleSel, onUpdate, onEnd) {
  const area = $(areaSel)
  const handle = $(handleSel)
  const centerX = 100, centerY = 100, maxR = 60
  let active = false

  const move = (e) => {
    if (!active) return
    const pos = e.touches ? e.touches[0] : e
    const rect = area.getBoundingClientRect()
    let dx = pos.clientX - (rect.left + rect.width / 2)
    let dy = pos.clientY - (rect.top + rect.height / 2)
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > maxR) { dx *= maxR / dist; dy *= maxR / dist }
    handle.setAttribute('cx', centerX + dx)
    handle.setAttribute('cy', centerY + dy)
    onUpdate(dx / maxR, dy / maxR)
  }
  const end = () => { active = false; handle.setAttribute('cx', centerX); handle.setAttribute('cy', centerY); onEnd() }

  on(area, 'mousedown', () => active = true)
  on(window, 'mousemove', move)
  on(window, 'mouseup', end)
  on(area, 'touchstart', (e) => { e.preventDefault(); active = true }, { passive: false })
  on(window, 'touchmove', (e) => { e.preventDefault(); move(e) }, { passive: false })
  on(window, 'touchend', end)
}

function setupLever(areaSel, handleSel, onUpdate, onEnd) {
  const area = $(areaSel)
  const handle = $(handleSel)
  const centerY = 90, maxRange = 70
  let active = false

  const move = (e) => {
    if (!active) return
    const pos = e.touches ? e.touches[0] : e
    const rect = area.getBoundingClientRect()
    let dy = pos.clientY - (rect.top + rect.height / 2)
    dy = Math.max(-maxRange, Math.min(maxRange, dy))
    handle.setAttribute('y', (centerY - 10) + dy)
    onUpdate(-dy / maxRange)
  }
  const end = () => { active = false; handle.setAttribute('y', centerY - 10); onEnd() }

  on(area, 'mousedown', () => active = true)
  on(window, 'mousemove', move)
  on(window, 'mouseup', end)
  on(area, 'touchstart', (e) => { e.preventDefault(); active = true }, { passive: false })
  on(window, 'touchmove', (e) => { e.preventDefault(); move(e) }, { passive: false })
  on(window, 'touchend', end)
}

function setupStageControl() {
  const svg = $('#svgStages')
  const slider = $('#zoomSlider')
  let isSliding = false

  const updateFromY = (clientY) => {
    const rect = svg.getBoundingClientRect()
    let ratio = 1 - ((clientY - rect.top) / rect.height)
    ratio = Math.max(0, Math.min(1, ratio))
    ctl.zoomDist = 80 - ratio * (80 - 5)
    slider.value = ctl.zoomDist
  }

  on(svg, 'mousedown', (e) => { isSliding = true; updateFromY(e.clientY) })
  on(window, 'mousemove', (e) => { if (isSliding) updateFromY(e.clientY) })
  on(window, 'mouseup', () => { isSliding = false })
  on(svg, 'touchstart', (e) => { e.preventDefault(); isSliding = true; updateFromY(e.touches[0].clientY) }, { passive: false })
  on(window, 'touchmove', (e) => { if (isSliding) { e.preventDefault(); updateFromY(e.touches[0].clientY) } }, { passive: false })
  on(window, 'touchend', () => { isSliding = false })
}

function updateStageDisplay() {
  const stages = root.value.querySelectorAll('.stage-rect')
  const normalizedZoom = 1 - (ctl.zoomDist - 5) / (80 - 5)
  const activeCount = Math.round(normalizedZoom * 10)
  stages.forEach((rect, index) => {
    if (9 - index < activeCount) {
      rect.style.fill = '#3b82f6'
      rect.style.filter = 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.8))'
    } else {
      rect.style.fill = 'rgba(255,255,255,0.1)'
      rect.style.filter = 'none'
    }
  })
}

function animate() {
  rafId = requestAnimationFrame(animate)
  if (!sphere) return

  ctl.camRotationH -= ctl.lookInput.x * 0.05
  ctl.camRotationV = Math.max(0.05, Math.min(Math.PI / 2.05, ctl.camRotationV + ctl.lookInput.y * 0.03))

  if (Math.abs(ctl.leverInput) > 0.01) {
    ctl.zoomDist = Math.max(5, Math.min(80, ctl.zoomDist - ctl.leverInput * 0.5))
    $('#zoomSlider').value = ctl.zoomDist
  }

  updateStageDisplay()

  const moveSpeed = 0.3
  const forward = new THREE.Vector3(Math.sin(ctl.camRotationH), 0, Math.cos(ctl.camRotationH))
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward)
  sphere.position.addScaledVector(forward, ctl.moveInput.y * moveSpeed)
  sphere.position.addScaledVector(right, ctl.moveInput.x * moveSpeed)

  // 夾在格間範圍內（留球體半徑當邊距）
  const limit = AREA_HALF - SPHERE_R
  sphere.position.x = Math.max(-limit, Math.min(limit, sphere.position.x))
  sphere.position.z = Math.max(-limit, Math.min(limit, sphere.position.z))

  // 隔間牆碰撞，最後再夾一次外框
  resolveWalls()
  sphere.position.x = Math.max(-limit, Math.min(limit, sphere.position.x))
  sphere.position.z = Math.max(-limit, Math.min(limit, sphere.position.z))

  sphere.rotation.y = ctl.camRotationH
  sphere.rotation.x += (ctl.moveInput.y * 0.15)
  sphere.rotation.z -= (ctl.moveInput.x * 0.15)

  const groundPos = sphere.position.clone(); groundPos.y = 0.05
  trailPoints.unshift(groundPos)
  if (trailPoints.length > MAX_TRAIL_POINTS) trailPoints.pop()
  const posAttr = trailLine.geometry.attributes.position
  const colAttr = trailLine.geometry.attributes.color
  for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
    const p = trailPoints[i] || groundPos
    posAttr.setXYZ(i, p.x, p.y, p.z)
    const alpha = 1.0 - (i / MAX_TRAIL_POINTS)
    colAttr.setXYZ(i, 0.4 * alpha, 0.7 * alpha, 1.0 * alpha)
  }
  posAttr.needsUpdate = colAttr.needsUpdate = true

  const targetCamPos = new THREE.Vector3(
    sphere.position.x + Math.sin(ctl.camRotationH) * ctl.zoomDist * Math.cos(ctl.camRotationV),
    sphere.position.y + Math.sin(ctl.camRotationV) * ctl.zoomDist,
    sphere.position.z + Math.cos(ctl.camRotationH) * ctl.zoomDist * Math.cos(ctl.camRotationV),
  )
  camera.position.lerp(targetCamPos, 0.1)
  camera.lookAt(sphere.position)

  renderer.render(scene, camera)
}

onMounted(() => {
  initThree()

  setupJoystick('#areaMove', '#hMove', (x, y) => { ctl.moveInput.x = x; ctl.moveInput.y = y }, () => { ctl.moveInput.x = 0; ctl.moveInput.y = 0 })
  setupJoystick('#areaLook', '#hLook', (x, y) => { ctl.lookInput.x = x; ctl.lookInput.y = y }, () => { ctl.lookInput.x = 0; ctl.lookInput.y = 0 })
  setupLever('#areaLever', '#hLever', (val) => { ctl.leverInput = val }, () => { ctl.leverInput = 0 })
  setupStageControl()

  const zoomSlider = $('#zoomSlider')
  on(zoomSlider, 'input', (e) => { ctl.zoomDist = parseFloat(e.target.value) })

  $('#btnFPV').onclick = () => { ctl.zoomDist = 6; ctl.camRotationV = 0.15; zoomSlider.value = 6 }
  $('#btnTPV').onclick = () => { ctl.zoomDist = 42; ctl.camRotationV = 0.85; zoomSlider.value = 42 }
  $('#btnGod').onclick = () => { ctl.zoomDist = 75; ctl.camRotationV = 1.5; zoomSlider.value = 75 }

  animate()
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  cleanups.forEach((fn) => fn())
  cleanups.length = 0
  scene?.traverse((obj) => {
    obj.geometry?.dispose?.()
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
    else obj.material?.dispose?.()
  })
  renderer?.dispose()
  renderer?.domElement?.remove()
})
</script>

<template>
  <div ref="root" class="viewer">
    <div ref="canvasContainer" class="canvas-container"></div>

    <div class="controls-wrapper">
      <!-- 1. 移動控制 (左搖桿) -->
      <div class="control-group">
        <span class="label-text">Move</span>
        <div class="control-body w-joystick">
          <svg id="areaMove" width="120" height="120" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" class="joystick-base" />
            <g stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round">
              <line x1="100" y1="30" x2="100" y2="45" />
              <line x1="100" y1="155" x2="100" y2="170" />
              <line x1="30" y1="100" x2="45" y2="100" />
              <line x1="155" y1="100" x2="170" y2="100" />
              <circle cx="50" cy="50" r="1.5" fill="rgba(255,255,255,0.15)" />
              <circle cx="150" cy="50" r="1.5" fill="rgba(255,255,255,0.15)" />
              <circle cx="50" cy="150" r="1.5" fill="rgba(255,255,255,0.15)" />
              <circle cx="150" cy="150" r="1.5" fill="rgba(255,255,255,0.15)" />
            </g>
            <circle id="hMove" cx="100" cy="100" r="35" class="handle-move" />
          </svg>
        </div>
      </div>

      <!-- 2. 視角控制 (右搖桿) -->
      <div class="control-group">
        <span class="label-text">Look</span>
        <div class="control-body w-joystick">
          <svg id="areaLook" width="120" height="120" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" class="joystick-base" />
            <g stroke="rgba(255,255,255,0.3)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="160,94 166,100 160,106" />
              <polyline points="40,94 34,100 40,106" />
              <polyline points="94,40 100,34 106,40" />
              <polyline points="94,160 100,166 106,160" />
            </g>
            <circle id="hLook" cx="100" cy="100" r="35" class="handle-look" />
          </svg>
        </div>
      </div>

      <!-- 3. 視角預設按鈕 -->
      <div class="control-group">
        <span class="label-text">Preset</span>
        <div class="control-body w-preset">
          <div class="flex flex-col gap-2">
            <button class="view-btn" id="btnFPV">1ST PERSON</button>
            <button class="view-btn" id="btnTPV">3RD PERSON</button>
            <button class="view-btn" id="btnGod">GOD VIEW</button>
          </div>
        </div>
      </div>

      <!-- 4. 縮放滑桿 -->
      <div class="control-group">
        <span class="label-text">Zoom</span>
        <div class="control-body w-zoom">
          <input type="range" id="zoomSlider" min="5" max="80" value="25" step="0.1" class="zoom-slider" />
        </div>
      </div>

      <!-- 5. 階段顯示器 -->
      <div class="control-group">
        <span class="label-text">Stage</span>
        <div class="control-body w-stage">
          <svg id="svgStages" width="22" height="125" viewBox="0 0 20 160">
            <rect class="stage-rect" data-stage="9" x="0" y="0" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
            <rect class="stage-rect" data-stage="8" x="0" y="16" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
            <rect class="stage-rect" data-stage="7" x="0" y="32" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
            <rect class="stage-rect" data-stage="6" x="0" y="48" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
            <rect class="stage-rect" data-stage="5" x="0" y="64" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
            <rect class="stage-rect" data-stage="4" x="0" y="80" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
            <rect class="stage-rect" data-stage="3" x="0" y="96" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
            <rect class="stage-rect" data-stage="2" x="0" y="112" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
            <rect class="stage-rect" data-stage="1" x="0" y="128" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
            <rect class="stage-rect" data-stage="0" x="0" y="144" width="20" height="12" rx="2" fill="rgba(255,255,255,0.1)" />
          </svg>
        </div>
      </div>

      <!-- 6. 速度/縮放撥桿 -->
      <div class="control-group">
        <span class="label-text">Lever</span>
        <div class="control-body w-lever">
          <svg id="areaLever" width="40" height="120" viewBox="0 0 60 180">
            <rect x="25" y="10" width="10" height="160" rx="5" class="lever-track" />
            <rect id="hLever" x="10" y="80" width="40" height="20" rx="4" class="handle-lever" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  background-color: #000;
}
.canvas-container {
  position: absolute;
  inset: 0;
}

.controls-wrapper {
  position: absolute;
  bottom: 25px;
  right: 25px;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(0, 0, 0, 0.45);
  padding: 20px;
  border-radius: 30px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.control-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.control-body {
  height: 145px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.w-joystick { width: 120px; }
.w-preset { width: 95px; }
.w-zoom { width: 30px; }
.w-stage { width: 30px; }
.w-lever { width: 40px; }

.label-text {
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.joystick-base {
  fill: rgba(255, 255, 255, 0.05);
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 2;
}
.handle-move { fill: #3b82f6; filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5)); }
.handle-look { fill: #ec4899; filter: drop-shadow(0 0 10px rgba(236, 72, 153, 0.5)); }
.handle-lever { fill: #10b981; filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.5)); }

.zoom-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 4px;
  height: 120px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  outline: none;
}
#zoomSlider {
  transform: rotate(-90deg);
  width: 120px;
  height: 4px;
  cursor: pointer;
}
.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #ffffff;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #3b82f6;
}

.view-btn {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  font-size: 9px;
  font-weight: 600;
  padding: 8px 0;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  width: 90px;
  text-align: center;
}
.view-btn:hover { background: rgba(255, 255, 255, 0.2); }
.view-btn:active { transform: scale(0.95); background: #3b82f6; }

.lever-track {
  fill: rgba(255, 255, 255, 0.05);
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 2;
}

.stage-rect {
  transition: fill 0.2s, filter 0.2s, opacity 0.2s;
  cursor: pointer;
}
#svgStages {
  cursor: ns-resize;
}
</style>
