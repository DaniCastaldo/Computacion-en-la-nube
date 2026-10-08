<template>
    <section class="principal-box">
        <header>
            <div class="logoUcab"><img src="../../../public/logo-ucab3.png" alt="Logo Ucab"></div>
            <div class="buscador"><input type="text" name="" id=""></div>
            <div class="NavBar">
                <button id='home'></button>
                <button id='conversaciones'></button>
                <button id='campana'></button>
                <button id='perfil'></button>
                <button id='reportsButtom'>
                    <div class="contenido-boton">
                        <img src='../../../public/insignia.png' alt='Reportes'>
                        <h2>Reportes</h2>
                    </div>
                </button>
            </div>
        </header>
        
        <section class="filter">
            <h1>Reportes</h1>
            <h2>Reconocimiento a Profesores</h2>
            
            <div class="filter-controls">
                <div class="combo-box principal-combo">
                    <label for="filter-select">Filtrar por:</label>
                    <select id="filter-select" v-model="selectedFilter" @change="onFilterChange">
                        <option value="" disabled>Tipo de reconocimiento</option>
                        <option v-for="filter in Filters" :value="filter">
                            {{ filter }} 
                        </option>
                    </select>
                </div>
            </div>
        </section>

        <section class="Content">
            <section class='info-container'>
                
                <!-- Mostrar TODOS los profesores si no hay filtro -->
                <section v-if="!selectedFilter">
                    <div class='info' v-for="profesor in profesores" :key="profesor.id">
                        
                        <div class='icono'>
                            <img src='../../../public//usuario.png' alt='icono'>
                        </div>
                        <div class='info-personal info-prof'>
                            <h2>{{ profesor.name }}</h2>
                            <p>{{ profesor.titulo }}</p>
                            <p class="usuario">@{{ profesor.usuario }}</p>
                            <div class='card-body'>

                                <div class='reconocimiento-info'>
                                    <p><strong>Reconocimiento:</strong> {{ profesor.reconocimiento }}</p>
                                    <p><strong>Facultad:</strong> {{ profesor.facultad }}</p>
                                </div>
                                <button class='btn-ver-perfil'>
                                    <span>Ver perfil</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Mostrar profesores filtrados -->
                <section v-else>  
                    <div class='info ' v-for="profesor in profesoresFiltrados" :key="profesor.id">
                        <div class='icono'>
                            <img src='../../../public/usuario.png' alt='icono'>
                        </div>
                        <div class='info-personal '>
                            <h2>{{ profesor.name }}</h2>
                            <p>{{ profesor.titulo }}</p>
                            <p class="usuario">@{{ profesor.usuario }}</p>
                            <div class='card-body'>
                                <button class='btn-ver-perfil'>
                                    <span>Ver perfil</span>
                                </button>
                                
                                <div class='reconocimiento-info'>
                                    <p><strong>Reconocimiento:</strong> {{ profesor.reconocimiento }}</p>
                                    <p><strong>Facultad:</strong> {{ profesor.facultad }}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>
            </section>
        </section>
    </section>
</template>

<script>
export default {
    name: 'ReconocimientoReport',
    data() {
        return {
            selectedFilter: '',
            profesores: [
                { 
                    id: 1, 
                    name: 'Yoníray Romero', 
                    usuario: 'yoni.romero',
                    titulo: 'Lic. Relaciones Industriales', 
                    facultad: 'Relaciones Industriales',
                    tipoReconocimiento: 'DOCENCIA',
                    reconocimiento: 'Premio a la excelencia Docente UCAB - 2025'
                },
                { 
                    id: 2, 
                    name: 'Gabriel Bravo', 
                    usuario: 'gabri3bravo',
                    titulo: 'Lic. Administración de Empresas', 
                    facultad: 'Relaciones Industriales',
                    tipoReconocimiento: 'DOCENCIA',
                    reconocimiento: 'Premio a la excelencia Docente UCAB - 2025'
                },
                { 
                    id: 3, 
                    name: 'Carlos López', 
                    usuario: 'carlos.lopez',
                    titulo: 'Lic. Ingeniería Informática', 
                    facultad: 'Industrial',
                    tipoReconocimiento: 'INVESTIGACIÓN',
                    reconocimiento: 'Premio a la investigación innovadora - 2024'
                },
                { 
                    id: 4, 
                    name: 'Ana Rodríguez', 
                    usuario: 'ana.rodriguez',
                    titulo: 'Lic. Administración de Empresas', 
                    facultad: 'Industrial',
                    tipoReconocimiento: 'INVESTIGACIÓN',
                    reconocimiento: 'Premio a la investigación innovadora - 2024'
                },
                { 
                    id: 5, 
                    name: 'Pedro Martínez', 
                    usuario: 'pedro.martinez',
                    titulo: 'Lic. Telecomunicaciones', 
                    facultad: 'Administracion',
                    tipoReconocimiento: 'IMPACTO SOCIAL',
                    reconocimiento: 'Reconocimiento por impacto social comunitario - 2023'
                },
                { 
                    id: 6, 
                    name: 'Laura Sánchez', 
                    usuario: 'laura.sanchez',
                    titulo: 'Lic. Relaciones Industriales', 
                    facultad: 'Telecomunicaciones',
                    tipoReconocimiento: 'IMPACTO SOCIAL',
                    reconocimiento: 'Reconocimiento por impacto social comunitario - 2023'
                },
                { 
                    id: 7, 
                    name: 'Roberto Jiménez', 
                    usuario: 'roberto.jimenez',
                    titulo: 'Lic. Administración de Empresas', 
                    facultad: 'Telecomunicaciones',
                    tipoReconocimiento: 'DOCENCIA',
                    reconocimiento: 'Premio a la excelencia Docente UCAB - 2024'
                },
                { 
                    id: 8, 
                    name: 'Sofía Ramírez', 
                    usuario: 'sofia.ramirez',
                    titulo: 'Lic. Ingeniería Informática', 
                    facultad: 'Administracion',
                    tipoReconocimiento: 'INVESTIGACIÓN',
                    reconocimiento: 'Premio a la investigación innovadora - 2023'
                }
            ],
            Filters: ['DOCENCIA', 'INVESTIGACIÓN', 'IMPACTO SOCIAL']
        };
    },
    computed: {
        // Profesores filtrados según la selección
        profesoresFiltrados() {
            if (!this.selectedFilter) {
                return this.profesores;
            }
            
            // Filtrar por tipo de reconocimiento
            return this.profesores.filter(profesor => 
                profesor.tipoReconocimiento === this.selectedFilter
            );
        }
    },
    methods: {
        onFilterChange(event) {
            const selectedValue = event.target.value;
            console.log('Filtro seleccionado:', selectedValue);
        }
    }
};
</script>