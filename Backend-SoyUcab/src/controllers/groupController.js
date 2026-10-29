const db = require('../config/database');

const groupController = {
    // POST /api/groups - Crear grupo
    async createGroup(req, res) {
        const { nombre, descripcion, categoria, requisitos_ingreso, privacidad } = req.body;
        const creatorEmail = req.user && req.user.email;

        if (!creatorEmail) {
        return res.status(401).json({ success: false, error: 'Autenticación requerida' });
        }

        if (!nombre) {
        return res.status(400).json({ success: false, error: 'El nombre del grupo es obligatorio' });
        }

        const client = await db.pool.connect();
        try {
        // Verificar que no exista
        const exists = await client.query('SELECT 1 FROM soyucab.grupo WHERE nombre = $1', [nombre]);
        if (exists.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'Nombre de grupo ya existe' });
        }

        await client.query('BEGIN');

        const estadoGrupo = req.body.estado || 'activo';
        const insertGroupText = `INSERT INTO soyucab.grupo (nombre, descripcion, categoria, requisitos_ingreso, estado, privacidad, email, cantidad_miembros)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0) RETURNING *`;
        const groupRes = await client.query(insertGroupText, [nombre, descripcion, categoria, requisitos_ingreso || null, estadoGrupo, privacidad || 'publico', creatorEmail]);

        // Insertar pertenencia del creador como administrador
        const insertMemberText = `INSERT INTO soyucab.pertenece_a_grupo (email_miembro, nombre_grupo, rol_grupo, estado_participante)
            VALUES ($1, $2, 'administrador', 'activo') ON CONFLICT DO NOTHING`;
        await client.query(insertMemberText, [creatorEmail, nombre]);

        // Actualizar contador de miembros (reconteo para consistencia)
        await client.query(`UPDATE soyucab.grupo SET cantidad_miembros = (
            SELECT COUNT(*) FROM soyucab.pertenece_a_grupo WHERE nombre_grupo = $1
        ) WHERE nombre = $1`, [nombre]);

        await client.query('COMMIT');

        return res.status(201).json({ success: true, data: groupRes.rows[0] });
        } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando grupo:', error);
        res.status(500).json({ success: false, error: 'Error al crear grupo' });
        } finally {
        client.release();
        }
    },

    // POST /api/groups/:name/join - Unirse a grupo
    async joinGroup(req, res) {
        const groupName = req.params.name;
        const userEmail = req.user && req.user.email;

        if (!userEmail) {
        return res.status(401).json({ success: false, error: 'Autenticación requerida' });
        }

        const client = await db.pool.connect();
        try {
        const groupResult = await client.query('SELECT privacidad FROM soyucab.grupo WHERE nombre = $1', [groupName]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
        }

        const privacidad = groupResult.rows[0].privacidad;

        // Verificar si ya es miembro activo
        const membership = await client.query(
            `SELECT * FROM soyucab.pertenece_a_grupo WHERE email_miembro = $1 AND nombre_grupo = $2`,
            [userEmail, groupName]
        );
        if (membership.rows.length > 0 && membership.rows[0].estado_participante === 'activo') {
            return res.status(409).json({ success: false, error: 'Ya eres miembro del grupo' });
        }

        if (privacidad === 'publico') {
            await client.query('BEGIN');
            await client.query(`INSERT INTO soyucab.pertenece_a_grupo (email_miembro, nombre_grupo, rol_grupo, estado_participante)
            VALUES ($1, $2, 'miembro', 'activo') ON CONFLICT DO NOTHING`, [userEmail, groupName]);

            await client.query(`UPDATE soyucab.grupo SET cantidad_miembros = (
            SELECT COUNT(*) FROM soyucab.pertenece_a_grupo WHERE nombre_grupo = $1
            ) WHERE nombre = $1`, [groupName]);

            await client.query('COMMIT');
            return res.json({ success: true, message: 'Te uniste al grupo' });
        }

        if (privacidad === 'privado') {
            // Crear solicitud de unirse (si no existe pendiente)
            await client.query(`INSERT INTO soyucab.solicitud_unirse_grupo (nombre_grupo, email_miembro)
            VALUES ($1, $2) ON CONFLICT DO NOTHING`, [groupName, userEmail]);

            return res.status(202).json({ success: true, message: 'Solicitud enviada (pendiente de aprobación)' });
        }

        // secreto
        return res.status(403).json({ success: false, error: 'Grupo secreto. Se requiere invitación.' });
        } catch (error) {
        console.error('Error al unirse al grupo:', error);
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: 'Error al procesar solicitud' });
        } finally {
        client.release();
        }
    },

    // GET /api/groups/mine - Listar grupos del usuario autenticado
    async getMyGroups(req, res) {
        try {
        const userEmail = req.user && req.user.email;
        if (!userEmail) {
            return res.status(401).json({ success: false, error: 'Autenticación requerida' });
        }

        const result = await db.query(
            `SELECT g.nombre, g.descripcion, g.categoria, g.privacidad, g.fecha_creacion, g.requisitos_ingreso, g.estado AS estado_grupo, pag.rol_grupo, pag.fecha_union, pag.estado_participante
            FROM soyucab.pertenece_a_grupo pag
            JOIN soyucab.grupo g ON g.nombre = pag.nombre_grupo
            WHERE pag.email_miembro = $1 AND pag.estado_participante = 'activo'`,
            [userEmail]
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
        } catch (error) {
        console.error('Error obteniendo grupos del usuario:', error);
        res.status(500).json({ success: false, error: 'Error al obtener grupos' });
        }
    },

    // GET /api/groups/:name - Obtener detalles de un grupo
    async getGroupDetails(req, res) {
        try {
            const { name } = req.params;

            const groupRes = await db.query(
                `SELECT g.nombre, g.descripcion, g.fecha_creacion, g.cantidad_miembros, g.requisitos_ingreso, g.estado AS estado_grupo, g.categoria, g.email as creador_email,
                        m.nombre_usuario AS creador_nombre
                 FROM soyucab.grupo g
                 LEFT JOIN soyucab.miembro m ON g.email = m.email
                 WHERE g.nombre = $1`,
                [name]
            );

            if (groupRes.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
            }

            const group = groupRes.rows[0];

            // Obtener admins (administrador y moderador)
            const adminsRes = await db.query(
                `SELECT pag.email_miembro, pag.rol_grupo, m.nombre_usuario
                 FROM soyucab.pertenece_a_grupo pag
                 LEFT JOIN soyucab.miembro m ON pag.email_miembro = m.email
                 WHERE pag.nombre_grupo = $1 AND pag.rol_grupo IN ('administrador', 'moderador')`,
                [name]
            );

            res.json({ success: true, data: { ...group, admins: adminsRes.rows } });
        } catch (error) {
            console.error('Error obteniendo detalles del grupo:', error);
            res.status(500).json({ success: false, error: 'Error al obtener detalles del grupo' });
        }
    },

    // GET /api/groups/:name/posts - Obtener publicaciones del grupo (solo de miembros activos)
    async getGroupPosts(req, res) {
        try {
            const { name } = req.params;

            const postsRes = await db.query(
                `SELECT p.*, m.nombre_usuario AS publicador_nombre
                 FROM soyucab.publicacion p
                 JOIN soyucab.miembro m ON p.email_publicador = m.email
                 JOIN soyucab.pertenece_a_grupo pag ON pag.email_miembro = p.email_publicador AND pag.nombre_grupo = p.nombre_grupo_publicado
                 WHERE p.nombre_grupo_publicado = $1 AND pag.estado_participante = 'activo'
                 ORDER BY p.fecha_publicacion DESC`,
                [name]
            );

            res.json({ success: true, count: postsRes.rows.length, data: postsRes.rows });
        } catch (error) {
            console.error('Error obteniendo publicaciones del grupo:', error);
            res.status(500).json({ success: false, error: 'Error al obtener publicaciones del grupo' });
        }
    },

    // PUT /api/groups/:name - Actualizar datos del grupo (solo administradores)
    async updateGroup(req, res) {
        try {
            const { name } = req.params;
            const requester = req.user && req.user.email;

            if (!requester) return res.status(401).json({ success: false, error: 'Autenticación requerida' });

            // Verificar que el grupo exista
            const groupRes = await db.query('SELECT * FROM soyucab.grupo WHERE nombre = $1', [name]);
            if (groupRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
            const group = groupRes.rows[0];

            // Verificar que requester sea administrador del grupo
            const adminCheck = await db.query(
                `SELECT * FROM soyucab.pertenece_a_grupo WHERE nombre_grupo = $1 AND email_miembro = $2 AND rol_grupo = 'administrador' AND estado_participante = 'activo'`,
                [name, requester]
            );

            if (adminCheck.rows.length === 0 && requester !== group.email) {
                return res.status(403).json({ success: false, error: 'Acceso denegado. Solo administradores pueden actualizar el grupo.' });
            }

            // Campos permitidos a actualizar
            const allowed = ['descripcion', 'requisitos_ingreso', 'estado', 'privacidad', 'categoria'];
            const updates = {};
            allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
            }

            // Actualizar
            const setClause = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
            const values = [name, ...Object.values(updates)];

            const updated = await db.query(`UPDATE soyucab.grupo SET ${setClause} WHERE nombre = $1 RETURNING nombre, descripcion, fecha_creacion, cantidad_miembros, requisitos_ingreso, estado AS estado_grupo, categoria, email`, values);

            res.json({ success: true, message: 'Grupo actualizado', data: updated.rows[0] });
        } catch (error) {
            console.error('Error actualizando grupo:', error);
            res.status(500).json({ success: false, error: 'Error al actualizar grupo' });
        }
    }
};

module.exports = groupController;
