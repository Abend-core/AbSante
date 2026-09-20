import type pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPool } from '../src/db.js'
import { normalizeQuery, toTsQuery } from '../src/fiche/recherche.js'
import { PgPraticienRepository } from '../src/fiche/repository.js'
import { importRpps } from '../src/import/importer.js'
import { TEST_DATABASE_URL, dropSchemas, uniqueSchema } from './helpers/db.js'
import { FIXTURE, IDS, writeRppsFiles } from './helpers/rpps-files.js'

describe('normalizeQuery', () => {
  it.each([
    ['Élodie', ['elodie']],
    ['  BRUN   Solenne ', ['brun', 'solenne']],
    ['Jean-Pierre  D\'Aubigné', ['jean', 'pierre', 'd', 'aubigne']],
    ['Œuvre Cœur', ['oeuvre', 'coeur']],
    ["o'brien; DROP TABLE x --", ['o', 'brien', 'drop', 'table']],
    ['un deux trois quatre cinq', ['un', 'deux', 'trois', 'quatre']],
    ['---', []],
  ])('%j -> %j', (raw, mots) => {
    expect(normalizeQuery(raw)).toEqual(mots)
  })

  it('ne produit que des mots sûrs pour une tsquery', () => {
    expect(toTsQuery(normalizeQuery(`a' | !b:* & (c) <-> d\\`))).toBe('a:* & b:* & c:* & d:*')
  })
})

const schema = uniqueSchema('recherche')
let pool: pg.Pool
let repository: PgPraticienRepository

beforeAll(async () => {
  // Le jeu de base + 25 « DUPONT » pour éprouver la limite de résultats.
  const dupont = Array.from({ length: 25 }, (_, i) => ({
    type_id_pp: '8', id_pp: `2000000${String(i).padStart(4, '0')}`, id_national: `82000000${String(i).padStart(4, '0')}`,
    nom: 'DUPONT', prenom: `PRENOM${String.fromCharCode(65 + i)}`, code_profession: '10', profession: 'Médecin',
    raison_sociale: 'CABINET', code_postal: '69001', commune: 'Lyon',
  }))
  const { files } = await writeRppsFiles({ ...FIXTURE, activites: [...FIXTURE.activites, ...dupont] })
  await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files })
  pool = createPool({ databaseUrl: TEST_DATABASE_URL, max: 2 })
  repository = new PgPraticienRepository(pool, schema)
})

afterAll(async () => {
  await pool.end()
  await dropSchemas(schema)
})

describe('PgPraticienRepository.rechercher', () => {
  it('trouve un praticien sans tenir compte des accents ni de la casse', async () => {
    for (const texte of ['elodie', 'ÉLODIE', 'élodie o brien', 'Obrien'.replace('Obrien', "o'brien")]) {
      const { resultats } = await repository.rechercher(texte)
      expect(resultats.map((r) => r.id), texte).toEqual([IDS.O_BRIEN])
    }
  })

  it('accepte nom et prénom dans n\'importe quel ordre, en préfixe', async () => {
    for (const texte of ['brun solenne', 'solenne brun', 'bru sol']) {
      const { resultats } = await repository.rechercher(texte)
      expect(resultats.map((r) => r.id).sort(), texte).toEqual([IDS.SOLENNE_ANTAGENE, IDS.SOLENNE_INFIRMIERE].sort())
    }
  })

  it('distingue les homonymes par leur profession et leur lieu', async () => {
    const { resultats } = await repository.rechercher('brun solenne')
    const infirmiere = resultats.find((r) => r.id === IDS.SOLENNE_INFIRMIERE)
    expect(infirmiere).toMatchObject({ nom: 'BRUN', prenom: 'SOLENNE', professions: ['Infirmier'], commune: 'Montpellier' })
    const technicienne = resultats.find((r) => r.id === IDS.SOLENNE_ANTAGENE)
    expect(technicienne).toMatchObject({ professions: ['Technicien de Laboratoire'], commune: 'La Tour-de-Salvagny', codePostal: '69890' })
  })

  it('renvoie un praticien sans lieu d\'exercice (commune null) plutôt que de l\'écarter', async () => {
    const { resultats } = await repository.rechercher('martin paul')
    expect(resultats).toHaveLength(1)
    expect(resultats[0]).toMatchObject({ id: IDS.DR_MARTIN, civiliteExercice: 'Docteur', commune: null, codePostal: null })
  })

  it('exige que TOUS les mots correspondent', async () => {
    expect((await repository.rechercher('brun paul')).resultats).toEqual([])
  })

  it('limite à 20 résultats, triés, et signale qu\'il y en avait d\'autres', async () => {
    const { resultats, tronque } = await repository.rechercher('dupont')
    expect(resultats).toHaveLength(20)
    expect(tronque).toBe(true)
    expect(resultats.map((r) => r.prenom)).toEqual([...resultats.map((r) => r.prenom)].sort())
    const precise = await repository.rechercher('dupont prenomb')
    expect(precise.resultats.map((r) => r.prenom)).toEqual(['PRENOMB'])
    expect(precise.tronque).toBe(false)
  })

  it('ne cherche pas en dessous de 3 caractères, ni sur de la ponctuation', async () => {
    expect(await repository.rechercher('br')).toEqual({ resultats: [], tronque: false })
    expect(await repository.rechercher("'--;")).toEqual({ resultats: [], tronque: false })
  })

  it('traite une tentative d\'injection comme du texte ordinaire', async () => {
    const { resultats } = await repository.rechercher(`brun'; DROP TABLE ${schema}.praticiens; --`)
    expect(resultats).toEqual([])
    expect((await repository.rechercher('martin')).resultats).toHaveLength(1) // la table est intacte
  })
})
