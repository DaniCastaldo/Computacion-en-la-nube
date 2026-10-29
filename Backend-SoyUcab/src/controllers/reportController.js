const db = require('../config/database');

const reportController = {
  // GET /api/reports/top-companies - Top empresas contratantes
  async getTopCompanies(req, res) { 
    try { 
      const { limit = 10 } = req.query; 

      const result = await db.query( `SELECT empresa_actual AS nombre_empresa, COUNT(*) AS cantidad_egresados, STRING_AGG(nombres || ' ' || apellidos, ', ') AS egresados FROM soyucab.egresado e JOIN soyucab.persona p ON e.email_egresado = p.email_persona WHERE empresa_actual IS NOT NULL GROUP BY empresa_actual ORDER BY COUNT(*) DESC LIMIT $1`, 
      [parseInt(limit)] 
      ); 
      
      res.json({ success: true, count: result.rows.length, data: result.rows }); } 
      
      catch (error) { 
        console.error(' Error obteniendo top empresas:', error); 
        res.status(500).json({ success: false, error: 'Error al obtener reporte de empresas' }); 
      } 
  },

  // GET /api/reports/tutors - Reporte de tutores
  async getTutorsReport(req, res) {
    try {
      const result = await db.callFunction('verificar_Datos_Tutores');

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });

    } catch (error) {
      console.error('Error obteniendo reporte de tutores:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener reporte de tutores'
      });
    }
  },

  // GET /api/reports/mentions - Reporte de menciones
  async getMentionsReport(req, res) {
    try {
      const result = await db.callFunction('obtener_menciones');

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });

    } catch (error) {
      console.error(' Error obteniendo reporte de menciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener reporte de menciones'
      });
    }
  },

  // GET /api/reports/graduates-location - Ubicación de egresados
  async getGraduatesLocation(req, res) {
    try {
      const result = await db.callFunction('obtener_ubicacion_egresados');

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });

    } catch (error) {
      console.error(' Error obteniendo ubicación de egresados:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener ubicación de egresados'
      });
    }
  }
};

module.exports = reportController;