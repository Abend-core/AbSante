<script setup lang="ts">
import { computed } from 'vue'
import { useClipboard } from '../../composables/useClipboard'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  /** Texte placé dans le presse-papiers. */
  text: string
  /** Ce qui est copié, pour le nom du bouton : « Copier l'identifiant RPPS ». */
  label: string
}>()

const { status, copy } = useClipboard()

const buttonLabel = computed(() => `Copier ${props.label}`)
const announcement = computed(() => {
  if (status.value === 'copied') return `${props.label} copié dans le presse-papiers`
  if (status.value === 'failed') return 'La copie a échoué'
  return ''
})
</script>

<template>
  <span class="copy-button">
    <button
      type="button"
      class="copy-button__button"
      :class="{ 'copy-button__button--copied': status === 'copied', 'copy-button__button--failed': status === 'failed' }"
      :aria-label="buttonLabel"
      :title="buttonLabel"
      @click="copy(text)"
    >
      <AppIcon :name="status === 'copied' ? 'check' : 'copy'" :size="14" />
    </button>
    <span v-if="status !== 'idle'" class="copy-button__tip" aria-hidden="true">{{ status === 'copied' ? 'Copié' : 'Échec' }}</span>
    <span class="sr-only" role="status">{{ announcement }}</span>
  </span>
</template>

<style scoped>
.copy-button {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

.copy-button__button {
  display: inline-grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.copy-button__button:hover {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand);
}

.copy-button__button--copied {
  border-color: #2e7d32;
  background: #e8f5e9;
  color: #2e7d32;
}

.copy-button__button--failed {
  border-color: var(--accent);
  color: var(--accent);
}

.copy-button__tip {
  position: absolute;
  z-index: 5;
  bottom: calc(100% + 6px);
  left: 50%;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  background: var(--text-h);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  transform: translateX(-50%);
  pointer-events: none;
}
</style>
