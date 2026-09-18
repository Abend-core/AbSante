<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppIcon from '../atoms/AppIcon.vue'
import IconButton from '../atoms/IconButton.vue'

const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<!-- iPhone / iPad : Safari n'autorise pas l'installation par un bouton, on montre le chemin exact. -->
<template>
  <div class="install-help" role="dialog" aria-label="Installer AbSante sur l'écran d'accueil">
    <div class="install-help__head">
      <strong>Installer AbSante</strong>
      <IconButton icon="close" label="Fermer l'aide" :size="16" @click="emit('close')" />
    </div>
    <ol>
      <li>Touchez <AppIcon name="share" :size="15" /> <strong>Partager</strong> dans la barre de Safari.</li>
      <li>Choisissez <strong>« Sur l'écran d'accueil »</strong>.</li>
      <li>Touchez <strong>Ajouter</strong> : AbSante apparaît comme une application.</li>
    </ol>
  </div>
</template>

<style scoped>
.install-help {
  position: absolute;
  z-index: 20;
  top: calc(100% + 10px);
  right: 0;
  width: min(300px, calc(100vw - 32px));
  padding: 0.9rem 1rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  color: var(--text);
  font-size: 0.88rem;
  text-align: left;
}

.install-help__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
  color: var(--text-h);
}

ol {
  margin: 0;
  padding-left: 1.2rem;
}

li {
  margin-bottom: 0.35rem;
}

li :deep(.app-icon) {
  vertical-align: -3px;
  color: var(--brand);
}
</style>
