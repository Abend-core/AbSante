import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import InfoList from './InfoList.vue'

describe('InfoList', () => {
  const items = [
    { title: 'Fond de carte.', body: ['© ', { text: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' }, ' (ODbL).'] },
    { body: ['Sans titre.'] },
  ]

  it('affiche titre en gras, texte et liens dans l\'ordre', () => {
    const wrapper = mount(InfoList, { props: { items } })
    const [first, second] = wrapper.findAll('li')
    expect(first!.text()).toBe('Fond de carte. © OpenStreetMap (ODbL).')
    expect(first!.find('strong').text()).toBe('Fond de carte.')
    expect(second!.find('strong').exists()).toBe(false)
  })

  it('ouvre les liens dans un nouvel onglet', () => {
    const link = mount(InfoList, { props: { items } }).find('a')
    expect(link.attributes('href')).toBe('https://www.openstreetmap.org/copyright')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it("n'interprète jamais le texte comme du HTML", () => {
    const wrapper = mount(InfoList, { props: { items: [{ body: ['<img src=x onerror=alert(1)>'] }] } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x')
  })
})
