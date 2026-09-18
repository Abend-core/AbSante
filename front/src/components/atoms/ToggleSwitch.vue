<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
}>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="toggle">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="toggle__track"><span class="toggle__thumb" /></span>
    <span>{{ label }}</span>
  </label>
</template>

<style scoped>
.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #444;
  cursor: pointer;
}

.toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle__track {
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: #ccc;
  position: relative;
  transition: background 0.15s;
  flex: none;
}

.toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s;
}

.toggle input:checked + .toggle__track {
  background: #1e88e5;
}

.toggle input:checked + .toggle__track .toggle__thumb {
  transform: translateX(16px);
}

.toggle input:focus-visible + .toggle__track {
  outline: 2px solid #1e88e5;
  outline-offset: 2px;
}
</style>
