<script setup lang="ts">
defineProps<{
  label: string
  /** `null` / vide -> « Non renseigné » affiché clairement (jamais une ligne vide ou masquée). */
  value: string | null | undefined
  /** Occupe toute la largeur de la grille (adresse, libellés longs). */
  wide?: boolean
}>()
</script>

<template>
  <div class="info-row" :class="{ 'info-row--wide': wide }">
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
  min-width: 0;
}

.info-row--wide {
  grid-column: 1 / -1;
}

.info-row__label {
  margin-bottom: 0.2rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
}

.info-row__value {
  margin: 0;
  font-size: 0.97rem;
  color: var(--text-h);
  overflow-wrap: anywhere;
}

.info-row__value :deep(a) {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--brand);
  font-weight: 500;
  text-decoration: none;
}

.info-row__value :deep(a:hover) {
  text-decoration: underline;
}

/* Une information absente du RPPS doit se voir sans jamais ressembler à une valeur. */
.info-row__missing {
  display: inline-block;
  padding: 0.05rem 0.6rem;
  border: 1px dashed var(--border-strong);
  border-radius: 999px;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--muted);
}
</style>
