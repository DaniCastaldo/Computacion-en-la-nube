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
            <h1>Tutores</h1>
            <h2>Reportes</h2>
            <p>Tutores Activos En El Semestre</p>
            
            <!-- Contenedor para los combos -->
            <div class="filter-controls">
                <div class="combo-box principal-combo">
                    <label for="filter-select">Filtrar por:</label>
                    <select id="filter-select" v-model="selectedFilter"@change="onFilterChange">
                        <option value="" disabled>Seleccionar</option>
                        <option v-for="filter in Filters" :value="filter">
                            {{ filter }} 
                        </option>
                    </select>
                </div>

                <!-- Segundo combo para materias -->
                <div class="combo-box secondary-combo" v-if="selectedFilter === 'Materias'">
                    <label for="materia-select">Seleccionar Materia:</label>
                    <select id="materia-select" v-model="selectedOption"@change="onSecondarySelect">
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

                <!-- Segundo combo para facultad -->
                <div class="combo-box secondary-combo" v-if="selectedFilter === 'Facultad'">
                    <label for="facultad-select">Seleccionar Facultad:</label>
                    <select id="facultad-select" v-model="selectedOption"@change="onSecondarySelect">
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
            <!-- UN SOLO contenedor info-container que siempre está -->
            <section class='info-container'>
                
                <!-- Mostrar TODOS los tutores si no hay filtro -->
                <section v-if="!selectedOption && !selectedUser">
                    <div class='info' v-for="user in users" :key="user.id">
                        <div class='icono'>
                            <img src='../../../public/usuario.png' alt='icono'>
                        </div>
                        <div class='info-personal'>
                            <h2>{{ user.name }}</h2>
                            <p>{{ user.email }}</p>
                            <p>{{ user.Materia }}</p>
                            <p><strong>Facultad:</strong> {{ user.facultad }}</p>
                        </div>
                    </div>
                </section>

                <!-- Mostrar tutores filtrados -->
                <section v-else-if="selectedOption && filteredUsers.length > 0">  
                    <div class='info' v-for="user in filteredUsers" :key="user.id">
                        <div class='icono'>
                            <img src='../../../public/usuario.png' alt='icono'>
                        </div>
                        <div class='info-personal'>
                            <h2>{{ user.name }}</h2>
                            <p>{{ user.email }}</p>
                            <p>{{ user.Materia }}</p>
                            <p><strong>Facultad:</strong> {{ user.facultad }}</p>
                        </div>
                    </div>
                </section>
            </section>
        </section>
    </section>

</template>

<script>
export default {
    name: 'TutoresReport',
    data() {
        return {
            selectedFilter: '',
            selectedOption: '',
            selectedUser: null,
            users: [
                { id: 1, name: 'Juan Pérez', email: 'juan@email.com', Materia: 'Calculo 1', facultad: 'Informatica' },
                { id: 2, name: 'María García', email: 'maria@email.com', Materia: 'Base de Datos', facultad: 'Informatica' },
                { id: 3, name: 'Carlos López', email: 'carlos@email.com', Materia: 'Fisica General', facultad: 'Industrial' },
                { id: 4, name: 'Ana Rodríguez', email: 'ana@email.com', Materia: 'Calculo 1', facultad: 'Industrial' },
                { id: 5, name: 'Pedro Martínez', email: 'pedro@email.com', Materia: 'Base de Datos', facultad: 'Administracion' },
                { id: 6, name: 'Laura Sánchez', email: 'laura@email.com', Materia: 'Calculo 1', facultad: 'Telecomunicaciones' },
                { id: 7, name: 'Roberto Jiménez', email: 'roberto@email.com', Materia: 'Base de Datos', facultad: 'Telecomunicaciones' },
                { id: 8, name: 'Sofía Ramírez', email: 'sofia@email.com', Materia: 'Fisica General', facultad: 'Administracion' }
            ],
            Filters: ['Facultad', 'Materias']
        };
    },
    computed: {
        // Lista de materias con valores únicos
        materiasList() {
            const materias = this.users.map(user => user.Materia);
            return [...new Set(materias)];
        },
        
        // Lista de facultades con valores únicos
        facultadesList() {
            const facultades = this.users.map(user => user.facultad);
            return [...new Set(facultades)];
        },
        
        // Usuarios filtrados según la selección
        filteredUsers() {
            if (!this.selectedOption || !this.selectedFilter) {
                return [];
            }
            
            if (this.selectedFilter === 'Materias') {
                return this.users.filter(user => user.Materia === this.selectedOption);
            } else if (this.selectedFilter === 'Facultad') {
                return this.users.filter(user => user.facultad === this.selectedOption);
            }
            
            return [];
        }
    },
    methods: {
        // Event listener cuando cambia el filtro principal
        onFilterChange(event) {
            const selectedValue = event.target.value;
            console.log('Filtro seleccionado:', selectedValue);
            
            // Resetear selección secundaria
            this.selectedOption = '';
            this.selectedUser = null;
        },
        
        // Event listener cuando cambia la selección secundaria
        onSecondarySelect(event) {
            const selectedValue = event.target.value;
            console.log('Opción seleccionada:', selectedValue);
            console.log('Filtro activo:', this.selectedFilter);
            
            // Resetear usuario específico seleccionado
            this.selectedUser = null;
        }
    }
};
</script>

