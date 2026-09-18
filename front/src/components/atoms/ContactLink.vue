<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  kind: 'phone' | 'mail'
  /** Valeur brute (numéro ou adresse e-mail), utilisée dans le lien. */
  value: string
  /** Texte affiché quand il diffère de la valeur (numéro mis en forme). */
  display?: string
}>()

const href = computed(() => (props.kind === 'phone' ? `tel:${props.value.replace(/\s/g, '')}` : `mailto:${props.value}`))
</script>

<template>
  <a class="contact-link" :href="href"><AppIcon :name="kind === 'phone' ? 'phone' : 'mail'" :size="14" />{{ display ?? value }}</a>
</template>

<style scoped>
.contact-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--brand);
  font-weight: 500;
  text-decoration: none;
}

.contact-link:hover {
  text-decoration: underline;
}
</style>
