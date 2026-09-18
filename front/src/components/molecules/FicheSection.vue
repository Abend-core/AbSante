<script setup lang="ts">
defineProps<{
  title: string
  /** Nombre d'éléments listés (affiché à côté du titre quand fourni). */
  count?: number
  /** Sans cadre : le contenu (cartes d'activité, de diplôme...) porte déjà le sien. */
  flat?: boolean
}>()
</script>

<template>
  <section class="fiche-section" :class="{ 'fiche-section--flat': flat }">
    <h2 class="fiche-section__title">
      {{ title }}
      <span v-if="count !== undefined" class="fiche-section__count">{{ count }}</span>
    </h2>
    <slot />
  </section>
</template>

<style scoped>
.fiche-section:not(.fiche-section--flat) {
  padding: 1.15rem 1.3rem 1.3rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(12, 35, 64, 0.04);
}

.fiche-section__title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 0.9rem;
  font-size: 1.15rem;
}

.fiche-section__count {
  display: inline-grid;
  place-items: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding-inline: 0.4rem;
  border-radius: 999px;
  background: var(--brand-soft);
  font-family: var(--sans);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--brand);
}
</style>
