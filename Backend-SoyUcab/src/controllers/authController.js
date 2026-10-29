const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authController = {
  // POST /api/auth/register - Registrar dependencias y organizaciones
  async register(req, res) {
    try {
      const {
        email,
        nombre_usuario,
        contraseña,
        telefono,
        biografia,
        tipo_entidad,           // "dependencia" u "organizacion" (REQUERIDO)
        privacidad_perfil = 'publico',
        // Campos específicos para dependencia
        nombre_institucional,
        descripcion,
        logo,
        pagina_web,
        fecha_creacion,
        estado,
        responsable,
        ubicacion_fisica,
        edificio,
        tipo_dependencia,
        // Campos específicos para organizacion
        rif,
        nombre,
        tipos_colaboracion,
        tipo_organizacion
      } = req.body;

      console.log('Registrando nueva entidad:', email, 'Tipo:', tipo_entidad);

      // Validar tipo de entidad
      if (!tipo_entidad || (tipo_entidad !== 'dependencia' && tipo_entidad !== 'organizacion')) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de entidad inválido. Debe ser "dependencia" u "organizacion"'
        });
      }

      // Validaciones básicas comunes
      const requiredCommonFields = ['email', 'nombre_usuario', 'contraseña'];
      const missingCommonFields = requiredCommonFields.filter(field => !req.body[field]);
      
      if (missingCommonFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos',
          missing: missingCommonFields
        });
      }

      // Validaciones específicas por tipo
      if (tipo_entidad === 'dependencia') {
        if (!nombre_institucional || !descripcion) {
          return res.status(400).json({
            success: false,
            error: 'Para dependencia: nombre_institucional y descripcion son requeridos'
          });
        }
        
        // Validar longitud de descripción
        if (descripcion.length < 50 || descripcion.length > 500) {
          return res.status(400).json({
            success: false,
            error: 'La descripción debe tener entre 50 y 500 caracteres'
          });
        }
        
      } else if (tipo_entidad === 'organizacion') {
        if (!rif || !nombre) {
          return res.status(400).json({
            success: false,
            error: 'Para organización: rif y nombre son requeridos'
          });
        }
      }

      // Verificar si el email ya existe
      const emailExists = await db.query(
        'SELECT 1 FROM soyucab.miembro WHERE email = $1',
        [email]
      );

      if (emailExists.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'El email ya está registrado'
        });
      }

      // Verificar si el nombre de usuario ya existe
      const usernameExists = await db.query(
        'SELECT 1 FROM soyucab.miembro WHERE nombre_usuario = $1',
        [nombre_usuario]
      );

      if (usernameExists.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'El nombre de usuario ya está en uso'
        });
      }

      // Para dependencia: verificar si nombre_institucional ya existe
      if (tipo_entidad === 'dependencia') {
        const nombreInstExists = await db.query(
          'SELECT 1 FROM soyucab.dependencia_ucab WHERE nombre_institucional = $1',
          [nombre_institucional]
        );

        if (nombreInstExists.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'El nombre institucional ya está registrado'
          });
        }
      }

      // Para organización: verificar si RIF ya existe
      if (tipo_entidad === 'organizacion') {
        const rifExists = await db.query(
          'SELECT 1 FROM soyucab.organizacion_asociada WHERE rif = $1',
          [rif]
        );

        if (rifExists.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'El RIF ya está registrado'
          });
        }
      }

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(contraseña, 10);

      // Iniciar transacción
      await db.query('BEGIN');

      try {
        // 1. Insertar en tabla miembro
        const miembroResult = await db.query(
          `INSERT INTO soyucab.miembro 
           (email, telefono, biografia, estado_cuenta, privacidad_perfil, nombre_usuario, contraseña, fecha_registro)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING *`,
          [
            email,
            telefono || null,
            biografia || '',
            'activa',
            privacidad_perfil,
            nombre_usuario,
            hashedPassword
          ]
        );

        //  Insertar en tabla específica según tipo de entidad
        
        let entidadResult = null;
        
        if (tipo_entidad === 'dependencia') {
          // Insertar en tabla dependencia_ucab
          entidadResult = await db.query(
            `INSERT INTO soyucab.dependencia_ucab 
             (nombre_institucional, email, descripcion, logo, pagina_web, fecha_creacion, estado, responsable, ubicacion_fisica, edificio)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
              nombre_institucional,
              email,
              descripcion,
              logo || null,
              pagina_web || null,
              fecha_creacion || new Date().toISOString().split('T')[0],
              estado || 'activa',
              responsable || 'Administrador',
              ubicacion_fisica || null,
              edificio || null
            ]
          );
          
          // Si hay tipo_dependencia, insertar en tipo_dependencia
          if (tipo_dependencia) {
            try {
              await db.query(
                `INSERT INTO soyucab.tipo_dependencia (nombre_tipo, descripcion)
                 VALUES ($1, $2)
                 ON CONFLICT (nombre_tipo) DO NOTHING`,
                [tipo_dependencia, `Tipo de dependencia: ${tipo_dependencia}`]
              );
            } catch (error) {
              // Ignorar error si el tipo ya existe
              console.log('Tipo de dependencia ya existe o error:', error.message);
            }
          }
          
        } else if (tipo_entidad === 'organizacion') {
          // Insertar en tabla organizacion_asociada
          // Convertir tipos_colaboracion a JSON si es un array
          let tiposColaboracionJSON = null;
          if (tipos_colaboracion) {
            if (Array.isArray(tipos_colaboracion)) {
              tiposColaboracionJSON = JSON.stringify(tipos_colaboracion);
            } else if (typeof tipos_colaboracion === 'string') {
              tiposColaboracionJSON = tipos_colaboracion;
            }
          }
          
          entidadResult = await db.query(
            `INSERT INTO soyucab.organizacion_asociada 
             (rif, email, nombre, logo, pagina_web, descripcion, tipos_colaboracion)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              rif,
              email,
              nombre,
              logo || null,
              pagina_web || null,
              descripcion || biografia || null,
              tiposColaboracionJSON
            ]
          );
          
          // Si hay tipo_organizacion, insertar en tipo_organizacion
          if (tipo_organizacion) {
            try {
              await db.query(
                `INSERT INTO soyucab.tipo_organizacion (nombre_tipo, descripcion)
                 VALUES ($1, $2)
                 ON CONFLICT (nombre_tipo) DO NOTHING`,
                [tipo_organizacion, `Tipo de organización: ${tipo_organizacion}`]
              );
            } catch (error) {
              // Ignorar error si el tipo ya existe
              console.log('Tipo de organización ya existe o error:', error.message);
            }
          }
        }

        await db.query('COMMIT');

        // Excluir contraseña de la respuesta
        const { contraseña: _, ...miembroSinPassword } = miembroResult.rows[0];

        res.status(201).json({
          success: true,
          message: `${tipo_entidad.charAt(0).toUpperCase() + tipo_entidad.slice(1)} registrada exitosamente`,
          data: {
            miembro: miembroSinPassword,
            entidad: entidadResult ? entidadResult.rows[0] : null,
            tipo_entidad: tipo_entidad
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error en transacción:', error);
        
        // Errores específicos de PostgreSQL
        if (error.code === '23505') { // Violación de unicidad
          return res.status(409).json({
            success: false,
            error: 'El email, nombre institucional o RIF ya está registrado'
          });
        }
        
        if (error.code === '23514') { // Violación de check constraint
          if (error.constraint && error.constraint.includes('pagina_web_check')) {
            return res.status(400).json({
              success: false,
              error: 'La página web debe comenzar con https://'
            });
          }
          if (error.constraint && error.constraint.includes('descripcion_check')) {
            return res.status(400).json({
              success: false,
              error: 'La descripción debe tener entre 50 y 500 caracteres'
            });
          }
        }
        
        throw error;
      }

    } catch (error) {
      console.error('Error en registro de entidad:', error);
      
      res.status(500).json({
        success: false,
        error: 'Error al registrar la entidad',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // POST /api/auth/login - Iniciar sesión 
  async login(req, res) {
    try {
      const { email, contraseña } = req.body;

      if (!email || !contraseña) {
        return res.status(400).json({
          success: false,
          error: 'Email y contraseña son requeridos'
        });
      }

      // Buscar en miembro
      const userResult = await db.query(
        `SELECT * FROM soyucab.miembro WHERE email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }

      const user = userResult.rows[0];

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(contraseña, user.contraseña);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }

      // Verificar estado de la cuenta
      if (user.estado_cuenta !== 'activa') {
        return res.status(403).json({
          success: false,
          error: `Cuenta ${user.estado_cuenta}. Contacta al administrador.`
        });
      }

      // Determinar tipo de usuario y obtener información adicional
      let tipo_usuario = 'persona';
      let entidad_info = null;
      let persona_info = null;
      
      // Verificar si es dependencia
      const dependenciaCheck = await db.query(
        'SELECT * FROM soyucab.dependencia_ucab WHERE email = $1',
        [email]
      );
      
      if (dependenciaCheck.rows.length > 0) {
        tipo_usuario = 'dependencia';
        entidad_info = dependenciaCheck.rows[0];
      } else {
        // Verificar si es organización
        const organizacionCheck = await db.query(
          'SELECT * FROM soyucab.organizacion_asociada WHERE email = $1',
          [email]
        );
        
        if (organizacionCheck.rows.length > 0) {
          tipo_usuario = 'organizacion';
          entidad_info = organizacionCheck.rows[0];
        } else {
          // Si no es dependencia ni organización, es persona
          const personaCheck = await db.query(
            'SELECT * FROM soyucab.persona WHERE email_persona = $1',
            [email]
          );
          
          if (personaCheck.rows.length > 0) {
            tipo_usuario = 'persona';
            persona_info = personaCheck.rows[0];
          }
        }
      }

      // Excluir contraseña de la respuesta
      const { contraseña: _, ...userWithoutPassword } = user;

      // Generar JWT
      const secret = process.env.JWT_SECRET || 'soyucab_secret_key';
      const tokenPayload = {
        email: user.email,
        nombre_usuario: user.nombre_usuario,
        tipo_usuario: tipo_usuario
      };
      const token = jwt.sign(tokenPayload, secret, { expiresIn: '2h' });

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          ...userWithoutPassword,
          tipo_usuario: tipo_usuario,
          entidad_info: entidad_info,
          persona_info: persona_info,
          token
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        error: 'Error al iniciar sesión'
      });
    }
  },

  // GET /api/auth/me - Obtener usuario actual a partir del token
  async me(req, res) {
    try {
      const userEmail = req.user && req.user.email;
      if (!userEmail) {
        return res.status(400).json({ success: false, error: 'Token inválido' });
      }

      const userResult = await db.query(
        `SELECT * FROM soyucab.miembro WHERE email = $1`,
        [userEmail]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const user = userResult.rows[0];
      const { contraseña: _, ...userWithoutPassword } = user;

      // Determinar tipo_usuario y info adicional (copiar lógica de login)
      let tipo_usuario = 'persona';
      let entidad_info = null;
      let persona_info = null;
      let roles = [];
      let academicInfo = {};

      const dependenciaCheck = await db.query(
        'SELECT * FROM soyucab.dependencia_ucab WHERE email = $1',
        [userEmail]
      );
      if (dependenciaCheck.rows.length > 0) {
        tipo_usuario = 'dependencia';
        entidad_info = dependenciaCheck.rows[0];
      } else {
        const organizacionCheck = await db.query(
          'SELECT * FROM soyucab.organizacion_asociada WHERE email = $1',
          [userEmail]
        );
        if (organizacionCheck.rows.length > 0) {
          tipo_usuario = 'organizacion';
          entidad_info = organizacionCheck.rows[0];
        } else {
          const personaCheck = await db.query(
            'SELECT * FROM soyucab.persona WHERE email_persona = $1',
            [userEmail]
          );
          if (personaCheck.rows.length > 0) {
            tipo_usuario = 'persona';
            persona_info = personaCheck.rows[0];

            // Obtener roles institucionales si existen
            const rolesRes = await db.query(
              `SELECT tipo_rol, fecha_inicio, estatus, fecha_finalizacion
               FROM soyucab.rolInstitucional WHERE email_persona = $1`,
              [userEmail]
            );
            roles = rolesRes.rows || [];

            // Información académica/profesional adicional
            // Estudiante
            const estudianteRes = await db.query(
              'SELECT semestre, carrera_programa, facultad, promedio, email_dominio_estudiante FROM soyucab.estudiante WHERE email_estudiante = $1',
              [userEmail]
            );
            if (estudianteRes.rows.length > 0) {
              const materias = await db.query('SELECT materia_nombre FROM soyucab.materias_impartidas WHERE email_persona = $1', [userEmail]);
              academicInfo.estudiante = { ...estudianteRes.rows[0], materias: materias.rows.map(m => m.materia_nombre) };
            }
            // Egresado
            const egresadoRes = await db.query(
              'SELECT facultad, fecha_acto_grado, pais, estado FROM soyucab.egresado WHERE email_egresado = $1',
              [userEmail]
            );
            if (egresadoRes.rows.length > 0) {
              const titulos = await db.query('SELECT nombre_titulo FROM soyucab.titulo_obtenido WHERE email_egresado = $1', [userEmail]);
              const empresas = await db.query('SELECT nombre_empresa FROM soyucab.empresa WHERE email_egresado = $1', [userEmail]);
              academicInfo.egresado = { ...egresadoRes.rows[0], titulos: titulos.rows.map(t => t.nombre_titulo), empresas: empresas.rows.map(e => e.nombre_empresa) };
            }
            // Profesor
            const profesorRes = await db.query('SELECT categoria, dedicacion, fecha_ingreso FROM soyucab.profesor WHERE email_persona = $1', [userEmail]);
            if (profesorRes.rows.length > 0) {
              const facultades = await db.query('SELECT facultad_nombre FROM soyucab.facultad WHERE email_persona = $1', [userEmail]);
              const materias = await db.query('SELECT materia_nombre FROM soyucab.materias_impartidas WHERE email_persona = $1', [userEmail]);
              academicInfo.profesor = { ...profesorRes.rows[0], facultades: facultades.rows.map(f => f.facultad_nombre), materias: materias.rows.map(m => m.materia_nombre) };
            }
          }
        }
      }

      res.json({
        success: true,
        data: {
          ...userWithoutPassword,
          tipo_usuario,
          entidad_info,
          persona_info,
          roles,
          academicInfo
        }
      });

    } catch (error) {
      console.error('Error en me:', error);
      res.status(500).json({ success: false, error: 'Error al obtener usuario actual' });
    }
  },

  // PUT /api/auth/dependencia/:email - Actualizar datos de dependencia
  async updateDependencia(req, res) {
    try {
      const { email } = req.params;
      const allowed = ['nombre_institucional','descripcion','logo','pagina_web','fecha_creacion','estado','responsable','ubicacion_fisica','edificio'];
      const incoming = {};
      allowed.forEach(f => { if (req.body[f] !== undefined) incoming[f] = req.body[f]; });

      if (Object.keys(incoming).length === 0) {
        return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      }

      if (incoming.pagina_web && !incoming.pagina_web.startsWith('https://')) {
        return res.status(400).json({ success: false, error: 'La página web debe comenzar con https://' });
      }

      if (incoming.descripcion && (incoming.descripcion.length < 50 || incoming.descripcion.length > 500)) {
        return res.status(400).json({ success: false, error: 'La descripción debe tener entre 50 y 500 caracteres' });
      }

      // Obtener dependencia actual
      const cur = await db.query('SELECT * FROM soyucab.dependencia_ucab WHERE email = $1', [email]);
      if (cur.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Dependencia no encontrada' });
      }
      const current = cur.rows[0];

      // Si hay cambio de nombre institucional, validar unicidad y actualizar tablas que referencian el nombre (es_tipo)
      if (incoming.nombre_institucional && incoming.nombre_institucional !== current.nombre_institucional) {
        // Verificar unicidad
        const exists = await db.query('SELECT 1 FROM soyucab.dependencia_ucab WHERE nombre_institucional = $1', [incoming.nombre_institucional]);
        if (exists.rows.length > 0) {
          return res.status(409).json({ success: false, error: 'El nombre institucional ya está en uso' });
        }

        // Realizar cambio en transacción: actualizar es_tipo (FK) y luego dependencia
        await db.query('BEGIN');
        try {
          await db.query('UPDATE soyucab.es_tipo SET codigo_institucional = $1 WHERE codigo_institucional = $2', [incoming.nombre_institucional, current.nombre_institucional]);

          // Preparar setClause incluyendo nombre_institucional
          const setClause = Object.keys(incoming).map((k, i) => `${k} = $${i + 2}`).join(', ');
          const values = [email, ...Object.values(incoming)];

          const result = await db.query(`UPDATE soyucab.dependencia_ucab SET ${setClause} WHERE email = $1 RETURNING *`, values);

          if (result.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Dependencia no encontrada al actualizar' });
          }

          await db.query('COMMIT');

          res.json({ success: true, message: 'Dependencia actualizada', data: result.rows[0] });
          return;
        } catch (e) {
          await db.query('ROLLBACK');
          console.error('Error actualizando nombre institucional:', e);
          return res.status(500).json({ success: false, error: 'Error actualizando nombre institucional' });
        }
      }

      // Sin cambio de nombre institucional, actualizar normalmente
      const setClause = Object.keys(incoming).map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = [email, ...Object.values(incoming)];

      const result = await db.query(`UPDATE soyucab.dependencia_ucab SET ${setClause} WHERE email = $1 RETURNING *`, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Dependencia no encontrada' });
      }

      res.json({ success: true, message: 'Dependencia actualizada', data: result.rows[0] });

    } catch (error) {
      console.error('Error actualizando dependencia:', error);
      res.status(500).json({ success: false, error: 'Error actualizando dependencia' });
    }
  },

  // PUT /api/auth/organizacion/:email - Actualizar datos de organizacion
  async updateOrganizacion(req, res) {
    try {
      const { email } = req.params;
      const allowed = ['nombre','logo','pagina_web','descripcion','tipos_colaboracion'];
      const updates = {};
      allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      }

      if (updates.pagina_web && !updates.pagina_web.startsWith('https://')) {
        return res.status(400).json({ success: false, error: 'La página web debe comenzar con https://' });
      }

      if (updates.tipos_colaboracion && Array.isArray(updates.tipos_colaboracion)) {
        updates.tipos_colaboracion = JSON.stringify(updates.tipos_colaboracion);
      }

      const setClause = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = [email, ...Object.values(updates)];

      const result = await db.query(`UPDATE soyucab.organizacion_asociada SET ${setClause} WHERE email = $1 RETURNING *`, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Organización no encontrada' });
      }

      res.json({ success: true, message: 'Organización actualizada', data: result.rows[0] });

    } catch (error) {
      console.error('Error actualizando organizacion:', error);
      res.status(500).json({ success: false, error: 'Error actualizando organización' });
    }
  }
};

module.exports = authController;