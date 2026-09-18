import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FicheSection from './FicheSection.vue'

describe('FicheSection', () => {
  it('affiche le titre et le contenu', () => {
    const wrapper = mount(FicheSection, { props: { title: 'Identité' }, slots: { default: '<p>contenu</p>' } })
    expect(wrapper.find('h2').text()).toBe('Identité')
    expect(wrapper.text()).toContain('contenu')
  })

  it('affiche le nombre d\'éléments, y compris zéro, seulement quand il est fourni', () => {
    expect(mount(FicheSection, { props: { title: 'Activités', count: 3 } }).find('.fiche-section__count').text()).toBe('3')
    expect(mount(FicheSection, { props: { title: 'Activités', count: 0 } }).find('.fiche-section__count').text()).toBe('0')
    expect(mount(FicheSection, { props: { title: 'Identité' } }).find('.fiche-section__count').exists()).toBe(false)
  })
})
