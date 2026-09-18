import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { FOOTER_DIALOGS } from '../../content/footer-content'
import SiteFooter from './SiteFooter.vue'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})
afterEach(() => vi.useRealTimers())

const mountFooter = () => mount(SiteFooter, { attachTo: document.body })
const linkButtons = (wrapper: ReturnType<typeof mountFooter>) => wrapper.findAll('nav[aria-label="Informations"] button')

describe('SiteFooter', () => {
  it("reste épuré : un slogan, quatre liens, la mention d'équipe et le code source", () => {
    const wrapper = mountFooter()
    expect(wrapper.find('.site-footer__about p').text()).toBe('Carte interactive des professionnels de santé en France.')
    expect(linkButtons(wrapper).map((b) => b.text())).toEqual(['Sources des données', 'Informations légales', 'Vie privée', 'À propos'])
    // le détail n'est pas dans la page : il est dans les fenêtres, fermées
    expect(wrapper.findAll('dialog[open]')).toHaveLength(0)
    expect(wrapper.find('.site-footer__top').text()).not.toContain('Licence Ouverte')
    expect(wrapper.find('.site-footer__top').text()).not.toContain('cookie')
  })

  it("nomme l'équipe Abend et l'année courante", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2031-03-04T10:00:00Z'))
    expect(mountFooter().find('.site-footer__bottom p').text()).toBe("© 2031 AbSante · Un projet de l'équipe Abend")
  })

  it('place le code source en discret, en bas, dans un nouvel onglet', () => {
    const link = mountFooter().find('.site-footer__bottom a')
    expect(link.text()).toBe('Code source')
    expect(link.attributes('href')).toBe('https://github.com/Abend-core/AbSante')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it.each(FOOTER_DIALOGS.map((d, i) => [d.label, i] as const))('« %s » ouvre sa fenêtre de détail, et elle seule', async (label, index) => {
    const wrapper = mountFooter()
    await linkButtons(wrapper)[index]!.trigger('click')
    const open = wrapper.findAll('dialog').filter((d) => d.element.open)
    expect(open).toHaveLength(1)
    expect(open[0]!.find('h2').text()).toBe(FOOTER_DIALOGS[index]!.title)
    expect(label).toBe(FOOTER_DIALOGS[index]!.label)
  })

  it('la fenêtre « Sources » contient les sources et leurs licences', async () => {
    const wrapper = mountFooter()
    await linkButtons(wrapper)[0]!.trigger('click')
    const text = wrapper.findAll('dialog').find((d) => d.element.open)!.text()
    expect(text).toContain('Annuaire Santé — RPPS')
    expect(text).toContain('Licence Ouverte 2.0')
    expect(text).toContain('Base Adresse Nationale')
  })

  it("passe d'une fenêtre à l'autre sans jamais en garder deux ouvertes", async () => {
    const wrapper = mountFooter()
    await linkButtons(wrapper)[0]!.trigger('click')
    await linkButtons(wrapper)[2]!.trigger('click')
    const open = wrapper.findAll('dialog').filter((d) => d.element.open)
    expect(open.map((d) => d.find('h2').text())).toEqual(['Vie privée'])
  })

  it('se referme avec le bouton Fermer', async () => {
    const wrapper = mountFooter()
    await linkButtons(wrapper)[1]!.trigger('click')
    await wrapper.find('dialog[open] button[aria-label="Fermer"]').trigger('click')
    expect(wrapper.findAll('dialog').filter((d) => d.element.open)).toHaveLength(0)
  })

  it('ouvre les liens des fenêtres dans un nouvel onglet sans fuite d\'opener', async () => {
    const wrapper = mountFooter()
    for (const links of wrapper.findAll('dialog a')) {
      expect(links.attributes('href')).toMatch(/^https:\/\//)
      expect(links.attributes('rel')).toContain('noopener')
    }
  })
})
