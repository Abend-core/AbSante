<script setup lang="ts">
import BrandMark from '../atoms/BrandMark.vue'

withDefaults(defineProps<{ size?: number }>(), { size: 34 })
</script>

<!-- Repère + nom d'AbSante, sur fond sombre. Purement visuel : l'appelant décide s'il est un lien. -->
<template>
  <span class="brand-logo">
    <BrandMark :size="size" />
    <span class="brand-logo__name" :style="{ fontSize: `${size * 0.043}rem` }">AbSante</span>
  </span>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #fff;
}

.brand-logo__name {
  font-family: var(--display);
  font-weight: 700;
  letter-spacing: -0.02em;
}
</style>
