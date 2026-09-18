import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')
const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'))
const html = readFileSync(resolve(root, 'index.html'), 'utf8')

describe('manifest.webmanifest', () => {
  it("remplit ce qu'exigent les navigateurs pour proposer l'installation", () => {
    expect(manifest.name).toContain('AbSante')
    expect(manifest.short_name).toBe('AbSante')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.lang).toBe('fr')
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('déclare des icônes 192 et 512 px, dont une « maskable », qui existent réellement', () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true)
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png')
      expect(existsSync(resolve(root, 'public', icon.src.replace(/^\//, ''))), icon.src).toBe(true)
    }
  })

  it("utilise la même couleur de thème que l'en-tête de l'application", () => {
    expect(html).toContain(`content="${manifest.theme_color}"`)
  })
})

describe('index.html', () => {
  it('relie le manifeste, les icônes et décrit la page en français', () => {
    expect(html).toContain('<html lang="fr">')
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('rel="icon"')
    expect(html).toContain('name="description"')
    expect(html).toContain('<title>AbSante')
    expect(existsSync(resolve(root, 'public/icons/apple-touch-icon.png'))).toBe(true)
    expect(existsSync(resolve(root, 'public/offline.html'))).toBe(true)
  })

  it("mentionne l'équipe auteure", () => {
    expect(html).toContain('name="author" content="Équipe Abend"')
  })
})
