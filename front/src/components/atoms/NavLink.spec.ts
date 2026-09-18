import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import NavLink from './NavLink.vue'

describe('NavLink', () => {
  const mountLink = (props: Record<string, unknown> = {}) =>
    mount(NavLink, { props: { to: '/', ...props }, slots: { default: 'Carte' }, global: { stubs: { RouterLink: RouterLinkStub } } })

  it('pointe vers la route demandée et affiche son libellé', () => {
    const link = mountLink().findComponent(RouterLinkStub)
    expect(link.props('to')).toBe('/')
    expect(link.text()).toBe('Carte')
  })

  it("affiche une icône seulement quand elle est fournie", () => {
    expect(mountLink({ icon: 'pin' }).find('svg').exists()).toBe(true)
    expect(mountLink().find('svg').exists()).toBe(false)
  })
})
