<script setup lang="ts">
import { onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from 'vue'
import IconButton from '../atoms/IconButton.vue'

const props = defineProps<{ title: string; modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean] }>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()

/** `<dialog>` natif : focus piégé dans la fenêtre, Échap pour fermer et fond inerte, sans code à nous. */
function sync(open: boolean) {
  const el = dialog.value
  if (!el || el.open === open) return
  if (open) {
    if (typeof el.showModal === 'function') el.showModal()
    else el.setAttribute('open', '')
  } else if (typeof el.close === 'function') {
    el.close()
  } else {
    el.removeAttribute('open')
  }
}

watch(() => props.modelValue, sync)
onMounted(() => sync(props.modelValue))
onBeforeUnmount(() => sync(false))

/** Un clic sur le fond (le <dialog> lui-même, hors du panneau) ferme la fenêtre. */
function onClick(event: MouseEvent) {
  if (event.target === dialog.value) emit('update:modelValue', false)
}
</script>

<template>
  <dialog ref="dialog" class="info-dialog" :aria-labelledby="titleId" @click="onClick" @close="emit('update:modelValue', false)">
    <div class="info-dialog__panel">
      <header class="info-dialog__head">
        <h2 :id="titleId">{{ title }}</h2>
        <IconButton icon="close" label="Fermer" @click="emit('update:modelValue', false)" />
      </header>
      <div class="info-dialog__body"><slot /></div>
    </div>
  </dialog>
</template>

<style scoped>
.info-dialog {
  width: min(560px, calc(100vw - 32px));
  max-height: min(80vh, 640px);
  padding: 0;
  border: 0;
  border-radius: 18px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 24px 60px rgba(7, 28, 52, 0.35);
}

.info-dialog::backdrop {
  background: rgba(7, 28, 52, 0.55);
}

.info-dialog__panel {
  display: flex;
  flex-direction: column;
  max-height: inherit;
}

.info-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem 0.9rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.info-dialog__head h2 {
  margin: 0;
  font-size: 1.2rem;
}

.info-dialog__body {
  padding: 1.1rem 1.5rem 1.5rem;
  overflow-y: auto;
  font-size: 0.93rem;
}
</style>
