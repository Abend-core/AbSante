<script setup lang="ts">
import { computed } from 'vue'
import PillBadge from '../atoms/PillBadge.vue'
import ContactLink from '../atoms/ContactLink.vue'
import SectionLabel from '../atoms/SectionLabel.vue'
import type { Activite } from '../../types/fiche'
import { formatPhone, formatSiret } from '../../utils/format'
import InfoRow from './InfoRow.vue'

const props = defineProps<{
  activite: Activite
  /** Position dans la liste (1-based) et taille de la liste, pour titrer « Activité 2 sur 3 ». */
  index: number
  total: number
}>()

/** Adresse postale complète, à copier d'un clic : « 6 ALL DU LEVANT, 69890 La Tour-de-Salvagny ». */
const fullAddress = computed(() => {
  const s = props.activite.structure
  if (!s) return undefined
  const city = [s.codePostal, s.commune].filter(Boolean).join(' ')
  return [s.voie, city].filter(Boolean).join(', ') || undefined
})
</script>

<template>
  <article class="activite-card">
    <header class="activite-card__head">
      <div>
        <h3 class="activite-card__title">{{ activite.profession ?? 'Profession non renseignée' }}</h3>
        <p v-if="activite.modeExercice || activite.secteurActivite" class="activite-card__badges">
          <PillBadge v-if="activite.modeExercice" variant="solid">{{ activite.modeExercice }}</PillBadge>
          <PillBadge v-if="activite.secteurActivite" variant="soft">{{ activite.secteurActivite }}</PillBadge>
        </p>
      </div>
      <span v-if="total > 1" class="activite-card__rank">Activité {{ index }} sur {{ total }}</span>
    </header>

    <SectionLabel>Exercice</SectionLabel>
    <dl class="fields">
      <InfoRow label="Catégorie professionnelle" :value="activite.categorie" />
      <InfoRow label="Mode d'exercice" :value="activite.modeExercice" />
      <InfoRow label="Secteur d'activité" :value="activite.secteurActivite" />
      <InfoRow label="Rôle" :value="activite.role" />
      <InfoRow label="Genre d'activité" :value="activite.genreActivite" />
      <InfoRow label="Section (tableau des pharmaciens)" :value="activite.sectionPharmaciens" />
    </dl>

    <SectionLabel>Lieu d'exercice</SectionLabel>
    <dl v-if="activite.structure" class="fields" data-testid="structure">
      <InfoRow label="Raison sociale" :value="activite.structure.raisonSociale" :copy="activite.structure.raisonSociale ?? undefined" />
      <InfoRow label="Enseigne" :value="activite.structure.enseigne" />
      <InfoRow label="Adresse" :value="activite.structure.voie" :copy="fullAddress" copy-label="l'adresse complète" wide />
      <InfoRow label="Complément (destinataire)" :value="activite.structure.complementDestinataire" />
      <InfoRow label="Complément (point géographique)" :value="activite.structure.complementPointGeographique" />
      <InfoRow label="Mention de distribution" :value="activite.structure.mentionDistribution" />
      <InfoRow label="Code postal" :value="activite.structure.codePostal" />
      <InfoRow label="Commune" :value="activite.structure.commune" />
      <InfoRow label="Bureau cedex" :value="activite.structure.bureauCedex" />
      <InfoRow label="Département" :value="activite.structure.departement" />
      <InfoRow label="Pays" :value="activite.structure.pays" />
      <InfoRow label="Téléphone" :value="activite.structure.telephone" :copy="formatPhone(activite.structure.telephone ?? '')" copy-label="le numéro de téléphone">
        <ContactLink kind="phone" :value="activite.structure.telephone ?? ''" :display="formatPhone(activite.structure.telephone ?? '')" />
      </InfoRow>
      <InfoRow label="Téléphone 2" :value="activite.structure.telephone2" :copy="formatPhone(activite.structure.telephone2 ?? '')" copy-label="le second numéro de téléphone">
        <ContactLink kind="phone" :value="activite.structure.telephone2 ?? ''" :display="formatPhone(activite.structure.telephone2 ?? '')" />
      </InfoRow>
      <InfoRow label="Télécopie" :value="activite.structure.telecopie" :copy="formatPhone(activite.structure.telecopie ?? '')" copy-label="le numéro de télécopie">{{ formatPhone(activite.structure.telecopie ?? '') }}</InfoRow>
      <InfoRow label="E-mail" :value="activite.structure.email" :copy="activite.structure.email ?? undefined" copy-label="l'adresse e-mail">
        <ContactLink kind="mail" :value="activite.structure.email ?? ''" />
      </InfoRow>
      <InfoRow label="SIRET" :value="activite.structure.siret" :copy="activite.structure.siret ?? undefined" copy-label="le SIRET">{{ formatSiret(activite.structure.siret ?? '') }}</InfoRow>
      <InfoRow label="SIREN" :value="activite.structure.siren" :copy="activite.structure.siren ?? undefined" copy-label="le SIREN">{{ formatSiret(activite.structure.siren ?? '') }}</InfoRow>
      <InfoRow label="FINESS (site)" :value="activite.structure.finessSite" :copy="activite.structure.finessSite ?? undefined" copy-label="le FINESS du site" />
      <InfoRow label="FINESS (établissement juridique)" :value="activite.structure.finessJuridique" :copy="activite.structure.finessJuridique ?? undefined" copy-label="le FINESS juridique" />
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

.activite-card__rank {
  padding-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--muted);
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
