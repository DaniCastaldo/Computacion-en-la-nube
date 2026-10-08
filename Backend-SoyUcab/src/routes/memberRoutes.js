const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// GET /api/members - Listar todos los miembros
router.get('/', memberController.getAllMembers);

// GET /api/members/stats - Estadísticas globales
router.get('/stats', memberController.getStats);

// GET /api/members/:email/followers-analysis - Análisis de seguidores
router.get('/:email/followers-analysis', memberController.getFollowersAnalysis);

// GET /api/members/:email - Obtener miembro por email
router.get('/:email', memberController.getMemberByEmail);

// POST /api/members - Crear nuevo miembro
router.post('/', memberController.createMember);

module.exports = router;
