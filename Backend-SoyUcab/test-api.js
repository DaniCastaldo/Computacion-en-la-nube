// test-api-complete.js
const axios = require('axios');
const API_BASE = 'http://localhost:3000/api';

async function testCompleteAPI() {
  console.log('🚀 Test completo del Backend SoyUCAB\n');
  console.log('='.repeat(60));

  const results = [];

  try {
    // 1. Test de conexión
    console.log('1. Probando conexión...');
    try {
      const health = await axios.get(`${API_BASE}/health`);
      results.push({ test: 'Conexión', status: '✅ PASÓ', details: health.data.status });
      console.log('   ✅ API saludable');
    } catch (error) {
      results.push({ test: 'Conexión', status: '❌ FALLÓ', details: error.message });
      console.log('   ❌ Error de conexión');
      throw error;
    }

    // 2. Test de registro
    console.log('\n2. Probando registro de usuario...');
    const testUser = {
      email: `test${Date.now()}@example.com`,
      nombre_usuario: `user${Date.now().toString().slice(-6)}`,
      contraseña: 'Test123!',
      nombres: 'Usuario',
      apellidos: 'Prueba',
      ci: `${Math.floor(Math.random() * 90000000) + 10000000}`,
      sexo: 'M',
      fecha_nacimiento: '1995-05-15',
      telefono: '4141234567',
      biografia: 'Usuario creado para pruebas',
      tipo_miembro: 'Estudiante',
      semestre: 5,
      carrera_programa: 'Ingeniería Informática',
      facultad: 'Ingeniería',
      email_dominio_estudiante: `est${Date.now().toString().slice(-6)}@est.ucab.edu.ve`
    };

    try {
      const register = await axios.post(`${API_BASE}/auth/register`, testUser);
      results.push({ test: 'Registro', status: '✅ PASÓ', details: register.data.message });
      console.log(`   ✅ Usuario registrado: ${testUser.email}`);
    } catch (error) {
      results.push({ 
        test: 'Registro', 
        status: '❌ FALLÓ', 
        details: error.response?.data?.error || error.message 
      });
      console.log('   ❌ Error en registro:', error.response?.data?.error);
    }

    // 3. Test de login
    console.log('\n3. Probando inicio de sesión...');
    try {
      const login = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        contraseña: testUser.contraseña
      });
      results.push({ test: 'Login', status: '✅ PASÓ', details: 'Token generado' });
      console.log('   ✅ Login exitoso');
      const token = login.data.data.token;
      
      // Usar token para pruebas posteriores
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      
      // 4. Test de perfil actual
      console.log('\n4. Probando obtención de perfil...');
      try {
        const profile = await axios.get(`${API_BASE}/auth/me`, authHeader);
        results.push({ test: 'Perfil', status: '✅ PASÓ', details: profile.data.data.nombre_usuario });
        console.log(`   ✅ Perfil obtenido: ${profile.data.data.nombres}`);
      } catch (error) {
        results.push({ test: 'Perfil', status: '❌ FALLÓ', details: error.response?.data?.error });
        console.log('   ❌ Error obteniendo perfil');
      }
      
    } catch (error) {
      results.push({ test: 'Login', status: '❌ FALLÓ', details: error.response?.data?.error });
      console.log('   ❌ Error en login');
    }

    // 5. Test de reportes
    console.log('\n5. Probando reportes...');
    
    const reportTests = [
      { name: 'Top Empresas', endpoint: '/reports/top-companies' },
      { name: 'Tutores', endpoint: '/reports/tutors' },
      { name: 'Menciones', endpoint: '/reports/mentions' },
      { name: 'Ubicación Egresados', endpoint: '/reports/graduates-location' }
    ];

    for (const report of reportTests) {
      try {
        const response = await axios.get(`${API_BASE}${report.endpoint}`);
        results.push({ 
          test: `Reporte ${report.name}`, 
          status: '✅ PASÓ', 
          details: `${response.data.count || response.data.data.length} registros
          ${response.data.data.slice(0,2).map(r => JSON.stringify(r)).join(', ')}...
          ` 
        });
        console.log(`   ✅ ${report.name}: ${response.data.count || response.data.data.length} registros`);
      } catch (error) {
        results.push({ 
          test: `Reporte ${report.name}`, 
          status: '❌ FALLÓ', 
          details: error.response?.data?.error || error.message 
        });
        console.log(`   ❌ Error en ${report.name}:`, error.response?.data?.error);
      }
    }

    // 6. Test de miembros
    console.log('\n6. Probando gestión de miembros...');
    
    try {
      const members = await axios.get(`${API_BASE}/members?limit=3`);
      results.push({ 
        test: 'Listar miembros', 
        status: '✅ PASÓ', 
        details: `${members.data.count} miembros obtenidos` 
      });
      console.log(`   ✅ Miembros: ${members.data.count} de ${members.data.total}`);
      
      if (members.data.data.length > 0) {
        // Test de miembro específico
        const memberEmail = members.data.data[0].email;
        const member = await axios.get(`${API_BASE}/members/${memberEmail}`);
        results.push({ 
          test: 'Obtener miembro específico', 
          status: '✅ PASÓ', 
          details: member.data.data.nombre_usuario 
        });
        console.log(`   ✅ Miembro específico: ${member.data.data.nombre_usuario}`);
      }
    } catch (error) {
      results.push({ 
        test: 'Listar miembros', 
        status: '❌ FALLÓ', 
        details: error.response?.data?.error 
      });
      console.log('   ❌ Error obteniendo miembros');
    }

    // 7. Test de estadísticas
    console.log('\n7. Probando estadísticas...');
    try {
      const stats = await axios.get(`${API_BASE}/members/stats`);
      results.push({ 
        test: 'Estadísticas', 
        status: '✅ PASÓ', 
        details: `${stats.data.data.totales.miembros} miembros totales` 
      });
      console.log(`   ✅ Estadísticas: ${stats.data.data.totales.miembros} miembros activos`);
    } catch (error) {
      results.push({ test: 'Estadísticas', status: '❌ FALLÓ', details: error.response?.data?.error });
      console.log('   ❌ Error obteniendo estadísticas');
    }

    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS:');
    console.log('='.repeat(60));
    
    results.forEach((result, index) => {
      console.log(`${result.status} ${index + 1}. ${result.test}`);
      console.log(`   ${result.details}`);
    });

    const passed = results.filter(r => r.status.includes('✅')).length;
    const total = results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log('\n' + '='.repeat(60));
    console.log(`📈 RESULTADO FINAL: ${passed}/${total} (${percentage}%)`);
    
    if (percentage >= 80) {
      console.log('🎉 ¡Backend funcionando correctamente!');
    } else if (percentage >= 50) {
      console.log('⚠️  Backend funcionando parcialmente');
    } else {
      console.log('❌ Problemas significativos en el backend');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error fatal en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  testCompleteAPI();
}

module.exports = { testCompleteAPI };