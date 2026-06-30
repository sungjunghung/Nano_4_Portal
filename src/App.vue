<script setup>
import { useSmoothScroll } from './composables/useSmoothScroll'
import BackgroundGeometry from './components/BackgroundGeometry.vue'
import SiteNav from './components/SiteNav.vue'
import HeroSection from './components/HeroSection.vue'
import CoreValues from './components/CoreValues.vue'
import UseCases from './components/UseCases.vue'
import OperationVideo from './components/OperationVideo.vue'
import OmniversePortal from './components/OmniversePortal.vue'
import JanusModal from './components/JanusModal.vue'

useSmoothScroll()
</script>

<template>
  <BackgroundGeometry />
  <SiteNav />
  <HeroSection />
  <CoreValues />
  <UseCases />
  <OperationVideo />
  <OmniversePortal />
  <JanusModal />
</template>
