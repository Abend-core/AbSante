<script setup lang="ts">
defineProps<{
  label: string
  /** `null` / vide -> « Non renseigné » affiché clairement (jamais une ligne vide ou masquée). */
  value: string | null | undefined
}>()
</script>

<template>
  <div class="info-row">
    <dt class="info-row__label">{{ label }}</dt>
    <dd class="info-row__value">
      <template v-if="value">
        <slot>{{ value }}</slot>
      </template>
      <span v-else class="info-row__missing" data-missing>Non renseigné</span>
    </dd>
  </div>
</template>

<style scoped>
.info-row {
  display: grid;
  grid-template-columns: minmax(8rem, 12rem) 1fr;
  gap: 0.5rem 1rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}

.info-row__label {
  color: var(--text);
}

.info-row__value {
  margin: 0;
  color: var(--text-h);
  overflow-wrap: anywhere;
}

.info-row__missing {
  color: var(--text);
  font-style: italic;
  opacity: 0.75;
}

@media (max-width: 560px) {
  .info-row {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
}
</style>
