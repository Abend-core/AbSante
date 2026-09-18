import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFranceRppsStats } from './useFranceRppsStats'

const DEPT_PAYLOAD = {
  updatedAt: '2026-09-17T00:00:00Z',
  professions: ['Médecin', 'Infirmier'],
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

describe('useFranceRppsStats', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('rpps-departement.json')) return Promise.resolve({ json: () => Promise.resolve(DEPT_PAYLOAD) })
        if (url.includes('rpps-commune.json')) return Promise.resolve({ json: () => Promise.resolve(COMMUNE_PAYLOAD) })
        return Promise.reject(new Error('URL non mockée: ' + url))
      }),
    )
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
})
