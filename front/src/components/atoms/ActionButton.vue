<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './AppIcon.vue'

withDefaults(defineProps<{ variant?: 'primary' | 'outline' | 'on-navy'; icon?: IconName }>(), { variant: 'primary', icon: undefined })
</script>

<template>
  <button type="button" class="action-button" :class="`action-button--${variant}`">
    <AppIcon v-if="icon" :name="icon" :size="16" />
    <slot />
  </button>
</template>

<style scoped>
.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1.1rem;
  border: 1px solid transparent;
  border-radius: 999px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.action-button--primary {
  background: var(--brand);
  color: #fff;
}

.action-button--primary:hover {
  background: #0f52a0;
}

.action-button--outline {
  border-color: var(--brand);
  background: transparent;
  color: var(--brand);
}

.action-button--outline:hover {
  background: var(--brand);
  color: #fff;
}

/* Sur le bandeau bleu nuit du header. */
.action-button--on-navy {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.action-button--on-navy:hover {
  background: rgba(255, 255, 255, 0.18);
}

.action-button--on-navy:focus-visible {
  outline-color: #fff;
}
</style>
