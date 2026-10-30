<template>
    <section class="principal-box">
        <HeaderBar/>
        
        <section class="filter">
            <h1>Reportes</h1>
            <h2>Reconocimiento a Profesores</h2>
            
            <!-- Estados de carga y error -->
            <div v-if="loading" class="loading-state">
                Cargando reconocimientos...
            </div>
            
            <div v-if="error" class="error-state">
                <span class="error-message">{{ error }}</span>
                <button @click="loadMentions" class="retry-button">
                    Reintentar
                </button>
            </div>

        </section>

        <section class="Content">
            <section class='info-container'>
                
                <!-- Mostrar TODOS los profesores -->
                <section>
                    <div v-if="profesores.length > 0">
                        <div class='info' v-for="profesor in profesores" :key="profesor.id || profesor.nombre_completo">
                            
                            <div class='icono'>
                                <img src='../../../public//usuario.png' alt='icono'>
                            </div>
                            <div class='info-personal info-prof'>
                                <h2>{{ profesor.nombre_completo || 'Nombre no disponible' }}</h2>
                                <p>{{ profesor.nombre_titulo || 'Título no especificado' }}</p>
                                <p class="usuario">@{{ profesor.nombre_usuario || 'usuario' }}</p>
                                <div class='card-body'>

                                    <div class='reconocimiento-info'>
                                        <p><strong>Reconocimiento:</strong> {{ profesor.nombre_reconocimiento || 'No especificado' }} 
                                            ({{ profesor.anio_reconocimiento || 'N/A' }})</p>
                                        <p><strong>Tipo:</strong> {{ profesor.tipo_reconocimiento || 'No especificado' }}</p>
                                        <p v-if="profesor.nombre_facultad"><strong>Facultad:</strong> {{ profesor.nombre_facultad }}</p>
                                    </div>
                                    <button class='btn-ver-perfil'>
                                        <span>Ver perfil</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Mensaje si no hay datos -->
                <div v-if="!loading && !error && profesores.length === 0" class="no-data-message">
                    No hay reconocimientos registrados.
                </div>
            </section>
        </section>
    </section>
</template>

<script>
// Importar el servicio existente
import HeaderBar from '../header.vue';
import usuarioServices from '../../services/usuarioSevices';

export default {
    name: 'ReconocimientoReport',
    components: {
        HeaderBar  
    },
    data() {
        return {
            profesores: [],
            loading: true,
            error: null,
        };
    },
    async mounted() {
        await this.loadMentions();
    },
    methods: {
        async loadMentions() {
            try {
                this.loading = true;
                this.error = null;
                this.profesores = [];
                
                console.log('Llamando a API para obtener reconocimientos...');
                
                // Usar el servicio existente
                const result = await usuarioServices.getMentionsReport();
                
                console.log('Resultado del servicio:', result);
                
                if (result.success) {
                    // Asegurarse de que tenemos un array
                    this.profesores = Array.isArray(result.data) ? result.data : [];
                    console.log(`Cargados ${this.profesores.length} reconocimientos`);
                    
                } else {
                    this.error = result.error || 'Error desconocido al cargar los reconocimientos';
                }
            } catch (error) {
                console.error('Error en loadMentions:', error);
                this.error = 'Error interno: ' + error.message;
            } finally {
                this.loading = false;
            }
        }
    }
};
</script>