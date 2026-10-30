import { createApp } from 'vue'
import './assets/main.css'
import './assets/reportes/tutores.css'
import './assets/reportes/Prof.css'
import './assets/reportes/map.css'
import './assets/principal.css'
import './assets/reportes/allReports.css'
import './assets/home.css'
import router from './router/router'
import App from './App.vue'

createApp(App).use(router).mount('#app')
