<template>
    <div class="container">
        <headerBar/> 
        
        <!-- Panel Izquierdo - Sidebar de usuario -->
        <div class="panel left-panel sidebar">
        <!-- Información del usuario -->
        <div class="user-info-section">
            <div class="user-header">
            <div class="avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="user-details">
                <h2 class="user-name">{{ userFullName }}</h2>
                <p class="username">@{{ userData.nombre_usuario }}</p>
                <p class="user-email">{{ userEmail }}</p>
                <p class="user-type" v-if="userData.tipo_usuario">
                  <span class="badge" :class="userData.tipo_usuario">
                    {{ formatUserType(userData.tipo_usuario) }}
                  </span>
                </p>
            </div>
            </div>
            
            <div class="user-stats" v-if="userStats.total_seguidores !== undefined">
              <div class="stat-item">
                  <span class="stat-number">{{ userStats.total_seguidores || 0 }}</span>
                  <span class="stat-label">Seguidores</span>
              </div>
              <div class="stat-item">
                  <span class="stat-number">{{ userStats.siguiendo || 0 }}</span>
                  <span class="stat-label">Siguiendo</span>
              </div>
              <div class="stat-item">
                  <span class="stat-number">{{ userStats.total_publicaciones || 0 }}</span>
                  <span class="stat-label">Publicaciones</span>
              </div>
            </div>

            <!-- Información adicional según tipo de usuario -->
            <div class="user-additional-info" v-if="additionalInfo">
              <div class="info-item" v-if="userData.tipo_usuario === 'estudiante' && additionalInfo.estudiante">
                <strong>Carrera:</strong> {{ additionalInfo.estudiante.carrera_programa }}
              </div>
              <div class="info-item" v-if="userData.tipo_usuario === 'estudiante' && additionalInfo.estudiante">
                <strong>Semestre:</strong> {{ additionalInfo.estudiante.semestre }}
              </div>
              <div class="info-item" v-if="userData.tipo_usuario === 'egresado' && additionalInfo.egresado">
                <strong>Egresado:</strong> {{ additionalInfo.egresado.facultad }}
              </div>
              <div class="info-item" v-if="userData.tipo_usuario === 'profesor' && additionalInfo.profesor">
                <strong>Profesor:</strong> {{ additionalInfo.profesor.categoria }}
              </div>
              <div class="info-item" v-if="userData.tipo_usuario === 'dependencia' && additionalInfo.dependencia">
                <strong>Dependencia:</strong> {{ additionalInfo.dependencia.nombre_institucional }}
              </div>
              <div class="info-item" v-if="userData.tipo_usuario === 'organizacion' && additionalInfo.organizacion">
                <strong>Organización:</strong> {{ additionalInfo.organizacion.nombre }}
              </div>
            </div>
        </div>
        
        <!-- Actividad reciente -->
        <div class="activity-section">
            <h3>Actividad Reciente</h3>
            <div class="activity-box">
              <div v-if="recentActivity.length === 0" class="empty-message">
                No hay actividad reciente
              </div>
              <div v-else class="activity-list">
                <div v-for="activity in recentActivity" :key="activity.id" class="activity-item">
                  <div class="activity-icon">
                    <i :class="getActivityIcon(activity.type)"></i>
                  </div>
                  <div class="activity-content">
                    <p>{{ activity.description }}</p>
                    <small>{{ formatTime(activity.timestamp) }}</small>
                  </div>
                </div>
              </div>
            </div>
        </div>
        </div>
        
        <!-- Panel Central - Publicaciones -->
        <div class="panel middle-panel">
          <div class="posts-section">
            <h2>Publicaciones</h2>
            
            <!-- Crear nueva publicación -->
            <div class="create-post" v-if="isLoggedIn">
              <div class="create-post-header">
                <div class="post-avatar">
                  <i class="fas fa-user-circle"></i>
                </div>
                <textarea 
                  v-model="newPostContent" 
                  placeholder="¿Qué estás pensando?" 
                  rows="3"
                  class="post-input"
                ></textarea>
              </div>
              <div class="create-post-actions">
                <button 
                  class="post-submit-btn" 
                  @click="createPost"
                  :disabled="!newPostContent.trim() || posting"
                >
                  <i class="fas fa-paper-plane"></i> 
                  {{ posting ? 'Publicando...' : 'Publicar' }}
                </button>
              </div>
            </div>
            
            <!-- Lista de publicaciones -->
            <div v-if="loadingPosts" class="loading-posts">
              <i class="fas fa-spinner fa-spin"></i> Cargando publicaciones...
            </div>
            
            <div v-else-if="userPosts.length === 0" class="no-posts">
              <p>No hay publicaciones aún</p>
              <button class="btn-create-post" @click="newPostContent = 'Hola a todos! Esta es mi primera publicación.'">
                <i class="fas fa-plus"></i> Crear primera publicación
              </button>
            </div>
            
            <div v-else class="posts-list">
              <div v-for="post in userPosts" :key="post.id" class="post-card">
                <div class="post-header">
                  <div class="post-avatar">
                    <i class="fas fa-user-circle"></i>
                  </div>
                  <div class="post-author">
                    <div class="author-name">{{ userFullName }}</div>
                    <div class="post-time">{{ formatPostTime(post.created_at) }}</div>
                  </div>
                  <div class="post-actions-menu" v-if="post.is_owner">
                    <button class="action-btn" @click="editPost(post)">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" @click="deletePost(post.id)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div class="post-content">
                  <p>{{ post.content }}</p>
                  <div v-if="post.media_url" class="post-media">
                    <img :src="post.media_url" alt="Media" class="post-image">
                  </div>
                </div>
                <div class="post-stats">
                  <span class="stat">
                    <i class="fas fa-heart"></i> {{ post.likes_count || 0 }}
                  </span>
                  <span class="stat">
                    <i class="fas fa-comment"></i> {{ post.comments_count || 0 }}
                  </span>
                  <span class="stat">
                    <i class="fas fa-share"></i> {{ post.shares_count || 0 }}
                  </span>
                </div>
                <div class="post-actions">
                  <button 
                    class="post-action" 
                    :class="{ 'active': post.liked_by_user }"
                    @click="toggleLike(post)"
                  >
                    <i class="fas fa-heart"></i> Me gusta
                  </button>
                  <button class="post-action" @click="showComments(post)">
                    <i class="fas fa-comment"></i> Comentar
                  </button>
                  <button class="post-action" @click="sharePost(post)">
                    <i class="fas fa-share"></i> Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Panel Derecho - Sidebar adicional -->
        <div class="panel right-panel sidebar">
          <!-- Sugerencias de conexión -->
          <div class="suggestions-section">
            <h3>Sugerencias para ti</h3>
            <div class="suggestions-box">
              <div v-if="loadingSuggestions" class="loading">
                <i class="fas fa-spinner fa-spin"></i> Cargando...
              </div>
              <div v-else-if="suggestions.length === 0" class="empty-message">
                No hay sugerencias disponibles
              </div>
              <div v-else class="suggestions-list">
                <div v-for="user in suggestions" :key="user.email" class="suggestion-item">
                  <div class="suggestion-avatar">
                    <i class="fas fa-user-circle"></i>
                  </div>
                  <div class="suggestion-details">
                    <div class="suggestion-name">{{ user.nombres }} {{ user.apellidos }}</div>
                    <div class="suggestion-username">@{{ user.nombre_usuario }}</div>
                    <div class="suggestion-mutual" v-if="user.mutual_friends > 0">
                      {{ user.mutual_friends }} amigos en común
                    </div>
                  </div>
                  <button 
                    class="follow-btn" 
                    @click="followUser(user.email)"
                    :disabled="user.is_following"
                  >
                    {{ user.is_following ? 'Siguiendo' : 'Seguir' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Tendencias -->
          <div class="trends-section">
            <h3>Tendencias</h3>
            <div class="trends-box">
              <div v-if="loadingTrends" class="loading">
                <i class="fas fa-spinner fa-spin"></i> Cargando...
              </div>
              <div v-else-if="trends.length === 0" class="empty-message">
                No hay tendencias para mostrar
              </div>
              <div v-else class="trends-list">
                <div v-for="trend in trends" :key="trend.hashtag" class="trend-item">
                  <div class="trend-tag">#{{ trend.hashtag }}</div>
                  <div class="trend-count">{{ trend.count }} publicaciones</div>
                </div>
              </div>
            </div>
          </div>

            <!-- Grupos: crear y listar mis grupos (mantenido fuera de la sección de cuenta) -->
            <div class="groups-section" v-if="isLoggedIn">
              <div>
                <h3 style="margin:0;">Grupos</h3>
              </div>

              <div class="create-group" style="margin-top:8px;">
                <button class="account-action-btn" @click="showCreateGroupForm = !showCreateGroupForm">
                  <i class="fas fa-users"></i>
                  {{ showCreateGroupForm ? 'Cancelar' : 'Crear grupo' }}
                </button>

                <div v-if="showCreateGroupForm" class="create-group-form">
                  <input v-model="newGroup.nombre" placeholder="Nombre del grupo" />
                  <input v-model="newGroup.descripcion" placeholder="Descripción" />
                  <select v-model="newGroup.categoria">
                    <option value="academico">Académico</option>
                    <option value="cultural">Cultural</option>
                    <option value="deportivo">Deportivo</option>
                    <option value="profesional">Profesional</option>
                    <option value="social">Social</option>
                    <option value="privado">Privado</option>
                  </select>
                  <select v-model="newGroup.privacidad">
                    <option value="publico">Público</option>
                    <option value="privado">Privado</option>
                    <option value="secreto">Secreto</option>
                  </select>

                  <textarea v-model="newGroup.requisitos_ingreso" placeholder="Requisitos de ingreso (opcional)" rows="3"></textarea>

                  <div class="create-group-actions">
                    <button @click="createGroup" :disabled="creatingGroup">
                      {{ creatingGroup ? 'Creando...' : 'Crear' }}
                    </button>
                  </div>
                  <div v-if="createGroupError" class="error">{{ createGroupError }}</div>
                  <div v-if="createGroupSuccess" class="success">{{ createGroupSuccess }}</div>
                </div>
              </div>

              <div class="my-groups" style="margin-top: 12px;">
                <h4>Mis grupos</h4>
                <div v-if="myGroupsLoading">Cargando grupos...</div>
                <div v-else-if="myGroups.length === 0">No perteneces a ningún grupo</div>
                <ul v-else>
                  <li v-for="g in myGroups" :key="g.nombre">
                    <router-link :to="`/groups/${encodeURIComponent(g.nombre)}`" class="group-link">
                      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                        <div>
                          <strong>{{ g.nombre }}</strong> — <em>{{ g.categoria }}</em>
                          <div class="group-meta">Rol: {{ g.rol_grupo }} • Unión: {{ formatDate(g.fecha_union) }}</div>
                          <div v-if="g.requisitos_ingreso" class="group-meta" style="margin-top:6px;">Requisitos: {{ g.requisitos_ingreso }}</div>
                        </div>
                        <div style="text-align:right;">
                          <div class="badge" :class="g.estado_grupo">{{ g.estado_grupo || 'N/A' }}</div>
                        </div>
                      </div>
                    </router-link>
                  </li>
                </ul>
              </div>
            </div>
        </div>
    </div>
</template>

<script>
import headerBar from './header.vue'
import api from '@/services/usuarioSevices';

export default {
  name: 'Home',
  components: {
    headerBar
  },
  data() {
    return {
      // Datos del usuario logueado
      userData: {},
      userEmail: '',
      userStats: {
        total_seguidores: 0,
        siguiendo: 0,
        total_publicaciones: 0
      },
      additionalInfo: null,
      
      // Publicaciones
      userPosts: [],
      newPostContent: '',
      posting: false,
      loadingPosts: false,
      
      // Sugerencias y tendencias
      suggestions: [],
      trends: [],
      loadingSuggestions: false,
      loadingTrends: false,
      
      // Actividad reciente
      recentActivity: [],
      
      // Grupos UI
      showCreateGroupForm: false,
      newGroup: {
        nombre: '',
        descripcion: '',
        categoria: 'academico',
        privacidad: 'publico',
        requisitos_ingreso: ''
      },
      creatingGroup: false,
      createGroupError: null,
      createGroupSuccess: null,
      myGroups: [],
      myGroupsLoading: false,

      // Estados de carga
      loading: true,
      error: null
    }
  },
  computed: {
    isLoggedIn() {
      const user = localStorage.getItem('user')
      return user !== null && user !== 'undefined'
    },
    
    userFullName() {
      if (!this.userData.nombres && !this.userData.apellidos) {
        return 'Usuario'
      }
      return `${this.userData.nombres || ''} ${this.userData.apellidos || ''}`.trim()
    }
  },
  async mounted() {
    await this.loadUserData()
    await this.loadUserPosts()
    await this.loadSuggestions()
    await this.loadTrends()
    await this.loadRecentActivity()
    await this.loadMyGroups()
  },
  methods: {
    // ========== CARGAR DATOS DEL USUARIO ==========
    async loadUserData() {
      try {
        this.loading = true
        
        // Obtener email del usuario logueado desde localStorage
        const storedUser = JSON.parse(localStorage.getItem('user'))
        
        if (!storedUser || !storedUser.email) {
          console.error('No hay usuario logueado')
          this.$router.push('/login')
          return
        }
        
        this.userEmail = storedUser.email
        
        // Obtener datos del usuario desde la API
        console.log('Cargando datos del usuario:', this.userEmail)
        
        // Llamar al endpoint que obtiene los datos del miembro
        const response = await api.getMemberByEmail(this.userEmail)
        
        if (response.success) {
          this.userData = response.data
          
          // Cargar estadísticas del usuario
          await this.loadUserStats()
          
          // Cargar información adicional según el tipo de usuario
          this.loadAdditionalInfo()
          
          console.log('Datos del usuario cargados:', this.userData)
        } else {
          console.error('Error al cargar datos del usuario:', response.error)
          this.error = response.error
        }
      } catch (error) {
        console.error('Error en loadUserData:', error)
        this.error = 'Error al cargar datos del usuario'
      } finally {
        this.loading = false
      }
    },
    
    async loadUserStats() {
      try {
        // Obtener estadísticas desde userData si están disponibles
        this.userStats = {
          total_seguidores: this.userData.estadisticas?.seguidores || 0,
          siguiendo: this.userData.estadisticas?.siguiendo || 0,
          total_publicaciones: this.userData.estadisticas?.publicaciones || 0
        }
      } catch (error) {
        console.error('Error al cargar estadísticas:', error)
      }
    },
    
    loadAdditionalInfo() {
      // Procesar información adicional según el tipo de usuario
      if (this.userData.tipo_usuario === 'estudiante' && this.userData.estudiante) {
        this.additionalInfo = {
          estudiante: this.userData.estudiante
        }
      } else if (this.userData.tipo_usuario === 'egresado' && this.userData.egresado) {
        this.additionalInfo = {
          egresado: this.userData.egresado
        }
      } else if (this.userData.tipo_usuario === 'profesor' && this.userData.profesor) {
        this.additionalInfo = {
          profesor: this.userData.profesor
        }
      } else if (this.userData.tipo_usuario === 'dependencia' && this.userData.entidad_info) {
        this.additionalInfo = {
          dependencia: this.userData.entidad_info
        }
      } else if (this.userData.tipo_usuario === 'organizacion' && this.userData.entidad_info) {
        this.additionalInfo = {
          organizacion: this.userData.entidad_info
        }
      }
    },
    
    // ========== GESTIÓN DE PUBLICACIONES ==========
    async loadUserPosts() {
      try {
        this.loadingPosts = true
        // No se cargan publicaciones simuladas en esta etapa. Mantener la lista vacía.
        this.userPosts = []
      } catch (error) {
        console.error('Error al cargar publicaciones:', error)
      } finally {
        this.loadingPosts = false
      }
    },
    
    async createPost() {
      if (!this.newPostContent.trim()) return
      try {
        this.posting = true
        // Crear publicación deshabilitada por ahora; el botón permanece visible pero no realiza acción.
        console.log('Crear publicación deshabilitada en esta etapa')
      } catch (error) {
        console.error('Error al crear publicación:', error)
      } finally {
        this.posting = false
      }
    },
    
    async toggleLike(post) {
      try {
        // Funcionalidad de like deshabilitada por ahora. El botón no realiza cambios.
        console.log('Toggle like deshabilitado para post', post.id)
      } catch (error) {
        console.error('Error al alternar like:', error)
      }
    },
    
    async deletePost(postId) {
      if (!confirm('¿Estás seguro de eliminar esta publicación?')) return
      // Eliminación deshabilitada por ahora; no se harán cambios en la lista.
      console.log('Eliminar publicación deshabilitado para postId', postId)
    },
    
    editPost(post) {
      // Llenar el textarea con el contenido del post para editar localmente (persistir deshabilitado)
      this.newPostContent = post.content
    },
    
    showComments(post) {
      // Mostrar comentarios deshabilitado por ahora.
      console.log('Mostrar comentarios deshabilitado para post', post.id)
    },
    
    sharePost(post) {
      const shareUrl = `${window.location.origin}/post/${post.id}`
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert('Enlace copiado al portapapeles'))
        .catch(err => console.error('Error al copiar:', err))
    },
    
    // ========== SUGERENCIAS Y TENDENCIAS ==========
    async loadSuggestions() {
      try {
        this.loadingSuggestions = true
        // No se cargan sugerencias simuladas; mantener la lista vacía por ahora.
        this.suggestions = []
      } catch (error) {
        console.error('Error al cargar sugerencias:', error)
      } finally {
        this.loadingSuggestions = false
      }
    },
    
    async loadTrends() {
      try {
        this.loadingTrends = true
        // No se cargan tendencias simuladas; mantener vacío por ahora.
        this.trends = []
      } catch (error) {
        console.error('Error al cargar tendencias:', error)
      } finally {
        this.loadingTrends = false
      }
    },

    // ========== GRUPOS ==========
    async loadMyGroups() {
      try {
        this.myGroupsLoading = true
        const resp = await api.getMyGroups()
        if (resp.success) {
          this.myGroups = resp.data || []
        } else {
          console.error('Error cargando mis grupos:', resp.error)
        }
      } catch (error) {
        console.error('Error en loadMyGroups:', error)
      } finally {
        this.myGroupsLoading = false
      }
    },

    async createGroup() {
      if (!this.newGroup.nombre.trim()) {
        this.createGroupError = 'El nombre del grupo es obligatorio'
        return
      }
      try {
        this.creatingGroup = true
        this.createGroupError = null
        this.createGroupSuccess = null

        const resp = await api.createGroup(this.newGroup)
        if (resp.success) {
          this.createGroupSuccess = 'Grupo creado correctamente'
          this.newGroup = { nombre: '', descripcion: '', categoria: 'academico', privacidad: 'publico', requisitos_ingreso: '' }
          this.showCreateGroupForm = false
          await this.loadMyGroups()
        } else {
          this.createGroupError = resp.error || 'Error creando grupo'
        }
      } catch (error) {
        console.error('Error en createGroup:', error)
        this.createGroupError = error.message || 'Error creando grupo'
      } finally {
        this.creatingGroup = false
      }
    },

    async joinGroupByName(name) {
      try {
        const resp = await api.joinGroup(name)
        if (resp.success) {
          alert('Solicitud procesada')
          await this.loadMyGroups()
        } else {
          alert('Error: ' + (resp.error || 'No se pudo procesar'))
        }
      } catch (error) {
        console.error('Error en joinGroupByName:', error)
        alert('Error al unirse al grupo')
      }
    },
    
    async loadRecentActivity() {
      try {
        // No se cargan actividades simuladas; mantener vacío por ahora.
        this.recentActivity = []
      } catch (error) {
        console.error('Error al cargar actividad:', error)
      }
    },
    
    // ========== FUNCIONES AUXILIARES ==========
    formatUserType(type) {
      const types = {
        'estudiante': 'Estudiante',
        'egresado': 'Egresado',
        'profesor': 'Profesor',
        'dependencia': 'Dependencia',
        'organizacion': 'Organización',
        'persona': 'Persona'
      }
      return types[type] || type
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Fecha desconocida'
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },
    
    formatPostTime(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 60) {
        return `Hace ${diffMins} min${diffMins !== 1 ? 's' : ''}`
      } else if (diffHours < 24) {
        return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
      } else if (diffDays < 7) {
        return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
      } else {
        return this.formatDate(dateString)
      }
    },
    
    formatTime(date) {
      if (!date) return ''
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    getActivityIcon(type) {
      const icons = {
        'like': 'fas fa-heart',
        'comment': 'fas fa-comment',
        'follow': 'fas fa-user-plus',
        'post': 'fas fa-pencil-alt'
      }
      return icons[type] || 'fas fa-bell'
    },
    
    // ========== ACCIONES DEL USUARIO ==========
    async followUser(email) {
      // Seguir usuario deshabilitado por ahora; el botón permanece visible pero no hace cambios.
      console.log('Seguir usuario deshabilitado para', email)
    },

    
    editProfile() {
      this.$router.push('/profile')
    },
    
    viewProfile() {
      this.$router.push('/profile')
    }
  }
}
</script>
