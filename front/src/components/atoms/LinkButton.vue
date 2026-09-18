<script setup lang="ts">
</script>

<!-- Bouton d'apparence « lien » : il déclenche une action (ouvrir un panneau) au lieu de naviguer. -->
<template>
  <button type="button" class="link-button"><slot /></button>
</template>

<style scoped>
.link-button {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(234, 242, 251, 0.35);
  text-underline-offset: 4px;
  cursor: pointer;
}

.link-button:hover {
  text-decoration-color: currentColor;
}

.link-button:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
  border-radius: 2px;
}
</style>
