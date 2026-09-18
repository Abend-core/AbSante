<script setup lang="ts">
import SiteFooter from './components/organisms/SiteFooter.vue'
import SiteHeader from './components/organisms/SiteHeader.vue'
</script>

<template>
  <div class="app-shell">
    <SiteHeader />
    <main class="app-shell__main">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
/* Le pied de page reste en bas de fenêtre même quand la page est courte (fiche introuvable...). */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-shell__main {
  flex: 1;
}
</style>
