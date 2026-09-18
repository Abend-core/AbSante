<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../atoms/AppIcon.vue'
import type { Fiche } from '../../types/fiche'
import { displayName } from '../../utils/format'

const props = defineProps<{ fiche: Fiche }>()

const name = computed(() => displayName(props.fiche))

/** Initiales pour l'avatar (prénom + nom) ; « ? » quand le RPPS n'en donne aucune. */
const initials = computed(() => {
  const letters = [props.fiche.prenom, props.fiche.nom].map((part) => part?.trim().charAt(0).toUpperCase() ?? '')
  return letters.join('') || '?'
})

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
      <RouterLink to="/" class="fiche-header__back">
        <AppIcon name="arrow-left" :size="16" />
        Retour à la carte
      </RouterLink>

      <div class="fiche-header__main">
        <div class="fiche-header__avatar" aria-hidden="true">{{ initials }}</div>
        <div class="fiche-header__identity">
          <h1>{{ name }}</h1>
          <ul v-if="professions.length" class="fiche-header__professions">
            <li v-for="p in professions" :key="p">{{ p }}</li>
          </ul>
          <ul v-if="places.length" class="fiche-header__places">
            <li v-for="place in places" :key="place"><AppIcon name="pin" :size="14" />{{ place }}</li>
          </ul>
          <p class="fiche-header__meta">
            <span>Identifiant RPPS {{ fiche.id }}</span>
            <span v-if="updated">Fiche mise à jour le {{ updated }}</span>
          </p>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.fiche-header {
  position: relative;
  overflow: hidden;
  padding-block: 1.1rem 2.4rem;
  background: var(--navy);
  color: var(--on-navy);
}

.fiche-header__back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.4rem;
  font-size: 0.88rem;
  color: var(--on-navy-muted);
  text-decoration: none;
}

.fiche-header__back:hover {
  color: #fff;
}

.fiche-header a:focus-visible {
  outline-color: #fff;
}

.fiche-header__main {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.fiche-header__avatar {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  flex: none;
  border: 3px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  background: var(--brand);
  font-family: var(--display);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #fff;
}

.fiche-header__identity {
  min-width: 0;
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
  margin: 0.7rem 0 0;
  padding: 0;
  list-style: none;
}

.fiche-header__professions li {
  padding: 0.2rem 0.8rem;
  border-radius: 999px;
  background: rgba(30, 136, 229, 0.3);
  font-size: 0.85rem;
  font-weight: 600;
  color: #cfe6ff;
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
  gap: 0.2rem 1.25rem;
  margin-top: 0.85rem;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  color: var(--on-navy-muted);
}

@media (max-width: 560px) {
  .fiche-header__main {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .fiche-header__avatar {
    width: 64px;
    height: 64px;
    font-size: 1.5rem;
  }
}
</style>
