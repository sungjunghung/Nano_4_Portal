<script setup>
const values = [
  {
    icon: '🛡️',
    title: '主權 AI 戰略地位',
    desc: '提供符合國家資安標準的運算環境，讓關鍵科研數據留在國內，確保技術主權與研發成果不外流。',
  },
  {
    icon: '⚡',
    title: '極致運算效能',
    desc: '實測效能達 81.55 PFlops，完美支撐兆級參數模型的訓練需求，大幅縮短科研週期。',
  },
  {
    icon: '🌐',
    title: '跨域產業創新',
    desc: '從 3nm 半導體製程模擬到精準醫療研究，晶創 26 是推動台灣產業升級最強大的算力後盾。',
  },
]
</script>

<template>
  <section id="vision" class="py-24 px-6 bg-slate-50/62">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-7xl font-bold mb-4 uppercase tracking-wide bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">為什麼選擇晶創 26？</h2>
        <div class="w-16 h-1 bg-primary mx-auto"></div>
        <p class="mt-6 text-slate-500 max-w-2xl mx-auto">這不僅是一座資料中心，更是台灣推動「主權 AI」與「半導體創新」的國家級戰略堡壘。</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="value in values" :key="value.title"
          class="card bg-base-100 eng-module eng-pad cut-tr transition hover:-translate-y-1">
          <div class="card-body p-10">
            <div class="text-4xl mb-8">{{ value.icon }}</div>
            <h3 class="card-title text-xl mb-4">{{ value.title }}</h3>
            <p class="text-slate-500 leading-relaxed text-sm">{{ value.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
