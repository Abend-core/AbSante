import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NearbyPanel from './NearbyPanel.vue'
import type { NearbyResult } from '../../composables/useNearby'

const commune = { codeInsee: '34172', nom: 'Montpellier', lat: 43.61, lon: 3.877, dept: '34', total: 100 }
const praticiens = (n: number) => Array.from({ length: n }, (_, i) => ({ nom: `NOM${i}`, prenom: `Prenom${i}`, profession: 'Médecin', id: `81000000000${i}` }))
const resultat = (nom: string, distanceKm: number, over: Partial<NearbyResult> = {}): NearbyResult => ({
  etablissement: { nom, coords: [43.61, 3.88], praticiens: praticiens(2) },
  commune,
  position: [43.61, 3.88],
  approximative: false,
  distanceKm,
  ...over,
})

describe('NearbyPanel', () => {
  it('n\'affiche rien tant qu\'aucune recherche n\'a été lancée', () => {
    expect(mount(NearbyPanel, { props: { status: 'idle', results: [], label: null } }).html()).toBe('<!--v-if-->')
  })

  it.each([
    ['locating', 'Localisation en cours'],
    ['searching', 'Recherche des établissements'],
    ['denied', 'Position refusée'],
    ['unsupported', 'La localisation n\'est pas disponible ici'],
    ['unavailable', 'n\'arrive pas à déterminer sa position'],
    ['timeout', 'a pris trop de temps'],
    ['error', 'La recherche des établissements a échoué'],
  ] as const)('explique l\'état « %s »', (status, texte) => {
    expect(mount(NearbyPanel, { props: { status, results: [], label: null } }).text()).toContain(texte)
  })

  it.each(['denied', 'unsupported', 'unavailable', 'timeout'] as const)('« %s » propose de choisir une ville à la place', (status) => {
    expect(mount(NearbyPanel, { props: { status, results: [], label: null } }).text()).toContain('choisissez une ville')
  })

  it('nomme la ville quand la recherche part d\'elle plutôt que de la position', () => {
    expect(mount(NearbyPanel, { props: { status: 'done', results: [], label: null, where: 'Bourges' } }).text()).toContain('Autour de Bourges')
    expect(mount(NearbyPanel, { props: { status: 'done', results: [], label: null } }).text()).toContain('Autour de vous')
  })

  it("prévient quand la position est approximative (localisation par IP, sans GPS), avec l'ordre de grandeur", () => {
    const wrapper = mount(NearbyPanel, { props: { status: 'done', results: [resultat('A', 30)], label: null, accuracyM: 45_000 } })
    const alerte = wrapper.find('.nearby__warning')
    expect(alerte.text()).toContain('Position approximative (à 45 km près)')
    expect(alerte.text()).toContain('pas par GPS')
    expect(alerte.text()).toContain('choisissez une ville')
  })

  it.each([[undefined], [null], [25], [1999]])('ne prévient pas quand la position est précise (%s m)', (accuracyM) => {
    const wrapper = mount(NearbyPanel, { props: { status: 'done', results: [resultat('A', 1)], label: null, accuracyM } })
    expect(wrapper.find('.nearby__warning').exists()).toBe(false)
  })

  it('liste les établissements avec distance, commune, praticiens et lien d\'itinéraire', () => {
    const wrapper = mount(NearbyPanel, { props: { status: 'done', results: [resultat('CABINET DU PARC', 0.84), resultat('CLINIQUE', 12.4)], label: 'Cardiologie' } })
    const items = wrapper.findAll('.nearby__list li')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('840 m')
    expect(items[0]!.text()).toContain('CABINET DU PARC')
    expect(items[0]!.text()).toContain('Montpellier')
    expect(items[0]!.text()).toContain('Prenom0 NOM0, Prenom1 NOM1')
    expect(items[1]!.text()).toContain('12 km')
    const route = items[0]!.find('a')
    expect(route.attributes('href')).toBe('https://www.google.com/maps/dir/?api=1&destination=43.61,3.88')
    expect(route.attributes('rel')).toContain('noopener')
    expect(wrapper.text()).toContain('Cardiologie')
    expect(wrapper.text()).not.toContain('choisissez une profession')
  })

  it('résume les praticiens d\'un gros établissement au lieu de tous les lister', () => {
    const gros = resultat('HOPITAL', 3, { etablissement: { nom: 'HOPITAL', coords: null, praticiens: praticiens(40) } })
    expect(mount(NearbyPanel, { props: { status: 'done', results: [gros], label: null } }).text()).toContain('et 37 autre(s)')
  })

  it('marque une distance approximative (adresse non localisée) et l\'explique', () => {
    const wrapper = mount(NearbyPanel, { props: { status: 'done', results: [resultat('SANS ADRESSE', 4.2, { approximative: true })], label: null } })
    expect(wrapper.find('.nearby__distance').text()).toBe('≈ 4,2 km')
    expect(wrapper.text()).toContain('adresse non localisée')
  })

  it('suggère de choisir une profession quand aucun filtre n\'est actif', () => {
    expect(mount(NearbyPanel, { props: { status: 'done', results: [resultat('A', 1)], label: null } }).text()).toContain('choisissez une profession')
  })

  it('dit qu\'il n\'y a rien à proximité (avec le filtre en cours) plutôt que d\'afficher une liste vide', () => {
    const wrapper = mount(NearbyPanel, { props: { status: 'done', results: [], label: 'Oculariste' } })
    expect(wrapper.text()).toContain('Aucun établissement « Oculariste » trouvé à moins de 60 km')
    expect(wrapper.find('.nearby__list').exists()).toBe(false)
  })

  it('remonte le choix d\'un établissement et la fermeture', async () => {
    const r = resultat('A', 1)
    const wrapper = mount(NearbyPanel, { props: { status: 'done', results: [r], label: null } })
    await wrapper.find('.nearby__item').trigger('click')
    await wrapper.find('.nearby__close').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[r]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
