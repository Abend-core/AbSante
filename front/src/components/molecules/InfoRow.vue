<script setup lang="ts">
import PillBadge from '../atoms/PillBadge.vue'
import CopyButton from '../atoms/CopyButton.vue'

defineProps<{
  label: string
  /** `null` / vide -> « Non renseigné » affiché clairement (jamais une ligne vide ou masquée). */
  value: string | null | undefined
  /** Occupe toute la largeur de la grille (adresse, libellés longs). */
  wide?: boolean
  /** Texte à copier : affiche un bouton de copie à côté de la valeur (seulement si la valeur existe). */
  copy?: string
  /** Nom de ce qui est copié quand il diffère du libellé (« l'adresse complète »). */
  copyLabel?: string
}>()
</script>

<template>
  <div class="info-row" :class="{ 'info-row--wide': wide }">
    <dt class="info-row__label">{{ label }}</dt>
    <dd class="info-row__value">
      <template v-if="value">
        <span class="info-row__content"><slot>{{ value }}</slot></span>
        <CopyButton v-if="copy" :text="copy" :label="copyLabel ?? label.toLowerCase()" />
      </template>
      <PillBadge v-else variant="missing" data-missing>Non renseigné</PillBadge>
    </dd>
  </div>
</template>

<style scoped>
.info-row {
  min-width: 0;
}

.info-row--wide {
  grid-column: 1 / -1;
}

.info-row__label {
  margin-bottom: 0.2rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
}

.info-row__value {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem 0.5rem;
  margin: 0;
  font-size: 0.97rem;
  color: var(--text-h);
}

.info-row__content {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
