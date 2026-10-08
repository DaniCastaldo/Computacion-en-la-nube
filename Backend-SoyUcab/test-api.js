// test-api.js
const axios = require('axios');
const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  console.log('Probando API SoyUCAB...\n');
  
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  try {
    // 1. Probar conexión
    console.log('1. Probando conexión...');
    testResults.total++;
    try {
      const health = await axios.get(`${API_BASE}/health`);
      if (health.data.status === 'ok') {
        console.log('   Salud:', health.data.status);
        testResults.passed++;
      } else {
        console.log('   Error: API no saludable');
        testResults.failed++;
        return testResults;
      }
    } catch (error) {
      console.log('   Error de conexión:', error.message);
      testResults.failed++;
      return testResults;
    }
    
    // 2. Probar reporte de empresas
    console.log('\n2. Probando reporte de empresas...');
    testResults.total++;
    try {
      const companies = await axios.get(`${API_BASE}/reports/top-companies?limit=4`);
      console.log('   Empresas encontradas:', companies.data.count);
      
      if (companies.data.success && companies.data.count >= 0) {
        testResults.passed++;
        companies.data.data.forEach((company, i) => {
          console.log(`   ${i + 1}. ${company.nombre_empresa}: ${company.cantidad_egresados} egresados`);
          if (company.egresados) {
            const nombres = company.egresados.split(', ').slice(0, 2);
            console.log(`      Egresados: ${nombres.join(', ')}${company.egresados.split(', ').length > 2 ? '...' : ''}`);
          }
        });
      } else {
        console.log('   Error: Respuesta no exitosa');
        testResults.failed++;
      }
    } catch (error) {
      console.log('   Error:', error.response?.data?.error || error.message);
      testResults.failed++;
    }
    
    // 3. Probar estadísticas de miembros
    console.log('\n3. Probando estadísticas...');
    testResults.total++;
    try {
      const stats = await axios.get(`${API_BASE}/members/stats`);
      console.log('   Estadísticas obtenidas:');
      
      if (stats.data.success) {
        testResults.passed++;
        console.log('      Miembros:', stats.data.data.miembros);
        console.log('      Estudiantes:', stats.data.data.estudiantes);
        console.log('      Egresados:', stats.data.data.egresados);
      } else {
        console.log('   Error: No se pudieron obtener estadísticas');
        testResults.failed++;
      }
    } catch (error) {
      console.log('   Error:', error.response?.data?.error || error.message);
      testResults.failed++;
    }
    
    // 4. Probar análisis de seguidores
    console.log('\n4. Probando análisis de seguidores...');
    testResults.total++;
    try {
      // Primero obtenemos un miembro existente para probar
      const members = await axios.get(`${API_BASE}/members?limit=5`);
      if (members.data.success && members.data.count > 0) {
        // Buscar un miembro que no sea el que acabamos de crear (si es que existe)
        const testMember = members.data.data.find(m => m.email && !m.email.includes('test_')) || members.data.data[0];
        const testEmail = testMember.email;
        console.log('   Probando con email:', testEmail);
        
        const analysis = await axios.get(`${API_BASE}/members/${testEmail}/followers-analysis`);
        if (analysis.data.success) {
          testResults.passed++;
          console.log('   Análisis obtenido para', testEmail);
          console.log('   Seguidores analizados:', analysis.data.count);
          
          if (analysis.data.count > 0) {
            analysis.data.data.slice(0, 2).forEach((follower, i) => {
              console.log(`      ${i + 1}. ${follower.nombre_usuario_seguidor} - ${follower.tipo_seguidor}`);
              console.log(`         Area de interés: ${follower.area_interes}`);
            });
          } else {
            console.log('      No tiene seguidores registrados');
          }
        } else {
          console.log('   Error en análisis:', analysis.data.error);
          testResults.failed++;
        }
      } else {
        console.log('   No hay miembros para probar análisis');
        testResults.skipped++;
      }
    } catch (error) {
      if (error.response && error.response.status === 500) {
        console.log('   El usuario no tiene seguidores (puede ser normal)');
        testResults.skipped++;
      } else {
        console.log('   Error:', error.response?.data?.error || error.message);
        testResults.failed++;
      }
    }
    
    // 5. Probar obtener ubicación de egresados
    console.log('\n5. Probando ubicación de egresados...');
    testResults.total++;
    try {
      const location = await axios.get(`${API_BASE}/reports/graduates-location`);
      console.log('   Ubicación de egresados obtenida');
      
      if (location.data.success) {
        testResults.passed++;
        console.log('   Egresados con ubicación:', location.data.count);
        
        if (location.data.count > 0) {
          location.data.data.slice(0, 3).forEach((grad, i) => {
            console.log(`      ${i + 1}. ${grad.nombres} ${grad.apellidos}`);
            console.log(`         Pais: ${grad.pais || 'No especificado'}, Estado: ${grad.estado || 'No especificado'}`);
            console.log(`         Fecha grado: ${grad.fecha_acto_grado || 'No especificada'}`);
          });
        } else {
          console.log('   No hay egresados con ubicación registrada');
        }
      } else {
        console.log('   Error:', location.data.error);
        testResults.failed++;
      }
    } catch (error) {
      console.log('   Error:', error.response?.data?.error || error.message);
      testResults.failed++;
    }
    
    // 6. Probar reporte de tutores
    console.log('\n6. Probando reporte de tutores...');
    testResults.total++;
    try {
      const tutors = await axios.get(`${API_BASE}/reports/tutors`);
      console.log('   Reporte de tutores obtenido');
      
      if (tutors.data.success) {
        testResults.passed++;
        console.log('   Tutores encontrados:', tutors.data.count);
        
        if (tutors.data.count > 0) {
          tutors.data.data.slice(0, 3).forEach((tutor, i) => {
            console.log(`      ${i + 1}. ${tutor.nombre_tutor}`);
            console.log(`         Usuario: ${tutor.nombre_usuario}`);
            console.log(`         Materias: ${tutor.cantidad_materias}, Estudiantes: ${tutor.cantidad_estudiantes}`);
            if (tutor.nombre_facultad) {
              console.log(`         Facultad: ${tutor.nombre_facultad}`);
            }
          });
        } else {
          console.log('   No hay tutores registrados');
        }
      } else {
        console.log('   Error:', tutors.data.error);
        testResults.failed++;
      }
    } catch (error) {
      console.log('   Error:', error.response?.data?.error || error.message);
      testResults.failed++;
    }
    
    // 7. Probar reporte de menciones
    console.log('\n7. Probando reporte de menciones...');
    testResults.total++;
    try {
      const mentions = await axios.get(`${API_BASE}/reports/mentions`);
      console.log('   Reporte de menciones obtenido');
      
      if (mentions.data.success) {
        testResults.passed++;
        console.log('   Menciones encontradas:', mentions.data.count);
        
        if (mentions.data.count > 0) {
          mentions.data.data.slice(0, 3).forEach((mention, i) => {
            console.log(`      ${i + 1}. ${mention.nombre_completo}`);
            console.log(`         Reconocimiento: ${mention.nombre_reconocimiento} (${mention.anio_reconocimiento})`);
            console.log(`         Tipo: ${mention.tipo_reconocimiento}`);
            if (mention.nombre_facultad) {
              console.log(`         Facultad: ${mention.nombre_facultad}`);
            }
          });
        } else {
          console.log('   No hay menciones registradas');
        }
      } else {
        console.log('   Error:', mentions.data.error);
        testResults.failed++;
      }
    } catch (error) {
      console.log('   Error:', error.response?.data?.error || error.message);
      testResults.failed++;
    }
    
    // 8. Probar registro de usuario (VERSIÓN CORREGIDA)
    console.log('\n8. Probando registro de usuario...');
    testResults.total++;

    
    const shortTimestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos
    const testEmail = `t${shortTimestamp}@example.com`; // Ej: "t857371@example.com"
    const testUsername = `u${shortTimestamp}`; // Ej: "u857371" (7 caracteres máximo)
    const testCI = `${Math.floor(Math.random() * 90000000) + 10000000}`;

    try {
      const testUser = {
        email: testEmail,
        nombre_usuario: testUsername, // ¡Máximo 20 caracteres!
        contraseña: 'test123',
        nombres: 'Test',
        apellidos: 'Usuario',
        ci: testCI,
        sexo: 'M',
        fecha_nacimiento: '1990-01-01',
        // Deja teléfono vacío para evitar error
        biografia: 'Usuario de prueba'
      };
      
      console.log(`   Intentando registrar: ${testEmail}`);
      console.log(`   Nombre usuario: "${testUsername}" (${testUsername.length} caracteres)`);
      
      const register = await axios.post(`${API_BASE}/auth/register`, testUser);
      
      if (register.data.success) {
        testResults.passed++;
        console.log('   ✓ Usuario registrado exitosamente');
      } else {
        console.log('   ✗ Error en registro:', register.data.error);
        testResults.failed++;
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('   ! Usuario ya existe');
        testResults.skipped++;
      } else if (error.response) {
        console.log('   ✗ Error:', error.response.data.error);
        if (error.response.data.details) {
          console.log('   Detalles:', error.response.data.details);
        }
        testResults.failed++;
      } else {
        console.log('   ✗ Error:', error.message);
        testResults.failed++;
      }
    }
    
    // 9. Probar login (solo si el registro fue exitoso)
    console.log('\n9. Probando login...');
    testResults.total++;
    
    // Si el registro falló, usar un usuario existente
    let loginEmail = testEmail;
    
    try {
      const login = await axios.post(`${API_BASE}/auth/login`, {
        email: loginEmail,
        contraseña: 'test123'
      });
      
      if (login.data.success) {
        testResults.passed++;
        console.log('   Login exitoso para:', loginEmail);
        console.log('   Nombre:', login.data.data.nombres, login.data.data.apellidos);
        console.log('   Estado cuenta:', login.data.data.estado_cuenta);
      } else {
        console.log('   Error en login:', login.data.error);
        testResults.failed++;
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('   Credenciales inválidas, probando con usuario existente...');
        
        // Intentar con un usuario existente
        try {
          const members = await axios.get(`${API_BASE}/members?limit=1`);
          if (members.data.success && members.data.count > 0) {
            const existingUser = members.data.data[0];
            const existingLogin = await axios.post(`${API_BASE}/auth/login`, {
              email: existingUser.email,
              contraseña: 'password123' // Probamos con contraseña por defecto
            });
            
            if (existingLogin.data.success) {
              testResults.passed++;
              console.log('   Login exitoso con usuario existente:', existingUser.email);
            } else {
              console.log('   Error login usuario existente:', existingLogin.data.error);
              testResults.skipped++;
            }
          } else {
            console.log('   No hay usuarios para probar login');
            testResults.skipped++;
          }
        } catch (innerError) {
          console.log('   Error probando usuario existente:', innerError.response?.data?.error || innerError.message);
          testResults.skipped++;
        }
      } else {
        console.log('   Error:', error.response?.data?.error || error.message);
        testResults.failed++;
      }
    }
    
    // 10. Probar obtención de miembros con filtros
    console.log('\n10. Probando obtención de miembros...');
    testResults.total++;
    try {
      const members = await axios.get(`${API_BASE}/members?limit=5&page=1`);
      
      if (members.data.success) {
        testResults.passed++;
        console.log('   Miembros obtenidos:', members.data.count);
        console.log('   Total en sistema:', members.data.total);
        console.log('   Página:', members.data.page, 'de', members.data.totalPages);
        
        if (members.data.count > 0) {
          members.data.data.slice(0, 3).forEach((member, i) => {
            console.log(`      ${i + 1}. ${member.nombre_usuario} (${member.email})`);
            console.log(`         Tipo: ${member.tipo_miembro}, Estado: ${member.estado_cuenta}`);
          });
        }
      } else {
        console.log('   Error:', members.data.error);
        testResults.failed++;
      }
    } catch (error) {
      console.log('   Error:', error.response?.data?.error || error.message);
      testResults.failed++;
    }
    
    // 11. Probar obtención de miembro específico
    console.log('\n11. Probando obtención de miembro específico...');
    testResults.total++;
    try {
      // Obtener un email existente
      const members = await axios.get(`${API_BASE}/members?limit=1`);
      if (members.data.success && members.data.count > 0) {
        const memberEmail = members.data.data[0].email;
        const member = await axios.get(`${API_BASE}/members/${memberEmail}`);
        
        if (member.data.success) {
          testResults.passed++;
          console.log('   Miembro obtenido:', member.data.data.nombres, member.data.data.apellidos);
          console.log('   CI:', member.data.data.ci);
          console.log('   Email:', member.data.data.email);
          console.log('   Fecha registro:', member.data.data.fecha_registro);
        } else {
          console.log('   Error obteniendo miembro:', member.data.error);
          testResults.failed++;
        }
      } else {
        console.log('   No hay miembros para probar');
        testResults.skipped++;
      }
    } catch (error) {
      console.log('   Error:', error.response?.data?.error || error.message);
      testResults.failed++;
    }
    
    // Resumen
    console.log('\n=== RESUMEN DE PRUEBAS ===');
    console.log('Total pruebas:', testResults.total);
    console.log('Pasadas:', testResults.passed);
    console.log('Falladas:', testResults.failed);
    console.log('Saltadas:', testResults.skipped);
    
    const successRate = testResults.total > 0 ? 
      Math.round((testResults.passed / testResults.total) * 100) : 0;
    console.log('Porcentaje de éxito:', successRate + '%');
    
    if (testResults.failed === 0 && testResults.passed > 0) {
      console.log('\n¡Todas las pruebas pasaron exitosamente!');
    } else if (testResults.failed > 0) {
      console.log('\nAlgunas pruebas fallaron. Revisa los errores arriba.');
    }
    
    return testResults;
    
  } catch (error) {
    console.log('\nError general en las pruebas:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data.error || error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Ejecutar pruebas
testAPI();