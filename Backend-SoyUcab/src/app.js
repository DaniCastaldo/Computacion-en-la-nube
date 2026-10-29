// src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const reportRoutes = require('./routes/reportRoutes');
const groupRoutes = require('./routes/groupRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SoyUCAB API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Ruta de documentación
app.get('/api', (req, res) => {
  res.json({
    message: '🚀 API SoyUCAB - Sistema de Red Social Universitaria',
    version: '1.0.0',
    documentation: {
      auth: {
        register: {
          method: 'POST',
          endpoint: '/api/auth/register',
          description: 'Registrar nuevo usuario',
          body: {
            email: 'string (required)',
            nombre_usuario: 'string (required, max 20)',
            contraseña: 'string (required)',
            nombres: 'string (required)',
            apellidos: 'string (required)',
            ci: 'string (required)',
            fecha_nacimiento: 'date (required)',
            sexo: 'string (optional, M/F)',
            telefono: 'string (optional)',
            biografia: 'string (optional)',
            tipo_miembro: 'string (optional: Estudiante, Egresado, Profesor)'
          }
        },
        login: {
          method: 'POST',
          endpoint: '/api/auth/login',
          description: 'Iniciar sesión',
          body: {
            email: 'string (required)',
            contraseña: 'string (required)'
          }
        }
      },
      members: {
        getAll: {
          method: 'GET',
          endpoint: '/api/members',
          description: 'Obtener todos los miembros',
          query: {
            page: 'number (optional, default: 1)',
            limit: 'number (optional, default: 50)',
            tipo: 'string (optional: Estudiante, Egresado, Profesor)',
            search: 'string (optional)'
          }
        },
        getOne: {
          method: 'GET',
          endpoint: '/api/members/:email',
          description: 'Obtener miembro por email'
        },
        create: {
          method: 'POST',
          endpoint: '/api/members',
          description: 'Crear nuevo miembro'
        }
      },
      reports: {
        topCompanies: {
          method: 'GET',
          endpoint: '/api/reports/top-companies',
          description: 'Top empresas contratantes de egresados'
        },
        tutors: {
          method: 'GET',
          endpoint: '/api/reports/tutors',
          description: 'Reporte de tutores'
        },
        mentions: {
          method: 'GET',
          endpoint: '/api/reports/mentions',
          description: 'Reconocimientos de profesores'
        },
        graduatesLocation: {
          method: 'GET',
          endpoint: '/api/reports/graduates-location',
          description: 'Ubicación de egresados'
        }
      },
      groups: {
        create: {
          method: 'POST',
          endpoint: '/api/groups',
          description: 'Crear nuevo grupo (autenticado)'
        },
        join: {
          method: 'POST',
          endpoint: '/api/groups/:name/join',
          description: 'Unirse a un grupo (público/privado/secreto)'
        },
        mine: {
          method: 'GET',
          endpoint: '/api/groups/mine',
          description: 'Listar grupos a los que pertenece el usuario autenticado'
        }
      }
    }
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/groups', groupRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.path}`
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(' Error global:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Error de validación de datos
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: err.message
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticación inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticación expirado'
    });
  }

  // Error de PostgreSQL
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({
      success: false,
      error: 'Error en la base de datos',
      code: err.code,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Error por defecto
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(` Servidor SoyUCAB iniciado`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Hora: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));
  console.log('\nEndpoints disponibles:');
  console.log('  - GET  /api/health          → Estado del servicio');
  console.log('  - GET  /api                 → Documentación');
  console.log('  - POST /api/auth/register   → Registrar usuario');
  console.log('  - POST /api/auth/login      → Iniciar sesión');
  console.log('  - GET  /api/members         → Listar miembros');
  console.log('  - GET  /api/reports/*       → Reportes');
  console.log('='.repeat(60));
});

// Manejo de cierre elegante
const shutdown = (signal) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    console.log('Servidor cerrado exitosamente.');
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error('Forzando cierre del servidor...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;