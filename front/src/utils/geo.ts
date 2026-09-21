export type LatLon = [lat: number, lon: number]

const EARTH_RADIUS_KM = 6371

/** Distance à vol d'oiseau (haversine), en km. */
export function distanceKm([lat1, lon1]: LatLon, [lat2, lon2]: LatLon): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/** Lien d'itinéraire vers une position (ouvre l'application de cartographie du visiteur). */
export function itineraireUrl([lat, lon]: LatLon): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
}

/** Au-delà de ce rayon d'incertitude (m), la position du navigateur vient de la connexion internet
 *  (IP, Wi-Fi) et non d'un GPS : elle peut être à des dizaines de km de la personne. */
export const POSITION_IMPRECISE_M = 2000
