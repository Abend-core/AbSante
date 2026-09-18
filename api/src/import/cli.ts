import { ConfigError } from '../config.js'
import { ImportError, importRpps } from './importer.js'

/** Usage : npm run import:rpps -- --dir <dossier des fichiers RPPS> [--min-activites N]
 *  Variables : DATABASE_URL (obligatoire), DB_SCHEMA (défaut : rpps). */
function parseArgs(argv: string[]) {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]
    const value = argv[i + 1]
    if (!key?.startsWith('--') || value === undefined) throw new ConfigError(`Argument invalide : ${key ?? ''}`)
    args[key.slice(2)] = value
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new ConfigError('DATABASE_URL est obligatoire')
  const dir = (args.dir ?? '.').replace(/\/$/, '')
  const minActivites = args['min-activites'] ? Number(args['min-activites']) : 1_000_000
  if (!Number.isInteger(minActivites) || minActivites < 0) throw new ConfigError('--min-activites doit être un entier positif')

  const result = await importRpps({
    databaseUrl,
    schema: process.env.DB_SCHEMA || 'rpps',
    files: {
      activites: `${dir}/PS_LibreAcces_Personne_activite.txt`,
      diplomes: `${dir}/PS_LibreAcces_Dipl_AutExerc.txt`,
      savoirFaire: `${dir}/PS_LibreAcces_SavoirFaire.txt`,
    },
    minActivites,
    log: (message) => console.log(`[import] ${message}`),
  })
  console.log(`[import] OK en ${Math.round(result.durationMs / 1000)} s`)
}

main().catch((err) => {
  if (err instanceof ImportError || err instanceof ConfigError) console.error(`[import] ÉCHEC : ${err.message}`)
  else console.error(err)
  process.exit(1)
})
