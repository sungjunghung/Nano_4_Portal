<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Chart from 'chart.js/auto'

const canvas = ref(null)
let chart = null

onMounted(() => {
  chart = new Chart(canvas.value.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Nano 2 (2022)', 'Nano 3 (2024)', '晶創 26 (Nano 4)'],
      datasets: [{
        label: '運算效能 (PFlops)',
        data: [9, 22, 81.55],
        backgroundColor: [
          'rgba(148, 163, 184, 0.4)',
          'rgba(59, 130, 246, 0.5)',
          'rgba(37, 99, 235, 1)',
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
        borderRadius: 12,
        barThickness: 60,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 14, weight: 'bold' },
          padding: 12,
          callbacks: {
            label: (context) => ` 實測效能: ${context.raw} PFlops`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 10 } },
          title: { display: true, text: 'PFlops (Rmax)', font: { size: 12, weight: 'bold' } },
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 12, weight: 'medium' } },
        },
      },
    },
  })
})

onBeforeUnmount(() => {
  chart?.destroy()
})
</script>

<template>
  <section class="py-24 px-6 bg-white/62 border-y border-white/50">
    <div class="max-w-7xl mx-auto">
      <div class="flex flex-col lg:flex-row items-center gap-16">
        <div class="lg:w-1/2">
          <h2 class="text-3xl font-bold mb-6">跨越式的算力演進</h2>
          <p class="text-lg text-slate-600 mb-8 leading-relaxed">
            晶創 26 (Nano 4) 標誌著台灣超級運算能力的重大轉折。與前代相比，Nano 4 的 FP8 混合精度效能提升超過 3 倍，能夠輕鬆應對生成式 AI (GenAI) 時代的海量模型計算。
          </p>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-primary-50 p-6 rounded-2xl">
              <span class="block text-[10px] text-primary-600 font-bold uppercase tracking-widest mb-1">Rmax 效能</span>
              <span class="text-3xl font-bold text-slate-900">81.55 <span class="text-sm font-medium">PF</span></span>
            </div>
            <div class="bg-slate-50 p-6 rounded-2xl">
              <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">GPU 總片數</span>
              <span class="text-3xl font-bold text-slate-900">1,760 <span class="text-sm font-medium">片</span></span>
            </div>
          </div>
        </div>
        <div class="lg:w-1/2 w-full">
          <div class="relative w-full max-w-[800px] mx-auto h-[400px] max-h-[500px]">
            <canvas ref="canvas"></canvas>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
