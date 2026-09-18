<script setup lang="ts">
import { ref } from 'vue'
import ActionButton from '../atoms/ActionButton.vue'
import { usePwaInstall } from '../../composables/usePwaInstall'
import InstallHelp from './InstallHelp.vue'

const { mode, install } = usePwaInstall()
const helpOpen = ref(false)

async function onClick() {
  if (mode.value === 'ios') {
    helpOpen.value = !helpOpen.value
    return
  }
  await install()
}
</script>

<!-- Bouton « Installer l'application » : un clic ouvre l'installation native du navigateur ;
     sur iPhone / iPad il montre comment faire. Absent quand il n'y a rien à proposer
     (déjà installée, ou navigateur sans installation possible). -->
<template>
  <div v-if="mode === 'prompt' || mode === 'ios'" class="install-button">
    <ActionButton
      variant="on-navy"
      icon="download"
      :aria-expanded="mode === 'ios' ? helpOpen : undefined"
      @click="onClick"
    >
      <span class="install-button__label">Installer <span class="install-button__long">l'application</span></span>
    </ActionButton>
    <InstallHelp v-if="mode === 'ios' && helpOpen" @close="helpOpen = false" />
  </div>
</template>

<style scoped>
.install-button {
  position: relative;
}

@media (max-width: 420px) {
  .install-button__long {
    display: none;
  }
}
</style>
