import type pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPool } from '../src/db.js'
import { PgPraticienRepository, RepositoryUnavailableError, isUnavailableError } from '../src/fiche/repository.js'
import { importRpps } from '../src/import/importer.js'
import { TEST_DATABASE_URL, dropSchemas, uniqueSchema } from './helpers/db.js'
import { FIXTURE, IDS, writeRppsFiles } from './helpers/rpps-files.js'

const schema = uniqueSchema('repo')
let pool: pg.Pool
let repository: PgPraticienRepository

beforeAll(async () => {
  const { files } = await writeRppsFiles(FIXTURE)
  await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files })
  pool = createPool({ databaseUrl: TEST_DATABASE_URL, max: 2 })
  repository = new PgPraticienRepository(pool, schema)
})

afterAll(async () => {
  await pool.end()
  await dropSchemas(schema)
})

describe('PgPraticienRepository.findFiche', () => {
  it('reconstitue la fiche complète d\'un praticien (identité, lieu, diplôme)', async () => {
    const fiche = await repository.findFiche(IDS.SOLENNE_ANTAGENE)
    expect(fiche).toMatchObject({
      id: IDS.SOLENNE_ANTAGENE, identifiantPP: '10006881261', typeIdentifiant: '8', nom: 'BRUN', prenom: 'SOLENNE', civilite: 'Madame',
    })
    expect(fiche?.activites).toHaveLength(1)
    expect(fiche?.activites[0]).toMatchObject({ profession: 'Technicien de Laboratoire', modeExercice: 'Salarié', secteurActivite: 'Recherche' })
    expect(fiche?.activites[0]?.structure).toMatchObject({
      raisonSociale: 'ANTAGENE', siret: '44154525800036', voie: '6 ALL DU LEVANT', codePostal: '69890', commune: 'La Tour-de-Salvagny',
    })
    expect(fiche?.diplomes).toEqual([
      { type: 'Autre type de diplôme', code: 'DIP348', libelle: 'Diplôme Technicien Laboratoire arrêté 21/10/1992', typeAutorisation: null, disciplineAutorisation: null },
    ])
    expect(fiche?.misAJourLe).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('marque null tout ce que le RPPS ne renseigne pas (téléphone, e-mail, spécialités...)', async () => {
    const fiche = await repository.findFiche(IDS.SOLENNE_ANTAGENE)
    const s = fiche?.activites[0]?.structure
    expect(s?.telephone).toBeNull()
    expect(s?.email).toBeNull()
    expect(s?.enseigne).toBeNull()
    expect(fiche?.civiliteExercice).toBeNull()
    expect(fiche?.savoirFaire).toEqual([])
  })

  it('distingue deux homonymes grâce à l\'identifiant national', async () => {
    const infirmiere = await repository.findFiche(IDS.SOLENNE_INFIRMIERE)
    expect(infirmiere?.nom).toBe('BRUN')
    expect(infirmiere?.activites.every((a) => a.profession === 'Infirmier')).toBe(true)
    expect(infirmiere?.diplomes[0]?.libelle).toBe("Diplôme d'Etat français d'Infirmier")
  })

  it('regroupe tous les lieux d\'exercice, sans doublon, dont un lieu sans identifiant technique', async () => {
    const fiche = await repository.findFiche(IDS.SOLENNE_INFIRMIERE)
    expect(fiche?.activites).toHaveLength(2) // 3 lignes source dont un doublon exact
    const hopital = fiche?.activites.find((a) => a.modeExercice === 'Salarié')?.structure
    expect(hopital).toMatchObject({
      cle: 'F340785161', raisonSociale: 'HOPITAL LAPEYRONIE CHU MONTPELLIER', voie: '371 Avenue DU DOYEN GASTON GIRAUD',
      telephone: '0467336733', telecopie: '0467338963', email: null,
    })
    const cabinet = fiche?.activites.find((a) => a.modeExercice === 'Libéral')?.structure
    expect(cabinet).toMatchObject({ raisonSociale: 'CABINET INFIRMIER', voie: '12 RUE DES LILAS', email: 'cabinet@example.org', telephone: null })
    expect(cabinet?.cle).toMatch(/^x:[0-9a-f]{32}$/)
  })

  it('accepte une activité sans aucun lieu (structure null) et liste les spécialités sans doublon', async () => {
    const fiche = await repository.findFiche(IDS.DR_MARTIN)
    expect(fiche?.civiliteExercice).toBe('Docteur')
    expect(fiche?.activites).toHaveLength(1)
    expect(fiche?.activites[0]?.structure).toBeNull()
    // SM04 figure à la fois dans le fichier savoir-faire et sur la ligne d'activité : un seul exemplaire
    expect(fiche?.savoirFaire.map((s) => s.code).sort()).toEqual(['CM0001', 'SM04'])
    expect(fiche?.savoirFaire.find((s) => s.code === 'SM04')).toEqual({
      profession: 'Médecin', type: 'Spécialité ordinale', code: 'SM04', libelle: 'Cardiologie et maladies vasculaires',
    })
  })

  it('conserve guillemets et antislash des noms tels quels (le RPPS n\'est pas du vrai CSV)', async () => {
    const fiche = await repository.findFiche(IDS.O_BRIEN)
    expect(fiche?.nom).toBe('O"BRIEN\\D')
    expect(fiche?.activites[0]?.structure?.raisonSociale).toBe('CABINET "DU PARC"')
  })

  it('renvoie null pour un identifiant inconnu, ou présent seulement dans le fichier des diplômes', async () => {
    expect(await repository.findFiche('810000000000')).toBeNull()
    expect(await repository.findFiche('899999999999')).toBeNull()
  })

  it('traite une tentative d\'injection SQL comme un simple identifiant inconnu', async () => {
    expect(await repository.findFiche("' OR '1'='1")).toBeNull()
    expect(await repository.findFiche(`${IDS.DR_MARTIN}'; DROP TABLE ${schema}.praticiens; --`)).toBeNull()
    expect(await repository.findFiche(IDS.DR_MARTIN)).not.toBeNull() // la table est intacte
  })
})

describe('PgPraticienRepository — robustesse', () => {
  it('ping réussit quand la base répond', async () => {
    await expect(repository.ping()).resolves.toBeUndefined()
  })

  it('lève RepositoryUnavailableError (et non une erreur brute) quand la base est injoignable', async () => {
    const deadPool = createPool({ databaseUrl: 'postgres://absante:absante@127.0.0.1:1/absante', max: 1 })
    const dead = new PgPraticienRepository(deadPool, schema)
    await expect(dead.findFiche(IDS.DR_MARTIN)).rejects.toBeInstanceOf(RepositoryUnavailableError)
    await expect(dead.ping()).rejects.toBeInstanceOf(RepositoryUnavailableError)
    await deadPool.end()
  })

  it('lève RepositoryUnavailableError quand la requête dépasse statement_timeout', async () => {
    const slowPool = createPool({ databaseUrl: TEST_DATABASE_URL, max: 1, statementTimeoutMs: 100 })
    // Un verrou exclusif sur la table fait attendre la requête au-delà du délai.
    const blocker = await pool.connect()
    await blocker.query('BEGIN')
    await blocker.query(`LOCK TABLE ${schema}.praticiens IN ACCESS EXCLUSIVE MODE`)
    try {
      const slow = new PgPraticienRepository(slowPool, schema)
      await expect(slow.findFiche(IDS.DR_MARTIN)).rejects.toBeInstanceOf(RepositoryUnavailableError)
    } finally {
      await blocker.query('ROLLBACK')
      blocker.release()
      await slowPool.end()
    }
  })

  it('lève RepositoryUnavailableError tant que les données n\'ont pas été importées (schéma absent)', async () => {
    const empty = new PgPraticienRepository(pool, uniqueSchema('vide'))
    await expect(empty.findFiche(IDS.DR_MARTIN)).rejects.toBeInstanceOf(RepositoryUnavailableError)
  })

  it('reste utilisable après une panne : la connexion suivante fonctionne', async () => {
    expect(await repository.findFiche(IDS.DR_MARTIN)).not.toBeNull()
  })

  it.each(['rpps; DROP TABLE x', 'A', '', 'a b', '"x"'])('refuse le schéma dangereux %j', (bad) => {
    expect(() => new PgPraticienRepository(pool, bad)).toThrow(/Schéma invalide/)
  })
})

describe('isUnavailableError', () => {
  it.each([
    [Object.assign(new Error('x'), { code: 'ECONNREFUSED' }), true],
    [Object.assign(new Error('x'), { code: '57014' }), true],
    [Object.assign(new Error('x'), { code: '57P01' }), true],
    [new Error('timeout exceeded when trying to connect'), true],
    [new Error('Connection terminated unexpectedly'), true],
    [Object.assign(new Error('agrégat'), { errors: [Object.assign(new Error('y'), { code: 'ECONNREFUSED' })] }), true],
    [Object.assign(new Error('password authentication failed'), { code: '28P01' }), true],
    [Object.assign(new Error('relation does not exist'), { code: '42P01' }), true],
    [Object.assign(new Error('column does not exist'), { code: '42703' }), false],
    [new Error('bug applicatif'), false],
    ['pas une erreur', false],
  ])('%s -> %s', (err, expected) => {
    expect(isUnavailableError(err)).toBe(expected)
  })
})
