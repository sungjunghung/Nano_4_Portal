<script setup>
const values = [
  {
    icon: import.meta.env.BASE_URL + 'icon_01.svg',
    title: '物理級即時模擬',
    desc: '以 RTX 即時光線追蹤與 PhysX 物理運算驅動，讓虛擬環境的光影、材質與動態貼近真實世界。',
  },
  {
    icon: import.meta.env.BASE_URL + 'icon_02.svg',
    title: '雲端 SaaS 一鍵進場',
    desc: '透過線上 SaaS 串流進入虛擬環境，免自建模型或 USD、免高階顯示卡。繁重運算交由我們高效能的雲端機器承擔，開啟瀏覽器即可進場。',
  },
  {
    icon: import.meta.env.BASE_URL + 'icon_03.svg',
    title: '沉浸式遠端操控',
    desc: '透過低延遲串流進入虛擬環境，即時監測場域狀態，並以鍵盤、搖桿遠端操控視角與裝置。',
  },
]
</script>

<template>
  <section id="vision" class="py-24 px-6 bg-slate-50/62">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="section-title mb-4 mx-auto">為什麼選擇我們的虛擬環境平台？</h2>
        <div class="w-16 h-1 bg-primary mx-auto"></div>
        <p class="mt-6 text-slate-500 max-w-2xl mx-auto">以物理級即時模擬與雲端串流，打造可監測、可操控的數位孿生虛擬環境。</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="value in values" :key="value.title"
          class="card bg-base-100 eng-module eng-pad cut-tr transition hover:-translate-y-1">
          <div class="card-body p-10">
            <img :src="value.icon" :alt="value.title" class="w-24 h-24 mb-2" />
            <h3 class="card-title text-xl mb-4">{{ value.title }}</h3>
            <p class="text-slate-500 leading-relaxed text-sm">{{ value.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
