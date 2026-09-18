<script setup lang="ts">
defineProps<{
  title: string
  /** Nombre d'éléments listés (affiché à côté du titre quand fourni). */
  count?: number
}>()
</script>

<template>
  <section class="fiche-section">
    <h2 class="fiche-section__title">
      {{ title }}
      <span v-if="count !== undefined" class="fiche-section__count">{{ count }}</span>
    </h2>
    <slot />
  </section>
</template>

<style scoped>
.fiche-section {
  margin-top: 1.75rem;
}

.fiche-section__title {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 0 0 0.6rem;
  font-size: 1.1rem;
}

.fiche-section__count {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--text);
}
</style>
