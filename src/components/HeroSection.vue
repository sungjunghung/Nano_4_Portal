<script setup>
import { useJanusModal } from '../composables/useJanusModal'

const { open } = useJanusModal()
</script>

<template>
  <section class="relative min-h-screen flex items-center pt-20 overflow-hidden">
    <!-- 背景影片：資料中心 3D 數位孿生（檔案置於 /public，部署後從根目錄載入） -->
    <video class="absolute inset-0 w-full h-full object-cover z-0" autoplay muted loop playsinline
      poster="https://images.unsplash.com/photo-1558494949-ef010cbdcc48?q=80&w=2000&auto=format&fit=crop">
      <source src="/0_Data_Center_3840x2160.mp4" type="video/mp4" />
    </video>
    <div class="absolute inset-0 bg-gradient-to-b from-slate-900/90 to-slate-900/70 z-[1]"></div>

    <!-- 台灣輪廓 routing 疊層（在影片之上、文字之下；影片保留不動） -->
    <svg class="tw-routing hidden md:block" viewBox="0 0 600 820" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <polyline class="tw-trace" points="0,180 120,180 120,250 332,252" />
      <polyline class="tw-trace tw-trace--active" points="0,360 180,360 180,300 300,302" />
      <polyline class="tw-trace tw-trace--active" points="0,560 220,560 220,470 300,470" />
      <g class="tw-pads">
        <rect x="328" y="248" width="8" height="8" />
        <rect x="296" y="298" width="8" height="8" class="tw-pad--active" />
        <rect x="296" y="466" width="8" height="8" class="tw-pad--active" />
      </g>
    </svg>

    <div class="max-w-5xl mx-auto text-center relative z-10 px-6">
      <!-- 工程感角框 -->
      <span class="hidden md:block pointer-events-none absolute -left-2 -top-2 w-7 h-7 border-l-2 border-t-2 border-accent/70"></span>
      <span class="hidden md:block pointer-events-none absolute -right-2 -top-2 w-7 h-7 border-r-2 border-t-2 border-accent/70"></span>
      <span class="hidden md:block pointer-events-none absolute -left-2 -bottom-2 w-7 h-7 border-l-2 border-b-2 border-accent/70"></span>
      <span class="hidden md:block pointer-events-none absolute -right-2 -bottom-2 w-7 h-7 border-r-2 border-b-2 border-accent/70"></span>
      <h1 class="text-5xl md:text-7xl font-bold mb-8 leading-tight text-white">
        即時模擬，沉浸無界<br /><span class="text-primary-400">虛擬環境</span> 數位孿生平台
      </h1>
      <p class="text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed font-light">
        以即時物理模擬建立高擬真的虛擬環境。串接感測資料打造數位孿生，在 3D 空間中監測、模擬並遠端操控真實場域。
      </p>
      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <a href="#vision" class="btn btn-primary btn-lg eng-btn shadow-lg shadow-primary-900/20">
          深入瞭解平台技術
        </a>
        <button type="button" @click="open" class="btn btn-lg eng-btn glass text-white border-white/20">
          進入示範場域
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tw-routing {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: min(58%, 660px);
  z-index: 2;
  pointer-events: none;
  opacity: 0.5;
}
.tw-outline {
  fill: none;
  stroke: color-mix(in oklch, var(--color-accent) 55%, transparent);
  stroke-width: 1.6;
  stroke-dasharray: 3 6;
}
.tw-trace {
  fill: none;
  stroke: color-mix(in oklch, var(--color-accent) 32%, transparent);
  stroke-width: 1.4;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.tw-trace--active {
  stroke: color-mix(in oklch, var(--color-accent) 70%, transparent);
  stroke-dasharray: 9 11;
  animation: tw-flow 6s linear infinite;
}
@keyframes tw-flow {
  to { stroke-dashoffset: -200; }
}
.tw-pads rect {
  fill: color-mix(in oklch, var(--color-accent) 60%, transparent);
}
.tw-pads .tw-pad--active {
  fill: color-mix(in oklch, var(--color-accent) 90%, transparent);
  animation: tw-pulse 2.4s ease-in-out infinite;
}
@keyframes tw-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .tw-trace--active, .tw-pad--active { animation: none; }
}
</style>
