import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/principalview',
    name: 'firstview',
    // Lazy-loading the component
    component: () => import('../components/PrincipalView.vue')
  },
  {
    path: '/tutores-report',
    name: 'TutoresReport',
    // Lazy-loading the component
    component: () => import('../components/reportesVue/TutoresReport.vue')
  },
  {
    path: '/reconocimiento-report',
    name: 'ReconocimientoReport',
    // Lazy-loading the component
    component: () => import('../components/reportesVue/ReconocimientoProfesores.vue')
  },
  {
    path: '/map-egresados',
    name: 'GraduatesMap',
    // Lazy-loading the component
    component: () => import('../components/reportesVue/MapaEgresados.vue')
  },
  {
    path: '/all-reports',
    name: 'AllReports',
    // Lazy-loading the component
    component: () => import('../components/reportesVue/allReports.vue')
  },
  {
    path: '/home',
    name: 'Home',
    // Lazy-loading the component
    component: () => import('../components/home.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../components/Profile.vue')
  },
  {
    path: '/groups/:name',
    name: 'GroupDashboard',
    component: () => import('../components/GroupDashboard.vue')
  }
  
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router