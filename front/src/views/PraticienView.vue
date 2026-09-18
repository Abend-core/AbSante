<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import DataFreshness from '../components/atoms/DataFreshness.vue'
import ActiviteCard from '../components/molecules/ActiviteCard.vue'
import DiplomeList from '../components/molecules/DiplomeList.vue'
import FicheIdentite from '../components/molecules/FicheIdentite.vue'
import FicheSection from '../components/molecules/FicheSection.vue'
import SavoirFaireList from '../components/molecules/SavoirFaireList.vue'
import { usePraticien } from '../composables/usePraticien'
import { displayName } from '../utils/format'

const route = useRoute()
const { state, reload } = usePraticien(() => String(route.params.id))

const fiche = computed(() => (state.value.status === 'ready' ? state.value.fiche : null))
const title = computed(() => (fiche.value ? displayName(fiche.value) : null))

watchEffect(() => {
  document.title = title.value ? `${title.value} — AbSante` : 'Fiche praticien — AbSante'
})
</script>

<template>
  <article class="praticien-view">
    <p v-if="state.status === 'loading'" class="praticien-view__status" role="status">Chargement de la fiche…</p>

    <div v-else-if="state.status === 'not-found'" class="praticien-view__status" role="alert">
      <h2>Praticien introuvable</h2>
      <p>Aucun praticien ne correspond à l'identifiant « {{ route.params.id }} » dans le RPPS.</p>
    </div>

    <div v-else-if="state.status === 'unavailable' || state.status === 'error'" class="praticien-view__status" role="alert">
      <h2>{{ state.status === 'unavailable' ? 'Service momentanément indisponible' : 'La fiche n\'a pas pu être chargée' }}</h2>
      <p>Le détail des praticiens ne répond pas pour le moment. Vos informations ne sont pas perdues : réessayez dans un instant.</p>
      <button type="button" class="praticien-view__retry" @click="reload">Réessayer</button>
    </div>

    <template v-else-if="fiche">
      <header class="praticien-view__header">
        <h2>{{ title }}</h2>
        <p class="praticien-view__id">Identifiant RPPS {{ fiche.id }}</p>
      </header>

      <FicheSection title="Identité"><FicheIdentite :fiche="fiche" /></FicheSection>

      <FicheSection title="Spécialités et compétences" :count="fiche.savoirFaire.length">
        <SavoirFaireList :items="fiche.savoirFaire" />
      </FicheSection>

      <FicheSection title="Activités" :count="fiche.activites.length">
        <ActiviteCard v-for="(a, i) in fiche.activites" :key="i" :activite="a" :index="i + 1" :total="fiche.activites.length" />
        <p v-if="!fiche.activites.length" class="praticien-view__none" data-missing>Non renseigné — aucune activité n'est enregistrée au RPPS pour ce praticien.</p>
      </FicheSection>

      <FicheSection title="Diplômes et autorisations d'exercice" :count="fiche.diplomes.length">
        <DiplomeList :items="fiche.diplomes" />
      </FicheSection>

      <footer class="praticien-view__source">
        <p>
          Source : Annuaire Santé — RPPS (Agence du Numérique en Santé), données en libre accès. Les mentions
          « Non renseigné » signalent une information absente du répertoire, pas une information cachée.
        </p>
        <DataFreshness :updated-at="fiche.misAJourLe" />
      </footer>
    </template>
  </article>
</template>

<style scoped>
.praticien-view {
  max-width: 820px;
  padding-bottom: 2rem;
}

.praticien-view__header h2 {
  margin: 0.5rem 0 0.2rem;
  font-size: 1.7rem;
}

.praticien-view__id {
  color: var(--text);
  font-size: 0.9rem;
}

.praticien-view__status {
  margin-top: 2rem;
}

.praticien-view__retry {
  margin-top: 0.6rem;
  padding: 0.4rem 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-h);
  cursor: pointer;
}

.praticien-view__none {
  font-size: 0.9rem;
  font-style: italic;
  opacity: 0.75;
}

.praticien-view__source {
  margin-top: 2rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--border);
  font-size: 0.8rem;
  color: var(--text);
}

.praticien-view__source p {
  margin-bottom: 0.4rem;
}
</style>
