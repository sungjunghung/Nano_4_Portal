<template>
  <nav class="navbar fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 border-t-2 border-t-accent/70">
    <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center w-full">
      <div class="flex items-center space-x-3">
        <div class="flex flex-col">
          <span class="text-2xl font-bold tracking-tight text-slate-900 leading-none uppercase">晶創 26</span>
          <span class="text-[10px] font-semibold text-primary-600 tracking-widest uppercase mt-1">Nano 4 Portal</span>
        </div>
      </div>
      <div class="hidden md:flex items-center space-x-10 font-medium">
        <a href="#vision"
          class="relative text-slate-600 hover:text-primary-600 text-sm transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-primary-600 after:transition-all hover:after:w-full">核心價值</a>
        <a href="#specs"
          class="relative text-slate-600 hover:text-primary-600 text-sm transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-primary-600 after:transition-all hover:after:w-full">技術優勢</a>
        <a href="#cases"
          class="relative text-slate-600 hover:text-primary-600 text-sm transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-primary-600 after:transition-all hover:after:w-full">應用領域</a>
        <a href="https://iservice.nchc.org.tw/" target="_blank" class="btn btn-neutral eng-btn text-sm">
          歡迎各界申請使用計畫
        </a>
      </div>
      <button class="btn btn-ghost btn-square md:hidden text-slate-900">
        <div class="flex flex-col items-end gap-1.5">
          <div class="w-6 h-0.5 bg-slate-900"></div>
          <div class="w-6 h-0.5 bg-slate-900"></div>
          <div class="w-4 h-0.5 bg-slate-900"></div>
        </div>
      </button>
    </div>
  </nav>
</template>
