<script setup>
import { useJanusModal } from '../composables/useJanusModal'
import { useOnlineCount } from '../composables/useOnlineCount'
import Icon from './Icon.vue'

// 開啟全站共用的示範場域 modal
const { open } = useJanusModal()
const { online, capacity } = useOnlineCount()
</script>

<template>
  <footer class="pt-32 pb-8 px-6 overflow-hidden relative bg-[radial-gradient(circle_at_center,#0f172a_0%,#020617_100%)]">
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] pointer-events-none z-0 bg-[radial-gradient(circle,rgba(118,185,0,0.1)_0%,transparent_70%)]">
    </div>

    <!-- 晶片版圖式走線疊層（深色底） -->
    <svg class="portal-grid" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <polyline points="120,140 460,140 460,300 760,300" class="p-trace" />
      <polyline points="1320,180 980,180 980,360 700,360" class="p-trace p-trace--active" />
      <polyline points="180,460 620,460 620,360 900,360" class="p-trace" />
      <polyline points="1300,440 1020,440 1020,300 820,300" class="p-trace p-trace--active" />
      <g class="p-pads">
        <rect x="456" y="136" width="8" height="8" /><rect x="756" y="296" width="8" height="8" />
        <rect x="976" y="356" width="8" height="8" /><rect x="616" y="456" width="8" height="8" />
        <rect x="1016" y="296" width="8" height="8" /><rect x="896" y="356" width="8" height="8" />
      </g>
    </svg>

    <div class="max-w-4xl mx-auto flex flex-col items-center relative z-10 text-center">
      <!-- 工程感角框 -->
      <span class="hidden md:block pointer-events-none absolute -left-3 -top-3 w-7 h-7 border-l-2 border-t-2 border-accent/60"></span>
      <span class="hidden md:block pointer-events-none absolute -right-3 -top-3 w-7 h-7 border-r-2 border-t-2 border-accent/60"></span>
      <span class="hidden md:block pointer-events-none absolute -left-3 -bottom-3 w-7 h-7 border-l-2 border-b-2 border-accent/60"></span>
      <span class="hidden md:block pointer-events-none absolute -right-3 -bottom-3 w-7 h-7 border-r-2 border-b-2 border-accent/60"></span>
      <div class="mb-2">
        <h2 class="section-title mb-8 mx-auto">晶創 26 Nano 4 數位孿生環境</h2>
      </div>

      <!-- 場域即時在線人數 -->
      <div class="flex items-baseline justify-center gap-2.5 mb-10" title="虛擬環境目前連線人數">
        <span class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          場域在線
        </span>
        <span class="text-4xl md:text-5xl font-bold text-white tabular-nums leading-none">
          {{ online }}<span class="text-2xl md:text-3xl text-slate-500">/{{ capacity }}</span>
        </span>
      </div>

      <button type="button" @click="open" class="px-8 py-5 md:px-14 md:py-7 text-white eng-btn font-bold text-base md:text-xl flex flex-col items-center group cursor-pointer
        bg-[linear-gradient(135deg,#76b900_0%,#166534_100%)] border border-[rgba(118,185,0,0.3)]
        shadow-[0_0_20px_rgba(118,185,0,0.2)] transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]
        hover:scale-[1.02] hover:-translate-y-[5px] hover:border-[rgba(118,185,0,0.6)]
        hover:shadow-[0_0_40px_rgba(118,185,0,0.5),inset_0_0_20px_rgba(255,255,255,0.2)]">
        <span class="flex items-center gap-4 mb-1">
          <Icon name="globe" class="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span>進入 Nano 4 Omniverse 環境</span>
        </span>
      </button>

    </div>

    <!-- 底部版權列：移出置中內容、滿版置中，置於最底部 -->
    <div class="max-w-7xl mx-auto mt-24 pt-8 border-t border-slate-800/50 relative z-10 text-center text-slate-500 text-[10px] font-medium">
      <p>© 2026 國家高速網路與計算中心 (NCHC) · 晶創 26 Nano 4 Portal</p>
    </div>
  </footer>
</template>

<style scoped>
.portal-grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  opacity: 0.55;
}
.p-trace {
  fill: none;
  stroke: color-mix(in oklch, var(--color-accent) 32%, transparent);
  stroke-width: 1.4;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.p-trace--active {
  stroke: color-mix(in oklch, var(--color-accent) 70%, transparent);
  stroke-dasharray: 9 11;
  animation: portal-flow 6s linear infinite;
}
@keyframes portal-flow {
  to { stroke-dashoffset: -200; }
}
.p-pads rect {
  fill: color-mix(in oklch, var(--color-accent) 75%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  .p-trace--active { animation: none; }
}
</style>
