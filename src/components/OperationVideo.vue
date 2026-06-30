<script setup>
import { ref } from 'vue'

// 操作影片來源（暫用 public/nano4.mp4）。BASE_URL 確保 GitHub Pages 子路徑也正確。
const videoSrc = import.meta.env.BASE_URL + 'nano4.mp4'
const poster = ''

const videoEl = ref(null)
const goFullscreen = () => videoEl.value?.requestFullscreen?.()
</script>

<template>
  <section id="demo" class="py-24 px-6 bg-slate-50/62">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-12">
        <h2 class="section-title mb-4 mx-auto">數位孿生環境操作示範</h2>
        <p class="text-slate-500 max-w-2xl mx-auto">實際進入並操作數位孿生環境的示範影片。</p>
      </div>

      <div class="eng-module eng-pad cut-tr overflow-hidden bg-slate-950 aspect-video relative">
        <!-- 有來源時顯示播放器（自動播放需靜音；保留 controls 可手動取消靜音）-->
        <video v-if="videoSrc" ref="videoEl" :src="videoSrc" :poster="poster"
          autoplay muted loop playsinline controls
          class="w-full h-full object-contain"></video>

        <!-- 全螢幕按鈕 -->
        <button v-if="videoSrc" type="button" @click="goFullscreen" title="全螢幕"
          class="absolute right-3 top-3 z-10 btn btn-sm btn-circle bg-black/50 border-white/20 text-white hover:bg-black/70">
          ⛶
        </button>

        <!-- 預留區（尚未設定來源時）-->
        <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div class="w-20 h-20 rounded-full border-2 border-accent/60 flex items-center justify-center mb-6">
            <span class="text-3xl text-accent translate-x-0.5">▶</span>
          </div>
          <p class="text-slate-100 text-lg font-semibold mb-2">操作影片預留區</p>
          <p class="text-slate-400 text-sm">
            錄製完成後置於 <code class="text-accent">public/</code>，於此區塊設定 <code class="text-accent">videoSrc</code> 即可顯示
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
