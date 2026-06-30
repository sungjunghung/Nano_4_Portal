<script setup>
import { ref } from 'vue'
import { useJanusModal } from '../composables/useJanusModal'
import { useOnlineCount } from '../composables/useOnlineCount'

const { open: openJanus } = useJanusModal()
const { online, capacity } = useOnlineCount()

const mobileOpen = ref(false)
const enterFromMobile = () => { mobileOpen.value = false; openJanus() }
</script>

<template>
  <nav class="navbar fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 border-t-2 border-t-accent/70">
    <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center w-full gap-3">
      <div class="flex items-center min-w-0">
        <div class="flex flex-col min-w-0">
          <span class="text-lg md:text-2xl font-bold tracking-tight text-slate-900 leading-none uppercase truncate">數位孿生-模型管理平台</span>
          <span class="text-[10px] font-semibold text-primary-600 tracking-widest uppercase mt-1">Digital Twin Platform</span>
        </div>
      </div>

      <!-- 桌機選單 -->
      <div class="hidden md:flex items-center space-x-10 font-medium">
        <a href="#vision"
          class="relative text-slate-600 hover:text-primary-600 text-sm transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-primary-600 after:transition-all hover:after:w-full">核心能力</a>
        <a href="#cases"
          class="relative text-slate-600 hover:text-primary-600 text-sm transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-primary-600 after:transition-all hover:after:w-full">應用場景</a>
        <a href="#demo"
          class="relative text-slate-600 hover:text-primary-600 text-sm transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-primary-600 after:transition-all hover:after:w-full">操作示範</a>
        <!-- 場域即時在線人數 -->
        <div class="flex items-center gap-2 text-sm" title="虛擬環境目前連線人數">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          <span class="text-slate-500 tabular-nums">場域在線
            <b class="text-slate-900">{{ online }}</b><span class="text-slate-400">/{{ capacity }}</span>
          </span>
        </div>
        <button type="button" @click="openJanus" class="btn btn-neutral eng-btn text-sm">
          進入示範場景
        </button>
      </div>

      <!-- 手機漢堡 -->
      <button class="btn btn-ghost btn-square md:hidden text-slate-900 shrink-0" @click="mobileOpen = !mobileOpen"
        aria-label="選單">
        <div class="flex flex-col items-end gap-1.5">
          <div class="w-6 h-0.5 bg-slate-900"></div>
          <div class="w-6 h-0.5 bg-slate-900"></div>
          <div class="w-4 h-0.5 bg-slate-900"></div>
        </div>
      </button>
    </div>

    <!-- 手機選單 -->
    <div v-if="mobileOpen"
      class="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-6 py-5 flex flex-col gap-4">
      <a href="#vision" @click="mobileOpen = false" class="text-slate-700 hover:text-primary-600 text-sm font-medium">核心能力</a>
      <a href="#cases" @click="mobileOpen = false" class="text-slate-700 hover:text-primary-600 text-sm font-medium">應用場景</a>
      <a href="#demo" @click="mobileOpen = false" class="text-slate-700 hover:text-primary-600 text-sm font-medium">操作示範</a>
      <div class="flex items-center gap-2 text-sm pt-1" title="虛擬環境目前連線人數">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
        </span>
        <span class="text-slate-500 tabular-nums">場域在線
          <b class="text-slate-900">{{ online }}</b><span class="text-slate-400">/{{ capacity }}</span>
        </span>
      </div>
      <button type="button" @click="enterFromMobile" class="btn btn-neutral eng-btn text-sm w-full">
        進入示範場景
      </button>
    </div>
  </nav>
</template>
