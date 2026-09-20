<script setup lang="ts">
import { formatNombre } from '../../utils/format'
import type { SpecialiteOption } from '../../composables/useFranceRppsStats'

defineProps<{
  /** Libellé de la spécialité choisie, `null` pour « toutes ». */
  modelValue: string | null
  specialites: SpecialiteOption[]
}>()
defineEmits<{ 'update:modelValue': [value: string | null] }>()
</script>

<template>
  <label class="specialite-select">
    Spécialité
    <select
      :value="modelValue ?? ''"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value || null)"
    >
      <option value="">Toutes les spécialités</option>
      <option v-for="s in specialites" :key="s.nom" :value="s.nom">{{ s.nom }} ({{ formatNombre(s.total) }})</option>
    </select>
  </label>
</template>

<style scoped>
.specialite-select {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  font-size: 0.9rem;
  color: var(--text);
}

.specialite-select select {
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-h);
  flex: 1 1 200px;
  min-width: 0;
  max-width: 100%;
}
</style>
