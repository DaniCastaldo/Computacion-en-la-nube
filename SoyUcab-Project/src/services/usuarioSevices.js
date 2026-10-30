import api from './ApiServices';

export default {
  // ==================== AUTHENTICATION ====================
  
  async registerUser(userData) {
    try {
      console.log('Iniciando registro con userData:', userData);
      
      // Determinar endpoint según tipo de usuario
      let endpoint;
      let formattedData = { ...userData };
      
      // Si es dependencia u organizacion
      if (userData.tipo_entidad && (userData.tipo_entidad === 'dependencia' || userData.tipo_entidad === 'organizacion')) {
        endpoint = '/auth/register';
        
        console.log('Enviando entidad a /auth/register:', formattedData);
        
      } else {
        // Si es persona, ir a /members
        endpoint = '/members';
        
        // Validar fecha de nacimiento para personas
        if (!userData.fecha_nacimiento) {
          console.error('Faltó fecha_nacimiento');
          return {
            success: false,
            error: 'La fecha de nacimiento es requerida'
          };
        }
        
        // Formatear fecha si es necesario
        formattedData = {
          ...userData,
          fecha_nacimiento: this.formatDate(userData.fecha_nacimiento)
        };
        
        console.log('Enviando persona a /members:', formattedData);
      }
      
      // Enviar al endpoint correspondiente
      const response = await api.post(endpoint, formattedData);
      
      console.log('Registro exitoso - Respuesta completa:', response.data);
      
      // Guardar token si la API lo devuelve
      if (response.data.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        console.log('Token guardado');
      }
      
      // Guardar datos de usuario según el tipo
      if (response.data.data) {
        let userToStore;
        
        // Para entidades (dependencia/organizacion)
        if (response.data.data.tipo_entidad) {
          userToStore = {
            ...response.data.data.miembro,
            tipo_usuario: response.data.data.tipo_entidad,
            entidad_info: response.data.data.entidad
          };
          
          // Eliminar contraseña
          delete userToStore.contraseña;
          
        } else {
          // Para personas (del endpoint /members)
          if (response.data.data.persona && response.data.data.miembro) {
            userToStore = {
              ...response.data.data.persona,
              nombre_usuario: response.data.data.miembro.nombre_usuario,
              estado_cuenta: response.data.data.miembro.estado_cuenta,
              privacidad_perfil: response.data.data.miembro.privacidad_perfil,
              fecha_registro: response.data.data.miembro.fecha_registro,
              tipo_usuario: 'persona',
              email: response.data.data.persona.email_persona || 
                    response.data.data.miembro.email
            };
            
            delete userToStore.contraseña;
            delete userToStore.email_estudiante;
            delete userToStore.email_egresado;
            
          } else if (response.data.data.persona) {
            userToStore = response.data.data.persona;
            delete userToStore.contraseña;
          } else if (response.data.data.miembro) {
            userToStore = response.data.data.miembro;
            delete userToStore.contraseña;
          }
        }
        
        if (userToStore) {
          localStorage.setItem('user', JSON.stringify(userToStore));
          console.log('Usuario guardado en localStorage:', userToStore);
        }
      }
      
      // Opcional: Hacer login automático después del registro exitoso
      try {
        if (!response.data.data?.token) {
          console.log('Intentando login automático...');
          const loginResponse = await api.post('/auth/login', {
            email: userData.email,
            contraseña: userData.contraseña
          });
          
          if (loginResponse.data.success && loginResponse.data.data) {
            // Guardar token del login
            const token = loginResponse.data.data.token || 
                        loginResponse.data.token || 
                        'generar-token-aqui';
            
            localStorage.setItem('token', token);
            
            // Actualizar usuario con datos del login
            if (loginResponse.data.data) {
              const loginUserData = { ...loginResponse.data.data };
              delete loginUserData.contraseña;
              localStorage.setItem('user', JSON.stringify(loginUserData));
            }
            
            console.log('Login automático exitoso');
          }
        }
      } catch (loginError) {
        console.warn('Registro exitoso pero login automático falló:', 
                    loginError.response?.data || loginError.message);
      }
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Registro exitoso'
      };
      
    } catch (error) {
      console.error('Error en registro:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      const errorData = error.response?.data || {};
      
      return {
        success: false,
        error: errorData.error || 'Error en el registro',
        details: errorData.details,
        missing: errorData.missing || [],
        status: error.response?.status
      };
    }
  },

  // Función auxiliar para formatear fecha
  formatDate(dateString) {
    if (!dateString) return null;
    
    // Si ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Convertir de otros formatos
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch {
      return dateString;
    }
  },

  async login(credentials) {
    try {
      console.log(' Enviando credenciales:', credentials);
      
      // Enviar EXACTAMENTE los campos que espera el backend
      const response = await api.post('/auth/login', credentials);
      
      console.log(' Login exitoso - Respuesta completa:', response.data);
      
      // Guardar token y datos de usuario
      if (response.data.data) {
        // Algunos backends devuelven el token en data.token, otros en data
        if (response.data.data.token) {
          localStorage.setItem('token', response.data.data.token);
          console.log('🔑 Token guardado');
        }
        
        // Guardar datos del usuario
        localStorage.setItem('user', JSON.stringify(response.data.data));
        console.log('👤 Usuario guardado:', response.data.data);
      }
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error(' Error en login:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error en el login'
      };
    }
  },

  async getCurrentUser() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          error: 'No hay token de autenticación'
        };
      }
      
      const response = await api.get('/auth/me');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error obteniendo usuario:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo usuario'
      };
    }
  },

  async getMemberByEmail(email) {
    try {
      const response = await api.get(`/members/${encodeURIComponent(email)}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error obteniendo miembro:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo miembro'
      };
    }
  },

  async updateMember(email, updates) {
    try {
      const response = await api.put(`/members/${encodeURIComponent(email)}`, updates);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error actualizando miembro:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error actualizando miembro'
      };
    }
  },

  async updateDependencia(email, updates) {
    try {
      const response = await api.put(`/auth/dependencia/${encodeURIComponent(email)}`, updates);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error actualizando dependencia:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error actualizando dependencia'
      };
    }
  },

  async updateOrganizacion(email, updates) {
    try {
      const response = await api.put(`/auth/organizacion/${encodeURIComponent(email)}`, updates);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error actualizando organizacion:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error actualizando organizacion'
      };
    }
  },

  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log(' Sesión cerrada');
    return { success: true, message: 'Sesión cerrada' };
  },

  // ==================== REPORTS ====================
  
  async getTopCompanies(limit = 10) {
    try {
      const response = await api.get(`/reports/top-companies?limit=${limit}`);
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error obteniendo empresas:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo empresas',
        data: []
      };
    }
  },

  async getTutorsReport() {
    try {
      const response = await api.get('/reports/tutors');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error obteniendo tutores:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo tutores',
        data: []
      };
    }
  },

  async getMentionsReport() {
    try {
      const response = await api.get('/reports/mentions');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error obteniendo menciones:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo menciones',
        data: []
      };
    }
  },

  async getReportsByCategory(category) {
    try {
      const response = await api.get(`/reports/category/${category}`);
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error obteniendo reportes por categoría:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo reportes por categoría',
        data: []
      };
    }
  },

  async getReportCategories() {
    try {
      const response = await api.get('/reports/categories');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error obteniendo categorías:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo categorías',
        data: ['Docencia', 'Impacto Social', 'Investigación']
      };
    }
  },

  async getGraduatesLocation() {
    try {
      const response = await api.get('/reports/graduates-location');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count,
        grouped_count: response.data.grouped_count
      };
    } catch (error) {
      console.error('Error obteniendo ubicación:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo ubicación',
        data: []
      };
    }
  },

  async getTutorsDetailedReport() {
    try {
      const response = await api.get('/reports/tutors-detailed');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error obteniendo tutores detallados:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo tutores detallados',
        data: []
      };
    }
  },

  async getGraduatesLocationDetailed() {
    try {
      const response = await api.get('/reports/graduates-location-detailed');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error obteniendo ubicación detallada:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo ubicación detallada',
        data: []
      };
    }
  },

  // ==================== GROUPS ====================

  async createGroup(groupData) {
    try {
      const response = await api.post('/groups', groupData);
      return {
        success: true,
        data: response.data.data,
        status: response.status
      };
    } catch (error) {
      console.error('Error creando grupo:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error creando grupo'
      };
    }
  },

  async joinGroup(groupName) {
    try {
      const response = await api.post(`/groups/${encodeURIComponent(groupName)}/join`);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      console.error('Error al unirse al grupo:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al unirse al grupo'
      };
    }
  },

  async getMyGroups() {
    try {
      const response = await api.get('/groups/mine');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error obteniendo grupos del usuario:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo grupos',
        data: []
      };
    }
  },

  async getGroupDetails(groupName) {
    try {
      const response = await api.get(`/groups/${encodeURIComponent(groupName)}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error obteniendo detalles de grupo:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Error obteniendo detalles de grupo' };
    }
  },

  async getGroupPosts(groupName) {
    try {
      const response = await api.get(`/groups/${encodeURIComponent(groupName)}/posts`);
      return { success: true, data: response.data.data, count: response.data.count };
    } catch (error) {
      console.error('Error obteniendo publicaciones de grupo:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Error obteniendo publicaciones de grupo', data: [] };
    }
  },

  async updateGroup(groupName, updates) {
    try {
      const response = await api.put(`/groups/${encodeURIComponent(groupName)}`, updates);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('Error actualizando grupo:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Error actualizando grupo' };
    }
  },

  // ==================== UTILITIES ====================
  
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  getCurrentToken() {
    return localStorage.getItem('token');
  },

  getStoredUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setStoredUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Helper para formatear fechas
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Helper para formatear nombres de países
  getCountryName(code) {
    const countries = {
      'CO': 'Colombia',
      'ES': 'España', 
      'US': 'Estados Unidos',
      'VE': 'Venezuela',
      'MX': 'México',
      'AR': 'Argentina',
      'CL': 'Chile',
      'PE': 'Perú',
      'BR': 'Brasil',
      'EC': 'Ecuador'
    };
    return countries[code] || code;
  }
};