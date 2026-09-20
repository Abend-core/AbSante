import { computed, ref, watch } from 'vue'
import { departementsRegions } from '../data/departement-region'

type DepartementCounts = Record<string, number> // profession (ou "Tous") -> effectif

interface RppsDeptPayload {
  updatedAt: string
  professions: string[]
  /** [profession, libellé] : l'indice est la clé de `bySpecialite`, des fichiers commune et des
   *  praticiens des établissements. Absent d'un fichier généré avant l'arrivée des spécialités. */
  specialites?: [string, string][]
  byDepartement: Record<string, DepartementCounts>
  /** département -> indice de spécialité (texte) -> effectif */
  bySpecialite?: Record<string, Record<string, number>>
}

interface PopulationPayload {
  byDepartement: Record<string, number>
}

/** Fichier creux : code INSEE de la commune -> [[indice de spécialité, effectif], ...]. */
interface CommuneSpecialitePayload {
  communes: Record<string, [number, number][]>
}

/** Habitants pour lesquels on exprime la densité. */
const POPULATION_BASE = 100_000

/** L'échelle des densités s'arrête au 95e centile : Paris compte près de deux fois plus de
 *  praticiens par habitant que le département suivant (les hôpitaux et cabinets de la capitale
 *  servent toute la région), et un seul point extrême délaverait les 100 autres départements. */
const DENSITE_PERCENTILE_PLAFOND = 0.95

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

export interface SpecialiteOption {
  nom: string
  /** Effectif national (une personne par département où elle exerce). */
  total: number
}

export interface CommuneOption {
  codeInsee: string
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
  /** Libellé de la spécialité choisie (ex : « Cardiologie et maladies vasculaires »), ou null.
   *  Toujours une spécialité de `selectedProfession` : elle repasse à null quand celle-ci change. */
  const selectedSpecialite = ref<string | null>(null)
  /** Colorie les départements par praticiens pour 100 000 habitants plutôt que par effectif brut :
   *  l'effectif brut ne fait que redessiner la carte de la population (Paris et le Nord toujours
   *  les plus foncés). */
  const densite = ref(true)
  const specialites = ref<[string, string][]>([])
  const bySpecialite = ref<Record<string, Record<string, number>>>({})
  const population = ref<Record<string, number>>({})
  const communeSpecialites = ref<Record<string, [number, number][]> | null>(null)
  /** Département actuellement zoomé (ou null en vue France entière), pour
   *  recalculer la taille des points localement plutôt que sur le max national. */
  const zoomedDept = ref<string | null>(null)

  async function load() {
    const [deptData, communeData, populationData]: [RppsDeptPayload, RppsCommunePayload, PopulationPayload | null] =
      await Promise.all([
        fetch('/data/rpps-departement.json').then((res) => res.json()),
        fetch('/data/rpps-commune.json').then((res) => res.json()),
        // Sans population, la carte reste utilisable en effectifs bruts (densité indisponible).
        fetch('/data/population-departement.json').then((res) => res.json()).catch(() => null),
      ])
    raw.value = deptData.byDepartement
    professions.value = deptData.professions
    specialites.value = deptData.specialites ?? []
    bySpecialite.value = deptData.bySpecialite ?? {}
    population.value = populationData?.byDepartement ?? {}
    communeRows.value = communeData.rows
    updatedAt.value = deptData.updatedAt
    loading.value = false
  }

  const catIndex = computed(() => {
    const cats = [...professions.value, 'Tous']
    const i = cats.indexOf(selectedProfession.value)
    return i === -1 ? cats.length - 1 : i
  })

  const specialitesDeLaProfession = computed<SpecialiteOption[]>(() => {
    const options: SpecialiteOption[] = []
    specialites.value.forEach(([profession, nom], idx) => {
      if (profession !== selectedProfession.value) return
      const total = Object.values(bySpecialite.value).reduce((sum, parDept) => sum + (parDept[String(idx)] ?? 0), 0)
      options.push({ nom, total })
    })
    return options.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  })

  const selectedSpecialiteIdx = computed<number | null>(() => {
    if (!selectedSpecialite.value) return null
    const idx = specialites.value.findIndex(([p, nom]) => p === selectedProfession.value && nom === selectedSpecialite.value)
    return idx === -1 ? null : idx
  })

  // Sans ça, revenir à « Médecin » ressusciterait la spécialité d'avant (« Cardiologie »)
  // alors que la liste affichée est repartie de zéro. Synchrone : aucune vue intermédiaire.
  watch(selectedProfession, () => (selectedSpecialite.value = null), { flush: 'sync' })

  async function loadCommuneSpecialites() {
    if (communeSpecialites.value) return
    const data: CommuneSpecialitePayload = await fetch('/data/rpps-commune-specialite.json').then((res) => res.json())
    communeSpecialites.value = data.communes
  }
  // Le fichier des communes par spécialité n'est téléchargé que si on choisit une spécialité.
  watch(
    selectedSpecialiteIdx,
    (idx) => {
      if (idx !== null) void loadCommuneSpecialites().catch(() => (communeSpecialites.value = {}))
    },
    { flush: 'sync' },
  )

  /** Effectif par département pour la sélection (spécialité, sinon profession, sinon « Tous »). */
  const byDepartement = computed<Record<string, number>>(() => {
    const idx = selectedSpecialiteIdx.value
    const result: Record<string, number> = {}
    for (const [dept, counts] of Object.entries(raw.value)) {
      result[dept] = idx === null ? (counts[selectedProfession.value] ?? 0) : (bySpecialite.value[dept]?.[String(idx)] ?? 0)
    }
    return result
  })

  const densiteDisponible = computed(() => Object.keys(population.value).length > 0)
  const modeDensite = computed(() => densite.value && densiteDisponible.value)

  /** Praticiens pour 100 000 habitants, par département. */
  const densites = computed<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    for (const [dept, n] of Object.entries(byDepartement.value)) {
      const habitants = population.value[dept]
      result[dept] = habitants ? (n / habitants) * POPULATION_BASE : 0
    }
    return result
  })

  /** Ce que la carte colorie : la densité ou l'effectif, selon le mode. */
  const valeurs = computed(() => (modeDensite.value ? densites.value : byDepartement.value))
  const plafondDensite = computed(() => {
    const positives = Object.values(densites.value).filter((v) => v > 0).sort((a, b) => a - b)
    return positives.length ? positives[Math.min(positives.length - 1, Math.floor(DENSITE_PERCENTILE_PLAFOND * positives.length))]! : 1
  })
  /** Borne haute de l'échelle : le plafond en densité, le maximum réel en effectif. */
  const maxValeur = computed(() => (modeDensite.value ? plafondDensite.value : Math.max(...Object.values(valeurs.value), 1)))
  /** Vrai si au moins un département dépasse la borne haute (la légende l'indique par « ≥ »). */
  const plafonne = computed(() => Math.max(...Object.values(valeurs.value), 0) > maxValeur.value)

  /** Libellé de la sélection pour l'interface : la spécialité, sinon la profession, sinon null. */
  const selectionLabel = computed(() =>
    selectedSpecialite.value ?? (selectedProfession.value === 'Tous' ? null : selectedProfession.value),
  )

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

  const rowByCode = computed(() => new Map(communeRows.value.map((row) => [row[4] as string, row])))

  const toPoint = (row: CommuneRow, n: number): CommunePoint => ({
    lat: row[0],
    lon: row[1],
    dept: row[2] as string,
    nom: row[3] as string,
    codeInsee: row[4] as string,
    n,
    total: row[row.length - 1] as number,
  })

  /** Points communes pour la sélection, uniquement ceux avec un effectif > 0. */
  const points = computed<CommunePoint[]>(() => {
    const specialiteIdx = selectedSpecialiteIdx.value
    if (specialiteIdx !== null) {
      // Spécialité : les effectifs viennent du fichier creux, les coordonnées du fichier principal.
      const result: CommunePoint[] = []
      for (const [code, parSpecialite] of Object.entries(communeSpecialites.value ?? {})) {
        const n = parSpecialite.find(([idx]) => idx === specialiteIdx)?.[1] ?? 0
        const row = rowByCode.value.get(code)
        if (n > 0 && row) result.push(toPoint(row, n))
      }
      return result
    }
    const idx = catIndex.value
    const result: CommunePoint[] = []
    for (const row of communeRows.value) {
      const n = row[5 + idx] as number
      if (n > 0) result.push(toPoint(row, n))
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
      codeInsee: row[4] as string,
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
    selectedSpecialite,
    selectedSpecialiteIdx,
    specialitesDeLaProfession,
    selectionLabel,
    densite,
    densiteDisponible,
    modeDensite,
    zoomedDept,
    byDepartement,
    densites,
    valeurs,
    maxValeur,
    plafonne,
    byRegion,
    maxValue,
    points,
    visiblePoints,
    allCommunes,
    load,
  }
}
