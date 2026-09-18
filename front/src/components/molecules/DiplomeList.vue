<script setup lang="ts">
import InfoRow from '../atoms/InfoRow.vue'
import type { Diplome } from '../../types/fiche'

defineProps<{ items: Diplome[] }>()
</script>

<template>
  <div v-if="items.length">
    <article v-for="(d, i) in items" :key="`${d.code}-${i}`" class="diplome">
      <dl>
        <InfoRow label="Diplôme" :value="d.libelle" />
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
.diplome {
  margin-bottom: 0.8rem;
  padding: 0.5rem 1.1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
}

dl {
  margin: 0;
}

.diplome__empty {
  margin: 0;
  font-size: 0.9rem;
  font-style: italic;
  opacity: 0.75;
}
</style>
