import { describe, it, expect } from 'vitest'
import { createColorScale } from './useColorScale'

describe('createColorScale', () => {
  it('renvoie de l\'hexadécimal, pas "rgb(...)" (amCharts dessine sur un <canvas>, son parseur de couleur est plus strict)', () => {
    const scale = createColorScale([0, 50, 100])
    const color = scale(50)
    expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('couvre bien tout le domaine, du plus clair au plus foncé', () => {
    const scale = createColorScale([0, 100])
    expect(scale(0)).not.toBe(scale(100))
  })

  it('avec un maximum explicite, les valeurs au-delà prennent la couleur la plus foncée (pas de dépassement)', () => {
    const scale = createColorScale([0, 50, 5000], 100)
    expect(scale(100)).toBe(scale(5000))
    expect(scale(50)).not.toBe(scale(100))
  })

  it('accepte un maximum inférieur à 1 (densité d\'une profession rare)', () => {
    const scale = createColorScale([0, 0.2], 0.2)
    expect(scale(0.1)).not.toBe(scale(0.2))
    expect(scale(0.1)).not.toBe(scale(0))
  })
})
