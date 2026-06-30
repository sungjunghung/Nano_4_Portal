<script setup>
import { ref, watch, defineAsyncComponent } from 'vue'
import { useJanusModal } from '../composables/useJanusModal'
import Icon from './Icon.vue'

// 延遲載入：webrtc-adapter / janus 串流邏輯切成獨立 chunk，只有開啟時才下載
const JanusViewer = defineAsyncComponent(() => import('./JanusViewer.vue'))

const { isOpen, close } = useJanusModal()
const dialog = ref(null)

// 開啟前先 showModal 讓容器有尺寸；關閉時卸載檢視器（disconnect 串流）
watch(isOpen, (v) => {
  if (v) dialog.value?.showModal()
  else dialog.value?.close()
})
</script>

<template>
  <!-- 示範場域 Modal：滿版減 2rem margin，只有按右上角關閉鈕才能關閉 -->
  <dialog ref="dialog" class="modal" @cancel.prevent>
    <div
      class="modal-box max-w-none w-[calc(100vw-4rem)] max-h-none h-[calc(100vh-4rem)] p-0 rounded-2xl overflow-hidden bg-black relative">
      <JanusViewer v-if="isOpen" />
      <button type="button" @click="close" aria-label="關閉"
        class="btn btn-sm btn-circle btn-primary text-white absolute right-4 top-14 z-20">
        <Icon name="close" class="w-4 h-4" />
      </button>
    </div>
  </dialog>
</template>
