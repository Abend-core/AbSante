import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import InfoDialog from './InfoDialog.vue'

// jsdom n'implémente pas <dialog>.showModal()/close() : on simule leur effet.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})

const mountDialog = (modelValue = false) =>
  mount(InfoDialog, { props: { title: 'Vie privée', modelValue }, slots: { default: '<p class="content">Détail</p>' }, attachTo: document.body })

describe('InfoDialog', () => {
  it('reste fermée tant qu\'on ne l\'ouvre pas', () => {
    mountDialog(false)
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled()
  })

  it('s\'ouvre en modale native (focus piégé, Échap) quand modelValue passe à vrai', async () => {
    const wrapper = mountDialog(false)
    await wrapper.setProps({ modelValue: true })
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
    expect(wrapper.find('dialog').element.open).toBe(true)
    expect(wrapper.find('.content').text()).toBe('Détail')
  })

  it("s'ouvre aussi quand elle est montée déjà ouverte", () => {
    mountDialog(true)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
  })

  it('se ferme quand modelValue repasse à faux', async () => {
    const wrapper = mountDialog(true)
    await wrapper.setProps({ modelValue: false })
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1)
  })

  it('est nommée par son titre', () => {
    const wrapper = mountDialog(false)
    const title = wrapper.find('h2')
    expect(title.text()).toBe('Vie privée')
    expect(wrapper.find('dialog').attributes('aria-labelledby')).toBe(title.attributes('id'))
  })

  it('demande sa fermeture avec le bouton Fermer', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('button[aria-label="Fermer"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('demande sa fermeture quand le navigateur la ferme (touche Échap)', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('se ferme au clic sur le fond, mais pas au clic dans le panneau', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('.info-dialog__body').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.find('dialog').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it("fonctionne sans <dialog>.showModal (navigateur ancien) : attribut open", async () => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
    const wrapper = mountDialog(false)
    await wrapper.setProps({ modelValue: true })
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    await wrapper.setProps({ modelValue: false })
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
  })
})
