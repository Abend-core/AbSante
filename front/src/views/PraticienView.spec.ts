import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Fiche } from '../types/fiche'
import PraticienView from './PraticienView.vue'

// Cas réel : « SOLENNE BRUN — Technicien de Laboratoire », ANTAGENE (La Tour-de-Salvagny)
const FICHE: Fiche = {
  id: '810006881261', identifiantPP: '10006881261', typeIdentifiant: '8', civilite: 'Madame', civiliteExercice: null,
  nom: 'BRUN', prenom: 'SOLENNE',
  activites: [
    {
      codeProfession: '86', profession: 'Technicien de Laboratoire', categorie: 'Civil', modeExercice: 'Salarié',
      secteurActivite: 'Recherche', sectionPharmaciens: null, role: 'Salarié en poste fixe',
      genreActivite: 'Activité standard de soin ou de pharmacien',
      structure: {
        cle: 'R10000003840808', raisonSociale: 'ANTAGENE', enseigne: null, siret: '44154525800036', siren: null,
        finessSite: null, finessJuridique: null, complementDestinataire: null, complementPointGeographique: null,
        voie: '6 ALL DU LEVANT', mentionDistribution: null, bureauCedex: '69890 TOUR DE SALVAGNY (LA)', codePostal: '69890',
        codeCommune: '69250', commune: 'La Tour-de-Salvagny', pays: 'France', telephone: null, telephone2: null,
        telecopie: null, email: null, departement: null,
      },
    },
  ],
  savoirFaire: [],
  diplomes: [
    { type: 'Autre type de diplôme', code: 'DIP348', libelle: 'Diplôme Technicien Laboratoire arrêté 21/10/1992', typeAutorisation: null, disciplineAutorisation: null },
  ],
  misAJourLe: '2026-09-18T20:51:21.551Z',
}

const respond = (status: number, body: unknown = FICHE) =>
  Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) })

async function mountAt(id: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/praticien/:id', component: PraticienView }] })
  await router.push(`/praticien/${id}`)
  const wrapper = mount(PraticienView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  document.title = ''
})
afterEach(() => vi.unstubAllGlobals())

describe('PraticienView', () => {
  it('affiche la fiche complète, avec le titre de la page', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respond(200)))
    const wrapper = await mountAt('810006881261')

    expect(wrapper.find('h1').text()).toBe('Madame Solenne BRUN')
    expect(wrapper.text()).toContain('Identifiant RPPS 810006881261')
    expect(wrapper.text()).toContain('Technicien de Laboratoire')
    expect(wrapper.text()).toContain('ANTAGENE')
    expect(wrapper.text()).toContain('Diplôme Technicien Laboratoire arrêté 21/10/1992')
    expect(document.title).toBe('Madame Solenne BRUN — AbSante')
    expect(fetch).toHaveBeenCalledWith('/api/praticiens/810006881261')
  })

  it("n'affiche aucune mention de sources ni de licence sur la fiche (elles sont dans le pied de page du site)", async () => {
    vi.stubGlobal('fetch', vi.fn(() => respond(200)))
    const text = (await mountAt('810006881261')).text()
    expect(text).not.toMatch(/Source|Annuaire Santé|Licence|Agence du Numérique/i)
    expect(text).toContain('Fiche mise à jour le 18 septembre 2026')
  })

  it("présente le profil en en-tête : initiales, profession et commune d'exercice", async () => {
    vi.stubGlobal('fetch', vi.fn(() => respond(200)))
    const wrapper = await mountAt('810006881261')
    const header = wrapper.find('.fiche-header')
    expect(header.find('.fiche-header__avatar').text()).toBe('SB')
    expect(header.find('.fiche-header__professions').text()).toBe('Technicien de Laboratoire')
    expect(header.find('.fiche-header__places').text()).toContain('La Tour-de-Salvagny (69890)')
  })

  it('signale clairement chaque information manquante (spécialités, téléphone, e-mail...)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respond(200)))
    const wrapper = await mountAt('810006881261')

    expect(wrapper.text()).toContain("aucune spécialité ni compétence n'est enregistrée")
    const missing = wrapper.findAll('[data-missing]').map((m) => m.element.closest('.info-row')?.querySelector('dt')?.textContent)
    expect(missing).toEqual(expect.arrayContaining(['Téléphone', 'E-mail', 'Enseigne', 'SIREN']))
    expect(wrapper.text()).toContain('Non renseigné')
  })

  it('affiche un état de chargement avant la réponse', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const wrapper = await mountAt('810006881261')
    expect(wrapper.find('[role="status"]').text()).toContain('Chargement')
    expect(document.title).toBe('Fiche praticien — AbSante')
  })

  it('affiche « Praticien introuvable » pour un identifiant inconnu', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respond(404)))
    const wrapper = await mountAt('810000000000')
    expect(wrapper.find('[role="alert"]').text()).toContain('Praticien introuvable')
    expect(wrapper.text()).toContain('810000000000')
  })

  it("propose de réessayer quand le service est indisponible, et affiche la fiche au retour du service", async () => {
    let down = true
    vi.stubGlobal('fetch', vi.fn(() => (down ? respond(503) : respond(200))))
    const wrapper = await mountAt('810006881261')
    expect(wrapper.find('[role="alert"]').text()).toContain('momentanément indisponible')

    down = false
    await wrapper.find('.praticien-view__retry').trigger('click')
    await flushPromises()
    expect(wrapper.find('h1').text()).toBe('Madame Solenne BRUN')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('reste utilisable quand le réseau est coupé', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    const wrapper = await mountAt('810006881261')
    expect(wrapper.find('[role="alert"]').text()).toContain('momentanément indisponible')
    expect(wrapper.find('.praticien-view__retry').exists()).toBe(true)
  })

  it('affiche une fiche minimale (aucune activité, spécialité ni diplôme) sans erreur', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respond(200, { ...FICHE, activites: [], diplomes: [], civilite: null, prenom: null, misAJourLe: null })))
    const wrapper = await mountAt('810006881261')
    expect(wrapper.find('h1').text()).toBe('BRUN')
    expect(wrapper.text()).toContain("aucune activité n'est enregistrée")
    expect(wrapper.text()).toContain("aucun diplôme ni autorisation n'est enregistré")
  })
})
