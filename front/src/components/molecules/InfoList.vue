<script setup lang="ts">
import ExternalLink from '../atoms/ExternalLink.vue'
import type { InfoItem } from '../../content/footer-content'

defineProps<{ items: InfoItem[] }>()
</script>

<!-- Liste d'informations : un titre facultatif en gras puis du texte où certains morceaux sont des liens. -->
<template>
  <ul class="info-list">
    <li v-for="(item, i) in items" :key="i">
      <template v-if="item.title"><strong>{{ item.title }}</strong>{{ ' ' }}</template>
      <template v-for="(part, j) in item.body" :key="j">
        <ExternalLink v-if="typeof part !== 'string'" :href="part.href">{{ part.text }}</ExternalLink>
        <template v-else>{{ part }}</template>
      </template>
    </li>
  </ul>
</template>

<style scoped>
.info-list {
  display: grid;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
  line-height: 1.55;
}

strong {
  color: var(--text-h);
}
</style>
