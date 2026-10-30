const API_BASE_URL = 'https://soyucab-backend.onrender.com/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Configurar headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };
    
    // Agregar token si existe
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors'
      });
      
      // Manejar respuesta no OK
      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o acceso denegado
          console.error('API 401 on', url);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          data: errorData,
          message: errorData.error || `HTTP ${response.status}`
        };
      }
      
      // Parsear respuesta JSON
      const data = await response.json();
      return { data, status: response.status };
      
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Métodos HTTP
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Exportar instancia única
export default new ApiService();
