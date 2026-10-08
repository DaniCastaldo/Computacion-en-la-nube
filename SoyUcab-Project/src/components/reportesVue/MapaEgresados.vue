<template>
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
  <div class="map-container">
    <!-- Panel lateral izquierdo -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>Reportes | Mapa</h2>
        <h3>Amigos en el mapa</h3>
      </div>
      
      <div class="filter-section">
        <div class="filter-option" v-for="country in availableCountries" :key="country.code">
          <input 
            type="radio" 
            :id="country.code" 
            :value="country.code" 
            v-model="filter" 
          />
          <label :for="country.code">{{ country.name }}</label>
        </div>
      </div>
      
      <div class="statistics">
        <p><strong>Total de egresados:</strong> {{ totalEgresados }}</p>
        <p><strong>Países con egresados:</strong> {{ countriesWithGraduates.length }}</p>
      </div>
    </div>
    
    <!-- Contenedor del mapa -->
    <div class="map-wrapper">
      <div ref="mapContainer" id="map"></div>
    </div>
    
    <!-- Panel lateral derecho para detalles -->
    <div class="detail-panel" :class="{ 'active': selectedLocation }">
      <div class="detail-header">
        <h3>Egresados en {{ selectedLocationName }}</h3>
        <button class="close-btn" @click="closeDetailPanel">×</button>
      </div>
      
      <div class="detail-content">
        <div v-if="filteredEgresados.length > 0">
          <div class="egresado-card" v-for="egresado in filteredEgresados" :key="egresado.id">
            <div class="card-header">
              <span class="name">{{ egresado.nombre }} {{ egresado.apellido }}</span>
              <span class="country-flag">{{ getFlagEmoji(egresado.pais) }}</span>
            </div>
            <div class="card-body">
              <p><strong>Título obtenido:</strong> {{ formatMultivalued(egresado.titulo_obtenido) }}</p>
              <p><strong>Facultad:</strong> {{ egresado.facultad }}</p>
              <p><strong>Graduación:</strong> {{ formatDate(egresado.fecha_acto_grado) }}</p>
              <p v-if="egresado.menciones && egresado.menciones.length">
                <strong>Menciones:</strong> {{ formatMultivalued(egresado.menciones) }}
              </p>
              <p v-if="egresado.empresa_actual && egresado.empresa_actual.length">
                <strong>Empresa actual:</strong> {{ formatMultivalued(egresado.empresa_actual) }}
              </p>
              <p><strong>Ubicación:</strong> {{ egresado.estado }}, {{ getCountryName(egresado.pais) }}</p>
            </div>
          </div>
        </div>
        <div v-else class="no-data">
          <p>No hay egresados en esta ubicación con el filtro actual.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import 'leaflet/dist/leaflet.css';

// Importamos Leaflet de forma dinámica para evitar problemas con SSR
let L = null;

const mapContainer = ref(null);
let map = null;
let markers = [];

const filter = ref('all');
const selectedLocation = ref(null);

const availableCountries = [
  { code: 'all', name: 'Ver todo' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'CO', name: 'Colombia' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' }
];

// DATOS SIMULADOS DE LA BASE DE DATOS - SIN COORDENADAS, solo nombres
const egresados = [
  {
    id: 1,
    nombre: 'María',
    apellido: 'González',
    titulo_obtenido: ['Ingeniero en Computación'],
    facultad: 'Ingeniería',
    fecha_acto_grado: '2018-07-15',
    menciones: ['Cum Laude'],
    empresa_actual: ['Google'],
    pais: 'Venezuela',          // Nombre del país, no coordenadas
    estado: 'Caracas',          // Nombre del estado
    ubicacion: 'Caracas, Venezuela'
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellido: 'Rodríguez',
    titulo_obtenido: ['Licenciado en Administración'],
    facultad: 'Ciencias Económicas y Sociales',
    fecha_acto_grado: '2015-11-20',
    menciones: [],
    empresa_actual: ['Amazon'],
    pais: 'Estados Unidos',     // Nombre del país
    estado: 'Florida',          // Nombre del estado
    ubicacion: 'Florida, Estados Unidos'
  },
  {
    id: 3,
    nombre: 'Ana',
    apellido: 'Fernández',
    titulo_obtenido: ['Doctor en Medicina'],
    facultad: 'Ciencias de la Salud',
    fecha_acto_grado: '2020-05-10',
    menciones: ['Magna Cum Laude'],
    empresa_actual: ['Hospital Central'],
    pais: 'Colombia',           // Nombre del país
    estado: 'Bogotá',           // Nombre del estado
    ubicacion: 'Bogotá, Colombia'
  },
  {
    id: 4,
    nombre: 'Luis',
    apellido: 'Martínez',
    titulo_obtenido: ['Licenciado en Derecho'],
    facultad: 'Derecho',
    fecha_acto_grado: '2019-03-22',
    menciones: [],
    empresa_actual: ['Bufete Legal Internacional'],
    pais: 'España',             // Nombre del país
    estado: 'Madrid',           // Nombre del estado
    ubicacion: 'Madrid, España'
  },
  {
    id: 5,
    nombre: 'Pedro',
    apellido: 'Gómez',
    titulo_obtenido: ['Ingeniero Civil'],
    facultad: 'Ingeniería',
    fecha_acto_grado: '2017-06-10',
    menciones: [],
    empresa_actual: ['Constructora Nacional'],
    pais: 'México',             // Nombre del país
    estado: 'Ciudad de México', // Nombre del estado
    ubicacion: 'Ciudad de México, México'
  },
  {
    id: 6,
    nombre: 'Laura',
    apellido: 'Pérez',
    titulo_obtenido: ['Licenciada en Comunicación Social'],
    facultad: 'Humanidades y Educación',
    fecha_acto_grado: '2021-09-15',
    menciones: ['Summa Cum Laude'],
    empresa_actual: ['Televisión Nacional'],
    pais: 'Argentina',          // Nombre del país
    estado: 'Buenos Aires',     // Nombre del estado
    ubicacion: 'Buenos Aires, Argentina'
  },
  {
    id: 7,
    nombre: 'Gerhard',
    apellido: 'Castro',
    titulo_obtenido: ['Licenciado en Comunicación Social'],
    facultad: 'Humanidades y Educación',
    fecha_acto_grado: '2021-09-15',
    menciones: ['Summa Cum Laude'],
    empresa_actual: ['Televisión Nacional'],
    pais: 'Argentina',          // Nombre del país
    estado: 'Buenos Aires',     // Nombre del estado
    ubicacion: 'Buenos Aires, Argentina'
  },{
    id: 8,
    nombre: 'Carlos',
    apellido: 'Castro',
    titulo_obtenido: ['Licenciado en Comunicación Social'],
    facultad: 'Humanidades y Educación',
    fecha_acto_grado: '2021-09-15',
    menciones: ['Summa Cum Laude'],
    empresa_actual: ['Televisión Nacional'],
    pais: 'Argentina',          // Nombre del país
    estado: 'Buenos Aires',     // Nombre del estado
    ubicacion: 'Buenos Aires, Argentina'
  },{
    id: 9,
    nombre: 'miguel',
    apellido: 'Castro',
    titulo_obtenido: ['Licenciado en Comunicación Social'],
    facultad: 'Humanidades y Educación',
    fecha_acto_grado: '2021-09-15',
    menciones: ['Summa Cum Laude'],
    empresa_actual: ['Televisión Nacional'],
    pais: 'Argentina',          // Nombre del país
    estado: 'Buenos Aires',     // Nombre del estado
    ubicacion: 'Buenos Aires, Argentina'
  }
];

// DICCIONARIO para convertir nombres de países a códigos ISO y coordenadas
const countryMapping = {
  // América
  'Venezuela': { code: 'VE', coordinates: [8.0000, -66.0000] },
  'Estados Unidos': { code: 'US', coordinates: [37.0902, -95.7129] },
  'Colombia': { code: 'CO', coordinates: [4.0000, -72.0000] },
  'México': { code: 'MX', coordinates: [23.6345, -102.5528] },
  'Argentina': { code: 'AR', coordinates: [-38.4161, -63.6167] },
  'Chile': { code: 'CL', coordinates: [-35.6751, -71.5429] },
  'Perú': { code: 'PE', coordinates: [-9.1900, -75.0152] },
  'Brasil': { code: 'BR', coordinates: [-14.2350, -51.9253] },
  'Ecuador': { code: 'EC', coordinates: [-1.8312, -78.1834] },
  'Bolivia': { code: 'BO', coordinates: [-16.2902, -63.5887] },
  'Paraguay': { code: 'PY', coordinates: [-23.4425, -58.4438] },
  'Uruguay': { code: 'UY', coordinates: [-32.5228, -55.7658] },
  'Panamá': { code: 'PA', coordinates: [8.5375, -80.7821] },
  'Costa Rica': { code: 'CR', coordinates: [9.7489, -83.7534] },
  'Nicaragua': { code: 'NI', coordinates: [12.8654, -85.2072] },
  'Honduras': { code: 'HN', coordinates: [15.2000, -86.2419] },
  'El Salvador': { code: 'SV', coordinates: [13.7942, -88.8965] },
  'Guatemala': { code: 'GT', coordinates: [15.7835, -90.2308] },
  'Cuba': { code: 'CU', coordinates: [21.5218, -77.7812] },
  'República Dominicana': { code: 'DO', coordinates: [18.7357, -70.1627] },
  'Puerto Rico': { code: 'PR', coordinates: [18.2208, -66.5901] },
  'Canadá': { code: 'CA', coordinates: [56.1304, -106.3468] },
  
  // Europa
  'España': { code: 'ES', coordinates: [40.4637, -3.7492] },
  'Francia': { code: 'FR', coordinates: [46.6034, 1.8883] },
  'Italia': { code: 'IT', coordinates: [41.8719, 12.5674] },
  'Alemania': { code: 'DE', coordinates: [51.1657, 10.4515] },
  'Reino Unido': { code: 'GB', coordinates: [55.3781, -3.4360] },
  'Portugal': { code: 'PT', coordinates: [39.3999, -8.2245] },
  'Países Bajos': { code: 'NL', coordinates: [52.1326, 5.2913] },
  'Bélgica': { code: 'BE', coordinates: [50.5039, 4.4699] },
  'Suiza': { code: 'CH', coordinates: [46.8182, 8.2275] },
  'Austria': { code: 'AT', coordinates: [47.5162, 14.5501] },
  'Suecia': { code: 'SE', coordinates: [60.1282, 18.6435] },
  'Noruega': { code: 'NO', coordinates: [60.4720, 8.4689] },
  'Finlandia': { code: 'FI', coordinates: [61.9241, 25.7482] },
  'Dinamarca': { code: 'DK', coordinates: [56.2639, 9.5018] },
  'Polonia': { code: 'PL', coordinates: [51.9194, 19.1451] },
  'Rusia': { code: 'RU', coordinates: [61.5240, 105.3188] },
  'Ucrania': { code: 'UA', coordinates: [48.3794, 31.1656] },
  'Grecia': { code: 'GR', coordinates: [39.0742, 21.8243] },
  'Turquía': { code: 'TR', coordinates: [38.9637, 35.2433] },
  
  // Asia
  'China': { code: 'CN', coordinates: [35.8617, 104.1954] },
  'Japón': { code: 'JP', coordinates: [36.2048, 138.2529] },
  'India': { code: 'IN', coordinates: [20.5937, 78.9629] },
  'Corea del Sur': { code: 'KR', coordinates: [35.9078, 127.7669] },
  'Singapur': { code: 'SG', coordinates: [1.3521, 103.8198] },
  'Tailandia': { code: 'TH', coordinates: [15.8700, 100.9925] },
  'Vietnam': { code: 'VN', coordinates: [14.0583, 108.2772] },
  'Filipinas': { code: 'PH', coordinates: [12.8797, 121.7740] },
  'Malasia': { code: 'MY', coordinates: [4.2105, 101.9758] },
  'Indonesia': { code: 'ID', coordinates: [-0.7893, 113.9213] },
  'Israel': { code: 'IL', coordinates: [31.0461, 34.8516] },
  'Emiratos Árabes Unidos': { code: 'AE', coordinates: [23.4241, 53.8478] },
  'Arabia Saudita': { code: 'SA', coordinates: [23.8859, 45.0792] },
  'Qatar': { code: 'QA', coordinates: [25.3548, 51.1839] },
  
  // África
  'Sudáfrica': { code: 'ZA', coordinates: [-30.5595, 22.9375] },
  'Egipto': { code: 'EG', coordinates: [26.8206, 30.8025] },
  'Nigeria': { code: 'NG', coordinates: [9.0820, 8.6753] },
  'Kenia': { code: 'KE', coordinates: [-1.2864, 36.8172] },
  'Marruecos': { code: 'MA', coordinates: [31.7917, -7.0926] },
  'Argelia': { code: 'DZ', coordinates: [28.0339, 1.6596] },
  'Túnez': { code: 'TN', coordinates: [33.8869, 9.5375] },
  'Ghana': { code: 'GH', coordinates: [7.9465, -1.0232] },
  'Costa de Marfil': { code: 'CI', coordinates: [7.5400, -5.5471] },
  'Senegal': { code: 'SN', coordinates: [14.4974, -14.4524] },
  'Etiopía': { code: 'ET', coordinates: [9.1450, 40.4897] },
  
  // Oceanía
  'Australia': { code: 'AU', coordinates: [-25.2744, 133.7751] },
  'Nueva Zelanda': { code: 'NZ', coordinates: [-40.9006, 174.8860] },
  
  // Centroamérica y Caribe
  'Jamaica': { code: 'JM', coordinates: [18.1096, -77.2975] },
  'Trinidad y Tobago': { code: 'TT', coordinates: [10.6918, -61.2225] },
  'Bahamas': { code: 'BS', coordinates: [25.0343, -77.3963] },
  'Barbados': { code: 'BB', coordinates: [13.1939, -59.5432] },
  
  // Países adicionales importantes
  'Irlanda': { code: 'IE', coordinates: [53.1424, -7.6921] },
  'Islandia': { code: 'IS', coordinates: [64.9631, -19.0208] },
  'Luxemburgo': { code: 'LU', coordinates: [49.8153, 6.1296] },
  'Mónaco': { code: 'MC', coordinates: [43.7384, 7.4246] },
  'Andorra': { code: 'AD', coordinates: [42.5462, 1.6016] },
  'Malta': { code: 'MT', coordinates: [35.9375, 14.3754] },
  'Chipre': { code: 'CY', coordinates: [35.1264, 33.4299] },
  'Liechtenstein': { code: 'LI', coordinates: [47.1660, 9.5554] },
  'San Marino': { code: 'SM', coordinates: [43.9424, 12.4578] },
  'Vaticano': { code: 'VA', coordinates: [41.9029, 12.4534] }
};

// Computed properties
const totalEgresados = computed(() => egresados.length);

const countriesWithGraduates = computed(() => {
  const countries = new Set();
  egresados.forEach(egresado => {
    countries.add(egresado.pais);
  });
  return Array.from(countries);
});

const filteredEgresados = computed(() => {
  if (!selectedLocation.value) return [];
  
  if (filter.value === 'all') {
    return egresados.filter(egresado => egresado.pais === selectedLocation.value);
  } else {
    return egresados.filter(egresado => {
      const countryInfo = countryMapping[egresado.pais];
      return countryInfo && countryInfo.code === filter.value && egresado.pais === selectedLocation.value;
    });
  }
});

const selectedLocationName = computed(() => {
  if (!selectedLocation.value) return '';
  return selectedLocation.value;
});

// Métodos
const initMap = async () => {
  // Importamos Leaflet solo en el cliente
  L = await import('leaflet');
  
  // Solución para los iconos de Leaflet en Vite
  delete L.Icon.Default.prototype._getIconUrl;
  
  // Usamos URLs públicas para los iconos
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  // Inicializar el mapa
  map = L.map(mapContainer.value).setView([15, -60], 3);
  
  // Añadir capa de tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // Añadir marcadores
  addMarkers();
};

const getCountryInfo = (countryName) => {
  // Obtener información del país por nombre
  return countryMapping[countryName] || { 
    code: countryName.substring(0, 2).toUpperCase(), 
    coordinates: [0, 0] // Coordenadas por defecto si no se encuentra el país
  };
};

const addMarkers = () => {
  // Limpiar marcadores existentes
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
  
  // Agrupar egresados por país
  const egresadosPorPais = {};
  egresados.forEach(egresado => {
    if (!egresadosPorPais[egresado.pais]) {
      egresadosPorPais[egresado.pais] = [];
    }
    egresadosPorPais[egresado.pais].push(egresado);
  });
  
  // Añadir un marcador por cada país con egresados
  Object.keys(egresadosPorPais).forEach(paisNombre => {
    const countryInfo = getCountryInfo(paisNombre);
    const coordenadas = countryInfo.coordinates;
    
    if (coordenadas[0] !== 0 || coordenadas[1] !== 0) {
      // Crear icono personalizado (flecha de ubicación)
      const icono = L.divIcon({
        html: `
          <div class="custom-marker">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e74c3c" width="30" height="30">
              <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            <span class="marker-count">${egresadosPorPais[paisNombre].length}</span>
          </div>
        `,
        className: 'custom-div-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });
      
      const marker = L.marker(coordenadas, { icon: icono })
        .addTo(map)
        .bindPopup(`
          <div class="map-popup">
            <strong>${paisNombre}</strong>
            <p>${egresadosPorPais[paisNombre].length} egresado(s)</p>
            <button class="popup-btn">Ver egresados</button>
          </div>
        `);
      
      marker.on('click', () => {
        showGraduates(paisNombre);
      });
      
      // También hacer que el botón en el popup funcione
      marker.on('popupopen', () => {
        const popupBtn = document.querySelector('.popup-btn');
        if (popupBtn) {
          popupBtn.onclick = (e) => {
            e.stopPropagation();
            showGraduates(paisNombre);
            map.closePopup();
          };
        }
      });
      
      markers.push(marker);
    }
  });
};

const showGraduates = (pais) => {
  selectedLocation.value = pais;
};

const closeDetailPanel = () => {
  selectedLocation.value = null;
};

const getFlagEmoji = (countryCode) => {
  // Si recibimos un nombre de país, obtener el código primero
  let code = countryCode;
  if (countryCode && countryCode.length > 2) {
    // Es un nombre de país, buscar en el mapping
    const countryInfo = countryMapping[countryCode];
    if (countryInfo) {
      code = countryInfo.code;
    } else {
      // Si no está en el mapping, usar las primeras dos letras
      code = countryCode.substring(0, 2).toUpperCase();
    }
  }
  
  // Convertir código de país a emoji de bandera
  if (code && code.length === 2) {
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }
  return '🏳️'; // Bandera por defecto
};

const getCountryName = (countryName) => {
  return countryName; // Ya tenemos el nombre del país
};

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

const formatMultivalued = (array) => {
  return Array.isArray(array) ? array.join(', ') : array;
};

// Lifecycle hooks
onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});

// Watchers
watch(filter, () => {
  if (map) {
    addMarkers();
  }
});
</script>