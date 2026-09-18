import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import SiteNav from './SiteNav.vue'

describe('SiteNav', () => {
  it('est une navigation nommée avec un lien vers la carte', () => {
    const wrapper = mount(SiteNav, { global: { stubs: { RouterLink: RouterLinkStub } } })
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Navigation principale')
    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links.map((l) => l.text())).toEqual(['Carte'])
    expect(links[0]!.props('to')).toBe('/')
  })

  it("ne propose plus le code source (réservé au pied de page)", () => {
    expect(mount(SiteNav, { global: { stubs: { RouterLink: RouterLinkStub } } }).text()).not.toMatch(/code source/i)
  })
})
