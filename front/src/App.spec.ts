import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'

describe('App', () => {
  it('entoure chaque page du même en-tête et du même pied de page', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<p class="page">contenu</p>' } }],
    })
    await router.push('/')
    const wrapper = mount(App, { global: { plugins: [router] } })
    expect(wrapper.find('header.site-header').exists()).toBe(true)
    expect(wrapper.find('main .page').text()).toBe('contenu')
    expect(wrapper.find('footer.site-footer').exists()).toBe(true)
    // ordre : en-tête, contenu, pied de page
    const order = [...wrapper.find('.app-shell').element.children].map((el) => el.tagName)
    expect(order).toEqual(['HEADER', 'MAIN', 'FOOTER'])
  })
})
