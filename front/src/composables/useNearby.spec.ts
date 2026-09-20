import { describe, expect, it, vi } from 'vitest'
import { findNearby } from './useNearby'
import type { Etablissement } from './useEtablissements'
import type { CommuneOption } from './useFranceRppsStats'

const commune = (codeInsee: string, nom: string, lat: number, lon: number, dept: string): CommuneOption => ({ codeInsee, nom, lat, lon, dept, total: 100 })
const etab = (nom: string, coords: [number, number] | null): Etablissement => ({ nom, coords, praticiens: [{ nom: 'X', prenom: 'Y', profession: 'Médecin', id: '810000000001' }] })

// Montpellier (34), Lattes (34, ~6 km), Nîmes (30, ~50 km), Paris (75, très loin)
const MONTPELLIER = commune('34172', 'Montpellier', 43.61, 3.877, '34')
const LATTES = commune('34129', 'Lattes', 43.567, 3.933, '34')
const NIMES = commune('30189', 'Nîmes', 43.837, 4.36, '30')
const PARIS = commune('75056', 'Paris', 48.857, 2.352, '75')
const ORIGIN: [number, number] = [43.6109, 3.8772]

function deps(parCommune: Record<string, Etablissement[]>, communes = [MONTPELLIER, LATTES, NIMES, PARIS]) {
  return {
    communes,
    loadDept: vi.fn(async () => {}),
    forCommune: vi.fn((_dept: string, code: string) => parCommune[code] ?? []),
  }
}

describe('findNearby', () => {
  it('classe les établissements du plus proche au plus lointain, avec leur distance', async () => {
    const d = deps({
      '34172': [etab('LOIN', [43.66, 3.9]), etab('PROCHE', [43.611, 3.878])],
      '34129': [etab('LATTES', [43.567, 3.933])],
    })
    const res = await findNearby(ORIGIN, d, { count: 3 })
    expect(res.map((r) => r.etablissement.nom)).toEqual(['PROCHE', 'LOIN', 'LATTES'])
    expect(res[0]!.distanceKm).toBeLessThan(0.2)
    expect(res.every((r, i) => i === 0 || r.distanceKm >= res[i - 1]!.distanceKm)).toBe(true)
  })

  it('se contente du plus petit rayon quand il y a assez de résultats (ne charge pas les départements lointains)', async () => {
    const d = deps({ '34172': [etab('A', [43.611, 3.878]), etab('B', [43.612, 3.879])] })
    await findNearby(ORIGIN, d, { count: 2 })
    expect(d.loadDept).toHaveBeenCalledTimes(1)
    expect(d.loadDept).toHaveBeenCalledWith('34')
  })

  it('élargit le rayon quand il manque des résultats, et charge alors le département voisin', async () => {
    const d = deps({ '34172': [etab('A', [43.611, 3.878])], '30189': [etab('NIMES', [43.837, 4.36])] })
    const res = await findNearby(ORIGIN, d, { count: 2 })
    expect(res.map((r) => r.etablissement.nom)).toEqual(['A', 'NIMES'])
    expect(res[1]!.distanceKm).toBeGreaterThan(40)
    expect(d.loadDept).toHaveBeenCalledWith('30')
  })

  it('renvoie ce qu\'il a trouvé (même moins que demandé) plutôt que d\'aller au bout du pays', async () => {
    const d = deps({ '75056': [etab('PARIS', [48.857, 2.352])] })
    expect(await findNearby(ORIGIN, d, { count: 5 })).toEqual([])
    expect(d.loadDept).not.toHaveBeenCalledWith('75')
  })

  it('place un établissement sans adresse géocodée au centre de sa commune, en le signalant approximatif', async () => {
    const d = deps({ '34129': [etab('SANS ADRESSE', null)] })
    const [res] = await findNearby(ORIGIN, d, { count: 1 })
    expect(res).toMatchObject({ approximative: true, position: [LATTES.lat, LATTES.lon] })
    expect(res!.distanceKm).toBeGreaterThan(4)
  })

  it('un établissement géocodé n\'est pas approximatif', async () => {
    const [res] = await findNearby(ORIGIN, deps({ '34172': [etab('A', [43.611, 3.878])] }), { count: 1 })
    expect(res!.approximative).toBe(false)
  })

  it('exclut un établissement hors du rayon même si sa commune est retenue (marge du centre-commune)', async () => {
    const d = deps({ '34172': [etab('HORS RAYON', [43.9, 3.877])] }) // ~32 km au nord
    expect(await findNearby(ORIGIN, d, { count: 1, radiiKm: [10] })).toEqual([])
  })

  it('renvoie une liste vide quand rien ne correspond à la sélection', async () => {
    expect(await findNearby(ORIGIN, deps({}))).toEqual([])
  })
})
