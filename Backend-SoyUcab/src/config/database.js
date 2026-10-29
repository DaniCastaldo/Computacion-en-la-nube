const { Pool } = require('pg');
require('dotenv').config();

// Crear pool de conexiones
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false
  }
});

// Verificar conexión al iniciar
pool.on('connect', () => {
  console.log(' Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error(' Error en pool de PostgreSQL:', err.message);
});

// Métodos para ejecutar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Query ejecutada (${duration}ms):`, {
        rows: result.rowCount,
        text: text.substring(0, 150) + (text.length > 150 ? '...' : '')
      });
    }
    
    return result;
  } catch (error) {
    console.error(' Error en query:', error.message);
    console.error('   Query:', text.substring(0, 200));
    throw error;
  }
};

// Método para llamar funciones de PostgreSQL
const callFunction = async (functionName, params = []) => {
  const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
  const queryText = `SELECT * FROM soyucab.${functionName}(${placeholders})`;
  return query(queryText, params);
};

module.exports = {
  query,
  callFunction,
  pool
};
