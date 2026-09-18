import { scaleSequential } from 'd3-scale'
import { interpolateBlues } from 'd3-scale-chromatic'
import { rgb } from 'd3-color'

/**
 * Échelle de couleur séquentielle partagée par les 3 prototypes de carte.
 * Renvoie du hexadécimal (#rrggbb), pas "rgb(r, g, b)" — amCharts5 dessine
 * sur un <canvas> (pas de SVG/<path> à inspecter) et son parseur de couleur
 * interne est plus strict qu'un moteur CSS complet ; le hexadécimal est le
 * format le plus sûr, sans ambiguïté possible.
 */
export function createColorScale(values: number[]) {
  const max = Math.max(...values, 1)
  const scale = scaleSequential(interpolateBlues).domain([0, max])
  return (value: number) => rgb(scale(value)).formatHex()
}
