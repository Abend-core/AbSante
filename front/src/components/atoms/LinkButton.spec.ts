import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LinkButton from './LinkButton.vue'

describe('LinkButton', () => {
  it("est un bouton (il agit, il ne navigue pas) et émet le clic", async () => {
    const wrapper = mount(LinkButton, { slots: { default: 'Vie privée' } })
    expect(wrapper.find('button').attributes('type')).toBe('button')
    expect(wrapper.text()).toBe('Vie privée')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
