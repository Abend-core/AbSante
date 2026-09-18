<script setup lang="ts">
defineProps<{ size?: number }>()
</script>

<!-- Repère d'AbSante : un tracé de pouls (la santé) qui se termine sur un point corail
     (les établissements sur la carte). Décoratif : le nom « AbSante » est écrit à côté. -->
<template>
  <svg class="brand-mark" :width="size ?? 34" :height="size ?? 34" viewBox="0 0 34 34" aria-hidden="true" focusable="false">
    <rect width="34" height="34" rx="10" fill="#1e88e5" />
    <path d="M5 18h6l3-8 5 15 3-7h4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="29" cy="18" r="2.6" fill="#e5533d" stroke="#fff" stroke-width="1.4" />
  </svg>
</template>

<style scoped>
.brand-mark {
  flex: none;
  display: block;
}
</style>
