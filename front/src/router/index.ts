import { createRouter, createWebHistory } from 'vue-router'
import CarteFranceView from '../views/CarteFranceView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'carte-france',
      component: CarteFranceView,
    },
  ],
})
