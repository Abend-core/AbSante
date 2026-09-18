import { describe, expect, it } from 'vitest'
import { mapFiche } from '../src/fiche/mapper.js'
import type { ActiviteRow, PraticienRow } from '../src/fiche/mapper.js'

const praticien: PraticienRow = {
  id_national: '810006881261', id_pp: '10006881261', type_identifiant: '8',
  civilite: 'Madame', civilite_exercice: null, nom: 'BRUN', prenom: 'SOLENNE',
}

const activite: ActiviteRow = {
  code_profession: '86', profession: 'Technicien de Laboratoire', categorie: 'Civil', mode_exercice: 'Salarié',
  secteur: 'Recherche', section_pharmaciens: null, role: 'Salarié en poste fixe', genre_activite: null,
  structure: { cle: 'R1', raison_sociale: 'ANTAGENE', voie: '6 ALL DU LEVANT', telephone: null, email: '' },
}

describe('mapFiche', () => {
  it('traduit les colonnes SQL vers le format de l\'API', () => {
    const fiche = mapFiche(praticien, [activite], [], [], '2026-09-18T20:51:21.551Z')
    expect(fiche).toMatchObject({
      id: '810006881261', identifiantPP: '10006881261', typeIdentifiant: '8', civilite: 'Madame', nom: 'BRUN', prenom: 'SOLENNE',
      misAJourLe: '2026-09-18T20:51:21.551Z',
    })
    expect(fiche.activites[0]).toMatchObject({
      codeProfession: '86', profession: 'Technicien de Laboratoire', secteurActivite: 'Recherche',
      structure: { cle: 'R1', raisonSociale: 'ANTAGENE', voie: '6 ALL DU LEVANT' },
    })
  })

  it('renvoie null (jamais undefined ni chaîne vide) pour toute information absente', () => {
    const fiche = mapFiche(praticien, [activite], [], [], null)
    expect(fiche.civiliteExercice).toBeNull()
    expect(fiche.misAJourLe).toBeNull()
    expect(fiche.activites[0]?.sectionPharmaciens).toBeNull()
    const s = fiche.activites[0]?.structure
    expect(s?.telephone).toBeNull()
    expect(s?.email).toBeNull() // chaîne vide -> null
    expect(s?.siret).toBeNull() // clé absente du JSON -> null
    // aucune valeur undefined nulle part : le JSON garde toutes les clés
    expect(JSON.parse(JSON.stringify(fiche)).activites[0].structure).toHaveProperty('siret', null)
  })

  it('accepte une activité sans structure', () => {
    const fiche = mapFiche(praticien, [{ ...activite, structure: null }], [], [], null)
    expect(fiche.activites[0]?.structure).toBeNull()
  })

  it('ne renvoie que des listes (jamais null) quand il n\'y a ni activité, ni diplôme, ni spécialité', () => {
    const fiche = mapFiche(praticien, [], [], [], null)
    expect(fiche.activites).toEqual([])
    expect(fiche.savoirFaire).toEqual([])
    expect(fiche.diplomes).toEqual([])
  })

  it('mappe spécialités et diplômes, en nettoyant les espaces', () => {
    const fiche = mapFiche(
      praticien,
      [],
      [{ profession: 'Médecin', type_savoir_faire: 'Spécialité ordinale', code_savoir_faire: 'SM04', savoir_faire: '  Cardiologie ' }],
      [{ type_diplome: 'DE', code_diplome: 'DE09', diplome: 'Infirmier', type_autorisation: null, discipline_autorisation: '  ' }],
      null,
    )
    expect(fiche.savoirFaire).toEqual([{ profession: 'Médecin', type: 'Spécialité ordinale', code: 'SM04', libelle: 'Cardiologie' }])
    expect(fiche.diplomes).toEqual([
      { type: 'DE', code: 'DE09', libelle: 'Infirmier', typeAutorisation: null, disciplineAutorisation: null },
    ])
  })
})
