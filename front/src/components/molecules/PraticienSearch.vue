<script setup lang="ts">
import { computed, ref } from 'vue'
import { RECHERCHE_MIN_CARACTERES, useRecherche } from '../../composables/useRecherche'
import type { ResultatRecherche } from '../../composables/useRecherche'
import { displayName } from '../../utils/format'

const { query, resultats, tronque, status } = useRecherche()
const open = ref(false)

const visible = computed(() => open.value && query.value.trim().length >= RECHERCHE_MIN_CARACTERES)

const nom = (r: ResultatRecherche) => displayName({ civiliteExercice: r.civiliteExercice, civilite: null, prenom: r.prenom, nom: r.nom })
/** « Médecin · Lyon (69001) » : de quoi distinguer deux homonymes avant d'ouvrir la fiche. */
const details = (r: ResultatRecherche) =>
  [r.professions.join(', '), [r.commune, r.codePostal ? `(${r.codePostal})` : null].filter(Boolean).join(' ')].filter(Boolean).join(' · ')

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    query.value = ''
    open.value = false
  }
}
</script>

<template>
  <div class="praticien-search">
    <input
      v-model="query"
      type="search"
      placeholder="Rechercher un praticien…"
      aria-label="Rechercher un praticien par nom"
      title="Nom et prénom, dans n'importe quel ordre (ex : « dupont marie »). Ouvre sa fiche."
      autocomplete="off"
      @focus="open = true"
      @blur="open = false"
      @keydown="onKeydown"
    />
    <!-- mousedown.prevent : garde le focus dans le champ, sinon le blur ferme la liste avant que le clic sur un lien n'aboutisse. -->
    <div v-if="visible" class="praticien-search__panel" aria-live="polite" @mousedown.prevent>
      <p v-if="status === 'loading'" class="praticien-search__message">Recherche…</p>
      <p v-else-if="status === 'error'" class="praticien-search__message">Recherche momentanément indisponible, réessayez dans un instant.</p>
      <p v-else-if="status === 'done' && resultats.length === 0" class="praticien-search__message">Aucun praticien ne correspond.</p>
      <template v-else-if="status === 'done'">
        <ul class="praticien-search__results">
          <li v-for="r in resultats" :key="r.id">
            <!-- Nouvel onglet : la carte garde sa position et son zoom. -->
            <a :href="`/praticien/${r.id}`" target="_blank" rel="noopener">
              <strong>{{ nom(r) }}</strong>
              <span>{{ details(r) }}</span>
            </a>
          </li>
        </ul>
        <p v-if="tronque" class="praticien-search__message">Plus de {{ resultats.length }} résultats : précisez le nom ou le prénom.</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.praticien-search {
  position: relative;
}

.praticien-search input {
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-h);
  min-width: min(240px, 100%);
  max-width: 100%;
  font-size: 0.9rem;
}

.praticien-search input:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 1px;
  border-color: var(--brand);
}

.praticien-search__panel {
  position: absolute;
  z-index: 1000;
  top: calc(100% + 2px);
  left: 0;
  width: max(100%, 320px);
  max-width: min(420px, calc(100vw - 2rem));
  max-height: 320px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(12, 35, 64, 0.14);
}

.praticien-search__results {
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
}

.praticien-search__results a {
  display: block;
  padding: 0.4rem 0.75rem;
  color: var(--text-h);
  text-decoration: none;
  font-size: 0.85rem;
}

.praticien-search__results a:hover,
.praticien-search__results a:focus-visible {
  background: var(--brand-soft);
}

.praticien-search__results span {
  display: block;
  color: var(--muted);
  font-size: 0.78rem;
}

.praticien-search__message {
  margin: 0;
  padding: 0.55rem 0.75rem;
  color: var(--muted);
  font-size: 0.82rem;
}
</style>
