<script setup>
const specs = [
  {
    icon: '🏢',
    title: 'NVIDIA H200',
    desc: '搭載最新 Hopper 架構與超高頻寬記憶體，專為大規模 AI 推理與訓練設計。',
  },
  {
    icon: '🔗',
    title: 'GB200 NVL72',
    desc: '支援次世代 GPU 互連技術，實現超低延遲與極致通訊頻寬，打破運算瓶頸。',
  },
  {
    icon: '🌐',
    title: 'InfiniBand NDR',
    desc: '400Gb/s 高速網路傳輸，確保節點間數據交換零時差，提升整體運算效率。',
  },
  {
    icon: '🍃',
    title: 'PUE 節能優化',
    desc: '先進的水冷散熱技術與機房能源管理，打造符合永續目標的綠色算力基地。',
  },
]
</script>

<template>
  <section id="specs" class="py-24 px-6 bg-slate-900/92 text-white">
    <div class="max-w-7xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-16">頂尖硬體技術架構</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div v-for="spec in specs" :key="spec.title"
          class="card bg-slate-800/50 eng-module-dark eng-pad cut-tr">
          <div class="card-body p-8 items-center text-center">
            <div class="text-3xl mb-6 text-primary-500">{{ spec.icon }}</div>
            <h3 class="text-lg font-bold mb-3">{{ spec.title }}</h3>
            <p class="text-slate-400 text-xs leading-relaxed">{{ spec.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
