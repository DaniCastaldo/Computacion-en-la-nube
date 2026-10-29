// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authMiddleware = {
  // Verificar token JWT
  verifyToken: (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Token requerido.'
        });
      }

      // Formato: "Bearer <token>"
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Token no proporcionado en formato correcto.'
        });
      }

      const verified = jwt.verify(token, process.env.JWT_SECRET || 'soyucab_secret_key');
      req.user = verified;
      next();
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expirado'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Token inválido'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Error al verificar token'
      });
    }
  },

  // Verificar si el usuario es el mismo o es admin
  isOwnerOrAdmin: async (req, res, next) => {
    try {
      const { email } = req.params;
      const userEmail = req.user.email;
      
      // Si el usuario es el dueño del recurso
      if (email === userEmail) {
        return next();
      }
      
      // Verificar si es administrador (puedes definir tu lógica de admin)
      const adminCheck = await db.query(
        `SELECT 1 FROM soyucab.miembro 
         WHERE email = $1 AND estado_cuenta = 'activa'`,
        [userEmail]
      );
      
      if (adminCheck.rows.length > 0) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. No tienes permisos para esta acción.'
      });
      
    } catch (error) {
      console.error('Error verificando permisos:', error);
      res.status(500).json({
        success: false,
        error: 'Error al verificar permisos'
      });
    }
  }
};

module.exports = authMiddleware;