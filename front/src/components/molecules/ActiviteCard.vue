<script setup lang="ts">
import AppIcon from '../atoms/AppIcon.vue'
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
    <header class="activite-card__head">
      <div>
        <h3 class="activite-card__title">{{ activite.profession ?? 'Profession non renseignée' }}</h3>
        <p v-if="activite.modeExercice || activite.secteurActivite" class="activite-card__badges">
          <span v-if="activite.modeExercice" class="activite-card__badge">{{ activite.modeExercice }}</span>
          <span v-if="activite.secteurActivite" class="activite-card__badge activite-card__badge--soft">{{ activite.secteurActivite }}</span>
        </p>
      </div>
      <span v-if="total > 1" class="activite-card__rank">Activité {{ index }} sur {{ total }}</span>
    </header>

    <h4 class="activite-card__subtitle">Exercice</h4>
    <dl class="fields">
      <InfoRow label="Catégorie professionnelle" :value="activite.categorie" />
      <InfoRow label="Mode d'exercice" :value="activite.modeExercice" />
      <InfoRow label="Secteur d'activité" :value="activite.secteurActivite" />
      <InfoRow label="Rôle" :value="activite.role" />
      <InfoRow label="Genre d'activité" :value="activite.genreActivite" />
      <InfoRow label="Section (tableau des pharmaciens)" :value="activite.sectionPharmaciens" />
    </dl>

    <h4 class="activite-card__subtitle">Lieu d'exercice</h4>
    <dl v-if="activite.structure" class="fields" data-testid="structure">
      <InfoRow label="Raison sociale" :value="activite.structure.raisonSociale" />
      <InfoRow label="Enseigne" :value="activite.structure.enseigne" />
      <InfoRow label="Adresse" :value="activite.structure.voie" wide />
      <InfoRow label="Complément (destinataire)" :value="activite.structure.complementDestinataire" />
      <InfoRow label="Complément (point géographique)" :value="activite.structure.complementPointGeographique" />
      <InfoRow label="Mention de distribution" :value="activite.structure.mentionDistribution" />
      <InfoRow label="Code postal" :value="activite.structure.codePostal" />
      <InfoRow label="Commune" :value="activite.structure.commune" />
      <InfoRow label="Bureau cedex" :value="activite.structure.bureauCedex" />
      <InfoRow label="Département" :value="activite.structure.departement" />
      <InfoRow label="Pays" :value="activite.structure.pays" />
      <InfoRow label="Téléphone" :value="activite.structure.telephone">
        <a :href="`tel:${activite.structure.telephone?.replace(/\s/g, '')}`">
          <AppIcon name="phone" :size="14" />{{ formatPhone(activite.structure.telephone ?? '') }}
        </a>
      </InfoRow>
      <InfoRow label="Téléphone 2" :value="activite.structure.telephone2">
        <a :href="`tel:${activite.structure.telephone2?.replace(/\s/g, '')}`">
          <AppIcon name="phone" :size="14" />{{ formatPhone(activite.structure.telephone2 ?? '') }}
        </a>
      </InfoRow>
      <InfoRow label="Télécopie" :value="activite.structure.telecopie">{{ formatPhone(activite.structure.telecopie ?? '') }}</InfoRow>
      <InfoRow label="E-mail" :value="activite.structure.email">
        <a :href="`mailto:${activite.structure.email}`"><AppIcon name="mail" :size="14" />{{ activite.structure.email }}</a>
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
  padding: 1.25rem 1.4rem 1.4rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(12, 35, 64, 0.04);
}

.activite-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.activite-card__title {
  margin: 0;
  font-size: 1.3rem;
}

.activite-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.55rem;
}

.activite-card__badge {
  padding: 0.15rem 0.7rem;
  border-radius: 999px;
  background: var(--brand);
  font-size: 0.78rem;
  font-weight: 600;
  color: #fff;
}

.activite-card__badge--soft {
  background: var(--brand-soft);
  color: var(--brand);
}

.activite-card__rank {
  padding-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--muted);
}

.activite-card__subtitle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.4rem 0 0.85rem;
  font-family: var(--sans);
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text);
}

.activite-card__subtitle::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.activite-card__no-structure {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
  font-size: 0.9rem;
  font-style: italic;
  color: var(--muted);
}
</style>
