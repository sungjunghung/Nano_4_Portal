<script setup>
// 晶片版圖式背景：工程模組 + PCB 走線 + 節點狀態燈 + 台灣島形節點聚合 + 捲動掃描光
// 單側切角的工程模組塊（polygon 點）
const modules = [
  '110,160 334,160 360,186 360,310 110,310',       // 左上，右上切角
  '160,410 370,410 370,530 184,530 160,506',       // 左中，左下切角
  '110,630 374,630 400,656 400,780 110,780',        // 左下，右上切角
]

// 正交走線（PCB routing），active 為通電線
const traces = [
  { d: '120,210 520,210 520,330 900,330', active: false },
  { d: '180,470 640,470 640,360 980,360', active: true },
  { d: '120,690 700,690 700,560 1000,560', active: false },
  { d: '430,150 430,300 760,300 760,420 1020,420', active: true },
  { d: '260,540 260,760 880,760 880,640 1030,640', active: false },
  { d: '900,180 1060,180 1060,260', active: false },
]

// 節點 pad / 狀態燈
const pads = [
  { x: 520, y: 330, active: false }, { x: 900, y: 330, active: true },
  { x: 640, y: 360, active: false }, { x: 980, y: 360, active: true },
  { x: 700, y: 560, active: false }, { x: 1000, y: 560, active: true },
  { x: 760, y: 420, active: false }, { x: 1020, y: 420, active: false },
  { x: 880, y: 640, active: true }, { x: 1030, y: 640, active: false },
  { x: 120, y: 210, active: false }, { x: 180, y: 470, active: false }, { x: 120, y: 690, active: false },
]

// 由節點聚合隱約構成的台灣島形輪廓
const island = '1090,180 1132,250 1156,345 1150,445 1118,540 1072,628 1028,694 996,628 1002,532 1014,432 1038,338 1064,250 1090,180'
const islandDots = [
  { x: 1132, y: 250, active: false }, { x: 1150, y: 445, active: true },
  { x: 1072, y: 628, active: false }, { x: 1014, y: 432, active: true },
]
</script>

<template>
  <div class="chip-bg" aria-hidden="true">
    <svg class="floorplan" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="chip-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0 H0 V40" class="grid-line" />
        </pattern>
      </defs>

      <!-- 細格網 -->
      <rect x="0" y="0" width="1440" height="900" fill="url(#chip-grid)" />

      <!-- Layer 1：工程模組塊 -->
      <polygon v-for="(m, i) in modules" :key="'m' + i" :points="m" class="module" />

      <!-- Layer 2：PCB 走線 -->
      <polyline v-for="(t, i) in traces" :key="'t' + i" :points="t.d"
        class="trace" :class="{ 'trace--active': t.active }" />

      <!-- 台灣島形節點聚合 -->
      <polyline :points="island" class="island" />

      <!-- Layer 3：節點 pad / 狀態燈 -->
      <rect v-for="(p, i) in pads" :key="'p' + i" :x="p.x - 4" :y="p.y - 4" width="8" height="8"
        class="pad" :class="{ 'pad--active': p.active }" />
      <circle v-for="(d, i) in islandDots" :key="'d' + i" :cx="d.x" :cy="d.y" r="3.5"
        class="pad" :class="{ 'pad--active': d.active }" />
    </svg>

    <!-- 捲動掃描光：位置綁捲動進度 -->
    <div class="scan"></div>
  </div>
</template>

<style scoped>
.chip-bg {
  position: fixed;
  inset: 0;
  z-index: -10;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(120% 100% at 82% 8%, color-mix(in oklch, var(--color-accent) 7%, transparent), transparent 58%),
    var(--color-base-200, #eef1f5);
}

.floorplan {
  position: absolute;
  left: 0;
  top: -30%;
  width: 100%;
  height: 160%;
  /* 捲動視差：以 scroll-progress 映射 ±220px 位移（合成層、順滑，且有界不露邊） */
  transform: translate3d(0, calc(var(--scroll-progress, 0) * 440px - 220px), 0);
  will-change: transform;
}

.grid-line {
  fill: none;
  stroke: color-mix(in oklch, var(--color-primary) 10%, transparent);
  stroke-width: 0.5;
}

.module {
  fill: color-mix(in oklch, var(--color-primary) 6%, transparent);
  stroke: color-mix(in oklch, var(--color-primary) 26%, transparent);
  stroke-width: 0.7;
}

.trace {
  fill: none;
  stroke: color-mix(in oklch, var(--color-primary) 28%, transparent);
  stroke-width: 0.8;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.trace--active {
  stroke: color-mix(in oklch, var(--color-accent) 60%, transparent);
  stroke-width: 1;
  stroke-dasharray: 9 11;
  animation: trace-flow 6s linear infinite;
}
@keyframes trace-flow {
  to { stroke-dashoffset: -200; }
}

.island {
  fill: none;
  stroke: color-mix(in oklch, var(--color-accent) 40%, transparent);
  stroke-width: 0.8;
  stroke-dasharray: 3 6;
}

.pad {
  fill: color-mix(in oklch, var(--color-primary) 30%, transparent);
}
.pad--active {
  fill: color-mix(in oklch, var(--color-accent) 75%, transparent);
  animation: pad-pulse 2.4s ease-in-out infinite;
}
@keyframes pad-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}

.scan {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  /* 用 transform 位移而非 top，避免逐格重排造成頓挫 */
  transform: translate3d(0, calc(var(--scroll-progress, 0) * 100vh), 0);
  will-change: transform;
  background: linear-gradient(90deg, transparent, color-mix(in oklch, var(--color-accent) 55%, transparent) 50%, transparent);
  box-shadow: 0 0 16px color-mix(in oklch, var(--color-accent) 35%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .trace--active, .pad--active { animation: none; }
  .floorplan { transform: none; }
  .scan { transform: none; top: 50%; }
}
</style>
