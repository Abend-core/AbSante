import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CopyButton from './CopyButton.vue'

const writeText = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'clipboard')
})

const mountButton = () => mount(CopyButton, { props: { text: '810006881261', label: "l'identifiant RPPS" } })

describe('CopyButton', () => {
  it('a un nom accessible qui dit ce qui sera copié', () => {
    const button = mountButton().find('button')
    expect(button.attributes('aria-label')).toBe("Copier l'identifiant RPPS")
    expect(button.attributes('title')).toBe("Copier l'identifiant RPPS")
    expect(button.attributes('type')).toBe('button')
  })

  it('copie le texte dans le presse-papiers au clic', async () => {
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    expect(writeText).toHaveBeenCalledWith('810006881261')
  })

  it('confirme visuellement et aux lecteurs d\'écran, puis revient à l\'état initial', async () => {
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.copy-button__tip').text()).toBe('Copié')
    expect(wrapper.find('[role="status"]').text()).toBe("l'identifiant RPPS copié dans le presse-papiers")
    expect(wrapper.find('button').classes()).toContain('copy-button__button--copied')

    vi.advanceTimersByTime(1900)
    await flushPromises()
    expect(wrapper.find('.copy-button__tip').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').text()).toBe('')
  })

  it("signale l'échec quand la copie est impossible (jamais un échec silencieux)", async () => {
    writeText.mockRejectedValue(new Error('denied'))
    document.execCommand = vi.fn(() => false)
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.copy-button__tip').text()).toBe('Échec')
    expect(wrapper.find('[role="status"]').text()).toBe('La copie a échoué')
  })
})
