<script setup lang="ts">
defineProps<{ href: string }>()
</script>

<!-- Lien qui s'ouvre dans un nouvel onglet sans donner à la page cible accès à la nôtre. -->
<template>
  <a :href="href" target="_blank" rel="noopener noreferrer"><slot /></a>
</template>
