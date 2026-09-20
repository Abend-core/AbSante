import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useFranceRppsStats } from './useFranceRppsStats'

const DEPT_PAYLOAD = {
  updatedAt: '2026-09-17T00:00:00Z',
  professions: ['Médecin', 'Infirmier'],
  // [profession, libellé] : l'indice sert de clé dans bySpecialite et dans le fichier des communes
  specialites: [
    ['Infirmier', 'Pratique avancée'],
    ['Médecin', 'Cardiologie'],
    ['Médecin', 'Médecine générale'],
  ],
  bySpecialite: {
    '01': { '1': 2, '2': 5 },
    '75': { '1': 30, '2': 20 },
  },
  // 01 (Ain) et 03 (Allier) sont tous les deux en région 84
  byDepartement: {
    '01': { Médecin: 8, Infirmier: 2, Tous: 10 },
    '03': { Médecin: 1, Infirmier: 4, Tous: 5 },
    '75': { Médecin: 60, Infirmier: 40, Tous: 100 },
  },
}
// [lat, lon, dept, nom, code_insee, Médecin, Infirmier, Tous] : le total "Tous" (34) doit
// rester distinct des effectifs par profession (7, 3) -> une régression de type "colonne
// décalée d'une case" (déjà arrivée en ajoutant code_insee au schéma) casserait ce test.
const COMMUNE_PAYLOAD = {
  updatedAt: '2026-09-17T00:00:00Z',
  professions: ['Médecin', 'Infirmier'],
  rows: [[45.8, 5.2, '01', 'Bourg-en-Bresse', '01053', 7, 3, 34]],
}

// Les habitants font la densité : 01 = 500 000 hab., 75 = 2 000 000 hab. (03 volontairement absent)
const POPULATION_PAYLOAD = { byDepartement: { '01': 500000, '75': 2000000 } }
// Fichier creux : Bourg-en-Bresse a 4 cardiologues (indice 1) et 9 généralistes (indice 2)
const COMMUNE_SPECIALITE_PAYLOAD = { communes: { '01053': [[1, 4], [2, 9]], '99999': [[1, 3]] } }

describe('useFranceRppsStats', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn((url: string) => {
      if (url.includes('rpps-departement.json')) return Promise.resolve({ json: () => Promise.resolve(DEPT_PAYLOAD) })
      if (url.includes('rpps-commune-specialite.json')) return Promise.resolve({ json: () => Promise.resolve(COMMUNE_SPECIALITE_PAYLOAD) })
      if (url.includes('rpps-commune.json')) return Promise.resolve({ json: () => Promise.resolve(COMMUNE_PAYLOAD) })
      if (url.includes('population-departement.json')) return Promise.resolve({ json: () => Promise.resolve(POPULATION_PAYLOAD) })
      return Promise.reject(new Error('URL non mockée: ' + url))
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('expose le total ("Tous") par défaut', async () => {
    const stats = useFranceRppsStats()
    await stats.load()

    expect(stats.loading.value).toBe(false)
    expect(stats.selectedProfession.value).toBe('Tous')
    expect(stats.byDepartement.value['01']).toBe(10)
    // 84 = Auvergne-Rhône-Alpes : 01 (10) + 03 (5) = 15, une somme pas une moyenne
    expect(stats.byRegion.value['84']).toBe(15)
  })

  it('change de valeurs quand on filtre sur une profession', async () => {
    const stats = useFranceRppsStats()
    await stats.load()

    stats.selectedProfession.value = 'Médecin'
    expect(stats.byDepartement.value['01']).toBe(8)
    expect(stats.byRegion.value['84']).toBe(9) // 8 + 1
  })

  it('lit le bon effectif "Tous" pour un point commune (pas une colonne profession décalée)', async () => {
    const stats = useFranceRppsStats()
    await stats.load()

    const point = stats.points.value.find((p) => p.nom === 'Bourg-en-Bresse')
    expect(point?.n).toBe(34) // "Tous", pas 7 (Médecin) ni 3 (Infirmier)
    expect(point?.total).toBe(34)
    expect(point?.codeInsee).toBe('01053')
  })

  it('lit le bon effectif filtré par profession pour un point commune', async () => {
    const stats = useFranceRppsStats()
    await stats.load()
    stats.selectedProfession.value = 'Infirmier'

    const point = stats.points.value.find((p) => p.nom === 'Bourg-en-Bresse')
    expect(point?.n).toBe(3)
    expect(point?.total).toBe(34) // le total ne bouge pas avec le filtre, sert de proxy de taille
  })

  it('allCommunes est indépendant du filtre de profession (pour la recherche)', async () => {
    const stats = useFranceRppsStats()
    await stats.load()
    stats.selectedProfession.value = 'Infirmier' // Bourg-en-Bresse aurait pu disparaître de `points`

    const option = stats.allCommunes.value.find((c) => c.nom === 'Bourg-en-Bresse')
    expect(option?.total).toBe(34)
  })

  it('expose le code INSEE des communes (clé de leurs établissements, pour « autour de moi »)', async () => {
    const stats = useFranceRppsStats()
    await stats.load()
    expect(stats.allCommunes.value[0]?.codeInsee).toBe('01053')
  })

  describe('densité', () => {
    it('colore par praticiens pour 100 000 habitants par défaut', async () => {
      const stats = useFranceRppsStats()
      await stats.load()

      expect(stats.modeDensite.value).toBe(true)
      expect(stats.densites.value['01']).toBeCloseTo(2, 5) // 10 / 500 000 * 100 000
      expect(stats.densites.value['75']).toBeCloseTo(5, 5) // 100 / 2 000 000 * 100 000
      expect(stats.valeurs.value['75']).toBeCloseTo(5, 5)
      expect(stats.maxValeur.value).toBeCloseTo(5, 5)
    })

    it('repasse en effectifs bruts (valeurs et échelle) quand on décoche la densité', async () => {
      const stats = useFranceRppsStats()
      await stats.load()
      stats.densite.value = false

      expect(stats.modeDensite.value).toBe(false)
      expect(stats.valeurs.value['75']).toBe(100)
      expect(stats.maxValeur.value).toBe(100)
    })

    it('un département sans population vaut 0 (jamais une division par zéro ni NaN)', async () => {
      const stats = useFranceRppsStats()
      await stats.load()
      expect(stats.densites.value['03']).toBe(0)
    })

    it('reste utilisable en effectifs bruts si la population est introuvable', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('population-departement.json')) return Promise.reject(new Error('404'))
        if (url.includes('rpps-departement.json')) return Promise.resolve({ json: () => Promise.resolve(DEPT_PAYLOAD) })
        return Promise.resolve({ json: () => Promise.resolve(COMMUNE_PAYLOAD) })
      })
      const stats = useFranceRppsStats()
      await stats.load()

      expect(stats.densiteDisponible.value).toBe(false)
      expect(stats.modeDensite.value).toBe(false) // densite reste à true mais n'est pas applicable
      expect(stats.valeurs.value['75']).toBe(100)
    })

    it('plafonne l\'échelle au 95e centile : un département extrême (Paris) ne délave pas les autres', async () => {
      // 40 départements à 100 000 habitants : 1..39 praticiens, plus un département « Paris » à 1 000
      const byDepartement: Record<string, Record<string, number>> = {}
      const habitants: Record<string, number> = {}
      for (let i = 1; i <= 39; i++) {
        byDepartement[`d${i}`] = { Tous: i }
        habitants[`d${i}`] = 100000
      }
      byDepartement.paris = { Tous: 1000 }
      habitants.paris = 100000
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('rpps-departement.json')) return Promise.resolve({ json: () => Promise.resolve({ ...DEPT_PAYLOAD, byDepartement }) })
        if (url.includes('population-departement.json')) return Promise.resolve({ json: () => Promise.resolve({ byDepartement: habitants }) })
        return Promise.resolve({ json: () => Promise.resolve(COMMUNE_PAYLOAD) })
      })
      const stats = useFranceRppsStats()
      await stats.load()

      expect(stats.valeurs.value.paris).toBe(1000) // la vraie valeur reste affichée...
      expect(stats.maxValeur.value).toBe(39) // ...mais l'échelle s'arrête avant elle
      expect(stats.plafonne.value).toBe(true)

      stats.densite.value = false // en effectif brut, on garde le vrai maximum
      expect(stats.maxValeur.value).toBe(1000)
      expect(stats.plafonne.value).toBe(false)
    })

    it('n\'annonce pas de plafond quand aucun département ne le dépasse', async () => {
      const stats = useFranceRppsStats()
      await stats.load()
      expect(stats.plafonne.value).toBe(false)
    })

    it('suit le filtre : la densité d\'une profession, pas du total', async () => {
      const stats = useFranceRppsStats()
      await stats.load()
      stats.selectedProfession.value = 'Médecin'
      expect(stats.densites.value['75']).toBeCloseTo(3, 5) // 60 / 2 000 000 * 100 000
    })
  })

  describe('spécialités', () => {
    it('ne liste que les spécialités de la profession choisie, par ordre alphabétique, avec leur effectif national', async () => {
      const stats = useFranceRppsStats()
      await stats.load()
      expect(stats.specialitesDeLaProfession.value).toEqual([]) // « Tous » : pas de spécialité

      stats.selectedProfession.value = 'Médecin'
      expect(stats.specialitesDeLaProfession.value).toEqual([
        { nom: 'Cardiologie', total: 32 }, // 2 + 30
        { nom: 'Médecine générale', total: 25 }, // 5 + 20
      ])
      stats.selectedProfession.value = 'Infirmier'
      expect(stats.specialitesDeLaProfession.value.map((s) => s.nom)).toEqual(['Pratique avancée'])
    })

    it('remplace l\'effectif de la profession par celui de la spécialité choisie', async () => {
      const stats = useFranceRppsStats()
      await stats.load()
      stats.selectedProfession.value = 'Médecin'
      stats.selectedSpecialite.value = 'Cardiologie'

      expect(stats.byDepartement.value['01']).toBe(2)
      expect(stats.byDepartement.value['75']).toBe(30)
      expect(stats.byDepartement.value['03']).toBe(0) // aucune entrée = 0
      expect(stats.densites.value['75']).toBeCloseTo(1.5, 5)
      expect(stats.selectionLabel.value).toBe('Cardiologie')
    })

    it('oublie la spécialité dès qu\'on change de profession (elle ne ressuscite pas au retour)', async () => {
      const stats = useFranceRppsStats()
      await stats.load()
      stats.selectedProfession.value = 'Médecin'
      stats.selectedSpecialite.value = 'Cardiologie'

      stats.selectedProfession.value = 'Infirmier'
      expect(stats.selectedSpecialite.value).toBeNull()
      stats.selectedProfession.value = 'Médecin'
      expect(stats.selectedSpecialite.value).toBeNull()
      expect(stats.byDepartement.value['75']).toBe(60)
      expect(stats.selectionLabel.value).toBe('Médecin')
    })

    it('ne télécharge le fichier des communes par spécialité que lorsqu\'on en choisit une, et une seule fois', async () => {
      const stats = useFranceRppsStats()
      await stats.load()
      const appels = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('rpps-commune-specialite.json')).length
      expect(appels()).toBe(0)

      stats.selectedProfession.value = 'Médecin'
      stats.selectedSpecialite.value = 'Cardiologie'
      await nextTick()
      await vi.waitFor(() => expect(stats.points.value.length).toBeGreaterThan(0))
      expect(appels()).toBe(1)

      stats.selectedSpecialite.value = 'Médecine générale'
      await nextTick()
      expect(appels()).toBe(1)
    })

    it('les points communes portent l\'effectif de la spécialité, et ignorent une commune sans coordonnées', async () => {
      const stats = useFranceRppsStats()
      await stats.load()
      stats.selectedProfession.value = 'Médecin'
      stats.selectedSpecialite.value = 'Cardiologie'
      await vi.waitFor(() => expect(stats.points.value.length).toBeGreaterThan(0))

      expect(stats.points.value).toHaveLength(1) // '99999' n'a pas de coordonnées
      expect(stats.points.value[0]).toMatchObject({ nom: 'Bourg-en-Bresse', codeInsee: '01053', n: 4, total: 34 })
    })

    it('reste utilisable avec un fichier de données sans spécialités (avant la première mise à jour)', async () => {
      const ancien = { ...DEPT_PAYLOAD, specialites: undefined, bySpecialite: undefined }
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('rpps-departement.json')) return Promise.resolve({ json: () => Promise.resolve(ancien) })
        if (url.includes('population-departement.json')) return Promise.resolve({ json: () => Promise.resolve(POPULATION_PAYLOAD) })
        return Promise.resolve({ json: () => Promise.resolve(COMMUNE_PAYLOAD) })
      })
      const stats = useFranceRppsStats()
      await stats.load()
      stats.selectedProfession.value = 'Médecin'
      expect(stats.specialitesDeLaProfession.value).toEqual([])
      expect(stats.byDepartement.value['75']).toBe(60)
    })
  })
})
