import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PraticienSearch from './PraticienSearch.vue'

const RESULTATS = [
  { id: '810000000001', civiliteExercice: 'Docteur', nom: 'MARTIN', prenom: 'PAUL', professions: ['Médecin'], commune: 'Lyon', codePostal: '69001' },
  { id: '810000000002', civiliteExercice: null, nom: 'MARTIN', prenom: 'ANNE', professions: ['Infirmier', 'Médecin'], commune: null, codePostal: null },
]

async function taper(wrapper: ReturnType<typeof mount>, texte: string) {
  const input = wrapper.find('input')
  await input.trigger('focus')
  await input.setValue(texte)
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}

describe('PraticienSearch', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('liste les praticiens trouvés, avec de quoi distinguer les homonymes, et un lien vers leur fiche', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ resultats: RESULTATS, tronque: false }) })))
    const wrapper = mount(PraticienSearch)
    await taper(wrapper, 'martin')

    const liens = wrapper.findAll('.praticien-search__results a')
    expect(liens).toHaveLength(2)
    expect(liens[0]!.attributes('href')).toBe('/praticien/810000000001')
    expect(liens[0]!.attributes('target')).toBe('_blank')
    expect(liens[0]!.text()).toContain('Docteur Paul MARTIN')
    expect(liens[0]!.text()).toContain('Médecin · Lyon (69001)')
    // Praticien sans lieu connu : on n'écrit ni « null » ni de séparateur orphelin
    expect(liens[1]!.text()).toContain('Infirmier, Médecin')
    expect(liens[1]!.text()).not.toMatch(/null|·\s*$/)
    expect(wrapper.text()).not.toContain('précisez')
  })

  it('invite à préciser quand il y a plus de résultats que ceux affichés', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ resultats: RESULTATS, tronque: true }) })))
    const wrapper = mount(PraticienSearch)
    await taper(wrapper, 'martin')
    expect(wrapper.text()).toContain('précisez le nom ou le prénom')
  })

  it('dit clairement quand rien ne correspond', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ resultats: [], tronque: false }) })))
    const wrapper = mount(PraticienSearch)
    await taper(wrapper, 'zzzz')
    expect(wrapper.text()).toContain('Aucun praticien ne correspond')
  })

  it('signale une recherche indisponible plutôt que de rester muet', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })))
    const wrapper = mount(PraticienSearch)
    await taper(wrapper, 'martin')
    expect(wrapper.text()).toContain('momentanément indisponible')
  })

  it('n\'affiche rien avant 3 caractères, et se referme avec Échap en vidant le champ', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ resultats: RESULTATS, tronque: false }) })))
    const wrapper = mount(PraticienSearch)
    await taper(wrapper, 'ma')
    expect(wrapper.find('.praticien-search__panel').exists()).toBe(false)

    await taper(wrapper, 'martin')
    expect(wrapper.find('.praticien-search__panel').exists()).toBe(true)
    await wrapper.find('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.praticien-search__panel').exists()).toBe(false)
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })
})
