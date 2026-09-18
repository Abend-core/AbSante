import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import IconButton from './IconButton.vue'

describe('IconButton', () => {
  it('a un nom accessible (bouton sans texte) repris en infobulle', () => {
    const button = mount(IconButton, { props: { icon: 'close', label: 'Fermer' } }).find('button')
    expect(button.attributes('aria-label')).toBe('Fermer')
    expect(button.attributes('title')).toBe('Fermer')
    expect(button.attributes('type')).toBe('button')
  })

  it("dessine l'icône demandée et émet le clic", async () => {
    const wrapper = mount(IconButton, { props: { icon: 'close', label: 'Fermer' } })
    expect(wrapper.find('path').exists()).toBe(true)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
