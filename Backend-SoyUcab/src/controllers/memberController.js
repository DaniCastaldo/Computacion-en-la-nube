const db = require('../config/database');
const bcrypt = require('bcrypt');

const memberController = {
  // GET /api/members - Obtener todos los miembros (con filtros)
  async getAllMembers(req, res) {
    try {
      const { 
        limit = 50, 
        page = 1, 
        tipo, 
        estado, 
        search,
        sortBy = 'fecha_registro',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          m.email,
          m.nombre_usuario,
          m.estado_cuenta,
          m.privacidad_perfil,
          m.fecha_registro,
          m.biografia,
          p.nombres,
          p.apellidos,
          p.ci,
          p.sexo,
          p.fecha_nacimiento,
          p.ocupacion_actual,
          p.empresa_actual,
          p.influencer,
          p.tutor,
          CASE 
            WHEN e.email_estudiante IS NOT NULL THEN 'Estudiante'
            WHEN eg.email_egresado IS NOT NULL THEN 'Egresado'
            WHEN pr.email_persona IS NOT NULL THEN 'Profesor'
            WHEN pa.email_persona IS NOT NULL THEN 'Personal Administrativo'
            WHEN po.email_persona IS NOT NULL THEN 'Personal Obrero'
            ELSE 'Miembro'
          END as tipo_miembro
        FROM soyucab.miembro m
        JOIN soyucab.persona p ON m.email = p.email_persona
        LEFT JOIN soyucab.estudiante e ON m.email = e.email_estudiante
        LEFT JOIN soyucab.egresado eg ON m.email = eg.email_egresado
        LEFT JOIN soyucab.profesor pr ON m.email = pr.email_persona
        LEFT JOIN soyucab.personal_administrativo pa ON m.email = pa.email_persona
        LEFT JOIN soyucab.personal_obrero po ON m.email = po.email_persona
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 0;

      // Filtro por tipo
      if (tipo) {
        switch(tipo.toLowerCase()) {
          case 'estudiante':
            query += ` AND e.email_estudiante IS NOT NULL`;
            break;
          case 'egresado':
            query += ` AND eg.email_egresado IS NOT NULL`;
            break;
          case 'profesor':
            query += ` AND pr.email_persona IS NOT NULL`;
            break;
          case 'administrativo':
            query += ` AND pa.email_persona IS NOT NULL`;
            break;
          case 'obrero':
            query += ` AND po.email_persona IS NOT NULL`;
            break;
        }
      }

      // Filtro por estado
      if (estado) {
        paramCount++;
        query += ` AND m.estado_cuenta = $${paramCount}`;
        params.push(estado);
      }

      // Búsqueda
      if (search) {
        paramCount++;
        query += ` AND (
          m.email ILIKE $${paramCount} OR 
          m.nombre_usuario ILIKE $${paramCount} OR 
          p.nombres ILIKE $${paramCount} OR 
          p.apellidos ILIKE $${paramCount} OR
          p.ci ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Ordenamiento
      const validSortColumns = ['fecha_registro', 'nombre_usuario', 'nombres', 'apellidos'];
      const sortColumn = validSortColumns.includes(sortBy) ? 
        (sortBy === 'nombres' || sortBy === 'apellidos' ? `p.${sortBy}` : `m.${sortBy}`) : 
        'm.fecha_registro';
      
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${sortColumn} ${order}`;

      // Paginación
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));

      const result = await db.query(query, params);

      // Contar total
      let countQuery = `
        SELECT COUNT(*) as total
        FROM soyucab.miembro m
        JOIN soyucab.persona p ON m.email = p.email_persona
        WHERE 1=1
      `;
      
      const countParams = [];
      paramCount = 0;

      if (tipo) {
        switch(tipo.toLowerCase()) {
          case 'estudiante':
            countQuery += ` AND EXISTS (SELECT 1 FROM soyucab.estudiante e WHERE e.email_estudiante = m.email)`;
            break;
          case 'egresado':
            countQuery += ` AND EXISTS (SELECT 1 FROM soyucab.egresado eg WHERE eg.email_egresado = m.email)`;
            break;
          case 'profesor':
            countQuery += ` AND EXISTS (SELECT 1 FROM soyucab.profesor pr WHERE pr.email_persona = m.email)`;
            break;
        }
      }

      if (estado) {
        paramCount++;
        countQuery += ` AND m.estado_cuenta = $${paramCount}`;
        countParams.push(estado);
      }

      if (search) {
        paramCount++;
        countQuery += ` AND (
          m.email ILIKE $${paramCount} OR 
          m.nombre_usuario ILIKE $${paramCount} OR 
          p.nombres ILIKE $${paramCount} OR 
          p.apellidos ILIKE $${paramCount}
        )`;
        countParams.push(`%${search}%`);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        count: result.rows.length,
        total: total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: result.rows
      });

    } catch (error) {
      console.error('Error obteniendo miembros:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener miembros' 
      });
    }
  },

  // GET /api/members/:email - Obtener miembro por email
  async getMemberByEmail(req, res) {
    try {
      const { email } = req.params;

      const result = await db.query(
        `SELECT 
          m.*,
          p.*,
          e.semestre,
          e.carrera_programa,
          e.facultad as facultad_estudiante,
          e.promedio,
          e.email_dominio_estudiante,
          eg.facultad as facultad_egresado,
          eg.fecha_acto_grado,
          eg.pais,
          eg.estado,
          pr.categoria as categoria_profesor,
          pr.dedicacion as dedicacion_profesor,
          pr.fecha_ingreso as fecha_ingreso_profesor,
          pa.cargo as cargo_administrativo,
          pa.ubicacion_de_trabajo as ubicacion_admin,
          pa.dedicacion as dedicacion_admin,
          po.cargo as cargo_obrero,
          po.dedicacion as dedicacion_obrero,
          po.empresa_a_la_que_pertenece as empresa_obrero,
          (SELECT COUNT(*) FROM soyucab.relacion r WHERE r.usuario_destino = m.email AND r.estado = 'aceptada') as seguidores,
          (SELECT COUNT(*) FROM soyucab.relacion r WHERE r.usuario_origen = m.email AND r.estado = 'aceptada') as siguiendo,
          (SELECT COUNT(*) FROM soyucab.grupo g WHERE g.email = m.email) as grupos_creados,
          (SELECT COUNT(*) FROM soyucab.pertenece_a_grupo pag WHERE pag.email_miembro = m.email AND pag.estado_participante = 'activo') as grupos_pertenece
         FROM soyucab.miembro m
         LEFT JOIN soyucab.persona p ON m.email = p.email_persona
         LEFT JOIN soyucab.estudiante e ON m.email = e.email_estudiante
         LEFT JOIN soyucab.egresado eg ON m.email = eg.email_egresado
         LEFT JOIN soyucab.profesor pr ON m.email = pr.email_persona
         LEFT JOIN soyucab.personal_administrativo pa ON m.email = pa.email_persona
         LEFT JOIN soyucab.personal_obrero po ON m.email = po.email_persona
         WHERE m.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Miembro no encontrado' 
        });
      }

      const member = result.rows[0];
      
      // Determinar tipo de miembro basándonos en campos devueltos por LEFT JOIN
      let tipo_miembro = 'Miembro';
      if (member.semestre || member.carrera_programa) tipo_miembro = 'Estudiante';
      else if (member.facultad_egresado || member.fecha_acto_grado) tipo_miembro = 'Egresado';
      else if (member.categoria_profesor) tipo_miembro = 'Profesor';
      else if (member.cargo_administrativo) tipo_miembro = 'Personal Administrativo';
      else if (member.cargo_obrero) tipo_miembro = 'Personal Obrero';

      // Obtener información adicional según el tipo
      let info_adicional = {};
      
      if (tipo_miembro === 'Estudiante') {
        // Obtener materias del estudiante
        const materias = await db.query(
          `SELECT materia_nombre 
           FROM soyucab.materias_impartidas 
           WHERE email_persona = $1`,
          [email]
        );
        
        info_adicional = {
          estudiante: {
            semestre: member.semestre,
            carrera_programa: member.carrera_programa,
            facultad: member.facultad_estudiante,
            promedio: member.promedio,
            email_institucional: member.email_dominio_estudiante,
            materias: materias.rows.map(m => m.materia_nombre)
          }
        };
      } else if (tipo_miembro === 'Egresado') {
        // Obtener títulos y empresas del egresado
        const [titulos, empresas] = await Promise.all([
          db.query(
            `SELECT nombre_titulo 
             FROM soyucab.titulo_obtenido 
             WHERE email_egresado = $1`,
            [email]
          ),
          db.query(
            `SELECT nombre_empresa 
             FROM soyucab.empresa 
             WHERE email_egresado = $1`,
            [email]
          )
        ]);
        
        info_adicional = {
          egresado: {
            facultad: member.facultad_egresado,
            fecha_acto_grado: member.fecha_acto_grado,
            pais: member.pais,
            estado: member.estado,
            titulos: titulos.rows.map(t => t.nombre_titulo),
            empresas: empresas.rows.map(e => e.nombre_empresa)
          }
        };
      } else if (tipo_miembro === 'Profesor') {
        // Obtener facultades y materias del profesor
        const [facultades, materias] = await Promise.all([
          db.query(
            `SELECT facultad_nombre 
             FROM soyucab.facultad 
             WHERE email_persona = $1`,
            [email]
          ),
          db.query(
            `SELECT materia_nombre 
             FROM soyucab.materias_impartidas 
             WHERE email_persona = $1`,
            [email]
          )
        ]);
        
        info_adicional = {
          profesor: {
            categoria: member.categoria_profesor,
            dedicacion: member.dedicacion_profesor,
            fecha_ingreso: member.fecha_ingreso_profesor,
            facultades: facultades.rows.map(f => f.facultad_nombre),
            materias: materias.rows.map(m => m.materia_nombre)
          }
        };
      }

      // Excluir contraseña y crear respuesta
      const { contraseña, ...memberData } = member;
      
      const response = {
        ...memberData,
        tipo_miembro: tipo_miembro,
        estadisticas: {
          seguidores: member.seguidores || 0,
          siguiendo: member.siguiendo || 0,
          grupos_creados: member.grupos_creados || 0,
          grupos_pertenece: member.grupos_pertenece || 0
        },
        ...info_adicional
      };

      res.json({ 
        success: true, 
        data: response 
      });

    } catch (error) {
      console.error('Error obteniendo miembro:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener miembro' 
      });
    }
  },

  // POST /api/members - Crear miembro
  async createMember(req, res) {
    try {
      const {
        email,
        nombre_usuario,
        contraseña,
        nombres,
        apellidos,
        ci,
        telefono,
        biografia,
        sexo = 'M',
        fecha_nacimiento,
        estado_cuenta = 'activa',
        privacidad_perfil = 'publico',
        ocupacion_actual,
        empresa_actual,
        influencer = false,
        tutor = false,
        // Campos específicos de tipo
        tipo_miembro,
        // Campos de estudiante
        semestre,
        carrera_programa,
        facultad,
        promedio,
        email_dominio_estudiante,
        // Campos de egresado
        fecha_acto_grado,
        pais,
        estado_egresado,
        // Campos de profesor
        categoria_profesor,
        dedicacion_profesor,
        fecha_ingreso_profesor
      } = req.body;

      // Validaciones básicas
      const requiredFields = ['email', 'nombre_usuario', 'contraseña', 'nombres', 'apellidos', 'ci', 'fecha_nacimiento'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos',
          missing: missingFields
        });
      }

      // Verificar unicidad
      const checks = await Promise.all([
        db.query('SELECT 1 FROM soyucab.miembro WHERE email = $1', [email]),
        db.query('SELECT 1 FROM soyucab.miembro WHERE nombre_usuario = $1', [nombre_usuario]),
        db.query('SELECT 1 FROM soyucab.persona WHERE ci = $1', [ci])
      ]);

      if (checks[0].rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Email ya registrado'
        });
      }
      
      if (checks[1].rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Nombre de usuario en uso'
        });
      }
      
      if (checks[2].rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'CI ya registrada'
        });
      }

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(contraseña, 10);

      await db.query('BEGIN');

      try {
        // 1. Insertar en tabla miembro
        const miembroResult = await db.query(
          `INSERT INTO soyucab.miembro 
           (email, telefono, biografia, estado_cuenta, privacidad_perfil, nombre_usuario, contraseña, fecha_registro)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING email, nombre_usuario, estado_cuenta, fecha_registro, privacidad_perfil`,
          [
            email,
            telefono || null,
            biografia || '',
            estado_cuenta,
            privacidad_perfil,
            nombre_usuario,
            hashedPassword
          ]
        );

        // 2. Insertar en tabla persona
        const personaResult = await db.query(
          `INSERT INTO soyucab.persona 
           (email_persona, ci, nombres, apellidos, sexo, fecha_nacimiento, ocupacion_actual, empresa_actual, influencer, tutor)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            email,
            ci,
            nombres,
            apellidos,
            sexo,
            fecha_nacimiento,
            ocupacion_actual || null,
            empresa_actual || null,
            influencer,
            tutor
          ]
        );

        // 3. Insertar en tabla específica según tipo
        if (tipo_miembro === 'Estudiante') {
          if (!semestre || !carrera_programa || !facultad || !email_dominio_estudiante) {
            throw new Error('Faltan datos requeridos para estudiante');
          }
          
          // Insertar rol institucional
          await db.query(
            `INSERT INTO soyucab.rolInstitucional 
             (email_persona, tipo_rol, fecha_inicio, estatus)
             VALUES ($1, 'Estudiante', CURRENT_DATE, 'Activo')`,
            [email]
          );

          // Insertar estudiante
          await db.query(
            `INSERT INTO soyucab.estudiante 
             (email_estudiante, ci_estudiante, semestre, carrera_programa, facultad, promedio, email_dominio_estudiante)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              email,
              ci,
              semestre,
              carrera_programa,
              facultad,
              promedio || null,
              email_dominio_estudiante
            ]
          );
          
        } else if (tipo_miembro === 'Egresado') {
          // Insertar rol institucional
          await db.query(
            `INSERT INTO soyucab.rolInstitucional 
             (email_persona, tipo_rol, fecha_inicio, estatus)
             VALUES ($1, 'Egresado', CURRENT_DATE, 'Graduado')`,
            [email]
          );

          // Insertar egresado
          await db.query(
            `INSERT INTO soyucab.egresado 
             (email_egresado, ci_egresado, facultad, fecha_acto_grado, pais, estado)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              email,
              ci,
              facultad || null,
              fecha_acto_grado || null,
              pais || null,
              estado_egresado || null
            ]
          );
          
        } else if (tipo_miembro === 'Profesor') {
          // Insertar rol institucional
          await db.query(
            `INSERT INTO soyucab.rolInstitucional 
             (email_persona, tipo_rol, fecha_inicio, estatus)
             VALUES ($1, 'Profesor', CURRENT_DATE, 'Activo')`,
            [email]
          );

          // Insertar profesor
          await db.query(
            `INSERT INTO soyucab.profesor 
             (email_persona, tipo_rol, fecha_inicio, fecha_ingreso, categoria, dedicacion)
             VALUES ($1, 'Profesor', CURRENT_DATE, $2, $3, $4)`,
            [
              email,
              fecha_ingreso_profesor || CURRENT_DATE,
              categoria_profesor || null,
              dedicacion_profesor || null
            ]
          );
        }

        await db.query('COMMIT');

        res.status(201).json({
          success: true,
          message: 'Miembro creado exitosamente',
          data: {
            miembro: miembroResult.rows[0],
            persona: personaResult.rows[0],
            tipo_miembro: tipo_miembro || 'Miembro'
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error en transacción:', error);
        
        if (error.code === '23505') {
          return res.status(409).json({
            success: false,
            error: 'Violación de unicidad. Datos duplicados.'
          });
        }
        
        throw error;
      }

    } catch (error) {
      console.error('Error creando miembro:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al crear miembro',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // GET /api/members/:email/followers-analysis - Análisis de seguidores
  async getFollowersAnalysis(req, res) {
    try {
      const { email } = req.params;

      // Verificar que el usuario existe
      const userCheck = await db.query(
        'SELECT 1 FROM soyucab.miembro WHERE email = $1',
        [email]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const result = await db.callFunction('Analisis_Influencia_Segmentacion_Seguidores', [email]);

      // Procesar resultados
      const analysis = {
        total_seguidores: result.rows.length,
        por_tipo: {},
        por_engagement: {
          alto: 0,
          medio: 0,
          bajo: 0
        },
        recomendaciones: [],
        detalle: result.rows.map(seg => ({
          email: seg.email_seguidor,
          nombre_usuario: seg.nombre_usuario_seguidor,
          tipo: seg.tipo_seguidor,
          area_interes: seg.area_interes,
          engagement: seg.potencial_engagement,
          interacciones: seg.conteo_likes_hist,
          recomendacion: seg.recomendacion_contenido
        }))
      };

      // Calcular estadísticas
      result.rows.forEach(seg => {
        // Por tipo
        analysis.por_tipo[seg.tipo_seguidor] = (analysis.por_tipo[seg.tipo_seguidor] || 0) + 1;
        
        // Por engagement
        if (seg.potencial_engagement === 'Alto') analysis.por_engagement.alto++;
        else if (seg.potencial_engagement === 'Medio') analysis.por_engagement.medio++;
        else analysis.por_engagement.bajo++;
        
        // Recomendaciones únicas
        if (seg.recomendacion_contenido && !analysis.recomendaciones.includes(seg.recomendacion_contenido)) {
          analysis.recomendaciones.push(seg.recomendacion_contenido);
        }
      });

      res.json({
        success: true,
        email,
        analysis: analysis,
        data: result.rows
      });
    } catch (error) {
      console.error('Error en análisis de seguidores:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al analizar seguidores' 
      });
    }
  },

  // GET /api/members/stats - Estadísticas globales
  async getStats(req, res) {
    try {
      // Consultas en paralelo para mejor performance
      const [
        miembros,
        estudiantes,
        egresados,
        profesores,
        administrativos,
        obreros,
        grupos,
        eventos
      ] = await Promise.all([
        db.query('SELECT COUNT(*) FROM soyucab.miembro WHERE estado_cuenta = $1', ['activa']),
        db.query('SELECT COUNT(*) FROM soyucab.estudiante'),
        db.query('SELECT COUNT(*) FROM soyucab.egresado'),
        db.query('SELECT COUNT(*) FROM soyucab.profesor'),
        db.query('SELECT COUNT(*) FROM soyucab.personal_administrativo'),
        db.query('SELECT COUNT(*) FROM soyucab.personal_obrero'),
        db.query('SELECT COUNT(*) FROM soyucab.grupo WHERE estado = $1', ['activo']),
        db.query('SELECT COUNT(*) FROM soyucab.evento WHERE estado_evento = $1', ['publicado'])
      ]);

      // Estadísticas de crecimiento
      const crecimiento = await db.query(`
        SELECT 
          COUNT(*) as nuevos_hoy,
          COUNT(CASE WHEN fecha_registro >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as nuevos_semana,
          COUNT(CASE WHEN fecha_registro >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nuevos_mes
        FROM soyucab.miembro
        WHERE estado_cuenta = 'activa'
      `);

      // Top facultades de estudiantes
      const topFacultades = await db.query(`
        SELECT facultad, COUNT(*) as cantidad
        FROM soyucab.estudiante
        GROUP BY facultad
        ORDER BY cantidad DESC
        LIMIT 5
      `);

      // Top empresas de egresados
      const topEmpresas = await db.query(`
        SELECT empresa_actual, COUNT(*) as cantidad
        FROM soyucab.egresado
        WHERE empresa_actual IS NOT NULL
        GROUP BY empresa_actual
        ORDER BY cantidad DESC
        LIMIT 5
      `);

      res.json({
        success: true,
        data: {
          totales: {
            miembros: parseInt(miembros.rows[0].count),
            estudiantes: parseInt(estudiantes.rows[0].count),
            egresados: parseInt(egresados.rows[0].count),
            profesores: parseInt(profesores.rows[0].count),
            administrativos: parseInt(administrativos.rows[0].count),
            obreros: parseInt(obreros.rows[0].count),
            grupos: parseInt(grupos.rows[0].count),
            eventos: parseInt(eventos.rows[0].count)
          },
          crecimiento: {
            hoy: parseInt(crecimiento.rows[0].nuevos_hoy),
            semana: parseInt(crecimiento.rows[0].nuevos_semana),
            mes: parseInt(crecimiento.rows[0].nuevos_mes)
          },
          distribucion: {
            top_facultades: topFacultades.rows,
            top_empresas: topEmpresas.rows
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener estadísticas' 
      });
    }
  },

  // PUT /api/members/:email - Actualizar miembro
  async updateMember(req, res) {
    try {
      const { email } = req.params;
      const updates = req.body;

      // Verificar que el miembro existe
      const memberCheck = await db.query(
        'SELECT 1 FROM soyucab.miembro WHERE email = $1',
        [email]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Miembro no encontrado'
        });
      }

      await db.query('BEGIN');

      try {
        // Campos que se pueden actualizar en miembro
        const miembroFields = ['telefono', 'biografia', 'estado_cuenta', 'privacidad_perfil', 'nombre_usuario'];
        const miembroUpdates = {};
        
        miembroFields.forEach(field => {
          if (updates[field] !== undefined) {
            miembroUpdates[field] = updates[field];
          }
        });

        if (Object.keys(miembroUpdates).length > 0) {
          const setClause = Object.keys(miembroUpdates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
          
          const values = [email, ...Object.values(miembroUpdates)];
          
          await db.query(
            `UPDATE soyucab.miembro SET ${setClause} WHERE email = $1`,
            values
          );
        }

        // Campos que se pueden actualizar en persona
        const personaFields = ['nombres', 'apellidos', 'ocupacion_actual', 'empresa_actual', 'influencer', 'tutor'];
        const personaUpdates = {};
        
        personaFields.forEach(field => {
          if (updates[field] !== undefined) {
            personaUpdates[field] = updates[field];
          }
        });

        if (Object.keys(personaUpdates).length > 0) {
          const setClause = Object.keys(personaUpdates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
          
          const values = [email, ...Object.values(personaUpdates)];
          
          await db.query(
            `UPDATE soyucab.persona SET ${setClause} WHERE email_persona = $1`,
            values
          );
        }

        // Si se actualiza la contraseña
        if (updates.contraseña) {
          // El propietario debe enviar su contraseña actual; un admin puede cambiar sin currentPassword
          const requester = req.user && req.user.email;
          if (!requester) {
            return res.status(401).json({ success: false, error: 'Token inválido' });
          }

          if (requester === email) {
            if (!updates.currentPassword) {
              return res.status(400).json({ success: false, error: 'Se requiere la contraseña actual para cambiar la contraseña' });
            }
            const pwRes = await db.query('SELECT contraseña FROM soyucab.miembro WHERE email = $1', [email]);
            const storedHash = pwRes.rows[0].contraseña;
            const match = await bcrypt.compare(updates.currentPassword, storedHash);
            if (!match) {
              return res.status(401).json({ success: false, error: 'Contraseña actual incorrecta' });
            }
          }

          const hashedPassword = await bcrypt.hash(updates.contraseña, 10);
          await db.query(
            'UPDATE soyucab.miembro SET contraseña = $1 WHERE email = $2',
            [hashedPassword, email]
          );

          // Eliminar currentPassword del body por seguridad
          delete updates.currentPassword;
        }

        await db.query('COMMIT');

        // Obtener el miembro actualizado (persona puede no existir)
        const updatedMember = await db.query(
          `SELECT m.*, p.* 
           FROM soyucab.miembro m
           LEFT JOIN soyucab.persona p ON m.email = p.email_persona
           WHERE m.email = $1`,
          [email]
        );

        if (updatedMember.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Miembro no encontrado tras actualización' });
        }

        const { contraseña, ...memberData } = updatedMember.rows[0];

        res.json({
          success: true,
          message: 'Miembro actualizado exitosamente',
          data: memberData
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error actualizando miembro:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar miembro'
      });
    }
  },

  // DELETE /api/members/:email - Desactivar miembro
  async deactivateMember(req, res) {
    try {
      const { email } = req.params;

      const result = await db.query(
        `UPDATE soyucab.miembro 
         SET estado_cuenta = 'inactiva' 
         WHERE email = $1 
         RETURNING email, nombre_usuario, estado_cuenta`,
        [email]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Miembro no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Miembro desactivado exitosamente',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error desactivando miembro:', error);
      res.status(500).json({
        success: false,
        error: 'Error al desactivar miembro'
      });
    }
  }
};

module.exports = memberController;