import { onMounted, onBeforeUnmount } from 'vue'
import Lenis from 'lenis'

/**
 * 以 Lenis 提供平滑（慣性）捲動。
 * 同時攔截頁內 anchor 連結（如 #vision），改用 Lenis 平滑捲動到目標。
 */
export function useSmoothScroll() {
  let lenis = null
  let rafId = null

  function onAnchorClick(e) {
    const link = e.target.closest('a[href^="#"]')
    if (!link) return

    const hash = link.getAttribute('href')
    if (hash === '#') return // 純佔位連結不處理

    const target = document.querySelector(hash)
    if (!target) return

    e.preventDefault()
    lenis.scrollTo(target, { offset: -80 }) // 預留固定導覽列高度
  }

  onMounted(() => {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
    })

    // 把捲動量輸出成 CSS 變數，供幾何背景做視差切割位移
    const root = document.documentElement
    lenis.on('scroll', ({ scroll, progress }) => {
      root.style.setProperty('--scroll-y', scroll)
      root.style.setProperty('--scroll-progress', progress)
    })

    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    document.addEventListener('click', onAnchorClick)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('click', onAnchorClick)
    if (rafId) cancelAnimationFrame(rafId)
    lenis?.destroy()
  })
}
