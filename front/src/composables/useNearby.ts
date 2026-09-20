import { distanceKm } from '../utils/geo'
import type { LatLon } from '../utils/geo'
import type { Etablissement } from './useEtablissements'
import type { CommuneOption } from './useFranceRppsStats'

export interface NearbyResult {
  etablissement: Etablissement
  commune: CommuneOption
  /** Où l'établissement se trouve : sa vraie adresse géocodée, sinon le centre de sa commune. */
  position: LatLon
  /** Vrai si `position` est le centre de la commune faute d'adresse géocodée : la distance est alors approximative. */
  approximative: boolean
  distanceKm: number
}

export interface NearbyDeps {
  communes: CommuneOption[]
  /** Charge les établissements d'un département (sans effet s'il est déjà chargé). */
  loadDept: (dept: string) => Promise<void>
  /** Établissements d'une commune correspondant à la sélection en cours (profession, spécialité). */
  forCommune: (dept: string, codeInsee: string) => Etablissement[]
}

/** On élargit le rayon tant qu'on n'a pas assez de résultats : en ville le premier suffit, en zone
 *  rurale on peut avoir à aller chercher plus loin. */
const DEFAULT_RADII_KM = [10, 25, 60]
/** Marge sur le rayon de sélection des communes : un établissement peut être à l'intérieur du rayon
 *  alors que le centre de sa commune est un peu au-delà. */
const COMMUNE_MARGIN_KM = 5

/** Les `count` établissements les plus proches de `origin` qui correspondent à la sélection. */
export async function findNearby(
  origin: LatLon,
  deps: NearbyDeps,
  { count = 10, radiiKm = DEFAULT_RADII_KM }: { count?: number; radiiKm?: number[] } = {},
): Promise<NearbyResult[]> {
  let best: NearbyResult[] = []
  for (const radius of radiiKm) {
    const communes = deps.communes.filter((c) => distanceKm(origin, [c.lat, c.lon]) <= radius + COMMUNE_MARGIN_KM)
    await Promise.all([...new Set(communes.map((c) => c.dept))].map((dept) => deps.loadDept(dept)))

    const results: NearbyResult[] = []
    for (const commune of communes) {
      for (const etablissement of deps.forCommune(commune.dept, commune.codeInsee)) {
        const position: LatLon = etablissement.coords ?? [commune.lat, commune.lon]
        const distance = distanceKm(origin, position)
        if (distance <= radius) {
          results.push({ etablissement, commune, position, approximative: !etablissement.coords, distanceKm: distance })
        }
      }
    }
    best = results.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, count)
    if (best.length >= count) break
  }
  return best
}
