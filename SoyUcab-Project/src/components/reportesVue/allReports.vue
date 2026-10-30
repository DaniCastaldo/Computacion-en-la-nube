<template>
  <headerBar/>
  <div class="reports-dashboard">
    
    <h1 class="dashboard-title">Reportes</h1>
    <div  class="dashboard-grid" @click="goToEvent()">
      <!-- Primera Fila -->
      <div class="dashboard-card card-wide">
        <h3 class="card-title">Eventos del mes</h3>

      </div>
      
      <div class="dashboard-card" @click="goToUsuarios()">
        <h3 class="card-title">Top usuarios</h3>
      </div>
      
      <div class="dashboard-card" @click="goToEmpresas()">
        <h3 class="card-title">Top empresas con más egresados</h3>
      </div>
      
      <div class="dashboard-card" @click="goToCarreras()">
        <h3 class="card-title">Top carreras</h3>

      </div>
      
      <!-- Segunda Fila -->
      <div class="dashboard-card" @click="goToTutores()">
        <h3 class="card-title">Tutores del semestre</h3>
      </div>
      
      <div class="dashboard-card" @click="goToPromedios()">
        <h3 class="card-title">Mejores promedios</h3>
      </div>
      
      <div class="dashboard-card" @click="goToReconocimientos()">
        <h3 class="card-title">Reconocimientos a profesores</h3>
      </div>

      <div class="dashboard-card" @click="goToMapaEgresados()">
        <h3 class="card-title">Mapa de Egresados</h3>
      </div>
      
      <div class="dashboard-card" id="semaforo" @click="goToSemaforo()">
        <h3 class="card-title">Semáforo de pago</h3>
        <div class="card-content">
          <div class="traffic-light">
            <div class="light red" :class="{ active: paymentStatus === 'red' }"></div>
            <div class="light yellow" :class="{ active: paymentStatus === 'yellow' }"></div>
            <div class="light green" :class="{ active: paymentStatus === 'green' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import router from "@/router/router";
import headerBar from '../header.vue'
export default {
  name: 'ReportsDashboard',
  components: {
    headerBar
  },
  data() {
    return {
      loading: false,
      error: null,
      paymentStatus: 'green' // Ejemplo de estado inicial
    };
  },
  methods: {
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
      });
    },

    handleCardClick(cardType) {
      this.$emit('card-click', cardType);
    },

    refreshData() {
      this.$emit('refresh-data');
    },

    // Métodos de navegación
    goToEvent() {
      // lógica para eventos
    },

    goToUsuarios() {
      // lógica para usuarios
    },

    goToEmpresas() {
      // lógica para empresas
    },

    goToCarreras() {
      // lógica para carreras
    },

    goToTutores() {
      router.push('/tutores-report');
    },

    goToPromedios() {
      // lógica para promedios
    },

    goToReconocimientos() {
      router.push('/reconocimiento-report');
    },

    goToMapaEgresados() {
      router.push('/map-egresados');
    },

    goToSemaforo() {
      // lógica para semáforo
    }
  }
};
</script>



