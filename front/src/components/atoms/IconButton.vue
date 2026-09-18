<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './AppIcon.vue'

/** Bouton rond sans texte : `label` est obligatoire, c'est son nom pour les lecteurs d'écran. */
defineProps<{ icon: IconName; label: string; size?: number }>()
</script>

<template>
  <button type="button" class="icon-button" :aria-label="label" :title="label">
    <AppIcon :name="icon" :size="size ?? 18" />
  </button>
</template>

<style scoped>
.icon-button {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.icon-button:hover {
  background: var(--brand-soft);
  color: var(--brand);
}
</style>
