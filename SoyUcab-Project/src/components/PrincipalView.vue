<template>
  <div class="registration-container">
    <!-- Fondo y logo -->
    <div class="background-overlay"></div>
    <div class="logo-section">
      <h1 class="app-title">SoyUCAB</h1>
      <p class="app-subtitle">Comunidad universitaria conectada</p>
    </div>

    <!-- Contenedor principal del formulario -->
    <div class="form-container" :class="{ 'active': isLoginActive }">
      
      <!-- Vista de registro inicial -->
      <div class="registration-view" v-if="!isLoginActive && currentStep === 1">
        <h2>Crea una cuenta</h2>
        <p class="subtitle">Ingrese tu correo electrónico para registrarte en esta app</p>
        
        <div class="form-group">
          <input 
            type="email" 
            v-model="email" 
            placeholder="correoelectrónico@dominio.com" 
            class="email-input"
            @keyup.enter="handleEmailSubmit"
          />
          <div class="input-underline"></div>
        </div>

        <button class="primary-btn" @click="handleEmailSubmit">
          Registrarse con correo electrónico
        </button>

        <div class="divider">
          <span>o</span>
        </div>

        <button class="secondary-btn" @click="switchToLogin">
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </div>

      <!-- Vista de login -->
      <div class="login-view" v-if="isLoginActive">
        <h2>Iniciar Sesión</h2>
        <div class="form-group">
          <input 
            type="email" 
            v-model="loginEmail" 
            placeholder="correoelectrónico@dominio.com" 
            class="email-input"
          />
          <div class="input-underline"></div>
        </div>
        
        <div class="form-group">
          <input 
            :type="showPassword ? 'text' : 'password'" 
            v-model="loginPassword" 
            placeholder="Contraseña" 
            class="password-input"
          />
          <div class="input-underline"></div>
          <span class="toggle-password" @click="showPassword = !showPassword">
            {{ showPassword ? '👁️' : '👁️‍🗨️' }}
          </span>
        </div>

        <button class="primary-btn" @click="handleLogin">
          Iniciar Sesión
        </button>

        <button class="secondary-btn" @click="switchToRegister">
          ¿No tienes cuenta? Regístrate
        </button>
      </div>

      <!-- Paso 2: Información básica de usuario -->
      <div class="step-view" v-if="currentStep === 2">
        <h2>Información Básica</h2>
        <p class="step-indicator">Paso 2 de {{ totalSteps }}</p>
        
        <div class="form-group">
          <label>Teléfono *</label>
          <input 
            type="tel" 
            v-model="userData.telefono" 
            placeholder="Ej: 04121234567" 
            maxlength="15"
          />
          <small class="hint">Máximo 15 dígitos</small>
        </div>

        <div class="form-group">
          <label>Nombre de usuario *</label>
          <input 
            type="text" 
            v-model="userData.nombre_usuario" 
            placeholder="usuario_123" 
            maxlength="20"
          />
          <small class="hint">Letras, números, _ , .</small>
        </div>

        <div class="form-group">
          <label>Contraseña *</label>
          <div class="password-wrapper">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              v-model="userData.contrasena" 
              placeholder="Mínimo 8 caracteres" 
              maxlength="20"
              @input="validatePassword"
            />
            <span class="toggle-password" @click="showPassword = !showPassword">
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </span>
          </div>
          <div class="password-rules" :class="{ 'valid': passwordStrength.valid }">
            <span v-if="!passwordStrength.valid">Debe tener: Mayúscula, minúscula, número, símbolo ($-_.%&!)</span>
            <span v-else class="valid-text">✓ Contraseña válida</span>
          </div>
        </div>

        <div class="form-group">
          <label>Biografía</label>
          <textarea 
            v-model="userData.biografia" 
            placeholder="Cuéntanos sobre ti..." 
            maxlength="1000"
            rows="3"
          ></textarea>
          <small class="char-count">{{ userData.biografia?.length || 0 }}/1000</small>
        </div>

        <div class="button-group">
          <button class="secondary-btn" @click="currentStep = 1">Atrás</button>
          <button class="primary-btn" @click="handleBasicInfoSubmit">Continuar</button>
        </div>
      </div>

      <!-- Paso 3: Selección de tipo de usuario -->
      <div class="step-view" v-if="currentStep === 3">
        <h2>Tipo de Usuario</h2>
        <p class="step-indicator">Paso 3 de {{ totalSteps }}</p>
        <p class="subtitle">Selecciona el tipo de cuenta que mejor se adapte a ti</p>
        
        <div class="user-type-grid">
          <div class="user-type-card" :class="{ 'selected': userType === 'persona' }"@click="selectUserType('persona')">
            <div class="icon">👤</div>
            <h3>Persona</h3>
            <p>Estudiante, egresado, profesor, personal</p>
          </div>

          <div 
            class="user-type-card" 
            :class="{ 'selected': userType === 'dependencia' }"
            @click="selectUserType('dependencia')"
          >
            <div class="icon">🏛️</div>
            <h3>Dependencia</h3>
            <p>Departamento, oficina, unidad</p>
          </div>

          <div 
            class="user-type-card" 
            :class="{ 'selected': userType === 'organizacion' }"
            @click="selectUserType('organizacion')"
          >
            <div class="icon">🤝</div>
            <h3>Organización</h3>
            <p>Asociación, grupo, club</p>
          </div>
        </div>

        <div class="button-group">
          <button class="secondary-btn" @click="currentStep = 2">Atrás</button>
          <button class="primary-btn" @click="handleUserTypeSubmit" :disabled="!userType">
            Continuar
          </button>
        </div>
      </div>

      <!-- Paso 4: Información específica de PERSONA -->
      <div class="step-view" v-if="currentStep === 4 && userType === 'persona'">
        <h2>Información Personal</h2>
        <p class="step-indicator">Paso 4 de {{ totalSteps }}</p>
        
        <div class="form-row">
          <div class="form-group">
            <label>Cédula de Identidad *</label>
            <input 
              type="text" 
              v-model="personaData.ci" 
              placeholder="Ej: V12345678" 
              maxlength="10"
            />
          </div>

          <div class="form-group">
            <label>Sexo *</label>
            <select v-model="personaData.sexo">
              <option value="" disabled>Seleccionar...</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Nombres *</label>
            <input 
              type="text" 
              v-model="personaData.nombres" 
              placeholder="Ej: Juan Carlos" 
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label>Apellidos *</label>
            <input 
              type="text" 
              v-model="personaData.apellidos" 
              placeholder="Ej: Pérez González" 
              maxlength="100"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Fecha de Nacimiento *</label>
            <input 
              type="date" 
              v-model="personaData.fecha_nacimiento" 
              @change="calculateAge"
            />
          </div>

          <div class="form-group">
            <label>Edad</label>
            <input 
              type="number" 
              v-model="personaData.edad" 
              disabled 
              class="disabled-input"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Empresa Actual</label>
          <input 
            type="text" 
            v-model="personaData.empresa_actual" 
            placeholder="Empresa donde trabajas" 
            maxlength="100"
          />
        </div>

        <div class="form-group">
          <label>Idiomas</label>
          <div class="multivalue-input">
            <input 
              type="text" 
              v-model="currentIdioma" 
              placeholder="Ej: Español" 
              @keyup.enter="addIdioma"
            />
            <button type="button" class="add-btn" @click="addIdioma">+</button>
          </div>
          <div class="tag-container">
            <span v-for="(idioma, index) in personaData.idiomas" :key="index" class="tag">
              {{ idioma }}
              <span class="remove-tag" @click="removeIdioma(index)">×</span>
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>Habilidades</label>
          <div class="multivalue-input">
            <input 
              type="text" 
              v-model="currentHabilidad" 
              placeholder="Ej: Python" 
              @keyup.enter="addHabilidad"
            />
            <button type="button" class="add-btn" @click="addHabilidad">+</button>
          </div>
          <div class="tag-container">
            <span v-for="(habilidad, index) in personaData.habilidades" :key="index" class="tag">
              {{ habilidad }}
              <span class="remove-tag" @click="removeHabilidad(index)">×</span>
            </span>
          </div>
        </div>

        <!-- Sub-tipo de persona -->
        <div class="form-group">
          <label>Tipo de Persona *</label>
          <div class="person-type-buttons">
            <button 
              class="type-btn" 
              :class="{ 'active': personaTipo === 'estudiante' }"
              @click="personaTipo = 'estudiante'"
            >
              👨‍🎓 Estudiante
            </button>
            <button 
              class="type-btn" 
              :class="{ 'active': personaTipo === 'egresado' }"
              @click="personaTipo = 'egresado'"
            >
              🎓 Egresado
            </button>
            <button 
              class="type-btn" 
              :class="{ 'active': personaTipo === 'profesor' }"
              @click="personaTipo = 'profesor'"
            >
              👨‍🏫 Profesor
            </button>
            <button 
              class="type-btn" 
              :class="{ 'active': personaTipo === 'administrativo' }"
              @click="personaTipo = 'administrativo'"
            >
              💼 Administrativo
            </button>
            <button 
              class="type-btn" 
              :class="{ 'active': personaTipo === 'obrero' }"
              @click="personaTipo = 'obrero'"
            >
              🔧 Obrero
            </button>
          </div>
        </div>

        <div class="button-group">
          <button class="secondary-btn" @click="currentStep = 3">Atrás</button>
          <button class="primary-btn" @click="handlePersonaInfoSubmit">Continuar</button>
        </div>
      </div>

      <!-- Paso 5: Información específica según sub-tipo de PERSONA -->
      <div class="step-view" v-if="currentStep === 5 && userType === 'persona'">
        <h2>Información {{ getPersonaTipoTitle() }}</h2>
        <p class="step-indicator">Paso 5 de {{ totalSteps }}</p>

        <!-- ESTUDIANTE -->
        <div v-if="personaTipo === 'estudiante'">
          <div class="form-group">
            <label>Carrera/Programa *</label>
            <select v-model="estudianteData.carrera">
              <option value="" disabled>Seleccionar carrera...</option>
              <option value="Ingeniería en Computación">Ingeniería en Computación</option>
              <option value="Ingeniería Civil">Ingeniería Civil</option>
              <option value="Administración de Empresas">Administración de Empresas</option>
              <option value="Derecho">Derecho</option>
              <option value="Psicología">Psicología</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Facultad *</label>
              <select v-model="estudianteData.facultad">
                <option value="" disabled>Seleccionar facultad...</option>
                <option value="Ingeniería">Ingeniería</option>
                <option value="Ciencias Económicas y Sociales">Ciencias Económicas y Sociales</option>
                <option value="Derecho">Derecho</option>
                <option value="Humanidades y Educación">Humanidades y Educación</option>
              </select>
            </div>

            <div class="form-group">
              <label>Semestre *</label>
              <select v-model="estudianteData.semestre">
                <option value="" disabled>Seleccionar semestre...</option>
                <option v-for="n in 10" :value="n" :key="n">Semestre {{ n }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Promedio</label>
            <input 
              type="number" 
              v-model="estudianteData.promedio" 
              placeholder="Ej: 18.50" 
              step="0.01" 
              min="0" 
              max="20"
            />
            <small class="hint">Opcional, escala 0-20</small>
          </div>
        </div>

        <!-- EGRESADO -->
        <div v-if="personaTipo === 'egresado'">
          <div class="form-group">
            <label>Facultad *</label>
            <select v-model="egresadoData.facultad">
              <option value="" disabled>Seleccionar facultad...</option>
              <option value="Ingeniería">Ingeniería</option>
              <option value="Ciencias Económicas y Sociales">Ciencias Económicas y Sociales</option>
              <option value="Derecho">Derecho</option>
              <option value="Humanidades y Educación">Humanidades y Educación</option>
            </select>
          </div>

          <div class="form-group">
            <label>Título(s) Obtenido(s) *</label>
            <div class="multivalue-input">
              <input 
                type="text" 
                v-model="currentTitulo" 
                placeholder="Ej: Ingeniero en Computación" 
                @keyup.enter="addTitulo"
              />
              <button type="button" class="add-btn" @click="addTitulo">+</button>
            </div>
            <div class="tag-container">
              <span v-for="(titulo, index) in egresadoData.titulos" :key="index" class="tag">
                {{ titulo }}
                <span class="remove-tag" @click="removeTitulo(index)">×</span>
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Graduación *</label>
              <input 
                type="date" 
                v-model="egresadoData.fecha_grado" 
                max="2024-12-31"
              />
            </div>

            <div class="form-group">
              <label>País *</label>
              <select v-model="egresadoData.pais" @change="updateEstados">
                <option value="" disabled>Seleccionar país...</option>
                <option value="VE">Venezuela</option>
                <option value="CO">Colombia</option>
                <option value="ES">España</option>
                <option value="US">Estados Unidos</option>
                <option value="MX">México</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Estado *</label>
            <select v-model="egresadoData.estado" :disabled="!egresadoData.pais">
              <option value="" disabled>Seleccionar estado...</option>
              <option v-for="estado in estadosDisponibles" :value="estado" :key="estado">
                {{ estado }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Menciones</label>
            <div class="multivalue-input">
              <input 
                type="text" 
                v-model="currentMencion" 
                placeholder="Ej: Cum Laude" 
                @keyup.enter="addMencion"
              />
              <button type="button" class="add-btn" @click="addMencion">+</button>
            </div>
            <div class="tag-container">
              <span v-for="(mencion, index) in egresadoData.menciones" :key="index" class="tag">
                {{ mencion }}
                <span class="remove-tag" @click="removeMencion(index)">×</span>
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>Empresa(s) Actual(es)</label>
            <div class="multivalue-input">
              <input 
                type="text" 
                v-model="currentEmpresa" 
                placeholder="Ej: Google" 
                @keyup.enter="addEmpresa"
              />
              <button type="button" class="add-btn" @click="addEmpresa">+</button>
            </div>
            <div class="tag-container">
              <span v-for="(empresa, index) in egresadoData.empresas" :key="index" class="tag">
                {{ empresa }}
                <span class="remove-tag" @click="removeEmpresa(index)">×</span>
              </span>
            </div>
          </div>
        </div>

        <!-- PROFESOR -->
        <div v-if="personaTipo === 'profesor'">
          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Ingreso *</label>
              <input 
                type="date" 
                v-model="profesorData.fecha_ingreso" 
                max="2024-12-31"
              />
            </div>

            <div class="form-group">
              <label>Categoría *</label>
              <select v-model="profesorData.categoria">
                <option value="" disabled>Seleccionar categoría...</option>
                <option value="Ordinario">Ordinario</option>
                <option value="Contratado">Contratado</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Dedicación *</label>
              <select v-model="profesorData.dedicacion">
                <option value="" disabled>Seleccionar dedicación...</option>
                <option value="Tiempo Completo">Tiempo Completo</option>
                <option value="Medio Tiempo">Medio Tiempo</option>
              </select>
            </div>

            <div class="form-group">
              <label>Estado *</label>
              <select v-model="profesorData.estado">
                <option value="" disabled>Seleccionar estado...</option>
                <option value="activo">Activo</option>
                <option value="Jubilado">Jubilado</option>
              </select>
            </div>
          </div>

          <div v-if="profesorData.estado === 'Jubilado'" class="form-group">
            <label>Fecha de Retiro</label>
            <input 
              type="date" 
              v-model="profesorData.fecha_fin" 
              :min="profesorData.fecha_ingreso"
            />
          </div>

          <div class="form-group">
            <label>Facultades</label>
            <div class="multivalue-input">
              <input 
                type="text" 
                v-model="currentFacultad" 
                placeholder="Ej: Ingeniería" 
                @keyup.enter="addFacultad"
              />
              <button type="button" class="add-btn" @click="addFacultad">+</button>
            </div>
            <div class="tag-container">
              <span v-for="(facultad, index) in profesorData.facultades" :key="index" class="tag">
                {{ facultad }}
                <span class="remove-tag" @click="removeFacultad(index)">×</span>
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>Departamentos</label>
            <div class="multivalue-input">
              <input 
                type="text" 
                v-model="currentDepartamento" 
                placeholder="Ej: Departamento de Computación" 
                @keyup.enter="addDepartamento"
              />
              <button type="button" class="add-btn" @click="addDepartamento">+</button>
            </div>
            <div class="tag-container">
              <span v-for="(depto, index) in profesorData.departamentos" :key="index" class="tag">
                {{ depto }}
                <span class="remove-tag" @click="removeDepartamento(index)">×</span>
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>Materias Impartidas</label>
            <div class="multivalue-input">
              <input 
                type="text" 
                v-model="currentMateria" 
                placeholder="Ej: Programación I" 
                @keyup.enter="addMateria"
              />
              <button type="button" class="add-btn" @click="addMateria">+</button>
            </div>
            <div class="tag-container">
              <span v-for="(materia, index) in profesorData.materias" :key="index" class="tag">
                {{ materia }}
                <span class="remove-tag" @click="removeMateria(index)">×</span>
              </span>
            </div>
          </div>
        </div>

        <!-- ADMINISTRATIVO -->
        <div v-if="personaTipo === 'administrativo'">
          <div class="form-group">
            <label>Cargo *</label>
            <input 
              type="text" 
              v-model="administrativoData.cargo" 
              placeholder="Ej: Jefe de Departamento" 
              maxlength="50"
            />
          </div>

          <div class="form-group">
            <label>Ubicación de Trabajo *</label>
            <input 
              type="text" 
              v-model="administrativoData.ubicacion" 
              placeholder="Ej: Edificio A, Piso 3" 
              maxlength="200"
            />
          </div>

          <div class="form-group">
            <label>Dedicación *</label>
            <select v-model="administrativoData.dedicacion">
              <option value="" disabled>Seleccionar dedicación...</option>
              <option value="Tiempo Completo">Tiempo Completo</option>
              <option value="Medio Tiempo">Medio Tiempo</option>
            </select>
          </div>
        </div>

        <!-- OBRERO -->
        <div v-if="personaTipo === 'obrero'">
          <div class="form-group">
            <label>Cargo *</label>
            <input 
              type="text" 
              v-model="obreroData.cargo" 
              placeholder="Ej: Mantenimiento" 
              maxlength="50"
            />
          </div>

          <div class="form-group">
            <label>Dedicación *</label>
            <select v-model="obreroData.dedicacion">
              <option value="" disabled>Seleccionar dedicación...</option>
              <option value="Tiempo Completo">Tiempo Completo</option>
              <option value="Medio Tiempo">Medio Tiempo</option>
            </select>
          </div>

          <div class="form-group">
            <label>Empresa a la que pertenece *</label>
            <input 
              type="text" 
              v-model="obreroData.empresa" 
              placeholder="Ej: UCAB o Empresa Contratista" 
              maxlength="50"
            />
          </div>
        </div>

        <div class="button-group">
          <button class="secondary-btn" @click="currentStep = 4">Atrás</button>
          <button class="primary-btn" @click="handleSpecificInfoSubmit">
            {{ isLastStep ? 'Crear Cuenta' : 'Continuar' }}
          </button>
        </div>
      </div>

      <!-- Paso 4-5: DEPENDENCIA -->
      <div class="step-view" v-if="currentStep === 4 && userType === 'dependencia'">
        <h2>Información de Dependencia</h2>
        <p class="step-indicator">Paso 4 de {{ totalSteps }}</p>
        
        <div class="form-group">
          <label>Nombre Institucional *</label>
          <input 
            type="text" 
            v-model="dependenciaData.nombre_institucional" 
            placeholder="Ej: Departamento de Computación" 
            maxlength="100"
          />
        </div>

        <div class="form-group">
          <label>Descripción *</label>
          <textarea 
            v-model="dependenciaData.descripcion" 
            placeholder="Describe las funciones de la dependencia..." 
            rows="4"
            @input="validateDescripcion"
          ></textarea>
          <small class="char-count">{{ dependenciaData.descripcion?.length || 0 }}/500</small>
          <small v-if="descripcionError" class="error-text">{{ descripcionError }}</small>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Logo (URL)</label>
            <input 
              type="url" 
              v-model="dependenciaData.logo" 
              placeholder="https://ejemplo.com/logo.png" 
              maxlength="255"
            />
          </div>

          <div class="form-group">
            <label>Página Web</label>
            <input 
              type="url" 
              v-model="dependenciaData.pagina_web" 
              placeholder="https://ejemplo.com" 
              maxlength="255"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Fecha de Creación</label>
            <input 
              type="date" 
              v-model="dependenciaData.fecha_creacion" 
            />
          </div>

          <div class="form-group">
            <label>Estado</label>
            <select v-model="dependenciaData.estado">
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Responsable</label>
            <input 
              type="text" 
              v-model="dependenciaData.responsable" 
              placeholder="Nombre del responsable" 
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label>Edificio</label>
            <input 
              type="text" 
              v-model="dependenciaData.edificio" 
              placeholder="Ej: Edificio A" 
              maxlength="50"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Ubicación Física</label>
          <textarea 
            v-model="dependenciaData.ubicacion" 
            placeholder="Ubicación exacta en el campus..." 
            rows="2"
          ></textarea>
        </div>

        <div class="form-group">
          <label>Tipo de Dependencia *</label>
          <select v-model="dependenciaData.tipo">
            <option value="" disabled>Seleccionar tipo...</option>
            <option value="Académica">Académica</option>
            <option value="Administrativa">Administrativa</option>
            <option value="Servicios">Servicios</option>
          </select>
        </div>

        <div class="button-group">
          <button class="secondary-btn" @click="currentStep = 3">Atrás</button>
          <button class="primary-btn" @click="handleDependenciaSubmit">
            {{ isLastStep ? 'Crear Cuenta' : 'Continuar' }}
          </button>
        </div>
      </div>

      <!-- Paso 4-5: ORGANIZACIÓN -->
      <div class="step-view" v-if="currentStep === 4 && userType === 'organizacion'">
        <h2>Información de Organización</h2>
        <p class="step-indicator">Paso 4 de {{ totalSteps }}</p>
        
        <div class="form-group">
          <label>RIF *</label>
          <input 
            type="text" 
            v-model="organizacionData.rif" 
            placeholder="Ej: J-12345678-9" 
            maxlength="50"
          />
        </div>

        <div class="form-group">
          <label>Nombre/Razón Social *</label>
          <input 
            type="text" 
            v-model="organizacionData.nombre" 
            placeholder="Nombre de la organización" 
            maxlength="100"
          />
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <textarea 
            v-model="organizacionData.descripcion" 
            placeholder="Describe las actividades y propósito de la organización..." 
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Logo (URL)</label>
            <input 
              type="url" 
              v-model="organizacionData.logo" 
              placeholder="https://ejemplo.com/logo.png" 
              maxlength="255"
            />
          </div>

          <div class="form-group">
            <label>Página Web</label>
            <input 
              type="url" 
              v-model="organizacionData.pagina_web" 
              placeholder="https://ejemplo.com" 
              maxlength="255"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Tipos de Colaboración</label>
          <div class="multivalue-input">
            <input 
              type="text" 
              v-model="currentColaboracion" 
              placeholder="Ej: Investigación, Eventos" 
              @keyup.enter="addColaboracion"
            />
            <button type="button" class="add-btn" @click="addColaboracion">+</button>
          </div>
          <div class="tag-container">
            <span v-for="(colab, index) in organizacionData.colaboraciones" :key="index" class="tag">
              {{ colab }}
              <span class="remove-tag" @click="removeColaboracion(index)">×</span>
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>Tipo de Organización *</label>
          <select v-model="organizacionData.tipo">
            <option value="" disabled>Seleccionar tipo...</option>
            <option value="Estudiantil">Estudiantil</option>
            <option value="Académica">Académica</option>
            <option value="Cultural">Cultural</option>
            <option value="Deportiva">Deportiva</option>
          </select>
        </div>

        <div class="button-group">
          <button class="secondary-btn" @click="currentStep = 3">Atrás</button>
          <button class="primary-btn" @click="handleOrganizacionSubmit">
            {{ isLastStep ? 'Crear Cuenta' : 'Continuar' }}
          </button>
        </div>
      </div>

      <!-- Paso final: Confirmación -->
      <div class="step-view confirmation-view" v-if="currentStep === 6">
        <div class="confirmation-icon">✅</div>
        <h2>¡Cuenta Creada Exitosamente!</h2>
        <p class="confirmation-message">
          Bienvenido/a a SoyUCAB, {{ getUserDisplayName() }}.
          Tu cuenta ha sido registrada correctamente.
        </p>
        <button class="primary-btn" @click="handleConfirmation">
          Continuar a la Plataforma
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../services/usuarioSevices';

export default {
  name: 'RegistrationComponent',
  
  data() {
    return {
      // Estados principales
      isLoginActive: false,
      currentStep: 1,
      showPassword: false,
      loading: false,
      errorMessage: '',
      
      // Datos básicos
      email: '',
      loginEmail: '',
      loginPassword: '',
      
      // Tipo de usuario
      userType: '',
      personaTipo: '',
      
      // Datos del formulario (comunes a todos)
      userData: {
        telefono: '',
        nombre_usuario: '',
        contrasena: '',
        biografia: '',
        privacidad_perfil: 'publico'
      },
      
      passwordStrength: {
        valid: false
      },
      
      // Datos de persona (solo cuando userType === 'persona')
      personaData: {
        ci: '',
        sexo: 'M',
        nombres: '',
        apellidos: '',
        fecha_nacimiento: '',
        edad: 0,
        empresa_actual: '',
        idiomas: [],
        habilidades: []
      },
      
      // Datos específicos por tipo de persona
      estudianteData: {
        carrera: '',
        facultad: '',
        semestre: '',
        promedio: ''
      },
      
      egresadoData: {
        facultad: '',
        titulos: [],
        fecha_grado: '',
        pais: '',
        estado: '',
        menciones: [],
        empresas: []
      },
      
      profesorData: {
        fecha_ingreso: '',
        categoria: '',
        dedicacion: '',
        estado: 'activo',
        fecha_fin: '',
        facultades: [],
        departamentos: [],
        materias: []
      },
      
      // Datos para dependencia (cuando userType === 'dependencia')
      dependenciaData: {
        nombre_institucional: '',  // ← CAMBIADO para coincidir con DB
        descripcion: '',
        logo: '',
        pagina_web: '',
        fecha_creacion: new Date().toISOString().split('T')[0],
        estado: 'activa',  // ← CAMBIADO para coincidir con ENUM
        responsable: '',
        ubicacion_fisica: '',  // ← CAMBIADO
        edificio: '',
        tipo: ''
      },
      
      // Datos para organización (cuando userType === 'organizacion')
      organizacionData: {
        rif: '',
        nombre: '',
        descripcion: '',
        logo: '',
        pagina_web: '',
        tipos_colaboracion: [],  // ← CAMBIADO
        tipo: ''
      },
      
      // Estados para inputs multivalor
      currentIdioma: '',
      currentHabilidad: '',
      currentTitulo: '',
      currentMencion: '',
      currentEmpresa: '',
      currentFacultad: '',
      currentDepartamento: '',
      currentMateria: '',
      currentColaboracion: '',
      
      // Estados de países y estados
      estadosDisponibles: [],
      descripcionError: '',
      
      // Mapeo de estados por país
      estadosPorPais: {
        'VE': ['Distrito Capital', 'Zulia', 'Miranda', 'Carabobo', 'Aragua', 'Lara', 'Bolívar', 'Táchira', 'Mérida', 'Anzoátegui'],
        'CO': ['Bogotá D.C.', 'Antioquia', 'Valle del Cauca', 'Santander', 'Cundinamarca', 'Atlántico', 'Bolívar'],
        'ES': ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Andalucía', 'Cataluña', 'País Vasco'],
        'US': ['Florida', 'California', 'Texas', 'Nueva York', 'Illinois', 'Washington', 'Massachusetts'],
        'MX': ['Ciudad de México', 'Jalisco', 'Nuevo León', 'Puebla', 'Veracruz', 'Estado de México', 'Guanajuato']
      }
    };
  },
  
  computed: {
    totalSteps() {
      // Dependencias y organizaciones tienen 4 pasos, personas tienen 5
      return this.userType === 'persona' ? 5 : 4;
    },
    
    isLastStep() {
      return this.currentStep === this.totalSteps;
    },
    
    isPersonaTypeValid() {
      // Solo permitir tipos implementados en el backend actual
      const validTypes = ['estudiante', 'egresado', 'profesor'];
      return validTypes.includes(this.personaTipo);
    }
  },
  
  methods: {
    // ========== MÉTODOS DE NAVEGACIÓN ==========
    switchToLogin() {
      this.isLoginActive = true;
    },
    
    switchToRegister() {
      this.isLoginActive = false;
      this.currentStep = 1;
      this.resetFormData();
    },
    
    handleEmailSubmit() {
      if (this.validateEmail(this.email)) {
        this.currentStep = 2;
      } else {
        alert('Por favor ingresa un correo electrónico válido');
      }
    },
    
    resetFormData() {
      // Resetea solo los datos según el tipo seleccionado
      if (this.userType === 'persona') {
        this.personaData = {
          ci: '',
          sexo: 'M',
          nombres: '',
          apellidos: '',
          fecha_nacimiento: '',
          edad: 0,
          empresa_actual: '',
          idiomas: [],
          habilidades: []
        };
      } else if (this.userType === 'dependencia') {
        this.dependenciaData = {
          nombre_institucional: '',
          descripcion: '',
          logo: '',
          pagina_web: '',
          fecha_creacion: new Date().toISOString().split('T')[0],
          estado: 'activa',
          responsable: '',
          ubicacion_fisica: '',
          edificio: '',
          tipo: ''
        };
      } else if (this.userType === 'organizacion') {
        this.organizacionData = {
          rif: '',
          nombre: '',
          descripcion: '',
          logo: '',
          pagina_web: '',
          tipos_colaboracion: [],
          tipo: ''
        };
      }
    },
    
    // ========== MÉTODOS DE VALIDACIÓN ==========
    validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },
    
    validatePassword() {
      const password = this.userData.contrasena;
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[$_\.%&!-]/.test(password);
      const hasMinLength = password.length >= 8;
      
      this.passwordStrength.valid = hasUpper && hasLower && hasNumber && hasSpecial && hasMinLength;
    },
    
    calculateAge() {
      if (this.personaData.fecha_nacimiento) {
        const birthDate = new Date(this.personaData.fecha_nacimiento);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        this.personaData.edad = age;
      }
    },
    
    // ========== MÉTODOS DE LOGIN ==========
    async handleLogin() {
      if (!this.loginEmail || !this.loginPassword) {
        alert('Por favor ingresa correo y contraseña');
        return;
      }
      
      try {
        this.loading = true;
        this.errorMessage = '';
        
        const result = await api.login({
          email: this.loginEmail,
          contraseña: this.loginPassword
        });
        
        if (result.success) {
          const userName = result.data?.nombres || result.data?.user?.nombres || 'Usuario';
          alert(`¡Bienvenido ${userName}!`);
          
          // Guardar usuario en localStorage
          if (result.data) {
            const userToStore = { ...result.data };
            delete userToStore.contraseña;
            localStorage.setItem('user', JSON.stringify(userToStore));
            
            // Guardar token si existe
            if (result.token) {
              localStorage.setItem('token', result.token);
            }
          }
          
          // Redirigir
          window.location.href = '/home';
        } else {
          this.errorMessage = result.error || 'Error en el inicio de sesión';
          alert(`Error: ${this.errorMessage}`);
        }
      } catch (error) {
        console.error('Error en handleLogin:', error);
        this.errorMessage = 'Error de conexión con el servidor';
        alert(this.errorMessage);
      } finally {
        this.loading = false;
      }
    },
    
    // ========== MÉTODO PRINCIPAL DE REGISTRO ==========
    async handleRegistration() {
      // Validaciones básicas comunes
      if (!this.email || !this.userData.nombre_usuario || !this.userData.contrasena) {
        alert('Por favor completa todos los campos obligatorios');
        return;
      }
      
      if (!this.passwordStrength.valid) {
        alert('La contraseña no cumple con los requisitos de seguridad');
        return;
      }
      
      try {
        this.loading = true;
        
        // Datos base comunes
        const baseData = {
          email: this.email,
          nombre_usuario: this.userData.nombre_usuario,
          contraseña: this.userData.contrasena,
          telefono: this.userData.telefono || null,
          biografia: this.userData.biografia || '',
          privacidad_perfil: this.userData.privacidad_perfil || 'publico'
        };
        
        let userData;
        
        // ========== REGISTRO DE PERSONA ==========
        if (this.userType === 'persona') {
          // Validaciones específicas de persona
          if (!this.personaData.ci || !this.personaData.nombres || !this.personaData.apellidos || !this.personaData.fecha_nacimiento) {
            alert('Por favor completa todos los campos obligatorios de la persona');
            this.loading = false;
            return;
          }
          
          if (!this.isPersonaTypeValid) {
            alert('Tipo de persona no implementado. Selecciona: Estudiante, Egresado o Profesor');
            this.loading = false;
            return;
          }
          
          userData = {
            ...baseData,
            nombres: this.personaData.nombres,
            apellidos: this.personaData.apellidos,
            ci: this.personaData.ci,
            sexo: this.personaData.sexo,
            fecha_nacimiento: this.formatDateForAPI(this.personaData.fecha_nacimiento),
            ocupacion_actual: this.personaData.empresa_actual || null,
            empresa_actual: this.personaData.empresa_actual || null,
            influencer: false,
            tutor: false,
            tipo_miembro: this.personaTipo.charAt(0).toUpperCase() + this.personaTipo.slice(1)
          };
          
          // Añadir datos específicos según tipo de persona
          if (this.personaTipo === 'estudiante') {
            if (!this.estudianteData.carrera || !this.estudianteData.facultad || !this.estudianteData.semestre) {
              alert('Por favor completa todos los campos del estudiante');
              this.loading = false;
              return;
            }
            
            Object.assign(userData, {
              semestre: this.estudianteData.semestre,
              carrera_programa: this.estudianteData.carrera,
              facultad: this.estudianteData.facultad,
              promedio: this.estudianteData.promedio || null,
              email_dominio_estudiante: this.generateInstitutionalEmail(this.email)
            });
            
          } else if (this.personaTipo === 'egresado') {
            if (!this.egresadoData.facultad || !this.egresadoData.titulos.length || !this.egresadoData.fecha_grado || 
                !this.egresadoData.pais || !this.egresadoData.estado) {
              alert('Por favor completa todos los campos del egresado');
              this.loading = false;
              return;
            }
            
            Object.assign(userData, {
              facultad: this.egresadoData.facultad,
              fecha_acto_grado: this.formatDateForAPI(this.egresadoData.fecha_grado),
              pais: this.egresadoData.pais,
              estado_egresado: this.egresadoData.estado
            });
            
          } else if (this.personaTipo === 'profesor') {
            if (!this.profesorData.fecha_ingreso || !this.profesorData.categoria || !this.profesorData.dedicacion) {
              alert('Por favor completa todos los campos del profesor');
              this.loading = false;
              return;
            }
            
            Object.assign(userData, {
              categoria_profesor: this.profesorData.categoria,
              dedicacion_profesor: this.profesorData.dedicacion,
              fecha_ingreso_profesor: this.formatDateForAPI(this.profesorData.fecha_ingreso)
            });
          }
          
        // ========== REGISTRO DE DEPENDENCIA ==========
        } else if (this.userType === 'dependencia') {
          // Validaciones específicas de dependencia
          if (!this.dependenciaData.nombre_institucional || !this.dependenciaData.descripcion) {
            alert('Para dependencia: nombre institucional y descripción son requeridos');
            this.loading = false;
            return;
          }
          
          // Validar longitud de descripción
          if (this.dependenciaData.descripcion.length < 50 || this.dependenciaData.descripcion.length > 500) {
            alert('La descripción debe tener entre 50 y 500 caracteres');
            this.loading = false;
            return;
          }
          
          userData = {
            ...baseData,
            tipo_entidad: 'dependencia',
            nombre_institucional: this.dependenciaData.nombre_institucional,
            descripcion: this.dependenciaData.descripcion,
            logo: this.dependenciaData.logo || null,
            pagina_web: this.dependenciaData.pagina_web || null,
            fecha_creacion: this.formatDateForAPI(this.dependenciaData.fecha_creacion),
            estado: this.dependenciaData.estado,
            responsable: this.dependenciaData.responsable || 'Administrador',
            ubicacion_fisica: this.dependenciaData.ubicacion_fisica || null,
            edificio: this.dependenciaData.edificio || null,
            tipo_dependencia: this.dependenciaData.tipo || null
          };
          
        // ========== REGISTRO DE ORGANIZACIÓN ==========
        } else if (this.userType === 'organizacion') {
          // Validaciones específicas de organización
          if (!this.organizacionData.rif || !this.organizacionData.nombre) {
            alert('Para organización: RIF y nombre son requeridos');
            this.loading = false;
            return;
          }
          
          userData = {
            ...baseData,
            tipo_entidad: 'organizacion',
            rif: this.organizacionData.rif,
            nombre: this.organizacionData.nombre,
            descripcion: this.organizacionData.descripcion || null,
            logo: this.organizacionData.logo || null,
            pagina_web: this.organizacionData.pagina_web || null,
            tipos_colaboracion: this.organizacionData.tipos_colaboracion,
            tipo_organizacion: this.organizacionData.tipo || null
          };
          
        } else {
          alert('Tipo de usuario no válido');
          this.loading = false;
          return;
        }
        
        console.log('Enviando datos al backend:', userData);
        
        // Llamar al servicio de registro
        const result = await api.registerUser(userData);
        
        if (result.success) {
          console.log('Registro exitoso:', result.data);
          alert('¡Cuenta creada exitosamente!');
          
          // Guardar datos básicos en localStorage
          const userToStore = {
            email: userData.email,
            nombre_usuario: userData.nombre_usuario,
            tipo_usuario: this.userType,
            fecha_registro: new Date().toISOString()
          };
          
          // Añadir datos específicos según tipo
          if (this.userType === 'persona') {
            userToStore.nombres = userData.nombres;
            userToStore.apellidos = userData.apellidos;
            userToStore.tipo_miembro = userData.tipo_miembro;
          } else if (this.userType === 'dependencia') {
            userToStore.nombre_institucional = userData.nombre_institucional;
          } else if (this.userType === 'organizacion') {
            userToStore.nombre = userData.nombre;
          }
          
          localStorage.setItem('user', JSON.stringify(userToStore));
          
          // Intentar login automático
          await this.autoLoginAfterRegister(userData.email, userData.contraseña);
          
        } else {
          // Manejar errores
          let errorMsg = result.error || 'Error en el registro';
          
          if (result.missing && result.missing.length > 0) {
            errorMsg += `\nCampos faltantes: ${result.missing.join(', ')}`;
          }
          
          if (result.details) {
            errorMsg += `\nDetalles: ${result.details}`;
          }
          
          alert(errorMsg);
        }
        
      } catch (error) {
        console.error('Error en handleRegistration:', error);
        alert('Error de conexión con el servidor. Por favor intenta nuevamente.');
      } finally {
        this.loading = false;
      }
    },
    
    // ========== LOGIN AUTOMÁTICO DESPUÉS DEL REGISTRO ==========
    async autoLoginAfterRegister(email, password) {
      try {
        console.log('Intentando login automático...');
        
        const loginResult = await api.login({
          email: email,
          contraseña: password
        });
        
        if (loginResult.success && loginResult.data) {
          console.log('Login automático exitoso');
          
          // Actualizar datos del usuario
          const userData = { ...loginResult.data };
          delete userData.contraseña;
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Guardar token si existe
          if (loginResult.token) {
            localStorage.setItem('token', loginResult.token);
          }
          
          // Redirigir al dashboard
          window.location.href = '/home';
        } else {
          console.warn('Login automático falló, redirigiendo a login');
          window.location.href = '/login';
        }
      } catch (loginError) {
        console.warn('Error en login automático:', loginError);
        window.location.href = '/login';
      }
    },
    
    // ========== MÉTODOS AUXILIARES ==========
    formatDateForAPI(dateString) {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    },
    
    generateInstitutionalEmail(personalEmail) {
      const username = personalEmail.split('@')[0];
      return `${username}@ucab.edu.ve`;
    },
    
    // ========== NAVEGACIÓN ENTRE PASOS ==========
    handleBasicInfoSubmit() {
      if (!this.userData.telefono || !this.userData.nombre_usuario || !this.userData.contrasena) {
        alert('Por favor completa todos los campos obligatorios');
        return;
      }
      
      if (!this.passwordStrength.valid) {
        alert('La contraseña no cumple con los requisitos de seguridad');
        return;
      }
      
      this.currentStep = 3;
    },
    
    selectUserType(type) {
      this.userType = type;
      this.resetFormData();
    },
    
    handleUserTypeSubmit() {
      if (!this.userType) {
        alert('Por favor selecciona un tipo de usuario');
        return;
      }
      
      // Avanzar al siguiente paso según el tipo
      this.currentStep = 4;
    },
    
    handlePersonaInfoSubmit() {
      // Validar campos obligatorios
      if (!this.personaData.ci || !this.personaData.sexo || !this.personaData.nombres || 
          !this.personaData.apellidos || !this.personaData.fecha_nacimiento || !this.personaTipo) {
        alert('Por favor completa todos los campos obligatorios');
        return;
      }
      
      // Validar edad
      if (this.personaData.edad < 16 || this.personaData.edad > 110) {
        alert('La edad debe estar entre 16 y 110 años');
        return;
      }
      
      // Validar CI
      if (this.personaData.ci.length < 7) {
        alert('La cédula debe tener al menos 7 caracteres');
        return;
      }
      
      // Validar tipo de persona
      if (!this.isPersonaTypeValid) {
        alert('Tipo de persona no implementado. Selecciona: Estudiante, Egresado o Profesor');
        return;
      }
      
      this.currentStep = 5;
    },
    
    handleSpecificInfoSubmit() {
      // Validaciones específicas según tipo de persona
      let isValid = true;
      let errorMessage = '';
      
      if (this.personaTipo === 'estudiante') {
        if (!this.estudianteData.carrera || !this.estudianteData.facultad || !this.estudianteData.semestre) {
          isValid = false;
          errorMessage = 'Por favor completa todos los campos obligatorios del estudiante';
        }
      } else if (this.personaTipo === 'egresado') {
        if (!this.egresadoData.facultad || !this.egresadoData.titulos.length || !this.egresadoData.fecha_grado || 
            !this.egresadoData.pais || !this.egresadoData.estado) {
          isValid = false;
          errorMessage = 'Por favor completa todos los campos obligatorios del egresado';
        }
      } else if (this.personaTipo === 'profesor') {
        if (!this.profesorData.fecha_ingreso || !this.profesorData.categoria || !this.profesorData.dedicacion) {
          isValid = false;
          errorMessage = 'Por favor completa todos los campos obligatorios del profesor';
        }
      }
      
      if (!isValid) {
        alert(errorMessage);
        return;
      }
      
      // Ir al paso de confirmación
      this.currentStep = 6;
    },
    
    // ========== MÉTODOS PARA DEPENDENCIAS ==========
    handleDependenciaSubmit() {
      // Validaciones específicas de dependencia
      if (!this.dependenciaData.nombre_institucional || !this.dependenciaData.descripcion) {
        alert('Para dependencia: nombre institucional y descripción son requeridos');
        return;
      }
      
      // Validar longitud de descripción
      if (this.dependenciaData.descripcion.length < 50 || this.dependenciaData.descripcion.length > 500) {
        alert('La descripción debe tener entre 50 y 500 caracteres');
        return;
      }
      
      // Validar página web si se proporciona
      if (this.dependenciaData.pagina_web && !this.dependenciaData.pagina_web.startsWith('https://')) {
        alert('La página web debe comenzar con https://');
        return;
      }
      
      // Ir al paso de confirmación
      this.currentStep = 6;
    },
    
    // ========== MÉTODOS PARA ORGANIZACIONES ==========
    handleOrganizacionSubmit() {
      // Validaciones específicas de organización
      if (!this.organizacionData.rif || !this.organizacionData.nombre) {
        alert('Para organización: RIF y nombre son requeridos');
        return;
      }
      
      // Validar página web si se proporciona
      if (this.organizacionData.pagina_web && !this.organizacionData.pagina_web.startsWith('https://')) {
        alert('La página web debe comenzar con https://');
        return;
      }
      
      // Ir al paso de confirmación
      this.currentStep = 6;
    },
    
    validateDescripcion() {
      const desc = this.dependenciaData.descripcion;
      if (desc && desc.length < 50) {
        this.descripcionError = 'La descripción debe tener al menos 50 caracteres';
      } else if (desc && desc.length > 500) {
        this.descripcionError = 'La descripción no puede exceder 500 caracteres';
      } else {
        this.descripcionError = '';
      }
    },
    
    // ========== MÉTODOS PARA ARRAYS MULTIVALOR ==========
    // (Mantén todos los métodos existentes para arrays multivalor)
    addIdioma() {
      if (this.currentIdioma.trim()) {
        this.personaData.idiomas.push(this.currentIdioma.trim());
        this.currentIdioma = '';
      }
    },
    
    removeIdioma(index) {
      this.personaData.idiomas.splice(index, 1);
    },
    
    addHabilidad() {
      if (this.currentHabilidad.trim()) {
        this.personaData.habilidades.push(this.currentHabilidad.trim());
        this.currentHabilidad = '';
      }
    },
    
    removeHabilidad(index) {
      this.personaData.habilidades.splice(index, 1);
    },
    
    addTitulo() {
      if (this.currentTitulo.trim()) {
        this.egresadoData.titulos.push(this.currentTitulo.trim());
        this.currentTitulo = '';
      }
    },
    
    removeTitulo(index) {
      this.egresadoData.titulos.splice(index, 1);
    },
    
    addMencion() {
      if (this.currentMencion.trim()) {
        this.egresadoData.menciones.push(this.currentMencion.trim());
        this.currentMencion = '';
      }
    },
    
    removeMencion(index) {
      this.egresadoData.menciones.splice(index, 1);
    },
    
    addEmpresa() {
      if (this.currentEmpresa.trim()) {
        this.egresadoData.empresas.push(this.currentEmpresa.trim());
        this.currentEmpresa = '';
      }
    },
    
    removeEmpresa(index) {
      this.egresadoData.empresas.splice(index, 1);
    },
    
    addFacultad() {
      if (this.currentFacultad.trim()) {
        this.profesorData.facultades.push(this.currentFacultad.trim());
        this.currentFacultad = '';
      }
    },
    
    removeFacultad(index) {
      this.profesorData.facultades.splice(index, 1);
    },
    
    addDepartamento() {
      if (this.currentDepartamento.trim()) {
        this.profesorData.departamentos.push(this.currentDepartamento.trim());
        this.currentDepartamento = '';
      }
    },
    
    removeDepartamento(index) {
      this.profesorData.departamentos.splice(index, 1);
    },
    
    addMateria() {
      if (this.currentMateria.trim()) {
        this.profesorData.materias.push(this.currentMateria.trim());
        this.currentMateria = '';
      }
    },
    
    removeMateria(index) {
      this.profesorData.materias.splice(index, 1);
    },
    
    addColaboracion() {
      if (this.currentColaboracion.trim()) {
        this.organizacionData.tipos_colaboracion.push(this.currentColaboracion.trim());
        this.currentColaboracion = '';
      }
    },
    
    removeColaboracion(index) {
      this.organizacionData.tipos_colaboracion.splice(index, 1);
    },
    
    // ========== MÉTODOS PARA MANEJAR ESTADOS DE PAÍSES ==========
    updateEstados() {
      if (this.egresadoData.pais && this.estadosPorPais[this.egresadoData.pais]) {
        this.estadosDisponibles = this.estadosPorPais[this.egresadoData.pais];
        this.egresadoData.estado = '';
      } else {
        this.estadosDisponibles = [];
        this.egresadoData.estado = '';
      }
    },
    
    // ========== MÉTODOS DE UI ==========
    getPersonaTipoTitle() {
      const titles = {
        'estudiante': 'Estudiantil',
        'egresado': 'de Egresado',
        'profesor': 'Profesoral',
        'administrativo': 'Administrativa',
        'obrero': 'de Personal Obrero'
      };
      return titles[this.personaTipo] || '';
    },
    
    getUserDisplayName() {
      if (this.userType === 'persona') {
        return `${this.personaData.nombres} ${this.personaData.apellidos}`;
      } else if (this.userType === 'dependencia') {
        return this.dependenciaData.nombre_institucional;
      } else if (this.userType === 'organizacion') {
        return this.organizacionData.nombre;
      }
      return 'Usuario';
    },
    
    // ========== MÉTODO DE CONFIRMACIÓN FINAL ==========
    handleConfirmation() {
      this.handleRegistration();
    }
  }
};
</script>