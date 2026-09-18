import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import SiteHeader from './SiteHeader.vue'

const mountHeader = () => mount(SiteHeader, { global: { stubs: { RouterLink: RouterLinkStub } } })

describe('SiteHeader', () => {
  it('affiche le nom et renvoie à la carte depuis le logo', () => {
    const wrapper = mountHeader()
    expect(wrapper.text()).toContain('AbSante')
    const brand = wrapper.find('.site-header__brand')
    expect(brand.attributes('aria-label')).toContain('AbSante')
    expect(brand.findComponent(RouterLinkStub).props('to')).toBe('/')
  })

  it("propose la navigation vers la carte et le code source (nouvel onglet, sans fuite d'opener)", () => {
    const wrapper = mountHeader()
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Navigation principale')
    const repo = wrapper.find('a[href*="github.com/Abend-core/AbSante"]')
    expect(repo.attributes('target')).toBe('_blank')
    expect(repo.attributes('rel')).toContain('noopener')
    expect(wrapper.findAllComponents(RouterLinkStub).some((l) => l.text().includes('Carte'))).toBe(true)
  })
})
