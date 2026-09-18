<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useFranceGeo } from '../../composables/useFranceGeo'
import { useFranceRppsStats, type CommuneOption } from '../../composables/useFranceRppsStats'
import { useEtablissements, type Praticien, type Etablissement } from '../../composables/useEtablissements'
import { createColorScale } from '../../composables/useColorScale'
import ColorLegend from '../molecules/ColorLegend.vue'
import ProfessionSelect from '../molecules/ProfessionSelect.vue'
import DetailCard from '../molecules/DetailCard.vue'
import CitySearch from '../molecules/CitySearch.vue'
import ToggleSwitch from '../atoms/ToggleSwitch.vue'
import DataFreshness from '../atoms/DataFreshness.vue'
import type { GeoFeature } from '../../types/geo'

const { load, loading, currentFeatures } = useFranceGeo()
const stats = useFranceRppsStats()
const etablissements = useEtablissements()
const mapDiv = ref<HTMLDivElement | null>(null)
const isZoomed = ref(false)
const showEtablissements = ref(false)
const selectedPoint = ref<{
  nom: string
  n: number
  praticiens?: Praticien[]
  etablissements?: Etablissement[]
} | null>(null)
const selectedDept = ref<{ nom: string; n: number } | null>(null)

/** Taille FIXE des points commune/établissement : la taille ne code plus une
 *  grandeur (retiré, imprécis visuellement) — la densité de points suffit à
 *  montrer où se concentrent les praticiens. */
const MARKER_RADIUS = 5
const FRANCE_CENTER: [number, number] = [46.6, 2.4]
const FRANCE_ZOOM = 5
/** Zoom "rue" pour un établissement géocodé à sa vraie adresse (voir
 *  scripts/geocode_etablissements.py) — plus précis que le zoom "ville" utilisé
 *  quand on ne connaît que les coordonnées de la commune. */
const ETABLISSEMENT_ZOOM = 17

let map: L.Map | null = null
let polygonsLayer: L.GeoJSON | null = null
let pointsLayer: L.LayerGroup | null = null
let cityHighlight: L.CircleMarker | null = null
let resetButton: HTMLButtonElement | null = null
let colorScale = createColorScale([1])

/** Pile des vues visitées (France -> département -> ville -> établissement...) pour
 *  permettre au clic sur l'anneau bleu de revenir en arrière PAS À PAS, pas
 *  directement à la vue France (c'est le rôle du bouton "retour" en haut à droite). */
interface ViewSnapshot {
  lat: number
  lon: number
  zoom: number
  zoomedDept: string | null
  selectedPoint: typeof selectedPoint.value
  selectedDept: typeof selectedDept.value
  ring: { lat: number; lon: number } | null
}
let viewStack: ViewSnapshot[] = []

function pushView() {
  if (!map) return
  const center = map.getCenter()
  const ringVisible = !!(cityHighlight && map.hasLayer(cityHighlight))
  const ringPos = ringVisible ? cityHighlight!.getLatLng() : null
  viewStack.push({
    lat: center.lat,
    lon: center.lng,
    zoom: map.getZoom(),
    zoomedDept: stats.zoomedDept.value,
    selectedPoint: selectedPoint.value,
    selectedDept: selectedDept.value,
    ring: ringPos ? { lat: ringPos.lat, lon: ringPos.lng } : null,
  })
}

/** Clic sur l'anneau bleu : revient à l'état précédent (établissement -> ville ->
 *  département -> France), une étape à la fois. Pile vide -> plus rien avant,
 *  équivaut à la vue France entière. */
function goBack() {
  const prev = viewStack.pop()
  if (!prev || !map) {
    resetZoom()
    return
  }
  stats.zoomedDept.value = prev.zoomedDept
  selectedPoint.value = prev.selectedPoint
  selectedDept.value = prev.selectedDept
  map.setView([prev.lat, prev.lon], prev.zoom)
  if (prev.ring && cityHighlight) {
    cityHighlight.setLatLng([prev.ring.lat, prev.ring.lon])
    cityHighlight.addTo(map)
  } else {
    clearCityHighlight()
  }
}

function valueFor(feature: GeoFeature): number {
  return stats.byDepartement.value[feature.properties.code] ?? 0
}

/** Niveau de zoom "ville" adapté à sa taille (proxy : effectif total "Tous" de
 *  la commune) -> une petite ville reste bien cadrée à zoom 14, une grande
 *  métropole (ex: Paris) ne se retrouve plus coincée sur son centre-ville. */
function cityZoomFor(total: number): number {
  if (total >= 10000) return 11
  if (total >= 3000) return 12
  if (total >= 500) return 13
  return 14
}

/** Le remplissage du département s'estompe en zoomant, pour laisser voir le
 *  fond de carte (rues, ville) une fois zoomé sur une commune -> remplace le
 *  "voile bleu" qui recouvrait tout l'écran en zoom ville. */
function deptFillOpacityFor(zoom: number): number {
  if (zoom <= 8) return 0.8
  if (zoom >= 12) return 0.1
  return 0.8 - (zoom - 8) * 0.175
}

function baseStyle(feature?: GeoJSON.GeoJsonObject): L.PathOptions {
  const f = feature as unknown as GeoFeature
  return {
    fillColor: colorScale(valueFor(f)),
    fillOpacity: deptFillOpacityFor(map?.getZoom() ?? FRANCE_ZOOM),
    color: '#fff',
    weight: 1,
  }
}

/** Bouton personnalisé "retour à la vue France entière", empilé par Leaflet
 *  sous le zoom +/- natif (même coin topright) -> pas de calcul de position à
 *  la main, contrairement au bouton flottant qu'il fallait repositionner
 *  manuellement sur le prototype amCharts. */
const ResetControl = L.Control.extend({
  options: { position: 'topright' },
  onAdd() {
    const btn = L.DomUtil.create('button', 'reset-control') as HTMLButtonElement
    btn.type = 'button'
    btn.title = 'Revenir à la vue France entière (raccourci : Échap)'
    btn.disabled = true
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" /></svg>'
    L.DomEvent.disableClickPropagation(btn)
    L.DomEvent.on(btn, 'click', resetZoom)
    resetButton = btn
    return btn
  },
})

/** Recentre/zoome sur une ville et affiche l'anneau de repère à sa place —
 *  remplace le voile bleu du département comme indicateur visuel "vous êtes ici". */
function focusCity(lat: number, lon: number, zoom: number) {
  if (!map || !cityHighlight) return
  map.setView([lat, lon], zoom)
  cityHighlight.setLatLng([lat, lon])
  cityHighlight.addTo(map)
  // Sur un établissement, l'anneau se retrouve exactement à la même position que son
  // propre point (même coordonnées géocodées) -> sans ça, le point (ajouté après dans
  // le SVG) passe au-dessus et intercepte le clic destiné à l'anneau (vérifié : le clic
  // retombait sur le point rouge, pas l'anneau, "Retour" ne faisait alors plus rien).
  cityHighlight.bringToFront()
}

function clearCityHighlight() {
  if (map && cityHighlight) map.removeLayer(cityHighlight)
}

/** Crée la carte UNE SEULE FOIS. Tout changement de filtre/zoom ne fait que
 *  mettre à jour les couches existantes (refreshData) -> le zoom/centrage de
 *  la vue n'est jamais perdu. */
function initMap() {
  if (!mapDiv.value || currentFeatures.value.length === 0) return

  map = L.map(mapDiv.value, { center: FRANCE_CENTER, zoom: FRANCE_ZOOM })
  // Fond de plan OpenStreetMap standard : pas de clé requise, contrairement
  // aux styles CARTO hébergés (basemaps.cartocdn.com exige désormais une clé
  // API sur leur offre gratuite, vérifié par capture d'écran -> tuiles
  // remplacées par un filigrane "API KEY REQUIRED").
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  map.zoomControl.setPosition('topright')
  new ResetControl().addTo(map)

  // N'importe quel changement de niveau de zoom (clic département, boutons
  // +/- natifs, molette...) active/désactive le bouton retour, et ajuste
  // l'opacité du département (voir deptFillOpacityFor) — pas seulement le
  // clic sur un département.
  map.on('zoomend', () => {
    isZoomed.value = (map?.getZoom() ?? FRANCE_ZOOM) > FRANCE_ZOOM + 0.5
    polygonsLayer?.setStyle(baseStyle)
  })

  polygonsLayer = L.geoJSON(
    { type: 'FeatureCollection', features: currentFeatures.value } as unknown as GeoJSON.GeoJsonObject,
    {
      style: baseStyle,
      onEachFeature(feature, layer) {
        const f = feature as unknown as GeoFeature
        // Survol : juste un repère visuel (bordure), léger et sans effet de
        // bord -> ne touche plus au détail affiché (auparavant mis à jour à
        // chaque mouvement de souris, gênant quand on veut lire l'info).
        layer.on('mouseover', () => {
          const path = layer as L.Path
          path.setStyle({ weight: 2, color: '#333' })
          // Chaque département est un contour séparé dans le GeoJSON : sans ça, la
          // fine bordure blanche (non survolée) du département voisin, dessinée par-
          // dessus le long de la frontière commune, "mange" une partie de la bordure
          // foncée du survol -> épaisseur visiblement inégale selon le côté du
          // contour (constaté : net à l'ouest, presque invisible à l'est vers Lyon).
          path.bringToFront()
        })
        layer.on('mouseout', () => polygonsLayer?.resetStyle(layer as L.Path))
        layer.on('click', () => {
          // Le polygone département couvre TOUTE sa surface, y compris une fois zoomé
          // dedans (ville, établissement) -> sans ce garde-fou, cliquer n'importe où
          // sur la carte (même loin d'un point) redéclenchait le fitBounds et
          // ramenait brutalement à la vue département, sans marge d'erreur pour
          // cliquer un point précis. On ignore le clic si on est déjà zoomé sur CE
          // département ; cliquer un AUTRE département reste une navigation valide.
          if (f.properties.code === stats.zoomedDept.value) return
          viewStack = []
          pushView()
          selectedPoint.value = null
          selectedDept.value = { nom: f.properties.nom, n: valueFor(f) }
          clearCityHighlight()
          map?.fitBounds((layer as L.Polygon).getBounds(), { padding: [20, 20] })
          stats.zoomedDept.value = f.properties.code
        })
      },
    },
  ).addTo(map)

  // fill quasi-invisible (0.01, pas 0) -> tout le disque est cliquable, pas
  // seulement le trait du contour (cible bien trop fine pour cliquer dessus).
  // Vérifié : à fillOpacity exactement 0, le SVG ne compte plus la forme comme
  // "painted" et les clics passent au travers (aucun gestionnaire déclenché) —
  // 0.01 reste visuellement invisible mais reçoit bien les clics.
  cityHighlight = L.circleMarker(FRANCE_CENTER, {
    radius: 16,
    color: '#1e88e5',
    weight: 3,
    fill: true,
    fillOpacity: 0.01,
    interactive: true,
  })
  cityHighlight.on('click', goBack)
  cityHighlight.bindTooltip('Revenir en arrière', { direction: 'top', offset: [0, -16] })

  pointsLayer = L.layerGroup()
  if (showEtablissements.value) pointsLayer.addTo(map)

  refreshData()
}

function makeMarker(lat: number, lon: number): L.CircleMarker {
  return L.circleMarker([lat, lon], {
    radius: MARKER_RADIUS,
    fillColor: '#d9534f',
    fillOpacity: 0.7,
    stroke: false,
  })
}

/** Affiche le détail nominatif d'un établissement (praticiens) et s'y recentre.
 *  Zoome sur sa vraie position géocodée si connue (précision "rue"), sinon sur
 *  la commune (on ne sait rien de plus précis). */
function showEtablissement(etab: Etablissement, communeNom: string, communeLat: number, communeLon: number) {
  pushView()
  selectedDept.value = null
  selectedPoint.value = { nom: `${etab.nom} (${communeNom})`, n: etab.praticiens.length, praticiens: etab.praticiens }
  if (etab.coords) focusCity(etab.coords[0], etab.coords[1], ETABLISSEMENT_ZOOM)
  else focusCity(communeLat, communeLon, cityZoomFor(0))
}

/** Reconstruit les couleurs des départements et régénère les points commune et
 *  établissement (filtre de profession et/ou zoom département) sans jamais
 *  recréer la carte. */
function refreshData() {
  if (!polygonsLayer || !pointsLayer) return

  colorScale = createColorScale(currentFeatures.value.map(valueFor))
  polygonsLayer.setStyle(baseStyle)

  const dept = stats.zoomedDept.value

  pointsLayer.clearLayers()
  // Sans département zoomé, stats.visiblePoints couvre TOUTE la France (~16 000 communes) :
  // à taille fixe, ça donne une masse rouge illisible qui recouvre le pays plutôt que des
  // points distincts -> les points ne s'affichent qu'une fois zoomé sur un département,
  // comme les établissements (dont ils ont de toute façon besoin pour être utiles).
  if (!dept) return

  for (const p of stats.visiblePoints.value) {
    // Le filtre de profession ne limite plus l'éclatement en établissements : chaque
    // praticien connaît sa propre profession dans les données -> on peut filtrer les
    // établissements ET leurs praticiens listés par la profession sélectionnée, pas
    // seulement se limiter à "Tous" comme avant (l'ancienne limite qui collapsait tout
    // sur un seul point dès qu'un filtre de profession était actif).
    const etabs = etablissements.forCommune(dept, p.codeInsee, stats.selectedProfession.value)
    const geocoded = etabs.filter((e) => e.coords)
    const ungeocoded = etabs.filter((e) => !e.coords)

    // Un point PAR établissement géocodé, à sa vraie adresse (scripts/geocode_etablissements.py)
    for (const etab of geocoded) {
      const marker = makeMarker(etab.coords![0], etab.coords![1])
      marker.on('click', () => showEtablissement(etab, p.nom, p.lat, p.lon))
      pointsLayer.addLayer(marker)
    }

    // Un point pour la commune elle-même : soit l'agrégat habituel (profession
    // filtrée, département pas encore chargé, ou aucun établissement connu), soit
    // les seuls établissements dont l'adresse n'a pas pu être géocodée (liste dans
    // la carte de détail — jamais de position individuelle inventée pour eux).
    if (geocoded.length === 0 || ungeocoded.length > 0) {
      const marker = makeMarker(p.lat, p.lon)
      // Clic (pas survol) : évite de recharger le détail à chaque passage de souris,
      // et enchaîne sur un zoom "ville" adapté à sa taille -> après le zoom
      // département, on peut zoomer davantage sur une commune précise.
      marker.on('click', () => {
        pushView()
        selectedDept.value = null
        selectedPoint.value = { nom: p.nom, n: p.n, etablissements: ungeocoded.length > 0 ? ungeocoded : undefined }
        focusCity(p.lat, p.lon, cityZoomFor(p.total))
      })
      pointsLayer.addLayer(marker)
    }
  }
}

/** Choix d'un établissement dans la liste de la carte de détail (établissements
 *  restés sans coordonnées propres, voir refreshData). */
function onSelectEtablissement(etab: Etablissement) {
  const communeNom = selectedPoint.value?.nom ?? ''
  // L'anneau de repère est déjà sur la commune (posé au clic qui a ouvert cette
  // liste) -> on reprend sa position comme référence pour le zoom de repli.
  const pos = cityHighlight?.getLatLng()
  showEtablissement(etab, communeNom, pos?.lat ?? FRANCE_CENTER[0], pos?.lng ?? FRANCE_CENTER[1])
}

function resetZoom() {
  viewStack = []
  map?.setView(FRANCE_CENTER, FRANCE_ZOOM)
  stats.zoomedDept.value = null
  clearCityHighlight()
  selectedPoint.value = null
  selectedDept.value = null
}

/** Recherche de ville : zoome directement dessus, quel que soit le département
 *  déjà affiché. Le nombre affiché respecte le filtre de profession actif (pas
 *  le total "Tous" utilisé uniquement comme proxy de taille pour le zoom). Une
 *  recherche repart d'un historique propre (retour = là où on était avant la
 *  recherche, pas un ancien fil de navigation sans rapport).
 */
function selectCity(c: CommuneOption) {
  if (!map) return
  viewStack = []
  pushView()
  const match = stats.points.value.find((p) => p.dept === c.dept && p.nom === c.nom)
  selectedDept.value = null
  selectedPoint.value = { nom: c.nom, n: match?.n ?? 0 }
  stats.zoomedDept.value = c.dept
  focusCity(c.lat, c.lon, cityZoomFor(c.total))
}

function professionLabel(): string {
  return stats.selectedProfession.value === 'Tous' ? 'praticiens' : stats.selectedProfession.value.toLowerCase()
}

function onKeydown(event: KeyboardEvent) {
  const tag = (event.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

  if (event.key === 'Escape') resetZoom()
  else if (event.key === 'e' || event.key === 'E') showEtablissements.value = !showEtablissements.value
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  await Promise.all([load(), stats.load()])
  initMap()
})

// Charge le détail des établissements du département dès qu'on zoome dessus (clic
// département, recherche de ville) -> refreshData() ré-affine ensuite les points
// commune en points établissement une fois les données disponibles (loadDept ne
// re-télécharge pas si déjà en cache).
watch([() => stats.selectedProfession.value, () => stats.zoomedDept.value], async ([, dept]) => {
  if (dept) await etablissements.loadDept(dept)
  refreshData()
})
watch(showEtablissements, (visible) => {
  if (!map || !pointsLayer) return
  if (visible) pointsLayer.addTo(map)
  else map.removeLayer(pointsLayer)
})
watch(isZoomed, (zoomed) => {
  if (resetButton) resetButton.disabled = !zoomed
})

onBeforeUnmount(() => {
  map?.remove()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="leaflet-map">
    <div class="controls">
      <CitySearch :communes="stats.allCommunes.value" @select="selectCity" />
      <ProfessionSelect v-model="stats.selectedProfession.value" :professions="stats.professions.value" />
      <ColorLegend
        :max="stats.maxValue.value"
        :label="`${stats.selectedProfession.value === 'Tous' ? 'Praticiens' : stats.selectedProfession.value} par département`"
      />
      <ToggleSwitch
        v-model="showEtablissements"
        label="Établissements"
        title="Afficher/masquer les établissements (raccourci : E)"
      />
    </div>

    <DataFreshness :updated-at="stats.updatedAt.value" />

    <p v-if="loading">Chargement des contours…</p>
    <div v-show="!loading" ref="mapDiv" class="map-canvas" />

    <DetailCard
      :detail="selectedPoint ?? selectedDept"
      :unit="professionLabel()"
      hint="Recherchez ou cliquez une ville ou un département pour voir le détail (Échap pour dézoomer)"
      @select-etablissement="onSelectEtablissement"
    />
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.map-canvas {
  width: 100%;
  height: 560px;
  margin-top: 0.5rem;
  border-radius: 8px;
}

@media (max-width: 1024px) {
  .map-canvas {
    height: 460px;
  }
}

@media (max-width: 640px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .map-canvas {
    height: 380px;
  }
}
</style>

<!-- Non scoped : le bouton "retour" est créé par L.DomUtil hors du rendu Vue,
     il n'a donc pas l'attribut data-v-xxx qu'un style scoped exigerait. -->
<style>
.reset-control {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.2);
  background-clip: padding-box;
  border-radius: 4px;
  color: #444;
  cursor: pointer;
  padding: 0;
}

.reset-control:hover:not(:disabled) {
  background: #f4f4f4;
}

.reset-control:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
