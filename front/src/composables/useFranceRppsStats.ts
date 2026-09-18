import { computed, ref } from 'vue'
import { departementsRegions } from '../data/departement-region'

type DepartementCounts = Record<string, number> // profession (ou "Tous") -> effectif

interface RppsDeptPayload {
  updatedAt: string
  professions: string[]
  byDepartement: Record<string, DepartementCounts>
}

// [lat, lon, dept, nom, code_insee, ...effectifs dans l'ordre de "professions" (dernier = "Tous")]
// Le détail des établissements (voir useEtablissements.ts) n'est plus embarqué ici : trop
// volumineux pour toute la France d'un coup, chargé à la demande par département.
type CommuneRow = [number, number, string, string, string, ...number[]]

interface RppsCommunePayload {
  updatedAt: string
  professions: string[]
  rows: CommuneRow[]
}

export interface CommunePoint {
  lat: number
  lon: number
  dept: string
  nom: string
  codeInsee: string
  n: number
  /** Effectif total "Tous" de la commune, indépendant du filtre de profession actif
   *  — sert de proxy à la taille de la ville (recherche, niveau de zoom). */
  total: number
}

export interface CommuneOption {
  nom: string
  lat: number
  lon: number
  dept: string
  total: number
}

/**
 * Effectifs de professionnels de santé par département et par commune (RPPS),
 * remis à jour chaque jour par .github/workflows/update-rpps.yml (voir
 * scripts/update_rpps.py). `selectedProfession` pilote un filtre partagé par
 * la carte départements (fond) et les points communes (comme l'artefact
 * ML-DMA/sante) : "Tous" ou l'une des 29 professions.
 */
export function useFranceRppsStats() {
  const raw = ref<Record<string, DepartementCounts>>({})
  const communeRows = ref<CommuneRow[]>([])
  const professions = ref<string[]>([]) // sans "Tous"
  const updatedAt = ref<string | null>(null)
  const loading = ref(true)
  const selectedProfession = ref('Tous')
  /** Département actuellement zoomé (ou null en vue France entière), pour
   *  recalculer la taille des points localement plutôt que sur le max national. */
  const zoomedDept = ref<string | null>(null)

  async function load() {
    const [deptData, communeData]: [RppsDeptPayload, RppsCommunePayload] = await Promise.all([
      fetch('/data/rpps-departement.json').then((res) => res.json()),
      fetch('/data/rpps-commune.json').then((res) => res.json()),
    ])
    raw.value = deptData.byDepartement
    professions.value = deptData.professions
    communeRows.value = communeData.rows
    updatedAt.value = deptData.updatedAt
    loading.value = false
  }

  const catIndex = computed(() => {
    const cats = [...professions.value, 'Tous']
    const i = cats.indexOf(selectedProfession.value)
    return i === -1 ? cats.length - 1 : i
  })

  const byDepartement = computed<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    for (const [dept, counts] of Object.entries(raw.value)) {
      result[dept] = counts[selectedProfession.value] ?? 0
    }
    return result
  })

  // Somme (pas moyenne) : ce sont de vrais effectifs de personnes.
  const byRegion = computed<Record<string, number>>(() => {
    const totals: Record<string, number> = {}
    for (const departement of departementsRegions) {
      const n = byDepartement.value[departement.code] ?? 0
      totals[departement.codeRegion] = (totals[departement.codeRegion] ?? 0) + n
    }
    return totals
  })

  const maxValue = computed(() => Math.max(...Object.values(byDepartement.value), 1))

  /** Points communes pour la profession filtrée, uniquement ceux avec un effectif > 0. */
  const points = computed<CommunePoint[]>(() => {
    const idx = catIndex.value
    const result: CommunePoint[] = []
    for (const row of communeRows.value) {
      const n = row[5 + idx] as number
      if (n > 0) {
        result.push({
          lat: row[0],
          lon: row[1],
          dept: row[2] as string,
          nom: row[3] as string,
          codeInsee: row[4] as string,
          n,
          total: row[row.length - 1] as number,
        })
      }
    }
    return result
  })

  /** Points visibles compte tenu du zoom (tous si vue France entière). */
  const visiblePoints = computed(() =>
    zoomedDept.value ? points.value.filter((p) => p.dept === zoomedDept.value) : points.value,
  )

  /** Liste complète des communes (indépendante du filtre de profession actif) pour
   *  la recherche de ville — contrairement à `points`, pas limitée aux communes
   *  ayant un effectif > 0 pour la profession sélectionnée. */
  const allCommunes = computed<CommuneOption[]>(() =>
    communeRows.value.map((row) => ({
      nom: row[3] as string,
      lat: row[0] as number,
      lon: row[1] as number,
      dept: row[2] as string,
      total: row[row.length - 1] as number,
    })),
  )

  return {
    loading,
    updatedAt,
    professions,
    selectedProfession,
    zoomedDept,
    byDepartement,
    byRegion,
    maxValue,
    points,
    visiblePoints,
    allCommunes,
    load,
  }
}
