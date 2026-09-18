<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import AppIcon from './AppIcon.vue'
import type { IconName } from './AppIcon.vue'

defineProps<{ to: RouteLocationRaw; icon?: IconName }>()
</script>

<template>
  <RouterLink :to="to" class="nav-link">
    <AppIcon v-if="icon" :name="icon" :size="16" />
    <slot />
  </RouterLink>
</template>

<style scoped>
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  color: var(--on-navy-muted);
  font-size: 0.9rem;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-link:focus-visible {
  outline-color: #fff;
}
</style>
