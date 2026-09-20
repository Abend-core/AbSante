import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { importRpps } from '../src/import/importer.js'
import { TEST_DATABASE_URL, dropSchemas, query, uniqueSchema } from './helpers/db.js'
import { FIXTURE, writeRppsFiles } from './helpers/rpps-files.js'

const schema = uniqueSchema('histo')
const historique = `${schema}_historique`
let script: string

const snapshot = (date: string, rows: [string, string, string, number][]) =>
  query(
    `INSERT INTO ${schema}.effectifs_snapshot (date_donnees, departement, profession, specialite, n)
     SELECT $1::date, * FROM unnest($2::text[], $3::text[], $4::text[], $5::int[])`,
    [date, rows.map((r) => r[0]), rows.map((r) => r[1]), rows.map((r) => r[2]), rows.map((r) => r[3])],
  )
const releves = () =>
  query<{ mois: string; departement: string; profession: string; specialite: string; n: number; date_donnees: string }>(
    `SELECT mois::text, departement, profession, specialite, n, date_donnees::text FROM ${historique}.effectifs ORDER BY mois, departement, profession, specialite`,
  )

beforeAll(async () => {
  // Le script du Pi, tel quel : seuls les noms de schémas changent pour ne pas toucher aux vrais.
  script = (await readFile(new URL('../../scripts/history_upsert.sql', import.meta.url), 'utf8'))
    .replaceAll('rpps.effectifs_snapshot', `${schema}.effectifs_snapshot`)
    .replaceAll('historique', historique)
  const { files } = await writeRppsFiles(FIXTURE)
  await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files })
})

afterAll(async () => {
  await dropSchemas(schema)
  await dropSchemas(historique)
})

const run = async () => {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  try {
    await client.query(script)
  } finally {
    await client.end()
  }
}

describe('historique des effectifs', () => {
  it('l\'import crée une table d\'instantané vide (la recopie ne peut jamais échouer sur une table absente)', async () => {
    expect(await query(`SELECT * FROM ${schema}.effectifs_snapshot`)).toEqual([])
  })

  it('recopie l\'instantané dans le schéma d\'historique, au mois des données', async () => {
    await snapshot('2026-09-18', [['75', 'Médecin', '', 100], ['75', 'Médecin', 'Cardiologie', 10], ['13', 'Tous', '', 500]])
    await run()
    expect(await releves()).toEqual([
      { mois: '2026-09-01', departement: '13', profession: 'Tous', specialite: '', n: 500, date_donnees: '2026-09-18' },
      { mois: '2026-09-01', departement: '75', profession: 'Médecin', specialite: '', n: 100, date_donnees: '2026-09-18' },
      { mois: '2026-09-01', departement: '75', profession: 'Médecin', specialite: 'Cardiologie', n: 10, date_donnees: '2026-09-18' },
    ])
  })

  it('rejouer le script est sans effet (pas de doublon)', async () => {
    await run()
    expect(await releves()).toHaveLength(3)
  })

  it('dans un même mois, le relevé le plus récent remplace le précédent', async () => {
    await query(`DELETE FROM ${schema}.effectifs_snapshot`)
    await snapshot('2026-09-25', [['75', 'Médecin', '', 110]])
    await run()
    const medecins = (await releves()).find((r) => r.departement === '75' && r.profession === 'Médecin' && r.specialite === '')
    expect(medecins).toMatchObject({ n: 110, date_donnees: '2026-09-25' })
  })

  it('un relevé plus ancien ne remplace jamais un plus récent', async () => {
    await query(`DELETE FROM ${schema}.effectifs_snapshot`)
    await snapshot('2026-09-10', [['75', 'Médecin', '', 1]])
    await run()
    const medecins = (await releves()).find((r) => r.departement === '75' && r.profession === 'Médecin' && r.specialite === '')
    expect(medecins).toMatchObject({ n: 110, date_donnees: '2026-09-25' })
  })

  it('garde un point par mois : l\'historique survit à la mise à jour suivante', async () => {
    await query(`DELETE FROM ${schema}.effectifs_snapshot`)
    await snapshot('2026-10-03', [['75', 'Médecin', '', 120]])
    await run()
    const serie = (await releves()).filter((r) => r.departement === '75' && r.profession === 'Médecin' && r.specialite === '')
    expect(serie.map((r) => [r.mois, r.n])).toEqual([['2026-09-01', 110], ['2026-10-01', 120]])
  })
})
