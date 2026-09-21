import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Comme pour amCharts, Leaflet dessine sur un vrai DOM/canvas qu'on ne peut
// pas faire tourner tel quel en test. Ce qu'on PEUT et DOIT vérifier : que le
// composant appelle le bon enchaînement d'API Leaflet (la carte n'est créée
// qu'une fois, les couches sont mises à jour en place au changement de
// filtre/zoom, sans jamais recréer la carte).

function makeLayer() {
  const handlers: Record<string, () => void> = {}
  return {
    on: vi.fn((event: string, cb: () => void) => {
      handlers[event] = cb
    }),
    setStyle: vi.fn(),
    getBounds: vi.fn(() => ({})),
    setLatLng: vi.fn(),
    getLatLng: vi.fn(() => ({ lat: 45.0, lng: 2.0 })),
    addTo: vi.fn(),
    bindTooltip: vi.fn(),
    bringToFront: vi.fn(),
    __handlers: handlers,
  }
}

// vi.mock(...) est hoisté au-dessus des imports : les spies qu'il référence
// doivent l'être aussi (vi.hoisted), sinon TDZ ("Cannot access before initialization").
const { removeSpy, mapOnSpy, fitBoundsSpy, setViewSpy } = vi.hoisted(() => ({
  removeSpy: vi.fn(),
  mapOnSpy: vi.fn(),
  fitBoundsSpy: vi.fn(),
  setViewSpy: vi.fn(),
}))
let geoJsonOnEachFeature: ((feature: unknown, layer: ReturnType<typeof makeLayer>) => void) | undefined
let geoJsonSetStyleCalls = 0
let pointsAdded: unknown[] = []
let nearbyAdded: unknown[] = []
let layerGroupCalls = 0
let controlOnAddCalled = false
let domClickHandlers = new Map<HTMLElement, (event: Event) => void>()

vi.mock('leaflet', () => {
  const geoJsonLayer = {
    addTo: vi.fn(function (this: unknown) {
      return this
    }),
    setStyle: vi.fn(() => {
      geoJsonSetStyleCalls += 1
    }),
    resetStyle: vi.fn(),
  }

  const layerGroup = {
    addTo: vi.fn(function (this: unknown) {
      return this
    }),
    clearLayers: vi.fn(() => {
      pointsAdded = []
    }),
    addLayer: vi.fn((l: unknown) => {
      pointsAdded.push(l)
    }),
  }

  const map = {
    on: mapOnSpy,
    getZoom: vi.fn(() => 6),
    getCenter: vi.fn(() => ({ lat: 46.6, lng: 2.4 })),
    setView: setViewSpy,
    fitBounds: fitBoundsSpy,
    remove: removeSpy,
    removeLayer: vi.fn(),
    hasLayer: vi.fn(() => true),
    createPane: vi.fn(() => document.createElement('div')),
    zoomControl: { setPosition: vi.fn() },
  }

  const ControlBase = class {
    addTo() {
      const el = (this as unknown as { onAdd: () => HTMLElement }).onAdd()
      controlOnAddCalled = true
      return el
    }
  }

  return {
    default: {
      map: vi.fn(() => map),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      geoJSON: vi.fn((_data: unknown, options: { onEachFeature?: typeof geoJsonOnEachFeature }) => {
        geoJsonOnEachFeature = options.onEachFeature
        return geoJsonLayer
      }),
      // 1er appel = calque des établissements (`layerGroup` ci-dessus) ; 2e = calque « autour de moi »,
      // suivi à part pour ne pas mélanger ses marqueurs avec ceux des établissements.
      layerGroup: vi.fn(() => {
        layerGroupCalls += 1
        if (layerGroupCalls === 1) return layerGroup
        return {
          addTo: vi.fn(function (this: unknown) {
            return this
          }),
          clearLayers: vi.fn(() => {
            nearbyAdded = []
          }),
          addLayer: vi.fn((l: unknown) => {
            nearbyAdded.push(l)
          }),
        }
      }),
      circleMarker: vi.fn(() => makeLayer()),
      Control: Object.assign(ControlBase, {
        extend: (opts: Record<string, unknown>) => class extends ControlBase {
          onAdd() {
            return (opts.onAdd as () => HTMLElement).call(this)
          }
        },
      }),
      canvas: vi.fn(() => ({})),
      DomUtil: {
        create: vi.fn((tag: string, className?: string, container?: HTMLElement) => {
          const el = document.createElement(tag)
          if (className) el.className = className
          container?.appendChild(el)
          return el
        }),
      },
      DomEvent: {
        disableClickPropagation: vi.fn(),
        on: vi.fn((el: HTMLElement, event: string, handler: (event: Event) => void) => {
          if (event === 'click') domClickHandlers.set(el, handler)
        }),
      },
    },
  }
})

import LeafletFranceMap from './LeafletFranceMap.vue'

/** Clique un bouton du contrôle de navigation (sous le zoom), retrouvé par son libellé. */
function clickNav(titleStart: string) {
  const button = [...domClickHandlers.keys()].find((el) => el.getAttribute('title')?.startsWith(titleStart))
  expect(button, `bouton « ${titleStart}… »`).toBeDefined()
  domClickHandlers.get(button!)!({ preventDefault: () => {} } as Event)
}
function navButton(titleStart: string): HTMLElement {
  return [...domClickHandlers.keys()].find((el) => el.getAttribute('title')?.startsWith(titleStart))!
}

const GEOJSON = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: { code: '01', nom: 'Ain' }, geometry: {} }],
}
const DEPT_PAYLOAD = {
  updatedAt: '2026-09-17T00:00:00Z',
  professions: ['Infirmier', 'Médecin'],
  byDepartement: { '01': { Infirmier: 1, Médecin: 5, Tous: 5 } },
}
// Une commune "Testville" (code INSEE 01001) : 1 infirmier, 3 médecins, 5 au total
// (cats = ['Infirmier', 'Médecin', 'Tous'] -> idx Infirmier=0, Médecin=1, Tous=2)
const COMMUNE_PAYLOAD = {
  updatedAt: '2026-09-17T00:00:00Z',
  professions: ['Infirmier', 'Médecin'],
  rows: [[45.0, 2.0, '01', 'Testville', '01001', 1, 3, 5]],
}
// Détail établissements du département '01', chargé à la demande une fois zoomé dessus.
// CH Grandville est géocodé (coordonnées propres) -> son propre point sur la carte.
// Cabinet Poulteau ne l'est pas (adresse non geocodable) -> reste dans la liste au
// clic sur le point commune, comme n'importe quel établissement sans position connue.
// Un 2e praticien (Infirmier) chez CH Grandville sert à vérifier le filtre par profession.
const ETABLISSEMENTS_01 = {
  updatedAt: '2026-09-17T00:00:00Z',
  communes: {
    '01001': [
      [
        'CH Grandville',
        [45.531, 4.276],
        [
          ['Dupont', 'Jean', 'Médecin', '810000000101'],
          ['Martin', 'Claire', 'Infirmier', '810000000102'],
        ],
      ],
      ['Cabinet Poulteau', null, [['Poulteau', 'Sylvain', 'Médecin', '810000000103']]],
    ],
  },
}

// Avec spécialités et population : 1 médecin cardiologue (indice 0) à Testville, 100 000 habitants dans l'Ain.
const DEPT_PAYLOAD_SPECIALITES = {
  ...DEPT_PAYLOAD,
  specialites: [['Médecin', 'Cardiologie']],
  bySpecialite: { '01': { '0': 2 } },
}
const POPULATION_PAYLOAD = { byDepartement: { '01': 100000 } }

function stubFetch(
  communePayload: unknown = COMMUNE_PAYLOAD,
  etablissementsPayload: unknown = ETABLISSEMENTS_01,
  deptPayload: unknown = DEPT_PAYLOAD,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('departements.geojson')) return Promise.resolve({ json: () => Promise.resolve(GEOJSON) })
      if (url.includes('rpps-departement.json')) return Promise.resolve({ json: () => Promise.resolve(deptPayload) })
      if (url.includes('population-departement.json')) return Promise.resolve({ json: () => Promise.resolve(POPULATION_PAYLOAD) })
      if (url.includes('rpps-commune-specialite.json')) return Promise.resolve({ json: () => Promise.resolve({ communes: { '01001': [[0, 2]] } }) })
      if (url.includes('rpps-commune.json')) return Promise.resolve({ json: () => Promise.resolve(communePayload) })
      if (url.includes('/etablissements/01.json'))
        return Promise.resolve({ json: () => Promise.resolve(etablissementsPayload) })
      return Promise.reject(new Error('URL non mockée: ' + url))
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  pointsAdded = []
  nearbyAdded = []
  layerGroupCalls = 0
  controlOnAddCalled = false
  domClickHandlers = new Map()
  geoJsonSetStyleCalls = 0
  stubFetch()
})

describe('LeafletFranceMap', () => {
  it('crée la carte une seule fois, même après plusieurs changements de filtre', async () => {
    const { default: L } = await import('leaflet')
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    expect((L.map as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
    expect(removeSpy).not.toHaveBeenCalled()

    await wrapper.find('select').setValue('Médecin')
    await flushPromises()

    expect((L.map as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
    expect(removeSpy).not.toHaveBeenCalled()
  })

  it('recolore les départements en place au changement de filtre, sans recréer la couche', async () => {
    const { default: L } = await import('leaflet')
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const geoJsonCallsAfterInit = (L.geoJSON as ReturnType<typeof vi.fn>).mock.calls.length
    expect(geoJsonCallsAfterInit).toBe(1)
    expect(geoJsonSetStyleCalls).toBe(1) // appelé une fois dans refreshData() au montage

    await wrapper.find('select').setValue('Médecin')
    await flushPromises()

    expect((L.geoJSON as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1) // toujours pas recréée
    expect(geoJsonSetStyleCalls).toBe(2)
  })

  it('zoome sur le département cliqué et le fait savoir au composable de stats', async () => {
    mount(LeafletFranceMap)
    await flushPromises()

    expect(geoJsonOnEachFeature).toBeDefined()
    const layer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], layer)

    const clickHandler = layer.__handlers.click
    expect(clickHandler).toBeDefined()
    clickHandler!()

    expect(fitBoundsSpy).toHaveBeenCalled()
  })

  it('un second clic sur le département déjà zoomé ne fait rien (évite de dézoomer accidentellement en cliquant à côté d\'un point)', async () => {
    mount(LeafletFranceMap)
    await flushPromises()

    const layer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], layer)
    layer.__handlers.click?.()
    expect(fitBoundsSpy).toHaveBeenCalledTimes(1)

    layer.__handlers.click?.()
    expect(fitBoundsSpy).toHaveBeenCalledTimes(1) // pas de second appel
  })

  it("le bouton « étape précédente » revient en arrière une étape à la fois (ville -> département -> France)", async () => {
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    const communeMarker = pointsAdded[0] as ReturnType<typeof makeLayer>
    communeMarker.__handlers.click?.()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Testville')

    clickNav("Revenir à l'étape précédente")
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Ain')
    expect(wrapper.text()).not.toContain('Testville')

    clickNav("Revenir à l'étape précédente")
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Ain')
    expect(wrapper.text()).not.toContain('Testville')
  })

  it("le bouton « étape précédente » est grisé tant qu'il n'y a rien avant, et inopérant dans cet état", async () => {
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    expect(navButton("Revenir à l'étape précédente").classList.contains('leaflet-disabled')).toBe(true)
    clickNav("Revenir à l'étape précédente")
    expect(setViewSpy).not.toHaveBeenCalled()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await wrapper.vm.$nextTick()
    expect(navButton("Revenir à l'étape précédente").classList.contains('leaflet-disabled')).toBe(false)

    clickNav("Revenir à l'étape précédente")
    expect(navButton("Revenir à l'étape précédente").classList.contains('leaflet-disabled')).toBe(true)
  })

  it("le bouton « vue France » recadre sur la France entière et efface la sélection", async () => {
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Ain')

    // Le mock de la carte reste au zoom 6 (> zoom France + 0,5) : le bouton est donc actif.
    const zoomend = mapOnSpy.mock.calls.find((c: unknown[]) => c[0] === 'zoomend')?.[1] as () => void
    zoomend()
    await wrapper.vm.$nextTick()
    expect(navButton('Revenir à la vue France').classList.contains('leaflet-disabled')).toBe(false)

    clickNav('Revenir à la vue France')
    await wrapper.vm.$nextTick()
    expect(setViewSpy).toHaveBeenLastCalledWith([46.6, 2.4], 5)
    expect(wrapper.text()).not.toContain('Ain')
  })

  it("les points et l'anneau vivent dans leurs propres calques, au-dessus des départements (régression : le département survolé remontait par-dessus les points et les rendait incliquables)", async () => {
    const { default: L } = await import('leaflet')
    mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    const calls = (L.circleMarker as ReturnType<typeof vi.fn>).mock.calls as [unknown, { pane?: string; radius: number }][]
    const ring = calls.find((c) => c[1].radius === 16)
    const points = calls.filter((c) => c[1].radius === 5)
    expect(ring?.[1].pane).toBe('repere')
    expect(points.length).toBeGreaterThan(0)
    for (const p of points) expect(p[1].pane).toBe('etablissements')
  })

  it("l'anneau de repère n'est plus cliquable, n'a pas de remplissage et passe sous les points (il ne doit jamais gêner le clic sur un établissement qu'il entoure)", async () => {
    const { default: L } = await import('leaflet')
    mount(LeafletFranceMap)
    await flushPromises()

    const calls = (L.circleMarker as ReturnType<typeof vi.fn>).mock.calls as [unknown, { radius: number; fill?: boolean; interactive?: boolean }][]
    const ring = calls.find((c) => c[1].radius === 16)
    expect(ring?.[1].fill).toBe(false)
    expect(ring?.[1].interactive).toBe(false)

    const mapMock = (L.map as ReturnType<typeof vi.fn>).mock.results[0].value as { createPane: ReturnType<typeof vi.fn> }
    const zIndexOf = (name: string) => {
      const i = mapMock.createPane.mock.calls.findIndex((c) => c[0] === name)
      return Number((mapMock.createPane.mock.results[i].value as HTMLElement).style.zIndex)
    }
    expect(zIndexOf('repere')).toBeLessThan(zIndexOf('etablissements'))
  })

  it("recliquer la commune déjà affichée n'ajoute pas d'étape : « précédent » ramène au département, pas sur la même fiche", async () => {
    stubFetch(COMMUNE_PAYLOAD, { updatedAt: '2026-09-17T00:00:00Z', communes: {} })
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    const communeMarker = pointsAdded[0] as ReturnType<typeof makeLayer>
    communeMarker.__handlers.click?.()
    communeMarker.__handlers.click?.()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Testville')

    clickNav("Revenir à l'étape précédente")
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Testville')
    expect(wrapper.text()).toContain('Ain')
  })

  it('les établissements sont désactivés par défaut', async () => {
    const { default: L } = await import('leaflet')
    mount(LeafletFranceMap)
    await flushPromises()

    const layerGroupInstance = (L.layerGroup as ReturnType<typeof vi.fn>).mock.results[0]?.value as {
      addTo: ReturnType<typeof vi.fn>
    }
    expect(layerGroupInstance.addTo).not.toHaveBeenCalled()
  })

  it("réagit au zoom natif (pas seulement au clic sur un département) pour activer le bouton retour", async () => {
    mount(LeafletFranceMap)
    await flushPromises()

    const zoomendHandler = mapOnSpy.mock.calls.find((c: unknown[]) => c[0] === 'zoomend')?.[1] as
      | (() => void)
      | undefined
    expect(zoomendHandler).toBeDefined()
    expect(controlOnAddCalled).toBe(true)
  })

  it('le survol seul ne met plus à jour le détail affiché (seulement le clic)', async () => {
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const layer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], layer)
    layer.__handlers.mouseover?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('Ain')
    expect(wrapper.text()).toContain('Recherchez ou cliquez')

    layer.__handlers.click?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Ain')
  })

  it("vue France : un petit point non cliquable par commune, sur un calque canevas à part (régression : rien ne s'affichait sans département zoomé)", async () => {
    const { default: L } = await import('leaflet')
    mount(LeafletFranceMap)
    await flushPromises()

    expect(pointsAdded.length).toBeGreaterThan(0)
    const calls = (L.circleMarker as ReturnType<typeof vi.fn>).mock.calls as [
      unknown,
      { radius: number; pane?: string; interactive?: boolean; renderer?: unknown },
    ][]
    const dots = calls.filter((c) => c[1].pane === 'communes-france')
    expect(dots.length).toBe(pointsAdded.length)
    for (const [, options] of dots) {
      expect(options.interactive).toBe(false) // ne bloque pas le clic sur les départements
      expect(options.radius).toBeLessThan(5) // plus petits que les points d'un département zoomé
      expect(options.renderer).toBeDefined() // canevas : 16 000 éléments SVG ralentiraient la carte
    }
    const mapMock = (L.map as ReturnType<typeof vi.fn>).mock.results[0].value as { createPane: ReturnType<typeof vi.fn> }
    const i = mapMock.createPane.mock.calls.findIndex((c) => c[0] === 'communes-france')
    expect((mapMock.createPane.mock.results[i].value as HTMLElement).style.pointerEvents).toBe('none')
  })

  it("la taille des points de la vue France suit le zoom", async () => {
    const { default: L } = await import('leaflet')
    mount(LeafletFranceMap)
    await flushPromises()

    const mapMock = (L.map as ReturnType<typeof vi.fn>).mock.results[0].value as { getZoom: ReturnType<typeof vi.fn> }
    const zoomend = mapOnSpy.mock.calls.find((c: unknown[]) => c[0] === 'zoomend')?.[1] as () => void
    const radiusAt = (zoom: number) => {
      mapMock.getZoom.mockReturnValue(zoom)
      zoomend()
      const calls = (L.circleMarker as ReturnType<typeof vi.fn>).mock.calls as [unknown, { radius: number; pane?: string }][]
      return calls.filter((c) => c[1].pane === 'communes-france').at(-1)![1].radius
    }
    const small = radiusAt(5)
    const large = radiusAt(8)
    expect(large).toBeGreaterThan(small)
  })

  it("en zoomant un département, les petits points de la vue France cèdent la place aux points communes/établissements", async () => {
    const { default: L } = await import('leaflet')
    mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    const calls = (L.circleMarker as ReturnType<typeof vi.fn>).mock.calls as [unknown, { pane?: string }][]
    const lastPane = calls.at(-1)![1].pane
    expect(lastPane).toBe('etablissements')
    for (const marker of pointsAdded) expect(marker).toBeDefined()
    expect(pointsAdded).toHaveLength(2) // CH Grandville + point commune, comme avant
  })

  it('le clic sur un point commune affiche son détail et zoome sur la ville (pas au survol)', async () => {
    // Département sans établissement connu pour cette commune -> un seul marqueur simple
    stubFetch(COMMUNE_PAYLOAD, { updatedAt: '2026-09-17T00:00:00Z', communes: {} })
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    const marker = pointsAdded[0] as ReturnType<typeof makeLayer>
    expect(marker).toBeDefined()
    expect(marker.__handlers.mouseover).toBeUndefined() // plus de handler de survol sur les points

    marker.__handlers.click?.()
    await wrapper.vm.$nextTick()

    // Testville a un effectif "Tous" de 5 -> petite commune -> zoom "ville" 14 (cityZoomFor)
    expect(setViewSpy).toHaveBeenCalledWith([45.0, 2.0], 14)
    expect(wrapper.text()).toContain('Testville')
  })

  it('un point commune sans établissement connu reste un point fixe unique (pas de taille variable)', async () => {
    stubFetch(COMMUNE_PAYLOAD, { updatedAt: '2026-09-17T00:00:00Z', communes: {} })
    mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    // Aucun établissement connu -> un seul marqueur pour la commune, pas un marqueur par
    // établissement, et un rayon fixe (pas dépendant de l'effectif)
    expect(pointsAdded).toHaveLength(1)
    const { default: L } = await import('leaflet')
    const circleMarkerCalls = (L.circleMarker as ReturnType<typeof vi.fn>).mock.calls as [
      unknown,
      { radius: number },
    ][]
    // cityHighlight (l'anneau de repère) est aussi créé via circleMarker (rayon 16) -> on
    // cible spécifiquement le marqueur de point à rayon fixe 5
    const pointCall = circleMarkerCalls.find((c) => c[1]?.radius === 5)
    expect(pointCall).toBeDefined()
  })

  it('un établissement géocodé obtient son propre point à sa vraie adresse, distinct du point commune', async () => {
    mount(LeafletFranceMap)
    await flushPromises()

    // Clic département -> zoomedDept = '01' -> charge etablissements/01.json -> refreshData
    const layer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], layer)
    layer.__handlers.click?.()
    await flushPromises()

    // CH Grandville (géocodé) obtient son propre point ; Cabinet Poulteau (non geocodable)
    // reste seulement dans la liste du point commune -> 2 points au total, pas 3 ni 1.
    expect(pointsAdded).toHaveLength(2)
    const { default: L } = await import('leaflet')
    const lastTwoCalls = (L.circleMarker as ReturnType<typeof vi.fn>).mock.calls.slice(-2)
    // Le point établissement est créé à SES coordonnées géocodées, pas celles de la commune
    expect(lastTwoCalls[0][0]).toEqual([45.531, 4.276])
    expect(lastTwoCalls[1][0]).toEqual([45.0, 2.0]) // le point commune, lui, reste à ses coordonnées
  })

  it('cliquer directement le point établissement géocodé affiche son détail et zoome à sa vraie adresse', async () => {
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    const etabMarker = pointsAdded[0] as ReturnType<typeof makeLayer> // CH Grandville, geocodé
    etabMarker.__handlers.click?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('CH Grandville')
    expect(wrapper.text()).toContain('Jean')
    expect(wrapper.text()).toContain('Dupont')
    // Zoom "rue" (17) sur ses vraies coordonnées, pas le zoom "ville" sur la commune
    expect(setViewSpy).toHaveBeenCalledWith([45.531, 4.276], 17)
  })

  it("chaque praticien listé mène à SA fiche (lien vers /praticien/<identifiant national> dans un nouvel onglet)", async () => {
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    ;(pointsAdded[0] as ReturnType<typeof makeLayer>).__handlers.click?.()
    await wrapper.vm.$nextTick()

    const links = wrapper.findAll('a.detail-card__fiche')
    expect(links.map((l) => l.attributes('href'))).toEqual(['/praticien/810000000101', '/praticien/810000000102'])
    expect(links.every((l) => l.attributes('target') === '_blank')).toBe(true)
  })

  it('cliquer le point commune liste seulement les établissements NON géocodés (les autres ont déjà leur propre point)', async () => {
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    const communeMarker = pointsAdded[1] as ReturnType<typeof makeLayer>
    communeMarker.__handlers.click?.()
    await wrapper.vm.$nextTick()

    // Cabinet Poulteau (non geocodable) est listé ; CH Grandville non (il a déjà son propre
    // point sur la carte, le lister ici ferait doublon)
    expect(wrapper.text()).toContain('Cabinet Poulteau')
    expect(wrapper.text()).not.toContain('CH Grandville')
    expect(wrapper.text()).not.toContain('Sylvain') // pas encore le détail nominatif
  })

  it("un praticien isolé dont l'adresse n'a pas pu être géocodée reste accessible via la liste, sans être perdu", async () => {
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    const communeMarker = pointsAdded[1] as ReturnType<typeof makeLayer>
    communeMarker.__handlers.click?.()
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('.detail-card__etablissements button')
    const poulteau = buttons.find((b) => b.text().includes('Cabinet Poulteau'))
    expect(poulteau).toBeDefined()
    await poulteau!.trigger('click')

    expect(wrapper.text()).toContain('Sylvain')
    expect(wrapper.text()).toContain('Poulteau')
    expect(wrapper.text()).toContain('1 praticiens')
  })

  it("un filtre de profession n'écrase plus tout sur un seul point (régression signalée : Andrézieux-Bouthéon ne montrait plus qu'un point avec un filtre actif)", async () => {
    const wrapper = mount(LeafletFranceMap)
    await flushPromises()

    const deptLayer = makeLayer()
    geoJsonOnEachFeature!(GEOJSON.features[0], deptLayer)
    deptLayer.__handlers.click?.()
    await flushPromises()

    await wrapper.find('select').setValue('Infirmier')
    await flushPromises()

    // CH Grandville a une infirmière (Martin Claire) -> garde son propre point malgré le
    // filtre. Cabinet Poulteau (que du Médecin) n'a plus personne à afficher pour ce
    // filtre -> disparaît complètement plutôt que de rester listé vide.
    expect(pointsAdded).toHaveLength(1)
    const etabMarker = pointsAdded[0] as ReturnType<typeof makeLayer>
    etabMarker.__handlers.click?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('CH Grandville')
    expect(wrapper.text()).toContain('Claire')
    expect(wrapper.text()).toContain('Martin')
    expect(wrapper.text()).not.toContain('Jean') // le médecin de CH Grandville, filtré
    expect(wrapper.text()).not.toContain('Poulteau')
  })

  describe('spécialités, densité et « autour de moi »', () => {
    it('n\'offre le choix de spécialité qu\'aux professions qui en ont', async () => {
      stubFetch(COMMUNE_PAYLOAD, ETABLISSEMENTS_01, DEPT_PAYLOAD_SPECIALITES)
      const wrapper = mount(LeafletFranceMap)
      await flushPromises()
      expect(wrapper.findAll('select')).toHaveLength(1) // « Toutes les professions » : pas de spécialité

      await wrapper.find('select').setValue('Médecin')
      const selects = wrapper.findAll('select')
      expect(selects).toHaveLength(2)
      expect(selects[1]!.text()).toContain('Cardiologie (2)')

      await wrapper.find('select').setValue('Infirmier') // aucune spécialité pour les infirmiers de ce jeu
      expect(wrapper.findAll('select')).toHaveLength(1)
    })

    it('choisir une spécialité recolore la carte en place et affiche ses points communes', async () => {
      stubFetch(COMMUNE_PAYLOAD, ETABLISSEMENTS_01, DEPT_PAYLOAD_SPECIALITES)
      const { default: L } = await import('leaflet')
      const wrapper = mount(LeafletFranceMap)
      await flushPromises()
      await wrapper.find('select').setValue('Médecin')
      await flushPromises()
      const avant = geoJsonSetStyleCalls

      await wrapper.findAll('select')[1]!.setValue('Cardiologie')
      await flushPromises()

      expect(geoJsonSetStyleCalls).toBeGreaterThan(avant)
      expect((L.map as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1) // la carte n'est jamais recréée
      expect(wrapper.text().replace(/\u00a0/g, ' ')).toContain('Cardiologie pour 100 000 habitants')
    })

    it('colore par densité par défaut ; la bascule recolore en place et change la légende', async () => {
      stubFetch(COMMUNE_PAYLOAD, ETABLISSEMENTS_01, DEPT_PAYLOAD_SPECIALITES)
      const wrapper = mount(LeafletFranceMap)
      await flushPromises()
      expect(wrapper.text().replace(/\u00a0/g, ' ')).toContain('Praticiens pour 100 000 habitants')
      // 5 praticiens / 100 000 habitants -> légende maximale à 5 (pas 5 000)
      expect(wrapper.find('.color-legend__ticks').text().replace(/\s/g, '')).toBe('05')

      const avant = geoJsonSetStyleCalls
      await wrapper.find('input[type="checkbox"]').setValue(false)
      await flushPromises()
      expect(geoJsonSetStyleCalls).toBeGreaterThan(avant)
      expect(wrapper.text()).toContain('Praticiens par département')
    })

    it('la fiche d\'un département indique l\'effectif ET la densité, quel que soit le mode', async () => {
      const wrapper = mount(LeafletFranceMap)
      await flushPromises()
      const layer = makeLayer()
      geoJsonOnEachFeature!(GEOJSON.features[0], layer)
      layer.__handlers.click?.()
      await flushPromises()

      const carte = wrapper.find('.detail-card').text().replace(/\s+/g, ' ')
      expect(carte).toContain('Ain')
      expect(carte).toContain('5 praticiens')
      expect(carte).toContain('5 pour 100 000 hab.')
    })

    describe('« Autour de moi »', () => {
      const positionne = (impl: (ok: (p: unknown) => void, err: (e: unknown) => void) => void) =>
        Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: vi.fn(impl) }, configurable: true })
      const bouton = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('button').find((b) => b.text().includes('Autour de moi'))!

      it('localise, liste les établissements les plus proches et les place sur la carte', async () => {
        positionne((ok) => ok({ coords: { latitude: 45.0, longitude: 2.01 } }))
        const wrapper = mount(LeafletFranceMap)
        await flushPromises()

        await bouton(wrapper).trigger('click')
        await flushPromises()

        // CH Grandville (géocodé à 190 km) est trop loin ; le cabinet sans adresse géocodée est au centre de Testville
        const panneau = wrapper.find('.nearby')
        expect(panneau.text()).toContain('Cabinet Poulteau')
        expect(panneau.text()).toContain('Testville')
        expect(panneau.text()).toContain('≈')
        expect(panneau.text()).not.toContain('CH Grandville')
        expect(nearbyAdded).toHaveLength(2) // vous + le cabinet
        expect(fitBoundsSpy).toHaveBeenCalled()
      })

      it('choisir un résultat affiche ses praticiens', async () => {
        positionne((ok) => ok({ coords: { latitude: 45.0, longitude: 2.01 } }))
        const wrapper = mount(LeafletFranceMap)
        await flushPromises()
        await bouton(wrapper).trigger('click')
        await flushPromises()

        await wrapper.find('.nearby__item').trigger('click')
        expect(wrapper.find('.detail-card').text()).toContain('Sylvain Poulteau')
      })

      it('suit la profession choisie : relance la recherche depuis la même position', async () => {
        positionne((ok) => ok({ coords: { latitude: 45.0, longitude: 2.01 } }))
        const wrapper = mount(LeafletFranceMap)
        await flushPromises()
        await bouton(wrapper).trigger('click')
        await flushPromises()
        expect(wrapper.find('.nearby').text()).toContain('Cabinet Poulteau')

        await wrapper.find('select').setValue('Infirmier') // le cabinet n'a qu'un médecin
        await flushPromises()
        expect(wrapper.find('.nearby').text()).not.toContain('Cabinet Poulteau')
        expect(wrapper.find('.nearby').text()).toContain('Aucun établissement « Infirmier »')
        expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1) // pas de nouvelle demande de position
      })

      it('explique un refus de localisation', async () => {
        positionne((_ok, err) => err({ code: 1, PERMISSION_DENIED: 1 }))
        const wrapper = mount(LeafletFranceMap)
        await flushPromises()
        await bouton(wrapper).trigger('click')
        await flushPromises()
        expect(wrapper.find('.nearby').text()).toContain('Position refusée')
      })

      it('signale un navigateur sans géolocalisation', async () => {
        Reflect.deleteProperty(navigator, 'geolocation')
        const wrapper = mount(LeafletFranceMap)
        await flushPromises()
        await bouton(wrapper).trigger('click')
        expect(wrapper.find('.nearby').text()).toContain('ne permet pas de vous localiser')
      })

      it('se ferme avec le bouton retour : liste et marqueurs disparaissent', async () => {
        positionne((ok) => ok({ coords: { latitude: 45.0, longitude: 2.01 } }))
        const wrapper = mount(LeafletFranceMap)
        await flushPromises()
        await bouton(wrapper).trigger('click')
        await flushPromises()

        await wrapper.find('.nearby__close').trigger('click')
        expect(wrapper.find('.nearby').exists()).toBe(false)
        expect(nearbyAdded).toHaveLength(0)
      })
    })
  })
})
