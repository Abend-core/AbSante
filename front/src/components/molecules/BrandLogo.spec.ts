import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BrandLogo from './BrandLogo.vue'

describe('BrandLogo', () => {
  it('affiche le repère et le nom', () => {
    const wrapper = mount(BrandLogo)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toBe('AbSante')
  })

  it('adapte le repère à la taille demandée', () => {
    expect(mount(BrandLogo).find('svg').attributes('width')).toBe('34')
    expect(mount(BrandLogo, { props: { size: 28 } }).find('svg').attributes('width')).toBe('28')
  })
})
