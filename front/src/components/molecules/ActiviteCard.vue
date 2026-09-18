<script setup lang="ts">
import InfoRow from '../atoms/InfoRow.vue'
import type { Activite } from '../../types/fiche'
import { formatPhone, formatSiret } from '../../utils/format'

defineProps<{
  activite: Activite
  /** Position dans la liste (1-based) et taille de la liste, pour titrer « Activité 2 sur 3 ». */
  index: number
  total: number
}>()
</script>

<template>
  <article class="activite-card">
    <h3 class="activite-card__title">
      <span>{{ activite.profession ?? 'Profession non renseignée' }}</span>
      <span v-if="total > 1" class="activite-card__rank">Activité {{ index }} sur {{ total }}</span>
    </h3>

    <dl class="activite-card__list">
      <InfoRow label="Profession" :value="activite.profession" />
      <InfoRow label="Catégorie professionnelle" :value="activite.categorie" />
      <InfoRow label="Mode d'exercice" :value="activite.modeExercice" />
      <InfoRow label="Secteur d'activité" :value="activite.secteurActivite" />
      <InfoRow label="Rôle" :value="activite.role" />
      <InfoRow label="Genre d'activité" :value="activite.genreActivite" />
      <InfoRow label="Section (tableau des pharmaciens)" :value="activite.sectionPharmaciens" />
    </dl>

    <h4 class="activite-card__subtitle">Lieu d'exercice</h4>
    <dl v-if="activite.structure" class="activite-card__list" data-testid="structure">
      <InfoRow label="Raison sociale" :value="activite.structure.raisonSociale" />
      <InfoRow label="Enseigne" :value="activite.structure.enseigne" />
      <InfoRow label="Adresse" :value="activite.structure.voie" />
      <InfoRow label="Complément (destinataire)" :value="activite.structure.complementDestinataire" />
      <InfoRow label="Complément (point géographique)" :value="activite.structure.complementPointGeographique" />
      <InfoRow label="Mention de distribution" :value="activite.structure.mentionDistribution" />
      <InfoRow label="Code postal" :value="activite.structure.codePostal" />
      <InfoRow label="Commune" :value="activite.structure.commune" />
      <InfoRow label="Bureau cedex" :value="activite.structure.bureauCedex" />
      <InfoRow label="Département" :value="activite.structure.departement" />
      <InfoRow label="Pays" :value="activite.structure.pays" />
      <InfoRow label="Téléphone" :value="activite.structure.telephone">
        <a :href="`tel:${activite.structure.telephone?.replace(/\s/g, '')}`">{{ formatPhone(activite.structure.telephone ?? '') }}</a>
      </InfoRow>
      <InfoRow label="Téléphone 2" :value="activite.structure.telephone2">
        <a :href="`tel:${activite.structure.telephone2?.replace(/\s/g, '')}`">{{ formatPhone(activite.structure.telephone2 ?? '') }}</a>
      </InfoRow>
      <InfoRow label="Télécopie" :value="activite.structure.telecopie">{{ formatPhone(activite.structure.telecopie ?? '') }}</InfoRow>
      <InfoRow label="E-mail" :value="activite.structure.email">
        <a :href="`mailto:${activite.structure.email}`">{{ activite.structure.email }}</a>
      </InfoRow>
      <InfoRow label="SIRET" :value="activite.structure.siret">{{ formatSiret(activite.structure.siret ?? '') }}</InfoRow>
      <InfoRow label="SIREN" :value="activite.structure.siren">{{ formatSiret(activite.structure.siren ?? '') }}</InfoRow>
      <InfoRow label="FINESS (site)" :value="activite.structure.finessSite" />
      <InfoRow label="FINESS (établissement juridique)" :value="activite.structure.finessJuridique" />
    </dl>
    <p v-else class="activite-card__no-structure" data-missing>
      Non renseigné — le RPPS n'indique aucun lieu d'exercice pour cette activité.
    </p>
  </article>
</template>

<style scoped>
.activite-card {
  margin-bottom: 1rem;
  padding: 0.9rem 1.1rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.activite-card__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.3rem 1rem;
  margin: 0 0 0.4rem;
  font-size: 1rem;
  color: var(--text-h);
}

.activite-card__rank {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--text);
}

.activite-card__subtitle {
  margin: 1rem 0 0.3rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text);
}

.activite-card__list {
  margin: 0;
}

.activite-card__no-structure {
  margin: 0;
  font-size: 0.9rem;
  font-style: italic;
  opacity: 0.75;
}

a {
  color: inherit;
}
</style>
