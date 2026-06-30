import { ref } from 'vue'

// 虛擬環境連線上限
export const CAPACITY = 30

// 目前場域在線人數（全站共用）。
// 目前以「進入/離開示範場域」更新本機連線；接上後端 presence / WebSocket 後，
// 可改由真實全域人數驅動 online.value。
const online = ref(0)

export function useOnlineCount() {
  return {
    online,
    capacity: CAPACITY,
    enter: () => { online.value = Math.min(CAPACITY, online.value + 1) },
    leave: () => { online.value = Math.max(0, online.value - 1) },
    set: (n) => { online.value = Math.max(0, Math.min(CAPACITY, n)) },
  }
}
