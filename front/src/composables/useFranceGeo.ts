import { computed, ref, shallowRef } from 'vue'
import type { GeoFeature, GeoFeatureCollection } from '../types/geo'

/** Charge les contours des départements de France. */
export function useFranceGeo() {
  const departements = shallowRef<GeoFeatureCollection | null>(null)
  const loading = ref(true)

  async function load() {
    departements.value = await fetch('/data/departements.geojson').then(
      (res) => res.json() as Promise<GeoFeatureCollection>,
    )
    loading.value = false
  }

  const currentFeatures = computed<GeoFeature[]>(() => departements.value?.features ?? [])

  return { load, loading, currentFeatures }
}
