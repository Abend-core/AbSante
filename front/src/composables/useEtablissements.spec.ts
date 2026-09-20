import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEtablissements } from './useEtablissements'

// Commune 18033 : un hôpital (deux médecins dont un cardiologue, une infirmière) et un cabinet
// dont le médecin cumule deux spécialités. Le dernier champ des praticiens = indices de spécialités.
const DEPT_18 = {
  updatedAt: '2026-09-20T00:00:00Z',
  communes: {
    '18033': [
      ['HOPITAL', [47.08, 2.4], [
        ['MARTIN', 'PAUL', 'Médecin', '810000000001', [1]],
        ['DURAND', 'ANNE', 'Médecin', '810000000002', [2]],
        ['BRUN', 'SOLENNE', 'Infirmier', '810000000003'],
      ]],
      ['CABINET', null, [['LEROY', 'JEAN', 'Médecin', '810000000004', [1, 2]]]],
    ],
  },
}

describe('useEtablissements.forCommune', () => {
  let e: ReturnType<typeof useEtablissements>

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(DEPT_18) })))
    e = useEtablissements()
    await e.loadDept('18')
  })

  it('renvoie tout sans filtre, en gardant les spécialités des praticiens qui en ont', () => {
    const etabs = e.forCommune('18', '18033')
    expect(etabs.map((x) => x.nom)).toEqual(['HOPITAL', 'CABINET'])
    expect(etabs[0]!.praticiens[0]).toEqual({ nom: 'MARTIN', prenom: 'PAUL', profession: 'Médecin', id: '810000000001', specialites: [1] })
    expect(etabs[0]!.praticiens[2]).not.toHaveProperty('specialites')
  })

  it('filtre par profession : ne garde que ces praticiens et les établissements qui en ont', () => {
    const etabs = e.forCommune('18', '18033', 'Infirmier')
    expect(etabs.map((x) => x.nom)).toEqual(['HOPITAL'])
    expect(etabs[0]!.praticiens.map((p) => p.nom)).toEqual(['BRUN'])
  })

  it('filtre par spécialité (un praticien à deux spécialités est trouvé par chacune)', () => {
    const cardio = e.forCommune('18', '18033', 'Médecin', 1)
    expect(cardio.map((x) => [x.nom, x.praticiens.map((p) => p.nom)])).toEqual([['HOPITAL', ['MARTIN']], ['CABINET', ['LEROY']]])
    const generalistes = e.forCommune('18', '18033', 'Médecin', 2)
    expect(generalistes.map((x) => [x.nom, x.praticiens.map((p) => p.nom)])).toEqual([['HOPITAL', ['DURAND']], ['CABINET', ['LEROY']]])
  })

  it('ne renvoie rien pour une spécialité que personne n\'a, ni pour une commune inconnue', () => {
    expect(e.forCommune('18', '18033', 'Médecin', 99)).toEqual([])
    expect(e.forCommune('18', '99999')).toEqual([])
    expect(e.forCommune('75', '75056')).toEqual([]) // département pas chargé
  })

  it('ne retélécharge pas un département déjà chargé', async () => {
    await e.loadDept('18')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
