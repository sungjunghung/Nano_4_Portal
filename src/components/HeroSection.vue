<template>
  <section class="relative min-h-screen flex items-center pt-20 overflow-hidden">
    <!-- 背景影片：資料中心 3D 數位孿生（檔案置於 /public，部署後從根目錄載入） -->
    <video class="absolute inset-0 w-full h-full object-cover z-0" autoplay muted loop playsinline
      poster="https://images.unsplash.com/photo-1558494949-ef010cbdcc48?q=80&w=2000&auto=format&fit=crop">
      <source src="/0_Data_Center_3840x2160.mp4" type="video/mp4" />
    </video>
    <div class="absolute inset-0 bg-gradient-to-b from-slate-900/90 to-slate-900/70 z-[1]"></div>

    <div class="max-w-5xl mx-auto text-center relative z-10 px-6">
      <!-- 工程感角框 -->
      <span class="hidden md:block pointer-events-none absolute -left-2 -top-2 w-7 h-7 border-l-2 border-t-2 border-accent/70"></span>
      <span class="hidden md:block pointer-events-none absolute -right-2 -top-2 w-7 h-7 border-r-2 border-t-2 border-accent/70"></span>
      <span class="hidden md:block pointer-events-none absolute -left-2 -bottom-2 w-7 h-7 border-l-2 border-b-2 border-accent/70"></span>
      <span class="hidden md:block pointer-events-none absolute -right-2 -bottom-2 w-7 h-7 border-r-2 border-b-2 border-accent/70"></span>
      <h1 class="text-5xl md:text-7xl font-bold mb-8 leading-tight text-white">
        驅動未來，運算無限<br /><span class="text-primary-400">晶創 26</span> 超級算力中心
      </h1>
      <p class="text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed font-light">
        國網中心年度旗艦計畫。搭載 NVIDIA H200 與 GB200 頂尖架構，為生成式 AI 與半導體研發提供最堅實的數位基座。
      </p>
      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <a href="#vision" class="btn btn-primary btn-lg eng-btn shadow-lg shadow-primary-900/20">
          深入瞭解計畫核心
        </a>
        <a href="https://iservice.nchc.org.tw/" target="_blank" class="btn btn-lg eng-btn glass text-white border-white/20">
          前往 iService 計畫申請
        </a>
      </div>
    </div>
  </section>
</template>
