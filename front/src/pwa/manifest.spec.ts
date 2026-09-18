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

describe("aperçu de lien (Open Graph), comme rxdy.fr", () => {
  const meta = (attr: 'property' | 'name', key: string) => html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, 's'))?.[1]

  it("déclare titre, description, adresse, site et langue", () => {
    expect(meta('property', 'og:type')).toBe('website')
    expect(meta('property', 'og:site_name')).toBe('AbSante')
    expect(meta('property', 'og:title')).toContain('AbSante')
    expect(meta('property', 'og:description')?.length).toBeGreaterThan(40)
    expect(meta('property', 'og:url')).toBe('https://absante.rxdy.fr/')
    expect(meta('property', 'og:locale')).toBe('fr_FR')
    expect(html).toContain('rel="canonical" href="https://absante.rxdy.fr/"')
  })

  it("pointe vers une image absolue en HTTPS, décrite et de dimensions annoncées", () => {
    expect(meta('property', 'og:image')).toBe('https://absante.rxdy.fr/og-image.png')
    expect(meta('property', 'og:image:width')).toBe('1200')
    expect(meta('property', 'og:image:height')).toBe('630')
    expect(meta('property', 'og:image:alt')).toBeTruthy()
  })

  it('demande la grande carte sur X / Twitter avec la même image', () => {
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    expect(meta('name', 'twitter:title')).toBe(meta('property', 'og:title'))
    expect(meta('name', 'twitter:image')).toBe(meta('property', 'og:image'))
  })

  it("l'image existe réellement et fait bien 1200 × 630 px (lu dans l'en-tête PNG)", () => {
    const png = readFileSync(resolve(root, 'public/og-image.png'))
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
    expect(png.length).toBeLessThan(600 * 1024) // WhatsApp ignore les images trop lourdes
  })
})

