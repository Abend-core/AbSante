<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../atoms/AppIcon.vue'
import PillBadge from '../atoms/PillBadge.vue'
import CopyButton from '../atoms/CopyButton.vue'
import type { Fiche } from '../../types/fiche'
import { displayName } from '../../utils/format'

const props = defineProps<{ fiche: Fiche }>()

const name = computed(() => displayName(props.fiche))

const professions = computed(() => [...new Set(props.fiche.activites.map((a) => a.profession).filter((p): p is string => !!p))])

/** Communes d'exercice distinctes (trois au plus : le détail complet est plus bas). */
const places = computed(() => {
  const labels = props.fiche.activites
    .map((a) => a.structure)
    .filter((s) => s?.commune)
    .map((s) => (s!.codePostal ? `${s!.commune} (${s!.codePostal})` : s!.commune!))
  return [...new Set(labels)].slice(0, 3)
})

const updated = computed(() =>
  props.fiche.misAJourLe ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(props.fiche.misAJourLe)) : null,
)
</script>

<template>
  <header class="fiche-header">
    <div class="container">
      <h1>{{ name }}</h1>
      <ul v-if="professions.length" class="fiche-header__professions">
        <li v-for="p in professions" :key="p"><PillBadge variant="glass">{{ p }}</PillBadge></li>
      </ul>
      <ul v-if="places.length" class="fiche-header__places">
        <li v-for="place in places" :key="place"><AppIcon name="pin" :size="14" />{{ place }}</li>
      </ul>
      <p class="fiche-header__meta">
        <span class="fiche-header__id">Identifiant RPPS {{ fiche.id }}<CopyButton :text="fiche.id" label="l'identifiant RPPS" /></span>
        <span v-if="updated">Fiche mise à jour le {{ updated }}</span>
      </p>
    </div>
  </header>
</template>

<style scoped>
.fiche-header {
  padding-block: 2.2rem 2.4rem;
  background: var(--navy);
  color: var(--on-navy);
}

.fiche-header h1 {
  font-size: clamp(1.7rem, 4vw, 2.5rem);
  color: #fff;
  overflow-wrap: anywhere;
}

.fiche-header ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}

.fiche-header__places li {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--on-navy-muted);
}

.fiche-header__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 1.25rem;
  margin-top: 0.9rem;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  color: var(--on-navy-muted);
}

.fiche-header__id {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

/* Bouton de copie sur fond sombre. */
.fiche-header__id :deep(.copy-button__button) {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #cfe6ff;
}

.fiche-header__id :deep(.copy-button__button:hover) {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.fiche-header__id :deep(.copy-button__button--copied) {
  border-color: #81c784;
  background: rgba(129, 199, 132, 0.2);
  color: #a5d6a7;
}
</style>
