<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  updatedAt: string | null
}>()

const formatted = computed(() => {
  if (!props.updatedAt) return null
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(props.updatedAt))
})

/** Les données sont retéléchargées chaque jour (voir .github/workflows/update-rpps.yml) :
 * au-delà de 48h sans mise à jour, quelque chose s'est arrêté. */
const isStale = computed(() => {
  if (!props.updatedAt) return false
  return Date.now() - new Date(props.updatedAt).getTime() > 48 * 3600 * 1000
})
</script>

<template>
  <span v-if="formatted" class="data-freshness" :class="{ 'data-freshness--stale': isStale }">
    <span class="data-freshness__dot" />
    Données du {{ formatted }}
  </span>
</template>

<style scoped>
.data-freshness {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #777;
}

.data-freshness__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4caf50;
  flex: none;
}

.data-freshness--stale {
  color: #b26a00;
}

.data-freshness--stale .data-freshness__dot {
  background: #f0a500;
}
</style>
