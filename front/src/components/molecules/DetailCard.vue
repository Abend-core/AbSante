<script setup lang="ts">
import type { Praticien, Etablissement } from '../../composables/useEtablissements'

defineProps<{
  detail: { nom: string; n: number; praticiens?: Praticien[]; etablissements?: Etablissement[] } | null
  unit: string
  hint: string
}>()
defineEmits<{ 'select-etablissement': [etablissement: Etablissement] }>()
</script>

<template>
  <div class="detail-card" :class="{ 'detail-card--empty': !detail }">
    <template v-if="detail">
      <div class="detail-card__header">
        <strong>{{ detail.nom }}</strong>
        <span>{{ detail.n }} {{ unit }}</span>
      </div>
      <ul v-if="detail.praticiens?.length" class="detail-card__praticiens">
        <li v-for="p in detail.praticiens" :key="`${p.nom}-${p.prenom}-${p.profession}`">
          {{ p.prenom }} {{ p.nom }} <span class="detail-card__profession">— {{ p.profession }}</span>
        </li>
      </ul>
      <ul v-else-if="detail.etablissements?.length" class="detail-card__etablissements">
        <li v-for="etab in detail.etablissements" :key="etab.nom">
          <button type="button" @click="$emit('select-etablissement', etab)">
            {{ etab.nom }} <span class="detail-card__profession">({{ etab.praticiens.length }} praticien(s))</span>
          </button>
        </li>
      </ul>
    </template>
    <span v-else class="detail-card__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.detail-card {
  margin-top: 0.75rem;
  padding: 0.6rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  min-height: 1.4rem;
  max-height: 260px;
  overflow-y: auto;
}

.detail-card--empty {
  color: #999;
}

.detail-card__header {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.detail-card__hint {
  font-size: 0.85rem;
}

.detail-card__praticiens {
  margin: 0.4rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.82rem;
  color: #444;
}

.detail-card__profession {
  color: #888;
}

.detail-card__etablissements {
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.82rem;
}

.detail-card__etablissements button {
  display: block;
  width: 100%;
  padding: 0.3rem 0.4rem;
  border: none;
  background: none;
  text-align: left;
  color: #1e5fa8;
  cursor: pointer;
  border-radius: 4px;
}

.detail-card__etablissements button:hover {
  background: #eef3f9;
  text-decoration: underline;
}
</style>
