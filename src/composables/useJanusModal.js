import { ref } from 'vue'

// 全站共用的 Janus 示範場域 modal 開關（單一狀態，任何元件皆可觸發）
const isOpen = ref(false)

export function useJanusModal() {
  return {
    isOpen,
    open: () => { isOpen.value = true },
    close: () => { isOpen.value = false },
  }
}
