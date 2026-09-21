<script setup lang="ts">
import type { NearbyResult } from '../../composables/useNearby'
import { formatDistance } from '../../utils/format'
import { itineraireUrl, POSITION_IMPRECISE_M } from '../../utils/geo'
import IconButton from '../atoms/IconButton.vue'
import ExternalLink from '../atoms/ExternalLink.vue'

export type NearbyStatus = 'idle' | 'locating' | 'searching' | 'done' | 'denied' | 'unsupported' | 'unavailable' | 'timeout' | 'error'

defineProps<{
  status: NearbyStatus
  results: NearbyResult[]
  /** Profession ou spécialité recherchée, `null` = tous les praticiens. */
  label: string | null
  /** Ville choisie à la place de la position de l'appareil, `null` = autour de la personne. */
  where?: string | null
  /** Rayon d'incertitude de la position donnée par le navigateur, en mètres (`null` = inconnu). */
  accuracyM?: number | null
}>()
defineEmits<{ select: [result: NearbyResult]; close: [] }>()

const PRATICIENS_MONTRES = 3
const CHOISIR_VILLE = "Sinon, choisissez une ville avec la barre de recherche : on listera les établissements autour d'elle."

const noms = (r: NearbyResult) => {
  const liste = r.etablissement.praticiens
  const montres = liste.slice(0, PRATICIENS_MONTRES).map((p) => `${p.prenom} ${p.nom}`.trim())
  return liste.length > PRATICIENS_MONTRES ? `${montres.join(', ')} et ${liste.length - PRATICIENS_MONTRES} autre(s)` : montres.join(', ')
}
</script>

<template>
  <section v-if="status !== 'idle'" class="nearby" aria-label="Autour de moi" aria-live="polite">
    <header class="nearby__header">
      <strong>{{ where ? `Autour de ${where}` : 'Autour de vous' }}</strong>
      <span v-if="label" class="nearby__label">{{ label }}</span>
      <IconButton class="nearby__close" icon="close" label="Fermer" :size="16" @click="$emit('close')" />
    </header>

    <p v-if="status === 'locating'" class="nearby__message">Localisation en cours… (votre navigateur peut vous demander l'autorisation)</p>
    <p v-else-if="status === 'searching'" class="nearby__message">Recherche des établissements les plus proches…</p>
    <p v-else-if="status === 'denied'" class="nearby__message">
      Position refusée. Autorisez la localisation pour ce site dans votre navigateur. {{ CHOISIR_VILLE }}
    </p>
    <p v-else-if="status === 'unsupported'" class="nearby__message">
      La localisation n'est pas disponible ici (navigateur non compatible, ou site ouvert sans https). {{ CHOISIR_VILLE }}
    </p>
    <p v-else-if="status === 'unavailable'" class="nearby__message">
      Votre appareil n'arrive pas à déterminer sa position (fréquent sur ordinateur, sans GPS). {{ CHOISIR_VILLE }}
    </p>
    <p v-else-if="status === 'timeout'" class="nearby__message">
      La localisation a pris trop de temps : réessayez. {{ CHOISIR_VILLE }}
    </p>
    <p v-else-if="status === 'error'" class="nearby__message">La recherche des établissements a échoué, réessayez dans un instant.</p>
    <template v-else>
      <p v-if="accuracyM != null && accuracyM >= POSITION_IMPRECISE_M" class="nearby__warning" role="alert">
        Position approximative (à {{ formatDistance(accuracyM / 1000) }} près) : votre navigateur vous situe d'après votre connexion internet, pas par GPS.
        Pour une recherche précise, choisissez une ville avec la barre de recherche.
      </p>
      <p v-if="results.length === 0" class="nearby__message">
        Aucun établissement{{ label ? ` « ${label} »` : '' }} trouvé à moins de 60 km.
      </p>
      <ol v-else class="nearby__list">
        <li v-for="(r, i) in results" :key="`${r.commune.codeInsee}-${r.etablissement.nom}-${i}`">
          <button type="button" class="nearby__item" @click="$emit('select', r)">
            <span class="nearby__distance">{{ r.approximative ? '≈ ' : '' }}{{ formatDistance(r.distanceKm) }}</span>
            <span class="nearby__name">{{ r.etablissement.nom }}</span>
            <span class="nearby__where">{{ r.commune.nom }} · {{ noms(r) }}</span>
          </button>
          <ExternalLink class="nearby__route" :href="itineraireUrl(r.position)">Itinéraire</ExternalLink>
        </li>
      </ol>
      <p v-if="results.length > 0 && !label" class="nearby__hint">Tous les praticiens confondus : choisissez une profession pour affiner.</p>
      <p v-if="results.some((r) => r.approximative)" class="nearby__hint">≈ : adresse non localisée, distance jusqu'au centre de la commune.</p>
    </template>
  </section>
</template>

<style scoped>
.nearby {
  margin-top: 0.75rem;
  padding: 0.6rem 1rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  max-height: 300px;
  overflow-y: auto;
}

.nearby__header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  color: var(--text-h);
}

.nearby__label {
  color: var(--muted);
  font-size: 0.85rem;
}

.nearby__close {
  margin-left: auto;
}

.nearby__message,
.nearby__warning {
  margin: 0.5rem 0 0.25rem;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.85rem;
}

.nearby__hint {
  margin: 0.4rem 0 0;
  font-size: 0.82rem;
  color: var(--muted);
}

.nearby__list {
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
}

.nearby__list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-top: 1px solid var(--border);
}

.nearby__list li:first-child {
  border-top: 0;
}

.nearby__item {
  display: grid;
  grid-template-columns: 4.5rem 1fr;
  grid-template-areas:
    'distance name'
    'distance where';
  column-gap: 0.6rem;
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.3rem;
  border: 0;
  border-radius: 6px;
  background: none;
  text-align: left;
  font: inherit;
  font-size: 0.85rem;
  color: var(--text-h);
  cursor: pointer;
}

.nearby__item:hover,
.nearby__item:focus-visible {
  background: var(--brand-soft);
}

.nearby__distance {
  grid-area: distance;
  align-self: center;
  color: var(--brand);
  font-weight: 600;
  white-space: nowrap;
}

.nearby__name {
  grid-area: name;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.nearby__where {
  grid-area: where;
  color: var(--muted);
  font-size: 0.78rem;
  overflow-wrap: anywhere;
}

.nearby__route {
  flex: none;
  padding: 0 0.6rem;
  border: 1px solid var(--brand);
  border-radius: 999px;
  color: var(--brand);
  font-size: 0.75rem;
  text-decoration: none;
  white-space: nowrap;
}

.nearby__route:hover,
.nearby__route:focus-visible {
  background: var(--brand);
  color: #fff;
}
</style>
