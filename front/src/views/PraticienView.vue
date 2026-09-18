<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import ActionButton from '../components/atoms/ActionButton.vue'
import ActiviteCard from '../components/molecules/ActiviteCard.vue'
import DiplomeList from '../components/molecules/DiplomeList.vue'
import FicheHeader from '../components/molecules/FicheHeader.vue'
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
    <div v-if="state.status === 'loading'" class="container praticien-view__state" role="status">
      <p>Chargement de la fiche…</p>
    </div>

    <div v-else-if="state.status === 'not-found'" class="container praticien-view__state" role="alert">
      <h1>Praticien introuvable</h1>
      <p>Aucun praticien ne correspond à l'identifiant « {{ route.params.id }} » dans le RPPS.</p>
    </div>

    <div v-else-if="state.status === 'unavailable' || state.status === 'error'" class="container praticien-view__state" role="alert">
      <h1>{{ state.status === 'unavailable' ? 'Service momentanément indisponible' : 'La fiche n\'a pas pu être chargée' }}</h1>
      <p>Le détail des praticiens ne répond pas pour le moment. Vos informations ne sont pas perdues : réessayez dans un instant.</p>
      <ActionButton variant="outline" class="praticien-view__retry" @click="reload">Réessayer</ActionButton>
    </div>

    <template v-else-if="fiche">
      <FicheHeader :fiche="fiche" />

      <div class="container praticien-view__body">
        <div class="praticien-view__main">
          <FicheSection title="Activités" :count="fiche.activites.length" flat>
            <div class="praticien-view__stack">
              <ActiviteCard v-for="(a, i) in fiche.activites" :key="i" :activite="a" :index="i + 1" :total="fiche.activites.length" />
            </div>
            <p v-if="!fiche.activites.length" class="praticien-view__none" data-missing>Non renseigné — aucune activité n'est enregistrée au RPPS pour ce praticien.</p>
          </FicheSection>

          <FicheSection title="Diplômes et autorisations d'exercice" :count="fiche.diplomes.length" flat>
            <DiplomeList :items="fiche.diplomes" />
          </FicheSection>
        </div>

        <aside class="praticien-view__aside">
          <FicheSection title="Identité"><FicheIdentite :fiche="fiche" /></FicheSection>
          <FicheSection title="Spécialités et compétences" :count="fiche.savoirFaire.length">
            <SavoirFaireList :items="fiche.savoirFaire" />
          </FicheSection>
        </aside>
      </div>
    </template>
  </article>
</template>

<style scoped>
.praticien-view__state {
  padding-block: 3rem;
}

.praticien-view__state h1 {
  margin-bottom: 0.6rem;
  font-size: 1.8rem;
}

.praticien-view__retry {
  margin-top: 1rem;
}

.praticien-view__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 1.5rem;
  align-items: start;
  padding-block: 2rem 0;
}

.praticien-view__main {
  display: grid;
  gap: 2rem;
  min-width: 0;
}

.praticien-view__stack {
  display: grid;
  gap: 1.1rem;
}

.praticien-view__aside {
  display: grid;
  gap: 1.1rem;
}

.praticien-view__main :deep(.fiche-section__title) {
  margin-top: 0;
  padding-top: 0.15rem;
}

.praticien-view__none {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
  font-size: 0.9rem;
  font-style: italic;
  color: var(--muted);
}

@media (max-width: 960px) {
  .praticien-view__body {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Sur mobile, l'identité et les spécialités passent avant le détail des activités. */
  .praticien-view__aside {
    order: -1;
  }
}
</style>
