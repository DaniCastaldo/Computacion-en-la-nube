const db = require('../config/database');

const memberController = {
  // GET /api/members - Obtener todos los miembros
  async getAllMembers(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;
      const offset = (page - 1) * limit;

      const result = await db.query(
        `SELECT 
          m.email,
          m.nombre_usuario,
          m.estado_cuenta,
          m.privacidad_perfil,
          m.fecha_registro,
          p.nombres,
          p.apellidos,
          p.ci,
          p.sexo,
          p.fecha_nacimiento,
          CASE 
            WHEN e.email_estudiante IS NOT NULL THEN 'Estudiante'
            WHEN eg.email_egresado IS NOT NULL THEN 'Egresado'
            WHEN pr.email_persona IS NOT NULL THEN 'Profesor'
            ELSE 'Miembro'
          END as tipo_miembro
         FROM soyucab.miembro m
         JOIN soyucab.persona p ON m.email = p.email_persona
         LEFT JOIN soyucab.estudiante e ON m.email = e.email_estudiante
         LEFT JOIN soyucab.egresado eg ON m.email = eg.email_egresado
         LEFT JOIN soyucab.profesor pr ON m.email = pr.email_persona
         ORDER BY m.fecha_registro DESC
         LIMIT $1 OFFSET $2`,
        [parseInt(limit), parseInt(offset)]
      );

      const countResult = await db.query('SELECT COUNT(*) FROM soyucab.miembro');

      res.json({
        success: true,
        count: result.rows.length,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        data: result.rows
      });

    } catch (error) {
      console.error('❌ Error obteniendo miembros:', error);
      res.status(500).json({ success: false, error: 'Error al obtener miembros' });
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
          e.facultad,
          e.promedio,
          eg.facultad as facultad_egresado,
          eg.fecha_acto_grado,
          pr.categoria as categoria_profesor
         FROM soyucab.miembro m
         JOIN soyucab.persona p ON m.email = p.email_persona
         LEFT JOIN soyucab.estudiante e ON m.email = e.email_estudiante
         LEFT JOIN soyucab.egresado eg ON m.email = eg.email_egresado
         LEFT JOIN soyucab.profesor pr ON m.email = pr.email_persona
         WHERE m.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Miembro no encontrado' });
      }

      const { contraseña, ...memberData } = result.rows[0];

      res.json({ success: true, data: memberData });

    } catch (error) {
      console.error('❌ Error obteniendo miembro:', error);
      res.status(500).json({ success: false, error: 'Error al obtener miembro' });
    }
  },

  // POST /api/members - Crear miembro (nota: en producción usar bcrypt)
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
        privacidad_perfil = 'publico'
      } = req.body;

      if (!email || !nombre_usuario || !contraseña || !nombres || !apellidos || !ci) {
        return res.status(400).json({ success: false, error: 'Campos requeridos faltantes' });
      }

      const checks = await Promise.all([
        db.query('SELECT 1 FROM soyucab.miembro WHERE email = $1', [email]),
        db.query('SELECT 1 FROM soyucab.miembro WHERE nombre_usuario = $1', [nombre_usuario]),
        db.query('SELECT 1 FROM soyucab.persona WHERE ci = $1', [ci])
      ]);

      if (checks[0].rows.length > 0) return res.status(409).json({ success: false, error: 'Email ya registrado' });
      if (checks[1].rows.length > 0) return res.status(409).json({ success: false, error: 'Nombre de usuario en uso' });
      if (checks[2].rows.length > 0) return res.status(409).json({ success: false, error: 'CI ya registrada' });

      await db.query('BEGIN');

      try {
        const miembroResult = await db.query(
          `INSERT INTO soyucab.miembro 
           (email, telefono, biografia, estado_cuenta, privacidad_perfil, nombre_usuario, contraseña, fecha_registro)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING email, nombre_usuario, estado_cuenta, fecha_registro`,
          [email, telefono, biografia || '', estado_cuenta, privacidad_perfil, nombre_usuario, contraseña]
        );

        const personaResult = await db.query(
          `INSERT INTO soyucab.persona 
           (email_persona, ci, nombres, apellidos, sexo, fecha_nacimiento)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [email, ci, nombres, apellidos, sexo, fecha_nacimiento]
        );

        await db.query('COMMIT');

        res.status(201).json({
          success: true,
          message: 'Miembro creado exitosamente',
          data: { miembro: miembroResult.rows[0], persona: personaResult.rows[0] }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('❌ Error creando miembro:', error);
      res.status(500).json({ success: false, error: 'Error al crear miembro' });
    }
  },

  // GET /api/members/:email/followers-analysis - Análisis de seguidores
  async getFollowersAnalysis(req, res) {
    try {
      const { email } = req.params;

      const result = await db.callFunction('Analisis_Influencia_Segmentacion_Seguidores', [email]);

      res.json({
        success: true,
        email,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      console.error('❌ Error en análisis de seguidores:', error);
      res.status(500).json({ success: false, error: 'Error al analizar seguidores' });
    }
  },

  // GET /api/members/stats - Conteos globales para el test
  async getStats(req, res) {
    try {
      const miembros = await db.query('SELECT COUNT(*) FROM soyucab.miembro');
      const estudiantes = await db.query('SELECT COUNT(*) FROM soyucab.estudiante');
      const egresados = await db.query('SELECT COUNT(*) FROM soyucab.egresado');

      res.json({
        success: true,
        data: {
          miembros: parseInt(miembros.rows[0].count),
          estudiantes: parseInt(estudiantes.rows[0].count),
          egresados: parseInt(egresados.rows[0].count)
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
  }
};

module.exports = memberController;
