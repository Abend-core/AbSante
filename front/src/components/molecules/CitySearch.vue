<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CommuneOption } from '../../composables/useFranceRppsStats'

const props = defineProps<{
  communes: CommuneOption[]
}>()
const emit = defineEmits<{ select: [commune: CommuneOption] }>()

const query = ref('')
const open = ref(false)

/** Comparaison insensible à la casse, aux accents et à la ponctuation : "chateauroux"
 *  trouve "Châteauroux", et "tour de salvagny" trouve "La Tour-de-Salvagny" (on tape
 *  des espaces là où les noms de communes ont des tirets ou des apostrophes). */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const suggestions = computed<CommuneOption[]>(() => {
  const q = normalize(query.value.trim())
  if (q.length < 2) return []
  return props.communes
    .filter((c) => normalize(c.nom).includes(q))
    .sort((a, b) => b.total - a.total) // les plus grandes villes en premier en cas d'ambiguïté
    .slice(0, 8)
})

// Rouvre la liste dès qu'on retape après avoir choisi une suggestion : le clic
// sur une suggestion (mousedown.prevent) ne fait volontairement pas perdre le
// focus à l'input (sinon le clic serait annulé par le blur), donc l'événement
// "focus" ne se redéclenche pas tout seul en continuant à taper.
watch(query, (q) => {
  if (q.length > 0) open.value = true
})

function choose(c: CommuneOption) {
  emit('select', c)
  query.value = ''
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    query.value = ''
    open.value = false
  } else if (event.key === 'Enter' && suggestions.value.length > 0) {
    choose(suggestions.value[0])
  }
}
</script>

<template>
  <div class="city-search">
    <input
      v-model="query"
      type="search"
      placeholder="Rechercher une ville…"
      title="Rechercher une ville pour zoomer directement dessus"
      @focus="open = true"
      @blur="open = false"
      @keydown="onKeydown"
    />
    <ul v-if="open && suggestions.length" class="city-search__suggestions">
      <li v-for="c in suggestions" :key="`${c.dept}-${c.nom}`">
        <button type="button" @mousedown.prevent="choose(c)">
          {{ c.nom }} <span class="city-search__dept">({{ c.dept }})</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.city-search {
  position: relative;
}

.city-search input {
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-h);
  min-width: min(220px, 100%);
  max-width: 100%;
  font-size: 0.9rem;
}

.city-search input:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 1px;
  border-color: var(--brand);
}

.city-search__suggestions {
  position: absolute;
  z-index: 1000;
  top: calc(100% + 2px);
  left: 0;
  min-width: 220px;
  max-width: 320px;
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  background: white;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  max-height: 260px;
  overflow-y: auto;
}

.city-search__suggestions button {
  display: block;
  width: 100%;
  padding: 0.4rem 0.7rem;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.85rem;
  color: #333;
  cursor: pointer;
}

.city-search__suggestions button:hover {
  background: #f0f5fb;
}

.city-search__dept {
  color: #999;
  font-size: 0.78rem;
}
</style>
