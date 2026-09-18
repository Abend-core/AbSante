import { describe, expect, it } from 'vitest'
import { FOOTER_DIALOGS, REPO_URL, TAGLINE, TEAM_NAME } from './footer-content'

const links = FOOTER_DIALOGS.flatMap((d) => d.items.flatMap((i) => i.body)).filter((p) => typeof p !== 'string')
const allText = (id: string) =>
  FOOTER_DIALOGS.find((d) => d.id === id)!
    .items.flatMap((i) => [i.title ?? '', ...i.body.map((p) => (typeof p === 'string' ? p : p.text))])
    .join(' ')

describe('contenu du pied de page', () => {
  it("nomme l'équipe auteure et pointe vers le dépôt de l'organisation", () => {
    expect(TEAM_NAME).toBe('Abend')
    expect(REPO_URL).toBe('https://github.com/Abend-core/AbSante')
    expect(allText('about')).toContain("l'équipe Abend")
  })

  it('propose quatre fenêtres aux identifiants uniques', () => {
    expect(FOOTER_DIALOGS.map((d) => d.id)).toEqual(['sources', 'legal', 'privacy', 'about'])
    expect(new Set(FOOTER_DIALOGS.map((d) => d.id)).size).toBe(4)
    for (const d of FOOTER_DIALOGS) {
      expect(d.label).toBeTruthy()
      expect(d.title).toBeTruthy()
      expect(d.items.length).toBeGreaterThan(0)
    }
  })

  it('cite les sources et leurs licences', () => {
    const sources = allText('sources')
    for (const expected of ['Annuaire Santé — RPPS', 'Licence Ouverte 2.0', 'OpenStreetMap', 'ODbL', 'Base Adresse Nationale', 'france-geojson', 'IGN']) {
      expect(sources).toContain(expected)
    }
  })

  it('porte les informations légales : indépendance, données publiques, rectification', () => {
    const legal = allText('legal')
    expect(legal).toContain("n'est affilié ni à l'Agence du Numérique en Santé ni à l'État")
    expect(legal).toContain('incomplètes')
    expect(legal).toContain('Non renseigné')
    expect(legal).toContain('Rectification')
  })

  it('décrit la vie privée sans cookie ni mesure d\'audience', () => {
    const privacy = allText('privacy')
    expect(privacy).toContain("ni cookie ni outil de mesure d'audience")
    expect(privacy).toContain('adresse IP')
  })

  it('a des liens sécurisés (https) et un slogan court', () => {
    expect(links).toHaveLength(4)
    for (const link of links) expect((link as { href: string }).href).toMatch(/^https:\/\//)
    expect(TAGLINE.length).toBeLessThan(70)
  })
})
