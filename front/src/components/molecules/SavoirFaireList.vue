<script setup lang="ts">
import { computed } from 'vue'
import type { SavoirFaire } from '../../types/fiche'

const props = defineProps<{ items: SavoirFaire[] }>()

/** Regroupées par type (« Spécialité ordinale », « Compétence métier »...), dans l'ordre d'apparition. */
const groups = computed(() => {
  const byType = new Map<string, SavoirFaire[]>()
  for (const item of props.items) {
    const type = item.type ?? 'Autre'
    byType.set(type, [...(byType.get(type) ?? []), item])
  }
  return [...byType].map(([type, list]) => ({ type, list }))
})
</script>

<template>
  <div v-if="items.length" class="savoir-faire">
    <div v-for="group in groups" :key="group.type" class="savoir-faire__group">
      <h3 class="savoir-faire__type">{{ group.type }}</h3>
      <ul class="savoir-faire__chips">
        <li v-for="(item, i) in group.list" :key="`${item.code}-${i}`" class="savoir-faire__chip">
          <span v-if="item.libelle">{{ item.libelle }}</span>
          <span v-else class="savoir-faire__missing" data-missing>Libellé non renseigné</span>
          <span v-if="item.code" class="savoir-faire__code">{{ item.code }}</span>
          <span v-if="item.profession" class="savoir-faire__profession">— {{ item.profession }}</span>
        </li>
      </ul>
    </div>
  </div>
  <p v-else class="savoir-faire__empty" data-missing>Non renseigné — aucune spécialité ni compétence n'est enregistrée au RPPS pour ce praticien.</p>
</template>

<style scoped>
.savoir-faire__group + .savoir-faire__group {
  margin-top: 1rem;
}

.savoir-faire__type {
  margin: 0 0 0.5rem;
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
}

.savoir-faire__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.savoir-faire__chip {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.45rem;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  background: var(--brand-soft);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-h);
}

.savoir-faire__code,
.savoir-faire__profession {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--text);
}

.savoir-faire__missing {
  font-style: italic;
  color: var(--muted);
}

.savoir-faire__empty {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
  font-size: 0.9rem;
  font-style: italic;
  color: var(--muted);
}
</style>
