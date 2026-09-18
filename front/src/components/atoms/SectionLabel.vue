<script setup lang="ts">
withDefaults(defineProps<{ as?: 'h3' | 'h4' | 'p' }>(), { as: 'h4' })
</script>

<!-- Intertitre discret en petites capitales, prolongé d'un filet (« Exercice », « Lieu d'exercice »). -->
<template>
  <component :is="as" class="section-label"><slot /></component>
</template>

<style scoped>
.section-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.4rem 0 0.85rem;
  font-family: var(--sans);
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text);
}

.section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}
</style>
