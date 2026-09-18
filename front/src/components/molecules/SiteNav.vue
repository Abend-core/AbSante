<script setup lang="ts">
import NavLink from '../atoms/NavLink.vue'
</script>

<template>
  <nav class="site-nav" aria-label="Navigation principale">
    <NavLink to="/" icon="pin">Carte</NavLink>
  </nav>
</template>

<style scoped>
.site-nav {
  display: flex;
  gap: 0.25rem;
}

/* Très petit écran : le logo renvoie déjà à l'accueil, la place revient au bouton d'installation. */
@media (max-width: 380px) {
  .site-nav {
    display: none;
  }
}
</style>
