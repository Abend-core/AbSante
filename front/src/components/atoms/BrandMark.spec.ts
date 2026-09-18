import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BrandMark from './BrandMark.vue'

describe('BrandMark', () => {
  it('est décoratif (le nom AbSante est écrit à côté)', () => {
    const svg = mount(BrandMark).find('svg')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('width')).toBe('34')
  })

  it('accepte une taille', () => {
    expect(mount(BrandMark, { props: { size: 24 } }).find('svg').attributes('height')).toBe('24')
  })
})
