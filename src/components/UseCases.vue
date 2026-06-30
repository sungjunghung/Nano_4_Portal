<script setup>
import { ref, computed } from 'vue'

const cases = {
  semi: {
    label: '半導體設計',
    title: '半導體設計優化',
    desc: '運用 AI 驅動晶片架構優化與封裝模擬。在 3nm 與更先進製程的研發中，透過晶創 26 的強大算力，加速電子設計自動化 (EDA) 的模擬驗證。',
    list: ['先進封裝熱傳導模擬與驗證', '晶片佈局智慧化優化', '奈米級製程缺陷檢測模型'],
    icon: '💾',
  },
  llm: {
    label: '大型語言模型',
    title: '大型語言模型 (LLM)',
    desc: '提供專為兆級參數設計的訓練環境。晶創 26 能顯著加速繁瑣的 Pre-training 流程，協助開發者快速建立具備在地文化特徵的產業專屬 AI 模型。',
    list: ['台版主權 LLM 模型訓練', '多模態 AI 推理加速', '高效能分散式運算框架'],
    icon: '🧠',
  },
  science: {
    label: '精密科學研究',
    title: '精密科學研究',
    desc: '為生醫、氣候變遷及量子計算提供數據模擬支撐。Nano 4 的高頻寬互連架構能確保複雜運算的精準與高效，縮短科學發現的最後一哩路。',
    list: ['蛋白質折疊與結構預測', '高解析度氣候災害模擬', '藥物分子開發與篩選'],
    icon: '🧪',
  },
}

const activeKey = ref('semi')
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
        <h2 class="text-3xl font-bold mb-4">引領關鍵領域突破</h2>
        <p class="text-slate-500 italic">晶創 26 正在支援以下關鍵產業的跨代進化</p>
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
          <div
            class="w-72 h-72 bg-white rounded-full border-[12px] border-primary-100/50 flex items-center justify-center animate-pulse-soft shadow-inner">
            <span class="text-7xl">{{ active.icon }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
