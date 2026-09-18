import { readFile, writeFile } from 'node:fs/promises'
import pg from 'pg'
import { afterAll, describe, expect, it } from 'vitest'
import { ImportError, importRpps } from '../src/import/importer.js'
import { TEST_DATABASE_URL, dropSchemas, query, uniqueSchema } from './helpers/db.js'
import { FIXTURE, IDS, writeRppsFiles } from './helpers/rpps-files.js'
import type { RppsFixture } from './helpers/rpps-files.js'

const created: string[] = []
function newSchema() {
  const s = uniqueSchema('imp')
  created.push(s)
  return s
}
afterAll(async () => {
  for (const s of created) await dropSchemas(s)
})

const schemaExists = async (name: string) =>
  (await query('SELECT 1 FROM information_schema.schemata WHERE schema_name = $1', [name])).length > 0
const ids = async (schema: string) =>
  (await query<{ id_national: string }>(`SELECT id_national FROM ${schema}.praticiens ORDER BY id_national`)).map((r) => r.id_national)

describe('importRpps', () => {
  it('construit les tables à partir des trois fichiers, dédoublonnées et nettoyées', async () => {
    const schema = newSchema()
    const { files } = await writeRppsFiles(FIXTURE)
    const logs: string[] = []
    const result = await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files, log: (m) => logs.push(m) })

    expect(result.counts).toEqual({
      praticiens: 4, // 4 personnes (deux homonymes distinctes par identifiant)
      structures: 4, // Antagene, hôpital, cabinet sans identifiant, cabinet O'Brien
      activites: 5, // 6 lignes source dont 1 doublon exact
      savoir_faire: 2, // SM04 présent dans les deux fichiers -> 1 seul, + CM0001
      diplomes: 2, // le diplôme d'une personne inconnue est écarté
    })
    expect(logs.length).toBeGreaterThanOrEqual(4)

    // Aucune chaîne vide en base : tout est NULL (l'API n'a pas à s'en soucier)
    const blanks = await query<{ n: string }>(`SELECT count(*) AS n FROM ${schema}.structures WHERE btrim(coalesce(email,'x')) = '' OR btrim(coalesce(telephone,'x')) = ''`)
    expect(Number(blanks[0]?.n)).toBe(0)

    // Les données de suivi sont présentes, et les tables de travail ont disparu
    const meta = Object.fromEntries((await query<{ cle: string; valeur: string }>(`SELECT cle, valeur FROM ${schema}.meta`)).map((r) => [r.cle, r.valeur]))
    expect(meta.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(meta.count_praticiens).toBe('4')
    const leftovers = await query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name IN ('act', 'stg_activite', 'stg_diplome', 'stg_savoir_faire')`, [schema])
    expect(leftovers).toEqual([])
    expect(await schemaExists(`${schema}_new`)).toBe(false)
    expect(await schemaExists(`${schema}_old`)).toBe(false)
  })

  it('remplace les données précédentes lors d\'un nouvel import (idempotent, pas de résidu)', async () => {
    const schema = newSchema()
    const first = await writeRppsFiles(FIXTURE)
    await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files: first.files })
    expect(await ids(schema)).toContain(IDS.DR_MARTIN)

    const withoutMartin: RppsFixture = {
      activites: FIXTURE.activites.filter((r) => r.id_national !== IDS.DR_MARTIN),
      diplomes: FIXTURE.diplomes,
      savoirFaire: FIXTURE.savoirFaire.filter((r) => r.id_national !== IDS.DR_MARTIN),
    }
    const second = await writeRppsFiles(withoutMartin)
    await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files: second.files })
    expect(await ids(schema)).toEqual([IDS.SOLENNE_INFIRMIERE, IDS.O_BRIEN, IDS.SOLENNE_ANTAGENE].sort())

    // Relancer le même import donne exactement le même résultat
    const again = await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files: second.files })
    expect(again.counts.praticiens).toBe(3)
    expect(await schemaExists(`${schema}_old`)).toBe(false)
  })

  it('un import qui échoue laisse les données actuelles intactes et ne laisse aucun résidu', async () => {
    const schema = newSchema()
    const good = await writeRppsFiles(FIXTURE)
    await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files: good.files })
    const before = await ids(schema)

    // Ligne de données avec une colonne en trop : le chargement plante en cours de route
    const bad = await writeRppsFiles(FIXTURE)
    await writeFile(bad.files.diplomes, (await readFile(bad.files.diplomes, 'utf8')) + '8|1|810|X|Y|a|b|c|d|e|f|g|h|EN TROP\n')
    await expect(importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files: bad.files })).rejects.toThrow(ImportError)

    expect(await ids(schema)).toEqual(before)
    expect(await schemaExists(`${schema}_new`)).toBe(false)
  })

  it('refuse un fichier d\'activités trop court (téléchargement tronqué) et garde les données actuelles', async () => {
    const schema = newSchema()
    const good = await writeRppsFiles(FIXTURE)
    await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files: good.files })

    const truncated = await writeRppsFiles({ ...FIXTURE, activites: FIXTURE.activites.slice(0, 1) })
    await expect(
      importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files: truncated.files, minActivites: 5 }),
    ).rejects.toThrow(/trop court/)
    expect((await ids(schema)).length).toBe(4)
    expect(await schemaExists(`${schema}_new`)).toBe(false)
  })

  it('refuse un en-tête qui a changé, en nommant la colonne fautive, avant de toucher à la base', async () => {
    const schema = newSchema()
    const { files } = await writeRppsFiles(FIXTURE)
    const content = await readFile(files.activites, 'utf8')
    // Deux colonnes permutées : le genre de dérive qui rangerait un téléphone dans un e-mail
    await writeFile(files.activites, content.replace('Téléphone (coord. structure)|Téléphone 2 (coord. structure)', 'Téléphone 2 (coord. structure)|Téléphone (coord. structure)'))
    await expect(importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files })).rejects.toThrow(/colonne 41 « Téléphone 2 \(coord\. structure\) » au lieu de « Téléphone \(coord\. structure\) »/)
    expect(await schemaExists(schema)).toBe(false)
    expect(await schemaExists(`${schema}_new`)).toBe(false)
  })

  it('refuse un fichier avec une colonne en plus ou en moins', async () => {
    const schema = newSchema()
    const { files } = await writeRppsFiles(FIXTURE)
    const content = await readFile(files.savoirFaire, 'utf8')
    await writeFile(files.savoirFaire, content.replace('|Libellé savoir-faire', ''))
    await expect(importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files })).rejects.toThrow(/savoir-faire.*12 colonnes, 13 attendues/)
  })

  it('signale clairement un fichier manquant', async () => {
    const { files } = await writeRppsFiles(FIXTURE)
    await expect(
      importRpps({ databaseUrl: TEST_DATABASE_URL, schema: newSchema(), files: { ...files, diplomes: '/nulle/part/diplomes.txt' } }),
    ).rejects.toThrow(/introuvable ou illisible : \/nulle\/part\/diplomes\.txt/)
  })

  it('refuse un schéma dangereux', async () => {
    const { files } = await writeRppsFiles(FIXTURE)
    await expect(importRpps({ databaseUrl: TEST_DATABASE_URL, schema: 'x; DROP SCHEMA public', files })).rejects.toThrow(/Schéma invalide/)
  })

  it('refuse un second import simultané sur le même schéma', async () => {
    const schema = newSchema()
    const { files } = await writeRppsFiles(FIXTURE)
    const holder = new pg.Client({ connectionString: TEST_DATABASE_URL })
    await holder.connect()
    try {
      await holder.query('SELECT pg_advisory_lock(hashtext($1))', [`absante-import-rpps:${schema}`])
      await expect(importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files })).rejects.toThrow(/déjà en cours/)
      // et un autre schéma n'est pas bloqué
      await expect(importRpps({ databaseUrl: TEST_DATABASE_URL, schema: newSchema(), files })).resolves.toBeDefined()
    } finally {
      await holder.end()
    }
    await expect(importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files })).resolves.toBeDefined() // verrou relâché
  })

  it('accepte des fins de ligne Windows (CRLF) et un BOM en tête de fichier', async () => {
    const schema = newSchema()
    const { files } = await writeRppsFiles(FIXTURE)
    for (const path of Object.values(files)) {
      const content = await readFile(path, 'utf8')
      await writeFile(path, '﻿' + content.replace(/\n/g, '\r\n'))
    }
    const result = await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files })
    expect(result.counts.praticiens).toBe(4)
  })
})
