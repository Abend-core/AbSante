import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Police des titres, servie par l'application elle-même (aucune requête vers un service tiers).
import '@fontsource-variable/bricolage-grotesque/wght.css'
import './style.css'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
