const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// GET /api/reports/top-companies
router.get('/top-companies', reportController.getTopCompanies);

// GET /api/reports/tutors
router.get('/tutors', reportController.getTutorsReport);

// GET /api/reports/mentions
router.get('/mentions', reportController.getMentionsReport);

// GET /api/reports/graduates-location
router.get('/graduates-location', reportController.getGraduatesLocation);

module.exports = router;