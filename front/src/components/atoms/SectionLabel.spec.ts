import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionLabel from './SectionLabel.vue'

describe('SectionLabel', () => {
  it('est un intertitre h4 par défaut', () => {
    const wrapper = mount(SectionLabel, { slots: { default: 'Exercice' } })
    expect(wrapper.element.tagName).toBe('H4')
    expect(wrapper.text()).toBe('Exercice')
  })

  it('peut changer de balise pour respecter la hiérarchie des titres', () => {
    expect(mount(SectionLabel, { props: { as: 'h3' } }).element.tagName).toBe('H3')
    expect(mount(SectionLabel, { props: { as: 'p' } }).element.tagName).toBe('P')
  })
})
