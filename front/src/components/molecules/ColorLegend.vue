<script setup lang="ts">
import { computed } from 'vue'
import { interpolateBlues } from 'd3-scale-chromatic'

const props = defineProps<{
  max: number
  label: string
}>()

const gradient = computed(() => {
  const stops = Array.from({ length: 6 }, (_, i) => interpolateBlues(i / 5))
  return `linear-gradient(to right, ${stops.join(', ')})`
})
</script>

<template>
  <div class="color-legend">
    <span class="color-legend__label">{{ label }}</span>
    <div class="color-legend__bar" :style="{ background: gradient }" />
    <div class="color-legend__ticks">
      <span>0</span>
      <span>{{ props.max.toLocaleString('fr-FR') }}</span>
    </div>
  </div>
</template>

<style scoped>
.color-legend {
  max-width: 320px;
}

.color-legend__label {
  display: block;
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 0.35rem;
}

.color-legend__bar {
  height: 10px;
  border-radius: 5px;
}

.color-legend__ticks {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #777;
  margin-top: 0.2rem;
}
</style>
