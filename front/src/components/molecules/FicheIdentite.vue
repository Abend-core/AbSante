<script setup lang="ts">
import InfoRow from '../atoms/InfoRow.vue'
import type { Fiche } from '../../types/fiche'
import { titleCase } from '../../utils/format'

defineProps<{ fiche: Fiche }>()
</script>

<template>
  <dl class="fiche-identite">
    <InfoRow label="Civilité" :value="fiche.civilite" />
    <InfoRow label="Civilité d'exercice" :value="fiche.civiliteExercice" />
    <InfoRow label="Nom d'exercice" :value="fiche.nom" />
    <InfoRow label="Prénom d'exercice" :value="fiche.prenom ? titleCase(fiche.prenom) : null" />
    <InfoRow label="Identifiant national (RPPS)" :value="fiche.id" />
    <InfoRow label="Identifiant PP" :value="fiche.identifiantPP" />
    <InfoRow label="Type d'identifiant" :value="fiche.typeIdentifiant" />
  </dl>
</template>

<style scoped>
.fiche-identite {
  margin: 0;
}
</style>
