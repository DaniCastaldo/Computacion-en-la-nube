const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me
router.get('/me', auth.verifyToken, authController.me);

// PUT /api/auth/dependencia/:email - Actualizar dependencia
router.put('/dependencia/:email', auth.verifyToken, auth.isOwnerOrAdmin, authController.updateDependencia);

// PUT /api/auth/organizacion/:email - Actualizar organizacion
router.put('/organizacion/:email', auth.verifyToken, auth.isOwnerOrAdmin, authController.updateOrganizacion);

module.exports = router;