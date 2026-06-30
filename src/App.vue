<script setup>
import { useSmoothScroll } from './composables/useSmoothScroll'
import BackgroundGeometry from './components/BackgroundGeometry.vue'
import SiteNav from './components/SiteNav.vue'
import HeroSection from './components/HeroSection.vue'
import CoreValues from './components/CoreValues.vue'
import PerformanceChart from './components/PerformanceChart.vue'
import TechSpecs from './components/TechSpecs.vue'
import UseCases from './components/UseCases.vue'
import OmniversePortal from './components/OmniversePortal.vue'

useSmoothScroll()
</script>

<template>
  <BackgroundGeometry />
  <SiteNav />
  <HeroSection />
  <CoreValues />
  <PerformanceChart />
  <TechSpecs />
  <UseCases />
  <OmniversePortal />
</template>
