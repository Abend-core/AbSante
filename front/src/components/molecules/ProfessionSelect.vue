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
  font-size: 0.9rem;
  color: #444;
}

.profession-select select {
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  min-width: 200px;
  max-width: 100%;
}
</style>
