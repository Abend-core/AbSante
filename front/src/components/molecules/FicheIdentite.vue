<script setup lang="ts">
import type { Fiche } from '../../types/fiche'
import { titleCase } from '../../utils/format'
import InfoRow from './InfoRow.vue'

defineProps<{ fiche: Fiche }>()
</script>

<template>
  <dl class="fields fiche-identite">
    <InfoRow label="Civilité" :value="fiche.civilite" />
    <InfoRow label="Civilité d'exercice" :value="fiche.civiliteExercice" />
    <InfoRow label="Nom d'exercice" :value="fiche.nom" />
    <InfoRow label="Prénom d'exercice" :value="fiche.prenom ? titleCase(fiche.prenom) : null" />
    <InfoRow label="Identifiant national (RPPS)" :value="fiche.id" :copy="fiche.id" copy-label="l'identifiant RPPS" wide />
    <InfoRow label="Identifiant PP" :value="fiche.identifiantPP" :copy="fiche.identifiantPP ?? undefined" />
    <InfoRow label="Type d'identifiant" :value="fiche.typeIdentifiant" />
  </dl>
</template>

<style scoped>
/* Colonne latérale étroite : une seule colonne, sinon les libellés longs passent sur deux
   lignes et décalent les valeurs les unes par rapport aux autres. */
.fiche-identite {
  grid-template-columns: minmax(0, 1fr);
  gap: 0.8rem;
}
</style>
