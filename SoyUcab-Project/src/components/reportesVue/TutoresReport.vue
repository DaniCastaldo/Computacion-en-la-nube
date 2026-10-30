<template>
    <section class="principal-box">
       
        <HeaderBar />
        
        <section class="filter">
            <h1>Tutores</h1>
            <h2>Reportes</h2>
            <p>Tutores Activos En El Semestre</p>
            
            <div class="filter-controls">
                <div class="combo-box principal-combo">
                    <label for="filter-select">Filtrar por:</label>
                    <select id="filter-select" v-model="selectedFilter" @change="onFilterChange">
                        <option value="" disabled>Seleccionar</option>
                        <option v-for="filter in filters" :key="filter" :value="filter">
                            {{ filter }} 
                        </option>
                    </select>
                </div>

                <div class="combo-box secondary-combo" v-if="selectedFilter === 'Materias'">
                    <label for="materia-select">Seleccionar Materia:</label>
                    <select id="materia-select" v-model="selectedOption" @change="onSecondarySelect">
                        <option value="" disabled>Seleccionar materia</option>
                        <option 
                            v-for="materia in materiasList" 
                            :key="materia"
                            :value="materia"
                        >
                            {{ materia }}
                        </option>
                    </select>
                </div>

                <div class="combo-box secondary-combo" v-if="selectedFilter === 'Facultad'">
                    <label for="facultad-select">Seleccionar Facultad:</label>
                    <select id="facultad-select" v-model="selectedOption" @change="onSecondarySelect">
                        <option value="" disabled>Seleccionar facultad</option>
                        <option 
                            v-for="facultad in facultadesList" 
                            :key="facultad"
                            :value="facultad"
                        >
                            {{ facultad }}
                        </option>
                    </select>
                </div>
            </div>
        </section>

        <section class="Content">
            <section v-if="loading" class="loading-container">
                <div class="loading">Cargando tutores...</div>
            </section>

            <section v-else-if="error" class="error-container">
                <div class="error">{{ error }}</div>
            </section>

            <section v-else class='info-container'>
                <section v-if="users.length === 0" class="no-data">
                    <p>No hay tutores disponibles</p>
                </section>

                <section v-else-if="!selectedOption && !selectedUser">
                    <div class='info' v-for="(user, index) in users" :key="index">
                        <div class='icono'>
                            <img src='../../../public/usuario.png' alt='icono'>
                        </div>
                        <div class='info-personal'>
                            <h2>{{ user.nombre_tutor }}</h2>
                            <p>@{{ user.nombre_usuario }}</p>
                            <p><strong>Título:</strong> {{ user.titulo_academico }}</p>
                            <p><strong>Materias:</strong> {{ user.materias_tutor || 'No especificado' }}</p>
                            <p><strong>Facultad:</strong> {{ user.nombre_facultad || 'No especificado' }}</p>
                            <p><strong>Estudiantes:</strong> {{ user.cantidad_estudiantes }}</p>
                        </div>
                        <button class='btn-ver-perfil'>
                            <span>Seguir</span>
                        </button>
                    </div>
                </section>

                <section v-else-if="selectedOption && filteredUsers.length > 0">  
                    <div class='info' v-for="(user, index) in filteredUsers" :key="index">
                        <div class='icono'>
                            <img src='../../../public/usuario.png' alt='icono'>
                        </div>
                        <div class='info-personal'>
                            <h2>{{ user.nombre_tutor }}</h2>
                            <p>@{{ user.nombre_usuario }}</p>
                            <p><strong>Título:</strong> {{ user.titulo_academico }}</p>
                            <p><strong>Materias:</strong> {{ user.materias_tutor || 'No especificado' }}</p>
                            <p><strong>Facultad:</strong> {{ user.nombre_facultad || 'No especificado' }}</p>
                            <p><strong>Estudiantes:</strong> {{ user.cantidad_estudiantes }}</p>
                        </div>
                        <button class='btn-seguir'>
                            <span>Seguir</span>
                        </button>
                    </div>
                </section>

                <section v-else-if="selectedOption && filteredUsers.length === 0" class="no-results">
                    <p>No se encontraron tutores con el filtro seleccionado</p>
                </section>
            </section>
        </section>
    </section>
</template>

<script>
import HeaderBar from '../header.vue';  
import usuarioServices from '../../services/usuarioSevices';

export default {
    name: 'TutoresReport',

    components: {
        HeaderBar  
    },
    data() {
        return {
            selectedFilter: '',
            selectedOption: '',
            selectedUser: null,
            users: [],
            loading: false,
            error: null,
            filters: ['Facultad', 'Materias']
        };
    },
    computed: {
        materiasList() {
            const materiasSet = new Set();
            this.users.forEach(user => {
                if (user.materias_tutor && user.materias_tutor !== 'No especificado') {
                    const materiasArray = user.materias_tutor.split(', ');
                    materiasArray.forEach(materia => {
                        if (materia.trim()) {
                            materiasSet.add(materia.trim());
                        }
                    });
                }
            });
            return Array.from(materiasSet).sort();
        },
        
        facultadesList() {
            const facultadesSet = new Set();
            this.users.forEach(user => {
                if (user.nombre_facultad && user.nombre_facultad !== 'No especificado') {
                    const facultadesArray = user.nombre_facultad.split(', ');
                    facultadesArray.forEach(facultad => {
                        if (facultad.trim()) {
                            facultadesSet.add(facultad.trim());
                        }
                    });
                }
            });
            return Array.from(facultadesSet).sort();
        },
        
        filteredUsers() {
            if (!this.selectedOption || !this.selectedFilter) {
                return [];
            }
            
            return this.users.filter(user => {
                if (this.selectedFilter === 'Materias') {
                    if (!user.materias_tutor || user.materias_tutor === 'No especificado') {
                        return false;
                    }
                    const materiasArray = user.materias_tutor.split(', ');
                    return materiasArray.some(materia => materia.trim() === this.selectedOption);
                } else if (this.selectedFilter === 'Facultad') {
                    if (!user.nombre_facultad || user.nombre_facultad === 'No especificado') {
                        return false;
                    }
                    const facultadesArray = user.nombre_facultad.split(', ');
                    return facultadesArray.some(facultad => facultad.trim() === this.selectedOption);
                }
                return false;
            });
        }
    },
    async created() {
        await this.loadTutors();
    },
    methods: {
        async loadTutors() {
            try {
                this.loading = true;
                this.error = null;
                this.users = []; 
                
                console.log('Cargando datos de tutores...');
                
                const result = await usuarioServices.getTutorsReport();
                
                console.log('Resultado del servicio:', result);
                
                if (result.success && result.data) {
                    this.users = result.data;
                    console.log(`Cargados ${this.users.length} tutores`);
                    
                    if (this.users.length > 0) {
                        console.log('Primer tutor:', this.users[0]);
                        console.log('Materias disponibles:', this.materiasList);
                        console.log('Facultades disponibles:', this.facultadesList);
                    }
                } else {
                    this.error = result.error || 'Error al cargar los tutores';
                    console.error('Error en la respuesta:', result.error);
                }
            } catch (error) {
                console.error('Error en loadTutors:', error);
                this.error = 'Error interno: ' + (error.message || 'Error desconocido');
            } finally {
                this.loading = false;
            }
        },
        
        onFilterChange(event) {
            const selectedValue = event.target.value;
            console.log('Filtro seleccionado:', selectedValue);
            
            this.selectedOption = '';
            this.selectedUser = null;
        },
        
        onSecondarySelect(event) {
            const selectedValue = event.target.value;
            console.log('Opción seleccionada:', selectedValue);
            console.log('Filtro activo:', this.selectedFilter);
            
            this.selectedUser = null;
        }
    }
};
</script>
