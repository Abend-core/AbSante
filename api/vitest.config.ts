import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Les tests d'intégration partagent un même Postgres : chacun travaille dans son
    // propre schéma (voir test/helpers/db.ts) -> exécution en parallèle sans collision.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/import/cli.ts'],
    },
  },
})
