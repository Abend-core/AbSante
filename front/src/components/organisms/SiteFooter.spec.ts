import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SiteFooter from './SiteFooter.vue'

afterEach(() => vi.useRealTimers())

describe('SiteFooter', () => {
  it('cite les sources des données avec leur licence', () => {
    const text = mount(SiteFooter).text()
    expect(text).toContain('Annuaire Santé — RPPS')
    expect(text).toContain('Agence du Numérique en Santé')
    expect(text).toContain('Licence Ouverte 2.0')
    expect(text).toContain('contributeurs OpenStreetMap')
    expect(text).toContain('Base Adresse Nationale')
    expect(text).toContain('france-geojson')
  })

  it('porte les informations légales : indépendance, données publiques, rectification, vie privée', () => {
    const text = mount(SiteFooter).text()
    expect(text).toContain('non affilié à l\'Agence du Numérique en Santé')
    expect(text).toContain('peuvent être incomplètes')
    expect(text).toContain('« Non renseigné » signale une information absente')
    expect(text).toContain('Rectification')
    expect(text).toContain('ni cookie ni outil de mesure d\'audience')
  })

  it('a des sections nommées pour les lecteurs d\'écran', () => {
    const wrapper = mount(SiteFooter)
    expect(wrapper.find('#footer-sources').text()).toBe('Sources des données')
    expect(wrapper.find('#footer-legal').text()).toBe('Informations légales')
    expect(wrapper.find('section[aria-labelledby="footer-sources"]').exists()).toBe(true)
  })

  it('ouvre tous les liens externes dans un nouvel onglet sans fuite d\'opener', () => {
    const links = mount(SiteFooter).findAll('a')
    expect(links).toHaveLength(5)
    for (const link of links) {
      expect(link.attributes('href')).toMatch(/^https:\/\//)
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toContain('noopener')
    }
  })

  it("affiche l'année courante", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2031-03-04T10:00:00Z'))
    expect(mount(SiteFooter).find('.site-footer__legal').text()).toContain('© 2031 AbSante')
  })
})
