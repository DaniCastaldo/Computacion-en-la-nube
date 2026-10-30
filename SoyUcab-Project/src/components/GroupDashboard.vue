<template>
  <div class="group-dashboard panel">
    <headerBar />
    <div v-if="loading">Cargando grupo...</div>
    <div v-else>
      <h2>{{ group.nombre }}</h2>
      <div class="group-header">
        <div>Creador: <strong>{{ group.creador_nombre }} ({{ group.creador_email }})</strong></div>
        <div>Creado: {{ formatDate(group.fecha_creacion) }}</div>
        <div>Miembros: {{ group.cantidad_miembros }}</div>
        <div>Estado: <span class="badge">{{ group.estado_grupo }}</span></div>
      </div>

      <div class="group-info">
        <!-- Editable only for admins -->
        <div v-if="!isEditing">
          <p>{{ group.descripcion }}</p>
          <p v-if="group.requisitos_ingreso"><strong>Requisitos:</strong> {{ group.requisitos_ingreso }}</p>
          <div v-if="isAdmin" style="margin-top:8px;">
            <button @click="startEdit">Editar información</button>
          </div>
        </div>

        <div v-else class="edit-form">
          <label>Descripción</label>
          <textarea rows="4" v-model="editForm.descripcion"></textarea>

          <label>Requisitos de ingreso</label>
          <textarea rows="3" v-model="editForm.requisitos_ingreso"></textarea>

          <label>Estado</label>
          <select v-model="editForm.estado">
            <option value="activo">activo</option>
            <option value="inactivo">inactivo</option>
            <option value="archivado">archivado</option>
          </select>

          <div class="actions" style="margin-top:8px;">
            <button @click="saveEdit" :disabled="saving">Guardar</button>
            <button @click="cancelEdit">Cancelar</button>
          </div>
          <div v-if="editError" class="error">{{ editError }}</div>
        </div>
      </div>

      <div class="group-admins" v-if="group.admins?.length">
        <h3>Administradores</h3>
        <ul>
          <li v-for="a in group.admins" :key="a.email_miembro">{{ a.nombre_usuario || a.email_miembro }} — {{ a.rol_grupo }}</li>
        </ul>
      </div>

      <div class="group-posts">
        <h3>Publicaciones</h3>
        <div v-if="postsLoading">Cargando publicaciones...</div>
        <div v-else-if="posts.length === 0">No hay publicaciones en este grupo.</div>
        <ul v-else>
          <li v-for="p in posts" :key="p.fecha_publicacion + '-' + p.email_publicador" class="post-item">
            <div class="post-header">
              <strong>{{ p.publicador_nombre }}</strong>
              <span class="post-date">{{ formatDateTime(p.fecha_publicacion) }}</span>
            </div>
            <div class="post-body">
              <div v-if="p.caption"><em>{{ p.caption }}</em></div>
              <div v-if="p.descripcion_publicacion">{{ p.descripcion_publicacion }}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
import headerBar from './header.vue';
import api from '@/services/usuarioSevices';

export default {
  name: 'GroupDashboard',
  components: { headerBar },
  data() {
    return {
      group: {},
      posts: [],
      loading: true,
      postsLoading: false,
      error: null,

      // edit state
      isEditing: false,
      editForm: {},
      saving: false,
      editError: null
    };
  },
  async mounted() {
    await this.load();
  },
  computed: {
    currentUser() {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}');
      } catch { return {}; }
    },
    isAdmin() {
      const email = this.currentUser.email;
      if (!email || !this.group.admins) return false;
      return this.group.admins.some(a => a.email_miembro === email && a.rol_grupo === 'administrador');
    }
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = null;
      const name = this.$route.params.name;
      try {
        const g = await api.getGroupDetails(name);
        if (g.success) {
          this.group = g.data;
        } else {
          this.error = g.error || 'No se pudo cargar el grupo';
        }
      } catch (err) {
        this.error = 'Error cargando grupo';
        console.error(err);
      } finally {
        this.loading = false;
      }

      this.loadPosts();
    },

    startEdit() {
      this.isEditing = true;
      this.editError = null;
      this.editForm = {
        descripcion: this.group.descripcion || '',
        requisitos_ingreso: this.group.requisitos_ingreso || '',
        estado: this.group.estado_grupo || 'activo'
      };
    },

    cancelEdit() {
      this.isEditing = false;
      this.editForm = {};
      this.editError = null;
    },

    async saveEdit() {
      this.saving = true;
      this.editError = null;
      try {
        const resp = await api.updateGroup(this.group.nombre, this.editForm);
        if (resp.success) {
          this.isEditing = false;
          await this.load();
        } else {
          this.editError = resp.error || 'Error actualizando grupo';
        }
      } catch (err) {
        console.error(err);
        this.editError = 'Error actualizando grupo';
      } finally {
        this.saving = false;
      }
    },

    async loadPosts() {
      this.postsLoading = true;
      const name = this.$route.params.name;
      try {
        const r = await api.getGroupPosts(name);
        if (r.success) {
          this.posts = r.data || [];
        } else {
          this.error = r.error || 'Error cargando publicaciones';
        }
      } catch (err) {
        console.error(err);
        this.error = 'Error cargando publicaciones';
      } finally {
        this.postsLoading = false;
      }
    },

    formatDate(d) {
      if (!d) return 'N/A';
      return new Date(d).toLocaleDateString();
    },
    formatDateTime(d) {
      if (!d) return 'N/A';
      return new Date(d).toLocaleString();
    }
  }
};
</script>

<style scoped>
/* Fullscreen panel */
.group-dashboard {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: auto;
  background: #fafafa;
  padding: 2rem 3rem;
  box-sizing: border-box;
}
.group-header { display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1rem; align-items:center; }
.group-info { margin-bottom:1rem; background:#fff; padding:1rem; border-radius:8px; box-shadow:0 1px 6px rgba(0,0,0,0.04); }
.post-item { padding:0.6rem; border:1px solid #eee; margin-bottom:0.6rem; border-radius:6px; background:#fff }
.post-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; }
.post-date { color:#666; font-size:0.9rem }
.badge { background:#f0f0f0; padding:0.2rem 0.5rem; border-radius:4px; }
.edit-form textarea { width:100%; padding:0.5rem; border-radius:6px; border:1px solid #ddd; }
.edit-form select { padding:0.5rem; border-radius:6px; border:1px solid #ddd; }
.edit-form .actions { display:flex; gap:0.5rem; margin-top:0.5rem }
.error { color:#c62828; margin-top:0.5rem }
</style>