<script setup lang="ts">
import type { Diplome } from '../../types/fiche'
import InfoRow from './InfoRow.vue'

defineProps<{ items: Diplome[] }>()
</script>

<template>
  <div v-if="items.length" class="diplomes">
    <article v-for="(d, i) in items" :key="`${d.code}-${i}`" class="diplome">
      <dl class="fields">
        <InfoRow label="Diplôme" :value="d.libelle" wide />
        <InfoRow label="Code du diplôme" :value="d.code" />
        <InfoRow label="Type de diplôme" :value="d.type" />
        <InfoRow label="Type d'autorisation" :value="d.typeAutorisation" />
        <InfoRow label="Discipline d'autorisation" :value="d.disciplineAutorisation" />
      </dl>
    </article>
  </div>
  <p v-else class="diplome__empty" data-missing>Non renseigné — aucun diplôme ni autorisation n'est enregistré au RPPS pour ce praticien.</p>
</template>

<style scoped>
.diplomes {
  display: grid;
  gap: 0.9rem;
}

.diplome {
  padding: 1.05rem 1.3rem 1.15rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(12, 35, 64, 0.04);
}

.diplome :deep(.info-row--wide .info-row__value) {
  font-family: var(--display);
  font-size: 1.05rem;
  font-weight: 600;
}

.diplome__empty {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
  font-size: 0.9rem;
  font-style: italic;
  color: var(--muted);
}
</style>
