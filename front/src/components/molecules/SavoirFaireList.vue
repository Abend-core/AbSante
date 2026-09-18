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
      <ul>
        <li v-for="(item, i) in group.list" :key="`${item.code}-${i}`">
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
.savoir-faire__type {
  margin: 0.6rem 0 0.2rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text);
}

ul {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--text-h);
  font-size: 0.9rem;
}

li {
  margin: 0.15rem 0;
}

.savoir-faire__code,
.savoir-faire__profession {
  margin-left: 0.5rem;
  font-size: 0.8rem;
  color: var(--text);
}

.savoir-faire__missing,
.savoir-faire__empty {
  font-style: italic;
  opacity: 0.75;
}

.savoir-faire__empty {
  margin: 0;
  font-size: 0.9rem;
}
</style>
