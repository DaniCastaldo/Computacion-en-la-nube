<template>
  <div class="profile-page">
    <headerBar />
    <div class="profile-container panel">
      <h2>Mi perfil</h2>

      <div v-if="loading">Cargando...</div>

      <form v-else @submit.prevent="save">
        <div class="field">
          <label>Email (no editable)</label>
          <input type="email" :value="user.email" disabled />
        </div>

        <!-- Persona -->
        <template v-if="user.tipo_usuario === 'persona'">
          <div class="field">
            <label>Cédula (no editable)</label>
            <input type="text" :value="user.persona_info?.ci || 'N/A'" disabled />
          </div>

          <div class="field">
            <label>Nombre de usuario</label>
            <input v-model="form.nombre_usuario" />
          </div>

          <div class="field">
            <label>Teléfono</label>
            <input v-model="form.telefono" />
          </div>

          <div class="field">
            <label>Biografía</label>
            <textarea rows="4" v-model="form.biografia"></textarea>
          </div>

          <div class="field">
            <label>Nombres</label>
            <input v-model="form.nombres" />
          </div>

          <div class="field">
            <label>Apellidos</label>
            <input v-model="form.apellidos" />
          </div>

          <!-- Roles y info academica/profesional -->
          <div class="field" v-if="user.roles?.length">
            <label>Roles</label>
            <ul>
              <li v-for="(r, idx) in user.roles" :key="idx">{{ r.tipo_rol }} ({{ r.estatus }})</li>
            </ul>
          </div>

          <div v-if="user.academicInfo?.estudiante" class="field">
            <label>Estudiante — Facultad / Carrera / Semestre</label>
            <div>{{ user.academicInfo.estudiante.facultad }} / {{ user.academicInfo.estudiante.carrera_programa }} / Semestre {{ user.academicInfo.estudiante.semestre }}</div>
            <div>Promedio: {{ user.academicInfo.estudiante.promedio }}</div>
            <div v-if="user.academicInfo.estudiante.materias?.length">Materias: {{ user.academicInfo.estudiante.materias.join(', ') }}</div>
          </div>

          <div v-if="user.academicInfo?.egresado" class="field">
            <label>Egresado — Facultad / Fecha grado</label>
            <div>{{ user.academicInfo.egresado.facultad }} — {{ user.academicInfo.egresado.fecha_acto_grado }}</div>
            <div>Pais: {{ user.academicInfo.egresado.pais }} — Estado: {{ user.academicInfo.egresado.estado }}</div>
            <div v-if="user.academicInfo.egresado.titulos?.length">Títulos: {{ user.academicInfo.egresado.titulos.join(', ') }}</div>
            <div v-if="user.academicInfo.egresado.empresas?.length">Empresas: {{ user.academicInfo.egresado.empresas.join(', ') }}</div>
          </div>

          <hr />

          <!-- Seguridad: cambiar contraseña -->
          <div class="field">
            <label>Contraseña</label>
            <div class="pw-inline">
              <input type="password" :value="maskedPassword" disabled />
              <button type="button" @click="toggleChangePassword">Cambiar contraseña</button>
            </div>
          </div>

          <div v-if="showChangePassword" class="field pw-change">
            <label>Contraseña actual</label>
            <input type="password" v-model="passwordFields.currentPassword" />
            <label>Nueva contraseña</label>
            <input type="password" v-model="passwordFields.newPassword" />
            <label>Confirmar nueva contraseña</label>
            <input type="password" v-model="passwordFields.confirmPassword" />
            <div class="actions" style="margin-top:0.5rem;">
              <button type="button" @click="changePassword" :disabled="changingPassword">Guardar contraseña</button>
              <button type="button" @click="cancelChangePassword">Cancelar</button>
            </div>
            <div v-if="pwError" class="error">{{ pwError }}</div>
            <div v-if="pwSuccess" class="success">{{ pwSuccess }}</div>
          </div>
        </template>

        <!-- Dependencia -->
        <template v-if="user.tipo_usuario === 'dependencia'">
          <div class="field">
            <label>Nombre institucional</label>
            <input v-model="form.nombre_institucional" />
          </div>

          <div class="field">
            <label>Responsable</label>
            <input v-model="form.responsable" />
          </div>

          <div class="field">
            <label>Descripción</label>
            <textarea rows="5" v-model="form.descripcion"></textarea>
          </div>

          <div class="field">
            <label>Ubicación física</label>
            <input v-model="form.ubicacion_fisica" />
          </div>

          <div class="field">
            <label>Edificio</label>
            <input v-model="form.edificio" />
          </div>

          <div class="field">
            <label>Página web</label>
            <input v-model="form.pagina_web" />
          </div>
        </template>

        <!-- Organización -->
        <template v-if="user.tipo_usuario === 'organizacion'">
          <div class="field">
            <label>RIF (no editable)</label>
            <input type="text" :value="user.entidad_info?.rif || 'N/A'" disabled />
          </div>

          <div class="field">
            <label>Nombre</label>
            <input v-model="form.nombre" />
          </div>

          <div class="field">
            <label>Descripción</label>
            <textarea rows="4" v-model="form.descripcion"></textarea>
          </div>

          <div class="field">
            <label>Página web</label>
            <input v-model="form.pagina_web" />
          </div>

          <div class="field">
            <label>Tipos de colaboración (coma-separated)</label>
            <input v-model="form.tipos_colaboracion_raw" placeholder="ej: patrocinio,formación" />
          </div>
        </template>

        <div class="actions" style="margin-top:1rem;">
          <button type="submit" :disabled="saving">Guardar</button>
          <button type="button" @click="cancel">Cancelar</button>
        </div>

        <div v-if="success" class="success">{{ success }}</div>
        <div v-if="error" class="error">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script>
import headerBar from './header.vue';
import api from '@/services/usuarioSevices';

export default {
  name: 'Profile',
  components: { headerBar },
  data() {
    return {
      user: {},
      form: {},
      loading: true,
      saving: false,
      success: null,
      error: null,

      // password change
      showChangePassword: false,
      changingPassword: false,
      passwordFields: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      pwError: null,
      pwSuccess: null
    };
  },
  computed: {
    maskedPassword() {
      return '********';
    }
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const resp = await api.getCurrentUser();
        if (resp.success) {
          this.user = resp.data;

          // Inicializar el formulario según el tipo
          this.form = {
            nombre_usuario: this.user.nombre_usuario || '',
            telefono: this.user.telefono || '',
            biografia: this.user.biografia || '',
            nombres: this.user.persona_info?.nombres || '',
            apellidos: this.user.persona_info?.apellidos || '',

            // dependencia
            nombre_institucional: this.user.entidad_info?.nombre_institucional || '',
            descripcion: this.user.entidad_info?.descripcion || '',
            responsable: this.user.entidad_info?.responsable || '',
            ubicacion_fisica: this.user.entidad_info?.ubicacion_fisica || '',
            edificio: this.user.entidad_info?.edificio || '',
            pagina_web: this.user.entidad_info?.pagina_web || '',

            // organizacion
            nombre: this.user.entidad_info?.nombre || '',
            tipos_colaboracion_raw: this.user.entidad_info?.tipos_colaboracion ? (Array.isArray(this.user.entidad_info.tipos_colaboracion) ? this.user.entidad_info.tipos_colaboracion.join(',') : this.user.entidad_info.tipos_colaboracion) : ''
          };
        } else {
          this.error = resp.error || 'No se pudo cargar usuario';
        }
      } catch (err) {
        this.error = 'Error cargando perfil';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    async save() {
      this.saving = true;
      this.success = null;
      this.error = null;

      try {
        const email = this.user.email;

        if (this.user.tipo_usuario === 'persona') {
          const updates = {
            nombre_usuario: this.form.nombre_usuario,
            telefono: this.form.telefono,
            biografia: this.form.biografia,
            nombres: this.form.nombres,
            apellidos: this.form.apellidos
          };

          const resp = await api.updateMember(email, updates);
          if (resp.success) {
            this.success = resp.message || 'Perfil actualizado';
            localStorage.setItem('user', JSON.stringify({ ...JSON.parse(localStorage.getItem('user')||'{}'), ...resp.data }));
            await this.load();
          } else {
            this.error = resp.error || 'Error actualizando perfil';
          }

        } else if (this.user.tipo_usuario === 'dependencia') {
          const updates = {
            nombre_institucional: this.form.nombre_institucional,
            descripcion: this.form.descripcion,
            responsable: this.form.responsable,
            ubicacion_fisica: this.form.ubicacion_fisica,
            edificio: this.form.edificio,
            pagina_web: this.form.pagina_web
          };

          const resp = await api.updateDependencia(email, updates);
          if (resp.success) {
            this.success = resp.message || 'Dependencia actualizada';
            await this.load();
          } else {
            this.error = resp.error || 'Error actualizando dependencia';
          }

        } else if (this.user.tipo_usuario === 'organizacion') {
          const tipos = this.form.tipos_colaboracion_raw ? this.form.tipos_colaboracion_raw.split(',').map(s => s.trim()).filter(Boolean) : null;
          const updates = {
            nombre: this.form.nombre,
            descripcion: this.form.descripcion,
            pagina_web: this.form.pagina_web,
            tipos_colaboracion: tipos
          };

          const resp = await api.updateOrganizacion(email, updates);
          if (resp.success) {
            this.success = resp.message || 'Organización actualizada';
            await this.load();
          } else {
            this.error = resp.error || 'Error actualizando organización';
          }
        }
      } catch (err) {
        this.error = 'Error actualizando perfil';
        console.error(err);
      } finally {
        this.saving = false;
      }
    },

    cancel() {
      this.$router.push('/home');
    },

    toggleChangePassword() {
      this.showChangePassword = !this.showChangePassword;
      this.pwError = null;
      this.pwSuccess = null;
      this.passwordFields = { currentPassword: '', newPassword: '', confirmPassword: '' };
    },

    cancelChangePassword() {
      this.toggleChangePassword();
    },

    async changePassword() {
      this.pwError = null;
      this.pwSuccess = null;

      const { currentPassword, newPassword, confirmPassword } = this.passwordFields;
      if (!currentPassword || !newPassword || !confirmPassword) {
        this.pwError = 'Complete todos los campos';
        return;
      }
      if (newPassword !== confirmPassword) {
        this.pwError = 'Las contraseñas no coinciden';
        return;
      }

      this.changingPassword = true;
      try {
        const resp = await api.updateMember(this.user.email, { currentPassword, contraseña: newPassword });
        if (resp.success) {
          this.pwSuccess = 'Contraseña actualizada correctamente';
          this.toggleChangePassword();
        } else {
          this.pwError = resp.error || 'Error al cambiar contraseña';
        }
      } catch (err) {
        this.pwError = 'Error al cambiar contraseña';
        console.error(err);
      } finally {
        this.changingPassword = false;
      }
    }
  }
};
</script>

<style scoped>
.profile-container {
  max-width: 900px;
  margin: 1.5rem auto;
}
.field {
  margin-bottom: 1rem;
}
.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.35rem;
}
.field input, .field textarea {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 0.4rem;
  box-sizing: border-box;
}
.pw-inline { display:flex; gap:0.5rem; align-items:center; }
.pw-change input { margin-bottom:0.5rem; }
.actions { display:flex; gap:0.5rem; }
.actions button { padding:0.5rem 0.9rem; border-radius:0.4rem; border:none; cursor:pointer; }
.actions button:first-child { background: #4CAF50; color:white; }
.success { margin-top:0.75rem; color:#2e7d32; }
.error { margin-top:0.75rem; color:#c62828; }
</style>