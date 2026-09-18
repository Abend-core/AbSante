<script setup lang="ts">
export type PillBadgeVariant = 'solid' | 'soft' | 'glass' | 'chip' | 'count' | 'missing'

withDefaults(defineProps<{ variant?: PillBadgeVariant }>(), { variant: 'soft' })
</script>

<!-- Pastille de texte : mode d'exercice, profession sur fond sombre, spécialité, compteur, ou
     « Non renseigné » (variant « missing », en pointillé pour ne jamais ressembler à une valeur). -->
<template>
  <span class="badge" :class="`badge--${variant}`"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 0.45rem;
  border-radius: 999px;
  font-family: var(--sans);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.5;
}

.badge--solid {
  padding: 0.15rem 0.7rem;
  background: var(--brand);
  color: #fff;
}

.badge--soft {
  padding: 0.15rem 0.7rem;
  background: var(--brand-soft);
  color: var(--brand);
}

.badge--glass {
  padding: 0.2rem 0.8rem;
  background: rgba(30, 136, 229, 0.3);
  color: #cfe6ff;
  font-size: 0.85rem;
}

.badge--chip {
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  background: var(--brand-soft);
  color: var(--text-h);
  font-size: 0.9rem;
  font-weight: 500;
}

.badge--count {
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding-inline: 0.4rem;
  background: var(--brand-soft);
  color: var(--brand);
}

.badge--missing {
  padding: 0.05rem 0.6rem;
  border: 1px dashed var(--border-strong);
  color: var(--muted);
  font-size: 0.8rem;
  font-style: italic;
  font-weight: 400;
}
</style>
