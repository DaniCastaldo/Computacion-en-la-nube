const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const auth = require('../middleware/auth');

// POST /api/groups - crear grupo
router.post('/', auth.verifyToken, groupController.createGroup);

// POST /api/groups/:name/join - unirse
router.post('/:name/join', auth.verifyToken, groupController.joinGroup);

// GET /api/groups/mine - listar grupos del usuario autenticado
router.get('/mine', auth.verifyToken, groupController.getMyGroups);

// GET /api/groups/:name - obtener detalles del grupo
router.get('/:name', groupController.getGroupDetails);

// GET /api/groups/:name/posts - obtener publicaciones del grupo
router.get('/:name/posts', groupController.getGroupPosts);

// PUT /api/groups/:name - actualizar grupo (solo administradores)
router.put('/:name', auth.verifyToken, groupController.updateGroup);

module.exports = router;
