<script setup>
import { ref, defineAsyncComponent } from 'vue'

// 延遲載入：three.js 切成獨立 chunk，只有開啟 modal 時才下載
const OmniverseViewer = defineAsyncComponent(() => import('./OmniverseViewer.vue'))

const modal = ref(null)
const isOpen = ref(false)

const open = () => {
  modal.value?.showModal() // 先開啟讓容器有尺寸
  isOpen.value = true       // 再掛載 Three.js 檢視器
}
const close = () => {
  isOpen.value = false      // 卸載檢視器 → 觸發清理
  modal.value?.close()
}
</script>

<template>
  <footer class="py-32 px-6 overflow-hidden relative bg-[radial-gradient(circle_at_center,#0f172a_0%,#020617_100%)]">
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
      <div class="mb-12">
        <span class="text-accent font-bold tracking-[0.2em] uppercase text-[10px] mb-4 block">NVIDIA Omniverse Digital Twin</span>
        <h2 class="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">晶創 26 Nano 4 數位孿生環境</h2>
        <p class="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed font-light">
          跨越物理邊界，進入基於實時物理模擬的虛擬機房。監測 GPU 負載分布、進行硬體配置模擬，在 3D 空間中直觀掌控您的運算計畫。
        </p>
      </div>

      <button type="button" @click="open" class="px-14 py-7 text-white eng-btn font-bold text-xl flex flex-col items-center group cursor-pointer
        bg-[linear-gradient(135deg,#76b900_0%,#166534_100%)] border border-[rgba(118,185,0,0.3)]
        shadow-[0_0_20px_rgba(118,185,0,0.2)] transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]
        hover:scale-[1.02] hover:-translate-y-[5px] hover:border-[rgba(118,185,0,0.6)]
        hover:shadow-[0_0_40px_rgba(118,185,0,0.5),inset_0_0_20px_rgba(255,255,255,0.2)]">
        <span class="flex items-center gap-4 mb-1">
          <span class="text-2xl group-hover:rotate-12 transition-transform">🌐</span>
          <span>進入 Nano 4 Omniverse 環境</span>
        </span>
        <span class="text-[10px] text-accent opacity-80 font-normal uppercase tracking-widest">Real-time Digital Twin Platform</span>
      </button>

      <div
        class="mt-24 pt-12 border-t border-slate-800/50 w-full text-slate-500 text-[10px] flex flex-col md:flex-row justify-between items-center gap-6 font-medium">
        <p>© 2026 國家高速網路與計算中心 (NCHC) · 晶創 26 Nano 4 Portal</p>
        <div class="flex gap-10">
          <a href="https://iservice.nchc.org.tw/" class="hover:text-primary-400 transition uppercase tracking-widest">iService 服務網</a>
          <a href="#" class="hover:text-primary-400 transition uppercase tracking-widest">技術支援</a>
        </div>
      </div>
    </div>

    <!-- 滿版 Modal：寬高 = 視窗 - 4rem，置中 → 四周各留 2rem margin -->
    <dialog ref="modal" class="modal" @cancel.prevent>
      <div
        class="modal-box max-w-none w-[calc(100vw-4rem)] max-h-none h-[calc(100vh-4rem)] p-0 rounded-2xl overflow-hidden bg-black relative">
        <!-- Three.js 雙搖桿球體控制系統（暫時內容） -->
        <OmniverseViewer v-if="isOpen" />

        <!-- 關閉鈕（只有按 ✕ 才能關閉） -->
        <button type="button" @click="close"
          class="btn btn-sm btn-circle btn-ghost text-white absolute right-4 top-4 z-20">✕</button>
      </div>
    </dialog>
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
