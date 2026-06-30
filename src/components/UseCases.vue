<script setup>
import { ref, computed } from 'vue'

const cases = {
  robot: {
    label: '機器人與自駕模擬',
    title: '機器人與自駕訓練模擬',
    desc: '在物理級虛擬環境中大規模生成訓練場景，加速機器人與自駕系統的感知與決策訓練，於數位孿生中驗證後再落地，大幅縮短真實路測成本。',
    list: ['合成訓練資料生成', '感測器與動力學模擬', '強化學習場景訓練'],
    image: import.meta.env.BASE_URL + '01.png',
  },
  city: {
    label: '智慧城市孿生',
    title: '智慧城市數位孿生',
    desc: '整合空間、交通與感測資料建立城市的數位孿生，即時模擬人流、能耗與災害情境，支援都市規劃與營運決策。',
    list: ['即時人流與交通模擬', '能耗與環境推演', '防災情境演練'],
    image: import.meta.env.BASE_URL + '02.jpg',
  },
  factory: {
    label: '智慧工廠孿生',
    title: '建築與工廠數位孿生',
    desc: '在虛擬環境中重建產線、設備與空間，進行佈局、流程與機械手臂的即時模擬與優化，導入實體前先於數位孿生完成驗證。',
    list: ['產線佈局與節拍模擬', '機械手臂路徑優化', '設備異常即時預警'],
    image: import.meta.env.BASE_URL + '03.png',
  },
}

const activeKey = ref('robot')
const fading = ref(false)
const active = computed(() => cases[activeKey.value])

function switchCase(key) {
  if (key === activeKey.value) return
  fading.value = true
  setTimeout(() => {
    activeKey.value = key
    fading.value = false
  }, 300)
}
</script>

<template>
  <section id="cases" class="py-24 px-6 bg-white/62">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="section-title mb-4 mx-auto">數位孿生應用場景</h2>
        <p class="text-slate-500 italic">以即時虛擬環境與數位孿生，加速以下場域的模擬、訓練與決策</p>
      </div>

      <div class="flex flex-wrap justify-center gap-4 mb-12">
        <button v-for="(item, key) in cases" :key="key" @click="switchCase(key)"
          class="btn btn-sm rounded-none"
          :class="key === activeKey ? 'btn-primary' : 'btn-outline'">
          {{ item.label }}
        </button>
      </div>

      <div
        class="bg-slate-50 eng-module cut-bl p-8 md:p-12 min-h-[350px] flex flex-col md:flex-row items-center gap-12 transition-opacity duration-500"
        :class="fading ? 'opacity-0' : 'opacity-100'">
        <div class="md:w-1/2">
          <h3 class="text-3xl font-bold mb-6 text-primary-800 tracking-tight">{{ active.title }}</h3>
          <p class="text-lg text-slate-600 leading-relaxed mb-6">{{ active.desc }}</p>
          <ul class="space-y-4">
            <li v-for="point in active.list" :key="point"
              class="flex items-center text-slate-500 text-sm font-medium">
              <span class="w-1.5 h-1.5 bg-primary-600 rounded-full mr-3"></span> {{ point }}
            </li>
          </ul>
        </div>
        <div class="md:w-1/2 flex justify-center">
          <div class="eng-module cut-tr overflow-hidden w-full max-w-md aspect-16/10">
            <img :src="active.image" :alt="active.title" loading="lazy"
              class="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
