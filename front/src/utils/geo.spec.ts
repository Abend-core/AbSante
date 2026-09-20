import { describe, expect, it } from 'vitest'
import { distanceKm, itineraireUrl } from './geo'

describe('distanceKm', () => {
  it('vaut 0 entre un point et lui-même', () => {
    expect(distanceKm([45.75, 4.85], [45.75, 4.85])).toBe(0)
  })

  it('donne ~392 km entre Paris et Lyon (à vol d\'oiseau)', () => {
    expect(distanceKm([48.8566, 2.3522], [45.764, 4.8357])).toBeCloseTo(392, -1)
  })

  it('est symétrique', () => {
    expect(distanceKm([43.6, 3.88], [48.85, 2.35])).toBeCloseTo(distanceKm([48.85, 2.35], [43.6, 3.88]), 6)
  })
})

describe('itineraireUrl', () => {
  it('cible les coordonnées données', () => {
    expect(itineraireUrl([43.6, 3.88])).toBe('https://www.google.com/maps/dir/?api=1&destination=43.6,3.88')
  })
})
