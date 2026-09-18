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
})
