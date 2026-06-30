import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages 專案頁路徑（build 時用 /Nano_4_Portal/，dev 維持 /）
  base: command === 'build' ? '/Nano_4_Portal/' : '/',
  plugins: [
    vue(),
    tailwindcss(),
  ],
}))
