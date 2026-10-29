const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const auth = require('../middleware/auth');

// GET /api/members - Listar todos los miembros
router.get('/', memberController.getAllMembers);

// GET /api/members/stats - Estadísticas globales
router.get('/stats', memberController.getStats);

// GET /api/members/:email/followers-analysis - Análisis de seguidores
router.get('/:email/followers-analysis', memberController.getFollowersAnalysis);

// GET /api/members/:email - Obtener miembro por email
router.get('/:email', memberController.getMemberByEmail);

// PUT /api/members/:email - Actualizar miembro (propietario o admin)
router.put('/:email', auth.verifyToken, auth.isOwnerOrAdmin, memberController.updateMember);

// POST /api/members - Crear nuevo miembro
router.post('/', memberController.createMember);

module.exports = router;
