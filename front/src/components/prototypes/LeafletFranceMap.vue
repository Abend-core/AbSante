<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useFranceGeo } from '../../composables/useFranceGeo'
import { useFranceRppsStats, type CommuneOption } from '../../composables/useFranceRppsStats'
import { useEtablissements, type Praticien, type Etablissement } from '../../composables/useEtablissements'
import { findNearby, type NearbyResult } from '../../composables/useNearby'
import { POSITION_IMPRECISE_M, type LatLon } from '../../utils/geo'
import { createColorScale } from '../../composables/useColorScale'
import ColorLegend from '../molecules/ColorLegend.vue'
import ProfessionSelect from '../molecules/ProfessionSelect.vue'
import SpecialiteSelect from '../molecules/SpecialiteSelect.vue'
import PraticienSearch from '../molecules/PraticienSearch.vue'
import NearbyPanel, { type NearbyStatus } from '../molecules/NearbyPanel.vue'
import DetailCard from '../molecules/DetailCard.vue'
import CitySearch from '../molecules/CitySearch.vue'
import ToggleSwitch from '../atoms/ToggleSwitch.vue'
import ActionButton from '../atoms/ActionButton.vue'
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
/** Département dont on affiche le détail : seulement son nom et son code, les chiffres sont
 *  calculés à l'affichage (`deptDetail`) pour suivre la profession, la spécialité et le mode choisis. */
const selectedDept = ref<{ nom: string; code: string } | null>(null)
const deptDetail = computed(() => {
  if (!selectedDept.value) return null
  const { nom, code } = selectedDept.value
  return {
    nom,
    n: stats.byDepartement.value[code] ?? 0,
    densite: stats.densiteDisponible.value ? stats.densites.value[code] : undefined,
  }
})

const nearbyStatus = ref<NearbyStatus>('idle')
const nearbyResults = ref<NearbyResult[]>([])
/** Ville choisie à la place de la position de l'appareil (repli quand la localisation échoue). */
const nearbyWhere = ref<string | null>(null)
/** Rayon d'incertitude (m) de la position donnée par le navigateur : grand sans GPS (localisation par IP). */
const nearbyAccuracyM = ref<number | null>(null)
/** Échecs de localisation après lesquels choisir une ville lance la recherche autour d'elle. */
const LOCATION_FAILURES: NearbyStatus[] = ['denied', 'unsupported', 'unavailable', 'timeout']
// Codes de GeolocationPositionError.
/** Sous ce rayon, le cercle d'incertitude serait masqué par le repère « vous êtes ici ». */
const ACCURACY_CIRCLE_MIN_M = 200
const PERMISSION_DENIED = 1
const TIMEOUT = 3

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
const ETABLISSEMENTS_PANE = 'etablissements'
const REPERE_PANE = 'repere'
/** Petits points communes de la vue France : calque à part (canevas, non cliquable), voir drawFrancePoints. */
const FRANCE_PANE = 'communes-france'

let map: L.Map | null = null
let polygonsLayer: L.GeoJSON | null = null
let pointsLayer: L.LayerGroup | null = null
let nearbyLayer: L.LayerGroup | null = null
let nearbyOrigin: LatLon | null = null
let nearbyRun = 0
let cityHighlight: L.CircleMarker | null = null
let franceRenderer: L.Canvas | null = null
let franceRadius = 0
let backButton: HTMLElement | null = null
let resetButton: HTMLElement | null = null
let colorScale = createColorScale([1])

/** Pile des vues visitées (France -> département -> ville -> établissement...) pour
 *  permettre au bouton « étape précédente » de revenir en arrière PAS À PAS, pas
 *  directement à la vue France (c'est le rôle du bouton « vue France », juste dessous). */
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
  syncNavButtons()
}

/** Bouton « étape précédente » : revient à l'état précédent (établissement -> ville ->
 *  département -> France), une étape à la fois. Pile vide -> plus rien avant,
 *  équivaut à la vue France entière. */
function goBack() {
  const prev = viewStack.pop()
  if (!prev || !map) {
    resetZoom()
    return
  }
  syncNavButtons()
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
  return stats.valeurs.value[feature.properties.code] ?? 0
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

const BACK_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>'
const RESET_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">' +
  '<path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" /></svg>'

function setNavDisabled(button: HTMLElement | null, disabled: boolean) {
  if (!button) return
  button.classList.toggle('leaflet-disabled', disabled)
  button.setAttribute('aria-disabled', String(disabled))
}

/** « Retour » actif seulement s'il y a une étape précédente ; « vue France » seulement une fois zoomé. */
function syncNavButtons() {
  setNavDisabled(backButton, viewStack.length === 0)
  setNavDisabled(resetButton, !isZoomed.value)
}

/** Boutons de navigation, empilés par Leaflet sous le zoom +/- natif (même coin topright, même
 *  apparence `leaflet-bar`) -> pas de calcul de position à la main, contrairement au bouton
 *  flottant qu'il fallait repositionner manuellement sur le prototype amCharts. */
const NavControl = L.Control.extend({
  options: { position: 'topright' },
  onAdd() {
    const bar = L.DomUtil.create('div', 'leaflet-bar nav-control') as HTMLDivElement
    const addButton = (icon: string, title: string, onClick: () => void) => {
      const btn = L.DomUtil.create('a', 'nav-control-button', bar) as HTMLElement
      btn.setAttribute('role', 'button')
      btn.setAttribute('href', '#')
      btn.setAttribute('title', title)
      btn.setAttribute('aria-label', title)
      btn.innerHTML = icon
      L.DomEvent.on(btn, 'click', (event: Event) => {
        event.preventDefault()
        if (!btn.classList.contains('leaflet-disabled')) onClick()
      })
      return btn
    }
    backButton = addButton(BACK_ICON, "Revenir à l'étape précédente", goBack)
    resetButton = addButton(RESET_ICON, 'Revenir à la vue France entière (raccourci : Échap)', resetZoom)
    L.DomEvent.disableClickPropagation(bar)
    syncNavButtons()
    return bar
  },
})

/** Recentre/zoome sur une ville et affiche l'anneau de repère à sa place —
 *  remplace le voile bleu du département comme indicateur visuel "vous êtes ici". */
function focusCity(lat: number, lon: number, zoom: number) {
  if (!map || !cityHighlight) return
  map.setView([lat, lon], zoom)
  cityHighlight.setLatLng([lat, lon])
  cityHighlight.addTo(map)
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
  // Calques dédiés, toujours au-dessus des départements (overlayPane, z-index 400) :
  // l'ordre d'empilement ne dépend plus de qui a été ajouté ou survolé en dernier.
  // Sans ça, le bringToFront() du département survolé (voir plus bas) le remontait
  // par-dessus les points, qui devenaient impossibles à cliquer (le clic tombait sur
  // le département). L'anneau reste SOUS les points : posé sur la ville ou sur un
  // établissement, il ne doit jamais empêcher de cliquer un établissement voisin.
  map.createPane(REPERE_PANE).style.zIndex = '440'
  map.createPane(ETABLISSEMENTS_PANE).style.zIndex = '450'
  // Points de la vue France : posés au-dessus des départements mais sans aucune interaction
  // (pointer-events: none), sinon leur canevas, qui couvre toute la carte, bloquerait le clic
  // sur les départements.
  const francePane = map.createPane(FRANCE_PANE)
  francePane.style.zIndex = '450'
  francePane.style.pointerEvents = 'none'
  franceRenderer = L.canvas({ pane: FRANCE_PANE })
  // Fond de plan OpenStreetMap standard : pas de clé requise, contrairement
  // aux styles CARTO hébergés (basemaps.cartocdn.com exige désormais une clé
  // API sur leur offre gratuite, vérifié par capture d'écran -> tuiles
  // remplacées par un filigrane "API KEY REQUIRED").
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  map.zoomControl.setPosition('topright')
  new NavControl().addTo(map)

  // N'importe quel changement de niveau de zoom (clic département, boutons
  // +/- natifs, molette...) active/désactive le bouton « vue France », ajuste
  // l'opacité du département (voir deptFillOpacityFor) et la taille des points de la
  // vue France — pas seulement le clic sur un département.
  map.on('zoomend', () => {
    isZoomed.value = (map?.getZoom() ?? FRANCE_ZOOM) > FRANCE_ZOOM + 0.5
    polygonsLayer?.setStyle(baseStyle)
    if (!stats.zoomedDept.value && franceDotRadius() !== franceRadius) drawFrancePoints()
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
          selectedDept.value = { nom: f.properties.nom, code: f.properties.code }
          clearCityHighlight()
          map?.fitBounds((layer as L.Polygon).getBounds(), { padding: [20, 20] })
          stats.zoomedDept.value = f.properties.code
        })
      },
    },
  ).addTo(map)

  // Simple repère « vous êtes ici » : non cliquable (le retour en arrière passe par le bouton
  // de la carte), donc il ne gêne jamais le clic sur un établissement qu'il entoure.
  // Sans remplissage, et calque sous les points.
  cityHighlight = L.circleMarker(FRANCE_CENTER, {
    radius: 16,
    color: '#1e88e5',
    weight: 6,
    opacity: 0.85,
    fill: false,
    interactive: false,
    pane: REPERE_PANE,
  })

  pointsLayer = L.layerGroup()
  if (showEtablissements.value) pointsLayer.addTo(map)
  nearbyLayer = L.layerGroup().addTo(map)

  refreshData()
}

function makeMarker(lat: number, lon: number): L.CircleMarker {
  return L.circleMarker([lat, lon], {
    radius: MARKER_RADIUS,
    fillColor: '#d9534f',
    fillOpacity: 0.7,
    stroke: false,
    pane: ETABLISSEMENTS_PANE,
  })
}

/** Rayon des petits points de la vue France : minuscules à l'échelle du pays (16 000 communes
 *  se chevaucheraient), plus gros à mesure qu'on zoome. */
function franceDotRadius(): number {
  const zoom = map?.getZoom() ?? FRANCE_ZOOM
  if (zoom <= 5) return 1
  if (zoom === 6) return 1.5
  if (zoom === 7) return 2.5
  return 4
}

/** Très translucides à l'échelle du pays : les points se superposent, si bien que seules les zones
 *  denses virent au rouge plein, sans masquer les couleurs des départements sous les zones rurales. */
function franceDotOpacity(radius: number): number {
  if (radius <= 1) return 0.3
  if (radius <= 1.5) return 0.4
  return 0.6
}

/** Vue France (aucun département zoomé) : un petit point par commune qui a des praticiens pour
 *  la sélection, pour voir où ils se concentrent. Dessinés sur un canevas (16 000 éléments SVG
 *  ralentiraient la carte) et non cliquables : le détail s'obtient en zoomant un département. */
function drawFrancePoints() {
  if (!pointsLayer) return
  pointsLayer.clearLayers()
  franceRadius = franceDotRadius()
  for (const p of stats.visiblePoints.value) {
    pointsLayer.addLayer(
      L.circleMarker([p.lat, p.lon], {
        radius: franceRadius,
        fillColor: '#d9534f',
        fillOpacity: franceDotOpacity(franceRadius),
        stroke: false,
        interactive: false,
        pane: FRANCE_PANE,
        renderer: franceRenderer ?? undefined,
      }),
    )
  }
}

/** Affiche le détail nominatif d'un établissement (praticiens) et s'y recentre.
 *  Zoome sur sa vraie position géocodée si connue (précision "rue"), sinon sur
 *  la commune (on ne sait rien de plus précis). */
function showEtablissement(etab: Etablissement, communeNom: string, communeLat: number, communeLon: number) {
  const nom = `${etab.nom} (${communeNom})`
  if (selectedPoint.value?.nom !== nom) pushView()
  selectedDept.value = null
  selectedPoint.value = { nom, n: etab.praticiens.length, praticiens: etab.praticiens }
  if (etab.coords) focusCity(etab.coords[0], etab.coords[1], ETABLISSEMENT_ZOOM)
  else focusCity(communeLat, communeLon, cityZoomFor(0))
}

/** Reconstruit les couleurs des départements et régénère les points commune et
 *  établissement (filtre de profession et/ou zoom département) sans jamais
 *  recréer la carte. */
function refreshData() {
  if (!polygonsLayer || !pointsLayer) return

  colorScale = createColorScale(currentFeatures.value.map(valueFor), stats.maxValeur.value)
  polygonsLayer.setStyle(baseStyle)

  const dept = stats.zoomedDept.value

  // Sans département zoomé, stats.visiblePoints couvre TOUTE la France (~16 000 communes) :
  // à taille fixe, ça donne une masse rouge illisible -> petits points non cliquables qui
  // grossissent avec le zoom (drawFrancePoints), le détail (établissements) venant une fois
  // un département zoomé.
  if (!dept) {
    drawFrancePoints()
    return
  }
  pointsLayer.clearLayers()

  for (const p of stats.visiblePoints.value) {
    // Le filtre de profession ne limite plus l'éclatement en établissements : chaque
    // praticien connaît sa propre profession dans les données -> on peut filtrer les
    // établissements ET leurs praticiens listés par la profession sélectionnée, pas
    // seulement se limiter à "Tous" comme avant (l'ancienne limite qui collapsait tout
    // sur un seul point dès qu'un filtre de profession était actif).
    const etabs = etablissements.forCommune(dept, p.codeInsee, stats.selectedProfession.value, stats.selectedSpecialiteIdx.value)
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
        // Recliquer sur la commune déjà affichée n'ajoute pas d'étape : sinon
        // l'anneau "retour" ramènerait sur la même fiche.
        if (selectedPoint.value?.nom !== p.nom) pushView()
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
  closeNearby()
  viewStack = []
  map?.setView(FRANCE_CENTER, FRANCE_ZOOM)
  stats.zoomedDept.value = null
  clearCityHighlight()
  selectedPoint.value = null
  selectedDept.value = null
  syncNavButtons()
}

/** « Autour de moi » : localise le visiteur puis cherche les établissements les plus proches qui
 *  correspondent à la sélection (profession, spécialité). La position n'est jamais envoyée
 *  nulle part : tout se calcule ici, à partir des fichiers de données déjà servis. */
function locateMe() {
  nearbyRun++ // ignore une recherche encore en cours
  nearbyWhere.value = null
  nearbyAccuracyM.value = null
  nearbyResults.value = []
  nearbyLayer?.clearLayers()
  // La géolocalisation exige une connexion sécurisée (https) : sans, les navigateurs la refusent.
  if (!('geolocation' in navigator) || window.isSecureContext === false) {
    nearbyStatus.value = 'unsupported'
    return
  }
  nearbyStatus.value = 'locating'
  navigator.geolocation.getCurrentPosition(
    (pos) => void searchNearby([pos.coords.latitude, pos.coords.longitude], null, pos.coords.accuracy),
    (err) => {
      // Refus, appareil qui n'arrive pas à se localiser (fréquent sur ordinateur), ou délai dépassé :
      // trois causes différentes, à ne pas confondre avec un échec de la recherche qui suit.
      nearbyStatus.value = err.code === PERMISSION_DENIED ? 'denied' : err.code === TIMEOUT ? 'timeout' : 'unavailable'
    },
    { timeout: 20_000, maximumAge: 60_000 },
  )
}

async function searchNearby(origin: LatLon, where: string | null = null, accuracyM: number | null = null) {
  const run = ++nearbyRun
  nearbyOrigin = origin
  nearbyWhere.value = where
  nearbyAccuracyM.value = accuracyM
  nearbyStatus.value = 'searching'
  try {
    const results = await findNearby(origin, {
      communes: stats.allCommunes.value,
      loadDept: etablissements.loadDept,
      forCommune: (dept, code) => etablissements.forCommune(dept, code, stats.selectedProfession.value, stats.selectedSpecialiteIdx.value),
    })
    if (run !== nearbyRun) return // une recherche plus récente a pris le relais
    nearbyResults.value = results
    nearbyStatus.value = 'done'
    drawNearby(origin, results)
  } catch {
    if (run === nearbyRun) nearbyStatus.value = 'error'
  }
}

function drawNearby(origin: LatLon, results: NearbyResult[]) {
  if (!map || !nearbyLayer) return
  nearbyLayer.clearLayers()
  const me = L.circleMarker(origin, { radius: 8, color: '#fff', weight: 3, fillColor: '#1e88e5', fillOpacity: 1, pane: ETABLISSEMENTS_PANE })
  me.bindTooltip(nearbyWhere.value ? `Centre de ${nearbyWhere.value}` : 'Vous êtes ici')
  // Position imprécise (sans GPS) : on montre la zone où la personne peut réellement se trouver.
  const accuracy = nearbyAccuracyM.value
  if (accuracy !== null && accuracy >= ACCURACY_CIRCLE_MIN_M) {
    nearbyLayer.addLayer(L.circle(origin, { radius: accuracy, color: '#1e88e5', weight: 1, fillOpacity: 0.08, interactive: false }))
  }
  nearbyLayer.addLayer(me)
  for (const r of results) {
    const marker = makeMarker(r.position[0], r.position[1])
    marker.on('click', () => onSelectNearby(r))
    nearbyLayer.addLayer(marker)
  }
  // Cadre la personne et ses résultats ; sans résultat, se contente de la centrer. Une position
  // imprécise est cadrée avec sa zone d'incertitude, sinon la carte, zoomée sur les résultats,
  // ferait croire que la position est exacte.
  const points: LatLon[] = [origin, ...results.map((r) => r.position)]
  if (accuracy !== null && accuracy >= ACCURACY_CIRCLE_MIN_M) {
    const dLat = accuracy / 111_320 // mètres par degré de latitude
    const dLon = dLat / Math.cos((origin[0] * Math.PI) / 180)
    points.push([origin[0] + dLat, origin[1] + dLon], [origin[0] - dLat, origin[1] - dLon])
  }
  if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 15 })
  else map.setView(origin, 12)
}

function onSelectNearby(r: NearbyResult) {
  showEtablissement(r.etablissement, r.commune.nom, r.commune.lat, r.commune.lon)
}

function closeNearby() {
  nearbyRun++ // ignore une recherche encore en cours
  nearbyOrigin = null
  nearbyWhere.value = null
  nearbyAccuracyM.value = null
  nearbyStatus.value = 'idle'
  nearbyResults.value = []
  nearbyLayer?.clearLayers()
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
  // Localisation impossible ou trop imprécise (ou déjà en mode « autour d'une ville ») : la ville
  // choisie sert de point de départ à « Autour de moi ».
  const imprecise = (nearbyAccuracyM.value ?? 0) >= POSITION_IMPRECISE_M
  if (nearbyWhere.value !== null || imprecise || LOCATION_FAILURES.includes(nearbyStatus.value)) {
    void searchNearby([c.lat, c.lon], c.nom)
  }
}

/** Unité des effectifs affichés : « praticiens », « infirmier », « praticiens en cardiologie »... */
function professionLabel(): string {
  if (stats.selectedSpecialite.value) return `praticiens en ${stats.selectedSpecialite.value.toLowerCase()}`
  return stats.selectedProfession.value === 'Tous' ? 'praticiens' : stats.selectedProfession.value.toLowerCase()
}

// Espaces insécables : « 100 000 » ne doit jamais se couper en fin de ligne.
const legendLabel = computed(
  () => `${stats.selectionLabel.value ?? 'Praticiens'} ${stats.modeDensite.value ? 'pour 100\u00a0000\u00a0habitants' : 'par département'}`,
)

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
// `stats.points` change quand la sélection change ET quand le fichier des communes par spécialité
// arrive ; `stats.valeurs` quand on bascule effectif / densité.
watch(
  [() => stats.selectedProfession.value, () => stats.selectedSpecialiteIdx.value, () => stats.zoomedDept.value, stats.points, stats.valeurs],
  async ([, , dept]) => {
    if (dept) await etablissements.loadDept(dept)
    refreshData()
  },
)
// « Autour de moi » suit la sélection : changer de profession relance la recherche depuis la même position.
watch([() => stats.selectedProfession.value, () => stats.selectedSpecialiteIdx.value], () => {
  if (nearbyOrigin && nearbyStatus.value !== 'idle') void searchNearby(nearbyOrigin, nearbyWhere.value, nearbyAccuracyM.value)
})
watch(showEtablissements, (visible) => {
  if (!map || !pointsLayer) return
  if (visible) pointsLayer.addTo(map)
  else map.removeLayer(pointsLayer)
})
watch(isZoomed, syncNavButtons)

onBeforeUnmount(() => {
  map?.remove()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="leaflet-map">
    <div class="controls">
      <CitySearch :communes="stats.allCommunes.value" @select="selectCity" />
      <PraticienSearch />
      <ActionButton
        variant="outline"
        icon="pin"
        :disabled="nearbyStatus === 'locating' || nearbyStatus === 'searching'"
        title="Les établissements les plus proches de vous (votre position reste sur votre appareil)"
        @click="locateMe"
      >
        Autour de moi
      </ActionButton>
    </div>
    <div class="controls">
      <ProfessionSelect v-model="stats.selectedProfession.value" :professions="stats.professions.value" />
      <SpecialiteSelect
        v-if="stats.specialitesDeLaProfession.value.length"
        v-model="stats.selectedSpecialite.value"
        :specialites="stats.specialitesDeLaProfession.value"
      />
      <ToggleSwitch
        v-if="stats.densiteDisponible.value"
        v-model="stats.densite.value"
        label="Pour 100 000 hab."
        title="Colorier par praticiens pour 100 000 habitants plutôt que par effectif brut (qui ne fait que suivre la population). Les praticiens sont comptés là où ils exercent : les départements à gros hôpitaux ressortent davantage."
      />
      <ColorLegend :max="stats.maxValeur.value" :label="legendLabel" :capped="stats.plafonne.value" />
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
      :detail="selectedPoint ?? deptDetail"
      :unit="professionLabel()"
      hint="Recherchez ou cliquez une ville ou un département pour voir le détail (Échap pour dézoomer)"
      @select-etablissement="onSelectEtablissement"
    />

    <NearbyPanel
      :status="nearbyStatus"
      :results="nearbyResults"
      :label="stats.selectionLabel.value"
      :where="nearbyWhere"
      :accuracy-m="nearbyAccuracyM"
      @select="onSelectNearby"
      @close="closeNearby"
    />
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  gap: 0.9rem 1.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

/* Le libellé de « Autour de moi » ne se coupe pas sur deux lignes ; on le grise pendant la recherche. */
.controls button:disabled {
  opacity: 0.6;
  cursor: progress;
}

.map-canvas {
  width: 100%;
  height: 560px;
  margin-top: 0.5rem;
  border-radius: 12px;
}

@media (max-width: 1024px) {
  .map-canvas {
    height: 460px;
  }
}

@media (max-width: 640px) {
  .controls {
    flex-direction: column;
    /* Sans ça, en colonne, la « ligne » prend la largeur du plus large contrôle (le menu des
       professions) et déborde du panneau au lieu de se caler sur lui. */
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 0.75rem;
  }

  .map-canvas {
    height: 380px;
  }
}
</style>

<!-- Non scoped : les boutons de navigation sont créés par L.DomUtil hors du rendu Vue,
     ils n'ont donc pas l'attribut data-v-xxx qu'un style scoped exigerait. Le reste de
     l'apparence (fond, bordure, survol, état désactivé) vient de `leaflet-bar`. -->
<style>
.nav-control a {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #444;
}
</style>
