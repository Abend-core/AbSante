import { createRouter, createWebHistory } from 'vue-router'
import CarteFranceView from '../views/CarteFranceView.vue'
import PraticienView from '../views/PraticienView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'carte-france',
      component: CarteFranceView,
    },
    {
      // Ouverte dans un nouvel onglet depuis la carte : l'identifiant est le seul état.
      path: '/praticien/:id',
      name: 'praticien',
      component: PraticienView,
    },
  ],
})
