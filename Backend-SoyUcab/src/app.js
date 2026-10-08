const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de salud para pruebas automáticas
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// Ruta de prueba principal
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API SoyUCAB funcionando',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      members: {
        getAll: 'GET /api/members',
        getById: 'GET /api/members/:email',
        create: 'POST /api/members',
        update: 'PUT /api/members/:email',
        followersAnalysis: 'GET /api/members/:email/followers-analysis',
        stats: 'GET /api/members/stats'
      },
      reports: {
        topCompanies: 'GET /api/reports/top-companies',
        tutors: 'GET /api/reports/tutors',
        mentions: 'GET /api/reports/mentions',
        graduatesLocation: 'GET /api/reports/graduates-location'
      }
    }
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/reports', reportRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(` Servidor SoyUCAB en http://localhost:${PORT}`);
  console.log('='.repeat(50));
});
