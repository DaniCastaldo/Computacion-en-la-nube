-- Crear schema si no existe
CREATE SCHEMA IF NOT EXISTS soyucab;

-- Establecer el schema por defecto
SET search_path TO soyucab, public;

-- Crear tipos ENUM en el schema soyucab
CREATE TYPE soyucab.estado_grupo AS ENUM (
    'activo',
    'inactivo',
    'archivado'
);

CREATE TYPE soyucab.categoria_grupo AS ENUM (
    'academico',
    'cultural',
    'deportivo',
    'profesional',
    'social',
    'privado'
);

CREATE TYPE soyucab.contenido AS ENUM (
    'texto',
    'imagen',
    'video',
    'archivo',
    'enlace'
);

CREATE TYPE soyucab.privacidadConfigP AS ENUM (
    'publico',
    'privado',
    'solo_relaciones'
);

CREATE TYPE soyucab.estado_participante AS ENUM (
    'activo',
    'inactivo',
    'expulsado'
);

CREATE TYPE soyucab.rol_grupo AS ENUM (
    'administrador',
    'moderador',
    'miembro'
);

CREATE TYPE soyucab.tipo_rol AS ENUM (
    'Estudiante',
    'Egresado',
    'Profesor',
    'Personal Administrativo',
    'Personal Obrero'
);

CREATE TYPE soyucab.estatus_rol AS ENUM (
    'Activo',
    'Inactivo',
    'Graduado',
    'Jubilado'
);

-- ENUMs para miembro
CREATE TYPE soyucab.estado_miembro AS ENUM (
    'activa',
    'inactiva',
    'suspendida',
    'eliminada'
);

CREATE TYPE soyucab.privacidad AS ENUM (
    'publico',
    'privado',
    'solo conexiones'
);

CREATE TYPE soyucab.genero AS ENUM ('M', 'F');

-- Crear tablas en el schema soyucab
CREATE TABLE soyucab.miembro (
    email VARCHAR(50) PRIMARY KEY,
    telefono integer,
    biografia TEXT,
    estado_cuenta soyucab.estado_miembro,
    privacidad_perfil soyucab.privacidad,
    fecha_registro TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    nombre_usuario VARCHAR(20) UNIQUE NOT NULL,
    contraseña VARCHAR(20) NOT NULL
);

CREATE TABLE soyucab.persona (
    email_persona VARCHAR(50) PRIMARY KEY,
    ci VARCHAR(10) UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    sexo soyucab.genero NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    ocupacion_actual VARCHAR(100),
    empresa_actual VARCHAR(100),
    influencer BOOLEAN DEFAULT FALSE,
    tutor BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_persona_miembro
        FOREIGN KEY(email_persona)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.seguimiento (
    email_seguidor VARCHAR(50) NOT NULL,
    email_seguido VARCHAR(50) NOT NULL,
    fecha_inicio TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (email_seguidor, email_seguido),
    CHECK (email_seguidor <> email_seguido),
    
    CONSTRAINT fk_seguidor_miembro
        FOREIGN KEY (email_seguidor)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_seguido_miembro
        FOREIGN KEY (email_seguido)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.rolInstitucional (
    email_persona VARCHAR(50) NOT NULL,
    tipo_rol soyucab.tipo_rol NOT NULL,
    fecha_inicio DATE NOT NULL,
    estatus soyucab.estatus_rol NOT NULL,
    fecha_finalizacion DATE,
    
    PRIMARY KEY (email_persona, tipo_rol, fecha_inicio),
    
    CONSTRAINT fk_hr_persona
        FOREIGN KEY (email_persona)
        REFERENCES soyucab.persona(email_persona)
        ON DELETE CASCADE,
        
    CONSTRAINT ck_fecha_valida
        CHECK (fecha_inicio <= fecha_finalizacion OR fecha_finalizacion IS NULL)
);

CREATE TABLE soyucab.grupo (
    nombre VARCHAR(50) PRIMARY KEY,
    descripcion TEXT,
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    cantidad_miembros INTEGER DEFAULT 1,
    requisitos_ingreso TEXT,
    estado soyucab.estado_grupo,
    categoria soyucab.categoria_grupo,
    email VARCHAR(50) NOT NULL,
    
    CONSTRAINT fk_email_creador
        FOREIGN KEY(email)
        REFERENCES soyucab.miembro(email)
);

CREATE TYPE soyucab.privacidad_grupo AS ENUM ('publico', 'privado', 'secreto');
ALTER TABLE soyucab.grupo ADD COLUMN IF NOT EXISTS privacidad soyucab.privacidad_grupo DEFAULT 'publico';

CREATE TYPE soyucab.estado_solicitud AS ENUM (
    'pendiente',
    'aceptada',
    'Rechazada'
);
CREATE TABLE soyucab.solicitud_unirse_grupo (
  id SERIAL PRIMARY KEY,
  nombre_grupo VARCHAR(100) NOT NULL,
  email_miembro VARCHAR(50) NOT NULL,
  estado soyucab.estado_solicitud DEFAULT 'pendiente',
  fecha_solicitud TIMESTAMP DEFAULT now(),
  FOREIGN KEY (nombre_grupo) REFERENCES soyucab.grupo(nombre),
  FOREIGN KEY (email_miembro) REFERENCES soyucab.miembro(email)
);

-- Trigger function: cuando una solicitud es aceptada, agregar al miembro al grupo y actualizar contador
CREATE OR REPLACE FUNCTION soyucab.procesar_solicitud_unirse_grupo()
RETURNS TRIGGER AS $$
BEGIN
    -- Manejar tanto INSERT como UPDATE
    IF (TG_OP = 'INSERT') THEN
        IF NEW.estado = 'aceptada' THEN
            INSERT INTO soyucab.pertenece_a_grupo (email_miembro, nombre_grupo, rol_grupo)
            VALUES (NEW.email_miembro, NEW.nombre_grupo, 'miembro')
            ON CONFLICT DO NOTHING;

            UPDATE soyucab.grupo
            SET cantidad_miembros = cantidad_miembros + 1
            WHERE nombre = NEW.nombre_grupo;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Si pasa de no-aceptada a aceptada
        IF (OLD.estado IS DISTINCT FROM 'aceptada') AND (NEW.estado = 'aceptada') THEN
            INSERT INTO soyucab.pertenece_a_grupo (email_miembro, nombre_grupo, rol_grupo)
            VALUES (NEW.email_miembro, NEW.nombre_grupo, 'miembro')
            ON CONFLICT DO NOTHING;

            UPDATE soyucab.grupo
            SET cantidad_miembros = cantidad_miembros + 1
            WHERE nombre = NEW.nombre_grupo;
        END IF;

        -- Si pasa de aceptada a Rechazada o se expulsa, opcionalmente podríamos decrementar contador
        -- No hacemos decremento automático aquí para evitar inconsistencias si el miembro fue eliminado manualmente.
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_procesar_solicitud
AFTER INSERT OR UPDATE OF estado ON soyucab.solicitud_unirse_grupo
FOR EACH ROW
EXECUTE FUNCTION soyucab.procesar_solicitud_unirse_grupo();

-- Procedimiento: aprobar solicitud (invocado por la lógica de negocio - por ejemplo desde backend)
CREATE OR REPLACE PROCEDURE soyucab.aprobar_solicitud_unirse(p_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_nombre VARCHAR(100);
    v_email VARCHAR(50);
BEGIN
    SELECT nombre_grupo, email_miembro INTO v_nombre, v_email
    FROM soyucab.solicitud_unirse_grupo
    WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud con id % no encontrada', p_id;
    END IF;

    UPDATE soyucab.solicitud_unirse_grupo
    SET estado = 'aceptada'
    WHERE id = p_id;
    -- El trigger se encarga de insertar en pertenece_a_grupo y actualizar contador
END;
$$;

-- Procedimiento: rechazar solicitud
CREATE OR REPLACE PROCEDURE soyucab.rechazar_solicitud_unirse(p_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE soyucab.solicitud_unirse_grupo
    SET estado = 'Rechazada'
    WHERE id = p_id;
END;
$$;

CREATE TABLE soyucab.publicacion (
    fecha_publicacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    caption TEXT,
    tipo_contenido soyucab.contenido,
    descripcion_publicacion TEXT,
    configuracion_privacidad soyucab.privacidadConfigP,
    contador_comentarios INTEGER DEFAULT 0,
    contador_compartidos INTEGER DEFAULT 0,
    imagen VARCHAR(100),
    video VARCHAR(100),
    email_publicador VARCHAR(50) NOT NULL,
    nombre_grupo_publicado VARCHAR(50) NULL,

    PRIMARY KEY (email_publicador, fecha_publicacion),
    
    CONSTRAINT fk_publicador_email
        FOREIGN KEY(email_publicador)
        REFERENCES soyucab.miembro(email)
);

CREATE TABLE soyucab.pertenece_a_grupo (
    email_miembro VARCHAR(50) NOT NULL,
    nombre_grupo VARCHAR(50) NOT NULL,
    rol_grupo soyucab.rol_grupo DEFAULT 'miembro',
    fecha_union TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    estado_participante soyucab.estado_participante DEFAULT 'activo',
    
    PRIMARY KEY (email_miembro, nombre_grupo),
    
    CONSTRAINT fk_miembro_email
        FOREIGN KEY (email_miembro)
        REFERENCES soyucab.miembro(email),
        
    CONSTRAINT fk_grupo_nombre
        FOREIGN KEY (nombre_grupo)
        REFERENCES soyucab.grupo(nombre)
);

CREATE OR REPLACE FUNCTION soyucab.verificar_pertenencia_grupo_publicacion()
RETURNS TRIGGER AS $$
DECLARE
    existe_pertenencia BOOLEAN;
BEGIN
    IF NEW.nombre_grupo_publicado IS NULL THEN
        RETURN NEW;
    END IF;
    
    SELECT EXISTS (
        SELECT 1
        FROM soyucab.pertenece_a_grupo pag
        WHERE pag.email_miembro = NEW.email_publicador
          AND pag.nombre_grupo = NEW.nombre_grupo_publicado
    ) INTO existe_pertenencia;

    IF NOT existe_pertenencia THEN
        RAISE EXCEPTION 'ERROR DE REGLA DE NEGOCIO (SOYUCAB): El miembro con email % no pertenece al grupo %.',
            NEW.email_publicador, NEW.nombre_grupo_publicado;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_publicacion_solo_miembro
BEFORE INSERT ON soyucab.publicacion
FOR EACH ROW
EXECUTE FUNCTION soyucab.verificar_pertenencia_grupo_publicacion();

CREATE TABLE soyucab.estudiante (
    email_estudiante VARCHAR(50) PRIMARY KEY,
    ci_estudiante VARCHAR(10) UNIQUE NOT NULL,
    semestre integer CHECK (semestre BETWEEN 1 AND 10),
    carrera_programa VARCHAR(100) NOT NULL,
    facultad VARCHAR(100) NOT NULL,
    promedio numeric(4,2) CHECK (promedio >= 0.00 AND promedio <=20.00),

    CONSTRAINT chk_email_dominio
        CHECK (email_estudiante LIKE '%@est.ucab.edu.ve'),

    CONSTRAINT fk_estudiante_persona
        FOREIGN KEY(email_estudiante)
        REFERENCES soyucab.persona(email_persona)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.egresado (
    facultad VARCHAR(100) NOT NULL,
    fecha_acto_grado Date,
    pais VARCHAR(2),
    estado VARCHAR(15),
    email_egresado VARCHAR(50),
    ci_egresado VARCHAR(10),

    PRIMARY KEY (email_egresado, ci_egresado),

    CONSTRAINT fk_egresado_persona
        FOREIGN KEY(email_egresado)
        REFERENCES soyucab.persona(email_persona)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.titulo_obtenido (
    email_egresado VARCHAR(50),
    ci_egresado VARCHAR(10),
    nombre_titulo VARCHAR(100) NOT NULL,

    PRIMARY KEY (email_egresado, ci_egresado, nombre_titulo),

    CONSTRAINT fk_titulo_egresado
        FOREIGN KEY(email_egresado, ci_egresado)
        REFERENCES soyucab.egresado(email_egresado, ci_egresado)
        ON DELETE CASCADE
);

CREATE TYPE soyucab.tipo_notif AS ENUM (
    'sistema',
    'relacion',
    'grupo',
    'evento',
    'publicacion',
    'anuncio'
);

CREATE TYPE soyucab.estado_notificacion AS ENUM (
    'pendiente',
    'entregada',
    'leida'
);

CREATE TYPE soyucab.prioridad_notif AS ENUM (
    'alta',
    'baja',
    'media'
);

CREATE TABLE soyucab.notificacion (
    email_destino VARCHAR(50),
    email_envia VARCHAR(50),
    fecha_hora TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    titulo VARCHAR(100),
    contenido TEXT,
    tipo_notificacion soyucab.tipo_notif,
    estado soyucab.estado_notificacion,
    prioridad soyucab.prioridad_notif DEFAULT 'media',

    PRIMARY KEY (email_destino, email_envia, fecha_hora),

    CONSTRAINT fk_email_destino
        FOREIGN KEY(email_destino)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,

    CONSTRAINT fk_email_envia
        FOREIGN KEY(email_envia)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE
);

CREATE TYPE soyucab.estado_evento AS ENUM (
    'borrador',
    'publicado',
    'en_curso',
    'finalizado',
    'cancelado'
);

CREATE TYPE soyucab.modalidad_evento AS ENUM (
    'presencial',
    'virtual',
    'hibrido'
);

CREATE TYPE soyucab.categoria_evento AS ENUM (
    'conferencia',
    'taller',
    'webinar',
    'acto_de_grado',
    'encuentro_de_egresados',
    'deportivo',
    'cultural'
);

CREATE TABLE soyucab.evento (
    ubicacion UUID,
    email_creador_evento VARCHAR(50) NOT NULL,
    fecha_hora_inicio TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    tipo_evento VARCHAR(100) NOT NULL,
    fecha_hora_fin TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria soyucab.categoria_evento NOT NULL,
    modalidad soyucab.modalidad_evento NOT NULL,
    enlace_virtual VARCHAR(255),
    aforo_maximo INTEGER CHECK (aforo_maximo > 0 OR aforo_maximo IS NULL),
    costo_inscripcion NUMERIC(10,2) CHECK (costo_inscripcion >= 0 OR costo_inscripcion IS NULL),
    instrucciones TEXT,
    estado_evento soyucab.estado_evento DEFAULT 'borrador',
    visibilidad BOOLEAN DEFAULT FALSE,
    
    PRIMARY KEY (ubicacion, fecha_hora_inicio),
    
    CONSTRAINT fk_evento_miembro
        FOREIGN KEY(email_creador_evento)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,
        
    CONSTRAINT ck_fecha_evento
        CHECK (fecha_hora_fin > fecha_hora_inicio)
);

CREATE TABLE soyucab.miembro_participa_evento (
    ubicacion UUID,
    fecha_hora_inicio TIMESTAMP WITHOUT TIME ZONE,
    email_miembro VARCHAR(50),
    estado_participacion VARCHAR(20) NOT NULL,
    
    PRIMARY KEY (ubicacion, fecha_hora_inicio, email_miembro),
    
    CONSTRAINT fk_participa_evento
        FOREIGN KEY(ubicacion, fecha_hora_inicio)
        REFERENCES soyucab.evento(ubicacion, fecha_hora_inicio)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_participa_miembro
        FOREIGN KEY(email_miembro)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE
);

CREATE TYPE soyucab.tipo_conversacion AS ENUM (
    'individual',
    'grupal'
);

CREATE TYPE soyucab.estado_conversacion AS ENUM (
    'activa',
    'archivada'
);

CREATE TYPE soyucab.tipo_mensaje AS ENUM (
    'texto',
    'imagen',
    'archivo',
    'video',
    'audio'
);

CREATE TYPE soyucab.estado_mensaje AS ENUM (
    'enviado',
    'leido',
    'error'
);

CREATE TABLE soyucab.conversacion (
    ci_iniciador VARCHAR(10) NOT NULL,
    fecha_inicio TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    titulo VARCHAR(100),
    tipo_conversacion soyucab.tipo_conversacion DEFAULT 'individual',
    ultimo_mensaje TEXT,
    fecha_ultimo_mensaje TIMESTAMP WITHOUT TIME ZONE,
    estado_conversacion soyucab.estado_conversacion DEFAULT 'activa',
    
    PRIMARY KEY (ci_iniciador, fecha_inicio),
    
    CONSTRAINT fk_conversacion_persona
        FOREIGN KEY(ci_iniciador)
        REFERENCES soyucab.persona(ci)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.participante_conversacion (
    ci_iniciador VARCHAR(10),
    fecha_inicio TIMESTAMP WITHOUT TIME ZONE,
    ci_participante VARCHAR(10),
    
    PRIMARY KEY (ci_iniciador, fecha_inicio, ci_participante),
    
    CONSTRAINT fk_participante_conversacion
        FOREIGN KEY(ci_iniciador, fecha_inicio)
        REFERENCES soyucab.conversacion(ci_iniciador, fecha_inicio)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_participante_persona
        FOREIGN KEY(ci_participante)
        REFERENCES soyucab.persona(ci)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.mensaje (
    ci_creador_conversacion VARCHAR(10) NOT NULL,
    fecha_creacion_conversacion TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ci_remitente VARCHAR(10) NOT NULL,
    fecha_envio TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    contenido TEXT NOT NULL,
    tipo_mensaje soyucab.tipo_mensaje DEFAULT 'texto',
    archivos_adjuntos JSON,
    fecha_hora_leido TIMESTAMP WITHOUT TIME ZONE,
    estado_mensaje soyucab.estado_mensaje DEFAULT 'enviado',
    
    PRIMARY KEY (ci_creador_conversacion, fecha_creacion_conversacion, ci_remitente, fecha_envio),
    
    CONSTRAINT fk_mensaje_conversacion
        FOREIGN KEY(ci_creador_conversacion, fecha_creacion_conversacion)
        REFERENCES soyucab.conversacion(ci_iniciador, fecha_inicio)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_mensaje_persona
        FOREIGN KEY(ci_remitente)
        REFERENCES soyucab.persona(ci)
        ON DELETE CASCADE
);

CREATE TYPE soyucab.estado_dependencia AS ENUM (
    'activa',
    'inactiva'
);

CREATE TABLE soyucab.dependencia_ucab (
    nombre_institucional VARCHAR(100) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT NOT NULL CHECK (LENGTH(descripcion) BETWEEN 50 AND 500),
    logo VARCHAR(255),
    pagina_web VARCHAR(255) CHECK (pagina_web LIKE 'https://%'),
    fecha_creacion DATE,
    estado soyucab.estado_dependencia DEFAULT 'activa',
    responsable VARCHAR(100),
    ubicacion_fisica TEXT,
    edificio VARCHAR(50),
    
    CONSTRAINT fk_dependencia_miembro
        FOREIGN KEY(email)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.tipo_dependencia (
    nombre_tipo VARCHAR(50) PRIMARY KEY,
    descripcion TEXT
);

CREATE TABLE soyucab.es_tipo (
    codigo_institucional VARCHAR(100),
    nombre_tipo VARCHAR(50),
    
    PRIMARY KEY (codigo_institucional, nombre_tipo),
    
    CONSTRAINT fk_es_tipo_dependencia
        FOREIGN KEY(codigo_institucional)
        REFERENCES soyucab.dependencia_ucab(nombre_institucional)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_es_tipo_tipo_dependencia
        FOREIGN KEY(nombre_tipo)
        REFERENCES soyucab.tipo_dependencia(nombre_tipo)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.organizacion_asociada (
    rif VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    logo VARCHAR(255),
    pagina_web VARCHAR(255) CHECK (pagina_web LIKE 'https://%'),
    descripcion TEXT,
    tipos_colaboracion JSON,
    
    CONSTRAINT fk_organizacion_miembro
        FOREIGN KEY(email)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.tipo_organizacion (
    nombre_tipo VARCHAR(50) PRIMARY KEY,
    descripcion TEXT
);

CREATE TABLE soyucab.es_tipo_organizacion (
    rif VARCHAR(50),
    nombre_tipo VARCHAR(50),
    
    PRIMARY KEY (rif, nombre_tipo),
    
    CONSTRAINT fk_es_tipo_org_organizacion
        FOREIGN KEY(rif)
        REFERENCES soyucab.organizacion_asociada(rif)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_es_tipo_org_tipo_organizacion
        FOREIGN KEY(nombre_tipo)
        REFERENCES soyucab.tipo_organizacion(nombre_tipo)
        ON DELETE CASCADE
);

CREATE TYPE soyucab.tipo_anuncio AS ENUM (
    'informativo',
    'laboral',
    'cultural',
    'academico'
);

CREATE TYPE soyucab.prioridad_anuncio AS ENUM (
    'baja',
    'media',
    'alta',
    'urgente'
);

CREATE TYPE soyucab.creador_tipo AS ENUM (
    'dependencia',
    'organizacion'
);

CREATE TYPE soyucab.estado_relacion AS ENUM (
    'pendiente',
    'aceptada',
    'rechazada',
    'bloqueada'
);

CREATE TYPE soyucab.estado_comentario AS ENUM (
    'visible',
    'oculto'
);

CREATE TYPE soyucab.estado_encuesta AS ENUM (
    'borrador',
    'publicada',
    'en_curso',
    'finalizada',
    'cerrada'
);

CREATE TYPE soyucab.tipo_encuestador AS ENUM (
    'dependencia',
    'organizacion'
);

CREATE TABLE soyucab.anuncio (
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    creador_email VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT,
    tipo_anuncio soyucab.tipo_anuncio,
    prioridad soyucab.prioridad_anuncio DEFAULT 'media',
    fecha_publicacion TIMESTAMP WITHOUT TIME ZONE,
    fecha_expiracion TIMESTAMP WITHOUT TIME ZONE,
    creador_tipo soyucab.creador_tipo NOT NULL,
    
    PRIMARY KEY (fecha_creacion, creador_email),
    
    CONSTRAINT fk_anuncio_miembro
        FOREIGN KEY (creador_email)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,
        
    CONSTRAINT ck_fecha_expiracion
        CHECK (fecha_expiracion > fecha_publicacion OR fecha_expiracion IS NULL)
);

CREATE TABLE soyucab.destinatarios (
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE,
    creador_email VARCHAR(50),
    valor TEXT,
    
    PRIMARY KEY (fecha_creacion, creador_email, valor),
    
    CONSTRAINT fk_destinatarios_anuncio
        FOREIGN KEY (fecha_creacion, creador_email)
        REFERENCES soyucab.anuncio(fecha_creacion, creador_email)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.etiquetas (
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE,
    creador_email VARCHAR(50),
    valor TEXT,
    
    PRIMARY KEY (fecha_creacion, creador_email, valor),
    
    CONSTRAINT fk_etiquetas_anuncio
        FOREIGN KEY (fecha_creacion, creador_email)
        REFERENCES soyucab.anuncio(fecha_creacion, creador_email)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.relacion (
    usuario_origen VARCHAR(50) NOT NULL,
    usuario_destino VARCHAR(50) NOT NULL,
    fecha_solicitud TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    fecha_establecimiento TIMESTAMP WITHOUT TIME ZONE,
    seguimiento BOOLEAN DEFAULT FALSE,
    estado soyucab.estado_relacion DEFAULT 'pendiente',
    es_simetrica BOOLEAN,
    permite_mensajeria BOOLEAN DEFAULT TRUE,
    
    PRIMARY KEY (usuario_origen, usuario_destino, fecha_solicitud),
    
    CONSTRAINT fk_relacion_origen
        FOREIGN KEY (usuario_origen)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_relacion_destino
        FOREIGN KEY (usuario_destino)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,
        
    CONSTRAINT ck_no_auto_relacion
        CHECK (usuario_origen <> usuario_destino)
);

CREATE TABLE soyucab.tipo_de_relacion (
    usuario_origen VARCHAR(50),
    usuario_destino VARCHAR(50),
    fecha_solicitud TIMESTAMP WITHOUT TIME ZONE,
    tipo VARCHAR(100),
    
    PRIMARY KEY (usuario_origen, usuario_destino, fecha_solicitud, tipo),
    
    CONSTRAINT fk_tipo_relacion_relacion
        FOREIGN KEY (usuario_origen, usuario_destino, fecha_solicitud)
        REFERENCES soyucab.relacion(usuario_origen, usuario_destino, fecha_solicitud)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.comentario (
    email_comentador VARCHAR(50) NOT NULL,
    email_creador_publicacion VARCHAR(50) NOT NULL,
    fecha_creacion_publicacion TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    contenido TEXT NOT NULL,
    fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE,
    estado_comentario soyucab.estado_comentario DEFAULT 'visible',
    editado BOOLEAN DEFAULT FALSE,
    
    PRIMARY KEY (email_comentador, email_creador_publicacion, fecha_creacion_publicacion),
    
    CONSTRAINT fk_comentario_miembro
        FOREIGN KEY (email_comentador)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_comentario_publicacion
        FOREIGN KEY (email_creador_publicacion, fecha_creacion_publicacion)
        REFERENCES soyucab.publicacion(email_publicador, fecha_publicacion)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.encuesta (
    tipo_encuesta VARCHAR(50),
    email_encuestador VARCHAR(50) NOT NULL,
    titulo VARCHAR(100),
    descripcion TEXT NOT NULL,
    tipo_encuestador soyucab.tipo_encuestador NOT NULL,
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    fecha_fin TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    estado_encuesta soyucab.estado_encuesta DEFAULT 'borrador',
    instrucciones TEXT,
    anonimato BOOLEAN DEFAULT TRUE,
    
    PRIMARY KEY (tipo_encuesta, titulo),
    
    CONSTRAINT fk_encuesta_miembro
        FOREIGN KEY (email_encuestador)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,
        
    CONSTRAINT ck_fecha_fin
        CHECK (fecha_fin > fecha_creacion)
);

CREATE TABLE soyucab.audiencia (
    tipo_encuesta VARCHAR(50),
    titulo VARCHAR(100),
    valor TEXT,
    
    PRIMARY KEY (tipo_encuesta, titulo, valor),
    
    CONSTRAINT fk_audiencia_encuesta
        FOREIGN KEY (tipo_encuesta, titulo)
        REFERENCES soyucab.encuesta(tipo_encuesta, titulo)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.requisitos_participacion (
    tipo_encuesta VARCHAR(50),
    titulo VARCHAR(100),
    valor TEXT,
    
    PRIMARY KEY (tipo_encuesta, titulo, valor),
    
    CONSTRAINT fk_requisitos_encuesta
        FOREIGN KEY (tipo_encuesta, titulo)
        REFERENCES soyucab.encuesta(tipo_encuesta, titulo)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.opcion (
    tipo_encuesta VARCHAR(50),
    titulo_encuesta VARCHAR(100),
    numero_opcion SMALLINT,
    email_encuestado VARCHAR(50),
    fecha_participacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    completada BOOLEAN DEFAULT FALSE,
    
    PRIMARY KEY (tipo_encuesta, titulo_encuesta, numero_opcion),
    
    CONSTRAINT fk_opcion_encuesta
        FOREIGN KEY (tipo_encuesta, titulo_encuesta)
        REFERENCES soyucab.encuesta(tipo_encuesta, titulo)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_opcion_persona
        FOREIGN KEY (email_encuestado)
        REFERENCES soyucab.persona(email_persona)
        ON DELETE SET NULL
);

CREATE TABLE soyucab.provoca (
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE,
    creador_email VARCHAR(50),
    email_destino VARCHAR(50),
    fecha_hora TIMESTAMP WITHOUT TIME ZONE,
    
    PRIMARY KEY (fecha_creacion, creador_email, email_destino, fecha_hora),
    
    CONSTRAINT fk_provoca_anuncio
        FOREIGN KEY (fecha_creacion, creador_email)
        REFERENCES soyucab.anuncio(fecha_creacion, creador_email)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_provoca_notificacion
        FOREIGN KEY (email_destino, creador_email, fecha_hora)
        REFERENCES soyucab.notificacion(email_destino, email_envia, fecha_hora)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.relacion_envia (
    usuario_origen VARCHAR(50),
    usuario_destino VARCHAR(50),
    fecha_solicitud TIMESTAMP WITHOUT TIME ZONE,
    email_destino VARCHAR(50),
    fecha_hora TIMESTAMP WITHOUT TIME ZONE,
    
    PRIMARY KEY (usuario_origen, usuario_destino, fecha_solicitud, email_destino, fecha_hora),
    
    CONSTRAINT fk_relacion_envia_relacion
        FOREIGN KEY (usuario_origen, usuario_destino, fecha_solicitud)
        REFERENCES soyucab.relacion(usuario_origen, usuario_destino, fecha_solicitud)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_relacion_envia_notificacion
        FOREIGN KEY (email_destino, usuario_origen, fecha_hora)
        REFERENCES soyucab.notificacion(email_destino, email_envia, fecha_hora)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.envia_una (
    email_creador_publicacion VARCHAR(50),
    email_comentador VARCHAR(50),
    fecha_creacion_publicacion TIMESTAMP WITHOUT TIME ZONE,
    email_destino VARCHAR(50),
    fecha_hora TIMESTAMP WITHOUT TIME ZONE,
    
    PRIMARY KEY (email_creador_publicacion, email_comentador, fecha_creacion_publicacion, email_destino, fecha_hora),
    
    CONSTRAINT fk_envia_una_comentario
        FOREIGN KEY (email_creador_publicacion, email_comentador, fecha_creacion_publicacion)
        REFERENCES soyucab.comentario(email_creador_publicacion, email_comentador, fecha_creacion_publicacion)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_envia_una_notificacion
        FOREIGN KEY (email_destino, email_comentador, fecha_hora)
        REFERENCES soyucab.notificacion(email_destino, email_envia, fecha_hora)
        ON DELETE CASCADE
);

-- Crear tipo ENUM para visibilidad
CREATE TYPE soyucab.visibilidad_portafolio AS ENUM ('Publico', 'Privado');

-- Crear tabla principal Portafolio
CREATE TABLE soyucab.Portafolio (
    ci_persona VARCHAR(10) NOT NULL,
    nombre_portafolio VARCHAR(50) NOT NULL,
    ultima_actualizacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    visibilidad soyucab.visibilidad_portafolio DEFAULT 'Publico',
    
    PRIMARY KEY (ci_persona),
    
    CONSTRAINT fk_portafolio_persona
        FOREIGN KEY (ci_persona)
        REFERENCES soyucab.persona(ci)
        ON DELETE CASCADE,
        
    CONSTRAINT uk_nombre_portafolio
        UNIQUE (nombre_portafolio)
);

-- Crear tablas para atributos multivaluados (JSON)
CREATE TABLE soyucab.Proyectos (
    ci_persona VARCHAR(10) NOT NULL,
    valor JSON NOT NULL,
    
    PRIMARY KEY (ci_persona),
    
    CONSTRAINT fk_proyectos_portafolio
        FOREIGN KEY (ci_persona)
        REFERENCES soyucab.Portafolio(ci_persona)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.Publicaciones_Academicas (
    ci_persona VARCHAR(10) NOT NULL,
    valor JSON NOT NULL,
    
    PRIMARY KEY (ci_persona),
    
    CONSTRAINT fk_publicaciones_portafolio
        FOREIGN KEY (ci_persona)
        REFERENCES soyucab.Portafolio(ci_persona)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.Certificaciones (
    ci_persona VARCHAR(10) NOT NULL,
    valor JSON NOT NULL,
    
    PRIMARY KEY (ci_persona),
    
    CONSTRAINT fk_certificaciones_portafolio
        FOREIGN KEY (ci_persona)
        REFERENCES soyucab.Portafolio(ci_persona)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.Experiencia_Laboral (
    ci_persona VARCHAR(10) NOT NULL,
    valor JSON NOT NULL,
    
    PRIMARY KEY (ci_persona),
    
    CONSTRAINT fk_experiencia_portafolio
        FOREIGN KEY (ci_persona)
        REFERENCES soyucab.Portafolio(ci_persona)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.Habilidades_Destacadas (
    ci_persona VARCHAR(10) NOT NULL,
    valor JSON NOT NULL,
    
    PRIMARY KEY (ci_persona),
    
    CONSTRAINT fk_habilidades_portafolio
        FOREIGN KEY (ci_persona)
        REFERENCES soyucab.Portafolio(ci_persona)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.Logros (
    ci_persona VARCHAR(10) NOT NULL,
    valor JSON NOT NULL,
    
    PRIMARY KEY (ci_persona),
    
    CONSTRAINT fk_logros_portafolio
        FOREIGN KEY (ci_persona)
        REFERENCES soyucab.Portafolio(ci_persona)
        ON DELETE CASCADE
);

-- Función del trigger corregida con schema soyucab
CREATE OR REPLACE FUNCTION soyucab.Verificar_relacion()
RETURNS TRIGGER AS $$
DECLARE
    es_dependencia_origen BOOLEAN;
    es_dependencia_destino BOOLEAN;
    es_persona_origen BOOLEAN;
    es_organizacion_origen BOOLEAN;
    es_organizacion_destino BOOLEAN;
BEGIN
    
    IF TG_OP = 'INSERT' THEN
        DELETE FROM soyucab.relacion
        WHERE usuario_origen = NEW.usuario_origen
          AND usuario_destino = NEW.usuario_destino;
    END IF;

    -- Determinar el rol de Origen y Destino
    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.dependencia_ucab d 
        WHERE d.email = NEW.usuario_origen
    ) INTO es_dependencia_origen;

    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.dependencia_ucab d 
        WHERE d.email = NEW.usuario_destino
    ) INTO es_dependencia_destino;
    
    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.persona p 
        WHERE p.email_persona = NEW.usuario_origen
    ) INTO es_persona_origen;

    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.organizacion_asociada o 
        WHERE o.email = NEW.usuario_origen
    ) INTO es_organizacion_origen;

    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.organizacion_asociada o 
        WHERE o.email = NEW.usuario_destino
    ) INTO es_organizacion_destino;

    -- REGLAS PARA RELACIONES QUE INVOLUCRAN DEPENDENCIAS U ORGANIZACIONES
    IF es_dependencia_origen OR es_dependencia_destino OR es_organizacion_origen OR es_organizacion_destino THEN
        -- Regla 1: Si hay dependencia/organización involucrada, debe ser SEGUIMIENTO
        NEW.es_simetrica := FALSE;
        NEW.seguimiento := TRUE;
        NEW.permite_mensajeria := FALSE;
        
        -- Regla 2: Dependencias NO pueden seguir a nadie (solo pueden ser seguidas)
        IF es_dependencia_origen THEN
            RAISE EXCEPTION 'ERROR: Las dependencias UCAB no pueden seguir a otros miembros. Solo pueden ser seguidas.';
        END IF;

        -- Regla 3: Si el DESTINO es una dependencia, se acepta inmediatamente
        IF es_dependencia_destino THEN
            NEW.estado := 'aceptada';
            NEW.fecha_establecimiento := NOW();
        END IF;
        
        -- Regla 4: Organizaciones pueden seguir dependencias y personas
        -- (esta es implícita - no necesita validación especial)
    END IF;
    
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER relacion_dependencia
BEFORE INSERT OR UPDATE ON soyucab.relacion
FOR EACH ROW
EXECUTE FUNCTION soyucab.Verificar_relacion();

-- Trigger para validar tipos de relación con dependencias
CREATE OR REPLACE FUNCTION soyucab.Verificar_tipo_relacion_dependencia()
RETURNS TRIGGER AS $$
DECLARE
    es_dependencia BOOLEAN;
    es_organizacion BOOLEAN;
BEGIN
    -- Verificar si el usuario_destino es una dependencia UCAB
    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.dependencia_ucab d 
        WHERE d.email = NEW.usuario_destino
    ) INTO es_dependencia;
    
    -- Verificar si el usuario_destino es una organización
    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.organizacion_asociada o 
        WHERE o.email = NEW.usuario_destino
    ) INTO es_organizacion;
    
    -- Si es una dependencia u organización, solo permitir tipo "seguimiento"
    IF (es_dependencia OR es_organizacion) AND NEW.tipo != 'seguimiento' THEN
        RAISE EXCEPTION 'ERROR: Las relaciones con dependencias UCAB u organizaciones solo pueden ser de tipo "seguimiento"';
    END IF;
    
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tipo_relacion_dependencia
BEFORE INSERT ON soyucab.tipo_de_relacion
FOR EACH ROW
EXECUTE FUNCTION soyucab.Verificar_tipo_relacion_dependencia();

-- Trigger para asegurar que cuando se crea una relación con seguimiento=TRUE,
-- automáticamente se cree el tipo_de_relacion correspondiente
CREATE OR REPLACE FUNCTION soyucab.Crear_tipo_relacion_automatico()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es una relación de seguimiento, crear automáticamente el tipo
    IF NEW.seguimiento = TRUE AND NEW.estado = 'aceptada' THEN
        INSERT INTO soyucab.tipo_de_relacion (usuario_origen, usuario_destino, fecha_solicitud, tipo)
        VALUES (NEW.usuario_origen, NEW.usuario_destino, NEW.fecha_solicitud, 'seguimiento')
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_tipo_relacion
AFTER INSERT OR UPDATE ON soyucab.relacion
FOR EACH ROW
WHEN (NEW.seguimiento = TRUE AND NEW.estado = 'aceptada')
EXECUTE FUNCTION soyucab.Crear_tipo_relacion_automatico();

-- Función de Análisis de Influencia y Segmentación de Seguidores
CREATE OR REPLACE FUNCTION soyucab.Analisis_Influencia_Segmentacion_Seguidores(
    p_email_miembro_seguido VARCHAR(50)
)
RETURNS TABLE (
    email_seguidor VARCHAR(50),
    nombre_usuario_seguidor VARCHAR,
    tipo_seguidor VARCHAR,
    area_interes VARCHAR,
    conteo_likes_hist INT,
    potencial_engagement VARCHAR,
    recomendacion_contenido VARCHAR
) AS
$$
BEGIN
    RETURN QUERY
    -- 1. Obtener lista de seguidores (usuarios que siguen al miembro dado)
    WITH Lista_Seguidores AS (
        SELECT 
            r.usuario_origen AS seg_email
        FROM soyucab.relacion r
        WHERE r.usuario_destino = p_email_miembro_seguido
        AND r.estado = 'aceptada'
        AND r.seguimiento = TRUE
    ),
    -- 2. Obtener Perfil de los Seguidores
    Perfil_Seguidores AS (
        SELECT
            ls.seg_email,
            m.nombre_usuario,
            -- Determinar tipo de seguidor
            CASE
                WHEN EXISTS (SELECT 1 FROM soyucab.persona p WHERE p.email_persona = ls.seg_email) THEN
                    CASE
                        WHEN EXISTS (SELECT 1 FROM soyucab.estudiante e WHERE e.email_estudiante = ls.seg_email) THEN 'Estudiante'
                        WHEN EXISTS (SELECT 1 FROM soyucab.egresado eg WHERE eg.email_egresado = ls.seg_email) THEN 'Egresado'
                        WHEN EXISTS (
                            SELECT 1 
                            FROM soyucab.rolInstitucional ri 
                            WHERE ri.email_persona = ls.seg_email 
                            AND ri.tipo_rol = 'Profesor' 
                            AND (ri.estatus = 'Activo' OR ri.estatus = 'Graduado')
                        ) THEN 'Profesor'
                        WHEN EXISTS (
                            SELECT 1 
                            FROM soyucab.rolInstitucional ri 
                            WHERE ri.email_persona = ls.seg_email 
                            AND ri.tipo_rol = 'Personal Administrativo'
                        ) THEN 'Personal Administrativo'
                        WHEN EXISTS (
                            SELECT 1 
                            FROM soyucab.rolInstitucional ri 
                            WHERE ri.email_persona = ls.seg_email 
                            AND ri.tipo_rol = 'Personal Obrero'
                        ) THEN 'Personal Obrero'
                        ELSE 'Persona'
                    END
                WHEN EXISTS (SELECT 1 FROM soyucab.dependencia_ucab d WHERE d.email = ls.seg_email) THEN 'Dependencia'
                WHEN EXISTS (SELECT 1 FROM soyucab.organizacion_asociada o WHERE o.email = ls.seg_email) THEN 'Organización'
                ELSE 'Otro'
            END AS tipo_seg,
            -- Obtener facultad/carrera
            COALESCE(
                (SELECT e.facultad FROM soyucab.estudiante e WHERE e.email_estudiante = ls.seg_email),
                (SELECT eg.facultad FROM soyucab.egresado eg WHERE eg.email_egresado = ls.seg_email),
                NULL
            ) AS facultad_interes,
            COALESCE(
                (SELECT e.carrera_programa FROM soyucab.estudiante e WHERE e.email_estudiante = ls.seg_email),
                NULL
            ) AS carrera_interes
        FROM Lista_Seguidores ls
        JOIN soyucab.miembro m ON ls.seg_email = m.email
    ),
    -- 3. Calcular Engagement Histórico (comentarios como proxy de likes)
    Engagement_Seguidores AS (
        SELECT
            c.email_comentador AS seg_email,
            COUNT(*)::INTEGER AS conteo_interacciones
        FROM soyucab.comentario c
        JOIN soyucab.publicacion p ON c.email_creador_publicacion = p.email_publicador
        WHERE c.email_comentador IN (SELECT seg_email FROM Lista_Seguidores)
          AND p.email_publicador = p_email_miembro_seguido
        GROUP BY c.email_comentador
    )
    -- 4. Consolidar y Segmentar
    SELECT
        ps.seg_email::VARCHAR AS email_seguidor,
        ps.nombre_usuario::VARCHAR AS nombre_usuario_seguidor,
        ps.tipo_seg::VARCHAR AS tipo_seguidor,
        COALESCE(
            ps.carrera_interes, 
            ps.facultad_interes,
            CASE 
                WHEN ps.tipo_seg IN ('Dependencia', 'Organización') THEN 'Institución'
                ELSE 'General/Sin Rol' 
            END
        )::VARCHAR AS area_interes,
        COALESCE(es.conteo_interacciones, 0)::INTEGER AS conteo_likes_hist,
        (CASE
            WHEN COALESCE(es.conteo_interacciones, 0) >= 5 THEN 'Alto'      
            WHEN COALESCE(es.conteo_interacciones, 0) BETWEEN 1 AND 4 THEN 'Medio'   
            ELSE 'Bajo' 
        END)::VARCHAR AS potencial_engagement,
        (CASE
            WHEN ps.tipo_seg = 'Estudiante' AND (ps.facultad_interes ILIKE '%ingeniería%' OR ps.facultad_interes ILIKE '%informática%') 
                THEN 'Contenido Técnico, Oportunidades de Pasantías y Horarios de Laboratorio.'
            WHEN ps.tipo_seg = 'Estudiante' AND ps.facultad_interes ILIKE '%derecho%' 
                THEN 'Casos de Estudio, Eventos de Cátedra y Noticias Judiciales.'
            WHEN ps.tipo_seg = 'Estudiante' AND ps.facultad_interes ILIKE '%comunicación%' 
                THEN 'Talleres de Redacción, Eventos de Medios y Oportunidades en Comunicación Social.'
            WHEN ps.tipo_seg = 'Profesor' 
                THEN 'Convocatorias a Investigación, Financiamiento y Reconocimientos Docentes.'
            WHEN ps.tipo_seg = 'Egresado' 
                THEN 'Ofertas de Empleo, Networking con Empresas y Eventos Alumni.'
            WHEN ps.tipo_seg = 'Personal Administrativo' 
                THEN 'Comunicados Administrativos, Actualizaciones de Procedimientos y Eventos Internos.'
            WHEN ps.tipo_seg = 'Personal Obrero' 
                THEN 'Comunicados Operativos, Seguridad Laboral y Eventos del Personal.'
            WHEN ps.tipo_seg = 'Dependencia' 
                THEN 'Colaboraciones Interinstitucionales, Eventos Conjuntos y Comunicados Oficiales.'
            WHEN ps.tipo_seg = 'Organización' 
                THEN 'Oportunidades de Vinculación, Proyectos Conjuntos y Networking Empresarial.'
            ELSE 'Anuncios Institucionales Generales y Eventos Interfacultades.'
        END)::VARCHAR AS recomendacion_contenido
    FROM Perfil_Seguidores ps
    LEFT JOIN Engagement_Seguidores es ON ps.seg_email = es.seg_email
    ORDER BY COALESCE(es.conteo_interacciones, 0) DESC, ps.tipo_seg;
END;
$$
LANGUAGE plpgsql;

-- Store Procedure CORREGIDO (OUT primero)
CREATE OR REPLACE PROCEDURE soyucab.crear_portafolio_completo(
    OUT p_mensaje VARCHAR(500),
    p_ci_persona VARCHAR(10),
    p_nombre_portafolio VARCHAR(50),
    p_visibilidad soyucab.visibilidad_portafolio DEFAULT 'Publico',
    p_proyectos JSON DEFAULT NULL,
    p_publicaciones_academicas JSON DEFAULT NULL,
    p_certificaciones JSON DEFAULT NULL,
    p_experiencia_laboral JSON DEFAULT NULL,
    p_habilidades_destacadas JSON DEFAULT NULL,
    p_logros JSON DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_persona_existe BOOLEAN;
    v_portafolio_existe BOOLEAN;
    v_nombre_en_uso BOOLEAN;
BEGIN
    -- Inicializar mensaje
    p_mensaje := '';
    
    -- VERIFICAR QUE LA C.I. PERTENECE A UNA PERSONA
    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.persona p
        WHERE p.ci = p_ci_persona
    ) INTO v_persona_existe;
    
    IF NOT v_persona_existe THEN
        p_mensaje := 'ERROR: La cédula ' || p_ci_persona || ' no pertenece a una persona registrada.';
        RAISE EXCEPTION '%', p_mensaje;
    END IF;
    
    -- VERIFICAR QUE NO EXISTA PORTFOLIO PARA ESTA PERSONA
    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.Portafolio pf
        WHERE pf.ci_persona = p_ci_persona
    ) INTO v_portafolio_existe;
    
    IF v_portafolio_existe THEN
        p_mensaje := 'ERROR: La persona con cédula ' || p_ci_persona || ' ya tiene un portafolio creado.';
        RAISE EXCEPTION '%', p_mensaje;
    END IF;
    
    -- VERIFICAR QUE EL NOMBRE DEL PORTFOLIO NO ESTÉ EN USO
    SELECT EXISTS (
        SELECT 1 
        FROM soyucab.Portafolio pf
        WHERE pf.nombre_portafolio = p_nombre_portafolio
    ) INTO v_nombre_en_uso;
    
    IF v_nombre_en_uso THEN
        p_mensaje := 'ERROR: El nombre de portafolio "' || p_nombre_portafolio || '" ya está en uso.';
        RAISE EXCEPTION '%', p_mensaje;
    END IF;
    
    -- VERIFICAR QUE LOS JSON SON VÁLIDOS (si se proporcionan)
    IF p_proyectos IS NOT NULL THEN
        BEGIN
            PERFORM p_proyectos::json;
        EXCEPTION WHEN invalid_text_representation THEN
            p_mensaje := 'ERROR: El formato JSON de proyectos es inválido.';
            RAISE EXCEPTION '%', p_mensaje;
        END;
    END IF;
    
    IF p_publicaciones_academicas IS NOT NULL THEN
        BEGIN
            PERFORM p_publicaciones_academicas::json;
        EXCEPTION WHEN invalid_text_representation THEN
            p_mensaje := 'ERROR: El formato JSON de publicaciones académicas es inválido.';
            RAISE EXCEPTION '%', p_mensaje;
        END;
    END IF;
    
    IF p_certificaciones IS NOT NULL THEN
        BEGIN
            PERFORM p_certificaciones::json;
        EXCEPTION WHEN invalid_text_representation THEN
            p_mensaje := 'ERROR: El formato JSON de certificaciones es inválido.';
            RAISE EXCEPTION '%', p_mensaje;
        END;
    END IF;
    
    IF p_experiencia_laboral IS NOT NULL THEN
        BEGIN
            PERFORM p_experiencia_laboral::json;
        EXCEPTION WHEN invalid_text_representation THEN
            p_mensaje := 'ERROR: El formato JSON de experiencia laboral es inválido.';
            RAISE EXCEPTION '%', p_mensaje;
        END;
    END IF;
    
    IF p_habilidades_destacadas IS NOT NULL THEN
        BEGIN
            PERFORM p_habilidades_destacadas::json;
        EXCEPTION WHEN invalid_text_representation THEN
            p_mensaje := 'ERROR: El formato JSON de habilidades destacadas es inválido.';
            RAISE EXCEPTION '%', p_mensaje;
        END;
    END IF;
    
    IF p_logros IS NOT NULL THEN
        BEGIN
            PERFORM p_logros::json;
        EXCEPTION WHEN invalid_text_representation THEN
            p_mensaje := 'ERROR: El formato JSON de logros es inválido.';
            RAISE EXCEPTION '%', p_mensaje;
        END;
    END IF;
    
    -- CREAR EL PORTFOLIO (transacción)
    BEGIN
        INSERT INTO soyucab.Portafolio (ci_persona, nombre_portafolio, visibilidad)
        VALUES (p_ci_persona, p_nombre_portafolio, p_visibilidad);
        
        IF p_proyectos IS NOT NULL THEN
            INSERT INTO soyucab.Proyectos (ci_persona, valor)
            VALUES (p_ci_persona, p_proyectos);
        END IF;
        
        IF p_publicaciones_academicas IS NOT NULL THEN
            INSERT INTO soyucab.Publicaciones_Academicas (ci_persona, valor)
            VALUES (p_ci_persona, p_publicaciones_academicas);
        END IF;
        
        IF p_certificaciones IS NOT NULL THEN
            INSERT INTO soyucab.Certificaciones (ci_persona, valor)
            VALUES (p_ci_persona, p_certificaciones);
        END IF;
        
        IF p_experiencia_laboral IS NOT NULL THEN
            INSERT INTO soyucab.Experiencia_Laboral (ci_persona, valor)
            VALUES (p_ci_persona, p_experiencia_laboral);
        END IF;
        
        IF p_habilidades_destacadas IS NOT NULL THEN
            INSERT INTO soyucab.Habilidades_Destacadas (ci_persona, valor)
            VALUES (p_ci_persona, p_habilidades_destacadas);
        END IF;
        
        IF p_logros IS NOT NULL THEN
            INSERT INTO soyucab.Logros (ci_persona, valor)
            VALUES (p_ci_persona, p_logros);
        END IF;
        
        p_mensaje := 'Portafolio creado exitosamente para la persona con CI ' || p_ci_persona || ' con nombre: "' || p_nombre_portafolio || '"';
        
    EXCEPTION
        WHEN OTHERS THEN
            p_mensaje := 'ERROR al crear portafolio: ' || SQLERRM;
            RAISE;
    END;
END;
$$;

-- Trigger para actualizar fecha automáticamente
CREATE OR REPLACE FUNCTION soyucab.actualizar_fecha_portafolio()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultima_actualizacion := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_portafolio
BEFORE UPDATE ON soyucab.Portafolio
FOR EACH ROW
EXECUTE FUNCTION soyucab.actualizar_fecha_portafolio();

CREATE TABLE soyucab.empresa (
    email_egresado VARCHAR(50) NOT NULL,
    ci_egresado VARCHAR(10) NOT NULL,
    nombre_empresa VARCHAR(100) NOT NULL,
    
    PRIMARY KEY (email_egresado, nombre_empresa),

    CONSTRAINT fk_empresa_egresado
        FOREIGN KEY (email_egresado, ci_egresado)
        REFERENCES soyucab.egresado(email_egresado, ci_egresado)
        ON DELETE CASCADE
);

-- Tipo para reporte de empresas
CREATE TYPE soyucab.tipo_reporte_top_empresas_extendido AS (
    nombre_empresa VARCHAR(100),
    cantidad_egresados BIGINT,
    nombres_egresados TEXT
);

-- Función para reporte de empresas
CREATE OR REPLACE FUNCTION soyucab.obtener_top_empresas_contratantes_extendido(
    limite_filas INTEGER DEFAULT 10
)
RETURNS SETOF soyucab.tipo_reporte_top_empresas_extendido AS $$
BEGIN
    RETURN QUERY 
    SELECT
        e.nombre_empresa,
        COUNT(e.email_egresado) AS cantidad_egresados,
        STRING_AGG(p.nombres || ' ' || p.apellidos, ', ' ORDER BY p.apellidos) AS nombres_egresados
    FROM 
        soyucab.empresa e
    JOIN
        soyucab.egresado eg ON e.email_egresado = eg.email_egresado AND e.ci_egresado = eg.ci_egresado
    JOIN
        soyucab.persona p ON eg.email_egresado = p.email_persona
    GROUP BY 
        e.nombre_empresa
    ORDER BY 
        cantidad_egresados DESC, e.nombre_empresa ASC
    LIMIT 
        limite_filas;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE soyucab.me_gusta (
    email_miembro_gusta VARCHAR(50) NOT NULL,
    email_publicador_publicacion VARCHAR(50) NOT NULL,
    fecha_publicacion_publicacion TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    fecha_like TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (email_miembro_gusta, email_publicador_publicacion, fecha_publicacion_publicacion),
    
    CONSTRAINT fk_miembro_gusta
        FOREIGN KEY (email_miembro_gusta)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_publicacion_gustada
        FOREIGN KEY (email_publicador_publicacion, fecha_publicacion_publicacion)
        REFERENCES soyucab.publicacion(email_publicador, fecha_publicacion)
        ON DELETE CASCADE
);

-- Modificar tabla estudiante para agregar email de dominio
ALTER TABLE soyucab.estudiante 
DROP CONSTRAINT IF EXISTS chk_email_dominio;

ALTER TABLE soyucab.estudiante
ADD COLUMN email_dominio_estudiante VARCHAR(50) UNIQUE NOT NULL;

ALTER TABLE soyucab.estudiante
ADD CONSTRAINT chk_email_dominio_estudiante
    CHECK (email_dominio_estudiante LIKE '%@est.ucab.edu.ve');

-- PROCEDIMIENTO PASAR ESTUDIANTE A EGRESADO
CREATE OR REPLACE PROCEDURE soyucab.graduar_estudiante(
    OUT p_mensaje VARCHAR(500),
    IN p_email_estudiante VARCHAR(50),
    IN p_fecha_graduacion DATE DEFAULT NULL,
    IN p_pais VARCHAR(2) DEFAULT NULL,
    IN p_estado VARCHAR(15) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_ci VARCHAR(10);
    v_facultad VARCHAR(100);
    v_carrera VARCHAR(100);
    v_email_institucional VARCHAR(50);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM soyucab.estudiante WHERE email_estudiante = p_email_estudiante) THEN
        RAISE EXCEPTION 'No es estudiante (email personal: %).', p_email_estudiante;
    END IF;

    SELECT
        ci_estudiante,
        facultad,
        carrera_programa,
        email_dominio_estudiante
    INTO 
        v_ci,
        v_facultad,
        v_carrera,
        v_email_institucional
    FROM soyucab.estudiante
    WHERE email_estudiante = p_email_estudiante;

    IF EXISTS (SELECT 1 FROM soyucab.egresado WHERE email_egresado = p_email_estudiante) THEN
        RAISE EXCEPTION 'Ya es egresado: %', p_email_estudiante;
    END IF;

    IF p_fecha_graduacion IS NULL THEN
        p_fecha_graduacion := CURRENT_DATE;
    END IF;

    INSERT INTO soyucab.egresado (
        facultad,
        fecha_acto_grado,
        pais,
        estado,
        email_egresado,
        ci_egresado
    )
    VALUES (
        v_facultad,
        p_fecha_graduacion,
        p_pais,
        p_estado,
        p_email_estudiante,
        v_ci
    );

    UPDATE soyucab.rolInstitucional
    SET estatus = 'Graduado',
        fecha_finalizacion = p_fecha_graduacion
    WHERE email_persona = p_email_estudiante AND tipo_rol = 'Estudiante';
    
    INSERT INTO soyucab.rolInstitucional (
        email_persona,
        tipo_rol,
        fecha_inicio,
        estatus
    )
    VALUES (
        p_email_estudiante,
        'Egresado',
        p_fecha_graduacion,
        'Graduado'
    );

    DELETE FROM soyucab.estudiante
    WHERE email_estudiante = p_email_estudiante;
    
    p_mensaje := ' Estudiante graduado. ' ||
                'Email personal: ' || p_email_estudiante || '. ' ||
                'Email institucional (@est.ucab.edu.ve) dado de baja: ' || v_email_institucional;
END $$;

CREATE TABLE soyucab.notif_generada_por_publicacion (
    email_destino_notif VARCHAR(50) NOT NULL,
    email_envia_notif VARCHAR(50) NOT NULL,
    fecha_hora_notif TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    email_publicador_pub VARCHAR(50) NOT NULL,
    fecha_publicacion_pub TIMESTAMP WITHOUT TIME ZONE NOT NULL,

    PRIMARY KEY (email_destino_notif, email_envia_notif, fecha_hora_notif),

    CONSTRAINT fk_notif_pk
        FOREIGN KEY (email_destino_notif, email_envia_notif, fecha_hora_notif)
        REFERENCES soyucab.notificacion(email_destino, email_envia, fecha_hora)
        ON DELETE CASCADE,

    CONSTRAINT fk_publicacion_pk
        FOREIGN KEY (email_publicador_pub, fecha_publicacion_pub)
        REFERENCES soyucab.publicacion(email_publicador, fecha_publicacion)
        ON DELETE CASCADE
);

-- Tablas de ANDREA
CREATE TABLE soyucab.profesor (
    email_persona VARCHAR(50) NOT NULL,
    tipo_rol soyucab.tipo_rol NOT NULL CHECK (tipo_rol = 'Profesor'),
    fecha_inicio DATE NOT NULL,
    fecha_ingreso DATE,
    categoria VARCHAR(50),
    dedicacion VARCHAR(50),
    
    PRIMARY KEY (email_persona, tipo_rol, fecha_inicio),

    CONSTRAINT fk_profesor_rol
        FOREIGN KEY (email_persona, tipo_rol, fecha_inicio)
        REFERENCES soyucab.rolInstitucional(email_persona, tipo_rol, fecha_inicio)
        ON DELETE CASCADE
        DEFERRABLE INITIALLY IMMEDIATE
);

-- Tabla corregida para facultades (era 'facultades', debe ser singular 'facultad')
CREATE TABLE soyucab.facultad (
    email_persona VARCHAR(50) NOT NULL,
    tipo_rol soyucab.tipo_rol NOT NULL,
    fecha_inicio DATE NOT NULL,
    facultad_nombre VARCHAR(100) NOT NULL,
    
    PRIMARY KEY (email_persona, tipo_rol, fecha_inicio, facultad_nombre),
    
    CONSTRAINT fk_facultad_profesor
        FOREIGN KEY (email_persona, tipo_rol, fecha_inicio)
        REFERENCES soyucab.profesor(email_persona, tipo_rol, fecha_inicio)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.materias_impartidas (
    email_persona VARCHAR(50) NOT NULL,
    tipo_rol soyucab.tipo_rol NOT NULL,
    fecha_inicio DATE NOT NULL,
    materia_nombre VARCHAR(100) NOT NULL,
    
    PRIMARY KEY (email_persona, tipo_rol, fecha_inicio, materia_nombre),
    
    CONSTRAINT fk_materia_profesor
        FOREIGN KEY (email_persona, tipo_rol, fecha_inicio)
        REFERENCES soyucab.profesor(email_persona, tipo_rol, fecha_inicio)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.personal_obrero (
    email_persona VARCHAR(50) NOT NULL,
    tipo_rol soyucab.tipo_rol NOT NULL CHECK (tipo_rol = 'Personal Obrero'),
    fecha_inicio DATE NOT NULL,
    cargo VARCHAR(100),
    dedicacion VARCHAR(50),
    empresa_a_la_que_pertenece VARCHAR(100),
    
    PRIMARY KEY (email_persona, tipo_rol, fecha_inicio),

    CONSTRAINT fk_obrero_rol
        FOREIGN KEY (email_persona, tipo_rol, fecha_inicio)
        REFERENCES soyucab.rolInstitucional(email_persona, tipo_rol, fecha_inicio)
        ON DELETE CASCADE
        DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE soyucab.personal_administrativo (
    email_persona VARCHAR(50) NOT NULL,
    tipo_rol soyucab.tipo_rol NOT NULL CHECK (tipo_rol = 'Personal Administrativo'),
    fecha_inicio DATE NOT NULL,
    cargo VARCHAR(100),
    ubicacion_de_trabajo VARCHAR(100),
    dedicacion VARCHAR(50),
    
    PRIMARY KEY (email_persona, tipo_rol, fecha_inicio),

    CONSTRAINT fk_admin_rol
        FOREIGN KEY (email_persona, tipo_rol, fecha_inicio)
        REFERENCES soyucab.rolInstitucional(email_persona, tipo_rol, fecha_inicio)
        ON DELETE CASCADE
        DEFERRABLE INITIALLY IMMEDIATE
);

-- Función para resumen de gestión de eventos
CREATE OR REPLACE FUNCTION soyucab.resumen_gestion_eventos()
RETURNS TABLE (
    fecha_evento DATE,
    titulo_evento VARCHAR,
    total_asistentes_confirmados BIGINT,
    gasto_asociado NUMERIC
)
LANGUAGE SQL
AS $$
    SELECT
        CAST(E.fecha_hora_inicio AS DATE) AS fecha_evento,
        E.titulo AS titulo_evento,
        COUNT(CASE WHEN P.estado_participacion = 'confirmado' THEN P.email_miembro END) AS total_asistentes_confirmados,
        E.costo_inscripcion AS gasto_asociado
    FROM
        soyucab.evento E
    LEFT JOIN
        soyucab.miembro_participa_evento P 
        ON E.ubicacion = P.ubicacion
        AND E.fecha_hora_inicio = P.fecha_hora_inicio
    GROUP BY
        E.ubicacion,
        E.fecha_hora_inicio,
        E.titulo,
        E.costo_inscripcion
    ORDER BY
        E.fecha_hora_inicio DESC;
$$;

-- Función para agregar rol estudiante
CREATE OR REPLACE FUNCTION soyucab.agregar_rol_estudiante (
    p_email VARCHAR(50),
    p_email_ucab VARCHAR(50),
    p_semestre INT,
    p_carrera VARCHAR(100),
    p_facultad VARCHAR(100),
    p_promedio DECIMAL(4, 2)
)
RETURNS VARCHAR AS $$
DECLARE
    v_ci_persona VARCHAR(10);
    v_fecha_inicio DATE := CURRENT_DATE;
BEGIN
    SELECT ci INTO v_ci_persona
    FROM soyucab.persona
    WHERE email_persona = p_email;

    IF v_ci_persona IS NULL THEN
        RETURN 'ERROR: El email personal no corresponde a ninguna persona registrada.';
    END IF;

    IF p_semestre IS NULL OR p_carrera IS NULL OR p_facultad IS NULL OR p_promedio IS NULL OR p_email_ucab IS NULL THEN
        RETURN 'ERROR: Faltan datos obligatorios (Email UCAB, Semestre, Carrera, Facultad, Promedio) para crear el rol Estudiante.';
    END IF;

    IF p_email_ucab NOT LIKE '%@est.ucab.edu.ve' THEN
         RETURN 'ERROR: El email de dominio UCAB debe terminar en @est.ucab.edu.ve.';
    END IF;
    
    INSERT INTO soyucab.rolInstitucional (
        email_persona,
        tipo_rol,
        fecha_inicio,
        estatus
    )
    VALUES (
        p_email,
        'Estudiante',
        v_fecha_inicio,
        'Activo'
    );

    INSERT INTO soyucab.Estudiante (
        email_estudiante,
        email_dominio_estudiante,
        ci_estudiante,
        semestre,
        carrera_programa,
        facultad,
        promedio
    )
    VALUES (
        p_email,
        p_email_ucab,
        v_ci_persona,
        p_semestre,
        p_carrera,
        p_facultad,
        p_promedio
    );

    RETURN 'ÉXITO: Se ha agregado el rol Estudiante y el registro académico para la persona con email ' || p_email || ' (UCAB: ' || p_email_ucab || ').';
END;
$$ LANGUAGE plpgsql;

-- Trigger corregido para notificar interacciones
CREATE OR REPLACE FUNCTION soyucab.crear_notificacion_por_interaccion()
RETURNS TRIGGER AS $$
DECLARE
    email_autor_publicacion VARCHAR(100);
BEGIN
    SELECT email_publicador INTO email_autor_publicacion
    FROM soyucab.publicacion
    WHERE email_publicador = NEW.email_creador_publicacion
      AND fecha_publicacion = NEW.fecha_creacion_publicacion;

    IF NEW.email_comentador <> email_autor_publicacion THEN
        INSERT INTO soyucab.notificacion (
            email_destino,
            email_envia,
            fecha_hora,
            titulo,
            contenido,
            tipo_notificacion,
            estado
        )
        VALUES (
            email_autor_publicacion,
            NEW.email_comentador,
            CURRENT_TIMESTAMP,
            'Nuevo comentario',
            'ha comentado tu publicación.',
            'publicacion',
            'pendiente'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notificar_nueva_interaccion
AFTER INSERT ON soyucab.comentario
FOR EACH ROW
EXECUTE FUNCTION soyucab.crear_notificacion_por_interaccion();

-- Tablas de GERHARD
CREATE TABLE soyucab.tutorias_materia (
    email_tutor VARCHAR(50) NOT NULL,
    materia_nombre VARCHAR(100) NOT NULL,
    
    PRIMARY KEY (email_tutor, materia_nombre),
    
    CONSTRAINT fk_tutorias_materia_miembro
        FOREIGN KEY (email_tutor)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE
);

CREATE TABLE soyucab.tutorias_estudiante (
    email_tutor VARCHAR(50) NOT NULL REFERENCES soyucab.miembro(email),
    email_estudiante VARCHAR(50) NOT NULL REFERENCES soyucab.miembro(email),
    PRIMARY KEY (email_tutor, email_estudiante)
);

CREATE TABLE soyucab.reconocimiento (
    tipo_reconocimiento VARCHAR(50) NOT NULL,
    nombre_reconocimiento VARCHAR(100) NOT NULL,
    PRIMARY KEY (tipo_reconocimiento, nombre_reconocimiento)
);

CREATE TABLE soyucab.profesor_recibe_reconocimiento (
    email_profesor VARCHAR(50) NOT NULL,
    tipo_reconocimiento VARCHAR(50) NOT NULL,
    nombre_reconocimiento VARCHAR(100) NOT NULL,
    anio_reconocimiento INT NOT NULL,
    
    PRIMARY KEY (email_profesor, tipo_reconocimiento, nombre_reconocimiento),
    
    CONSTRAINT fk_prr_miembro
        FOREIGN KEY (email_profesor)
        REFERENCES soyucab.miembro(email)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_prr_reconocimiento
        FOREIGN KEY (tipo_reconocimiento, nombre_reconocimiento)
        REFERENCES soyucab.reconocimiento(tipo_reconocimiento, nombre_reconocimiento)
        ON DELETE CASCADE
);

-- Función para obtener ubicación de egresados
CREATE OR REPLACE FUNCTION soyucab.obtener_ubicacion_egresados()
RETURNS TABLE (
    email_egresado VARCHAR(50),
    ci_egresado VARCHAR(10),
    nombres VARCHAR(100),
    apellidos VARCHAR(100),
    pais VARCHAR(2),
    estado VARCHAR(15),
    fecha_acto_grado DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.email_egresado,
        e.ci_egresado,
        p.nombres,
        p.apellidos,
        e.pais,
        e.estado,
        e.fecha_acto_grado
    FROM
        soyucab.egresado e
    JOIN
        soyucab.persona p ON e.email_egresado = p.email_persona
    ORDER BY
        e.pais, e.estado, p.apellidos;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar datos de tutores
CREATE OR REPLACE FUNCTION soyucab.verificar_Datos_Tutores()
RETURNS TABLE (
    nombre_tutor TEXT,
    titulo_academico VARCHAR,
    nombre_usuario VARCHAR,
    cantidad_materias BIGINT,
    cantidad_estudiantes BIGINT,
    nombre_facultad TEXT
)
AS $$
BEGIN
    RETURN QUERY
    WITH TutorMetrics AS (
        SELECT
            tm.email_tutor,
            COUNT(DISTINCT tm.materia_nombre)::BIGINT AS total_materias,
            COALESCE(est.total_estudiantes, 0)::BIGINT AS total_estudiantes
        FROM
            soyucab.tutorias_materia tm
        LEFT JOIN (
            SELECT
                ert.email_tutor,
                COUNT(ert.email_estudiante)::BIGINT AS total_estudiantes
            FROM
                soyucab.tutorias_estudiante ert
            GROUP BY
                ert.email_tutor
        ) est ON tm.email_tutor = est.email_tutor
        GROUP BY
            tm.email_tutor, est.total_estudiantes
    ),
    TutorFacultades AS (
        SELECT
            f.email_persona,
            STRING_AGG(f.facultad_nombre, ', ' ORDER BY f.facultad_nombre) AS lista_facultades
        FROM
            soyucab.facultad f
        GROUP BY
            f.email_persona
    )
    SELECT
        (p.nombres || ' ' || p.apellidos)::TEXT AS nombre_tutor,
        'Estudiante Tutor'::VARCHAR AS titulo_academico,
        m.nombre_usuario::VARCHAR,
        tm.total_materias::BIGINT AS cantidad_materias,
        tm.total_estudiantes::BIGINT AS cantidad_estudiantes,
        tf.lista_facultades::TEXT AS nombre_facultad
    FROM
        soyucab.persona p
    JOIN
        soyucab.miembro m ON p.email_persona = m.email
    JOIN
        TutorMetrics tm ON p.email_persona = tm.email_tutor
    LEFT JOIN
        TutorFacultades tf ON p.email_persona = tf.email_persona
    WHERE
        p.tutor IS TRUE
    ORDER BY
        tm.total_materias DESC, p.apellidos;

END;
$$ LANGUAGE plpgsql;


-- Función para obtener menciones de profesores
CREATE OR REPLACE FUNCTION soyucab.obtener_menciones()
RETURNS TABLE (
    nombre_completo TEXT,
    nombre_titulo VARCHAR,
    nombre_usuario VARCHAR,
    tipo_reconocimiento VARCHAR,
    nombre_reconocimiento VARCHAR,
    anio_reconocimiento INT,
    nombre_facultad TEXT
)
AS $$
BEGIN
    RETURN QUERY
    WITH ProfesorFacultades AS (
        SELECT 
            f.email_persona,
            STRING_AGG(f.facultad_nombre, ', ' ORDER BY f.facultad_nombre) AS lista_facultades
        FROM 
            soyucab.facultad f
        GROUP BY 
            f.email_persona
    )
    SELECT
        p.nombres || ' ' || p.apellidos AS nombre_completo,
        pr.categoria AS nombre_titulo,
        m.nombre_usuario,
        r.tipo_reconocimiento,
        r.nombre_reconocimiento,
        prr.anio_reconocimiento,
        pf.lista_facultades AS nombre_facultad
    FROM
        soyucab.profesor_recibe_reconocimiento prr
    JOIN
        soyucab.reconocimiento r ON prr.tipo_reconocimiento = r.tipo_reconocimiento AND prr.nombre_reconocimiento = r.nombre_reconocimiento
    JOIN
        soyucab.miembro m ON prr.email_profesor = m.email
    JOIN
        soyucab.persona p ON m.email = p.email_persona
    JOIN
        soyucab.profesor pr ON prr.email_profesor = pr.email_persona
    LEFT JOIN
        ProfesorFacultades pf ON prr.email_profesor = pf.email_persona
    WHERE
        r.tipo_reconocimiento = 'Mención'
    ORDER BY
        prr.anio_reconocimiento DESC, p.apellidos;
END;
$$ LANGUAGE plpgsql;

-- Permisos de supabase

GRANT USAGE ON SCHEMA soyucab TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA soyucab TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA soyucab TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA soyucab TO anon, authenticated, service_role;
