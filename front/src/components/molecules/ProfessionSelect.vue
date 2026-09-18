<script setup lang="ts">
defineProps<{
  modelValue: string
  professions: string[]
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="profession-select">
    Profession
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="Tous">Toutes les professions</option>
      <option v-for="p in professions" :key="p" :value="p">{{ p }}</option>
    </select>
  </label>
</template>

<style scoped>
.profession-select {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  font-size: 0.9rem;
  color: var(--text);
}

.profession-select select {
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-h);
  flex: 1 1 200px;
  min-width: 0;
  max-width: 100%;
}
</style>
