<script setup lang="ts">
import HeroIntro from '../components/molecules/HeroIntro.vue'
import LeafletFranceMap from '../components/prototypes/LeafletFranceMap.vue'
</script>

<template>
  <HeroIntro />
  <section class="container map-panel-wrap" aria-label="Carte interactive">
    <div class="map-panel">
      <LeafletFranceMap />
    </div>
  </section>
</template>

<style scoped>
/* Le panneau de la carte chevauche le bas de l'en-tête : la carte devient le sujet de la page. */
.map-panel-wrap {
  position: relative;
  margin-top: -4.25rem;
}

.map-panel {
  padding: 1.1rem 1.25rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

@media (max-width: 640px) {
  .map-panel {
    padding: 0.8rem;
    border-radius: 14px;
  }
}
</style>
