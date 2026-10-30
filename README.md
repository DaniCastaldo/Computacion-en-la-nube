# Computacion-en-la-nube
Grupo:   
Antonela Lauria; C.I.:30.969.781  
Daniela Castaldo; C.I.: 30.906.448  
Mariadelia Finizola; C.I.: 30.693.341   
Violeta Semprúm; C.I.: 31.423.116  
Melanie Gamboa; C.I.:31.082.086  

SoyUCAB - Plataforma y Red Social Universitaria

El alcance de este proyecto abarca la creación de una plataforma segura donde estudiantes, egresados y profesores puedan registrarse y tener perfiles propios. La herramienta funciona como una red social interna que permite a la comunidad conectarse, seguirse e interactuar según sus intereses comunes. Además, facilita la vida académica al mostrar de forma clara qué tutores están disponibles, las materias que imparten y a qué facultad pertenecen. Un aspecto clave del sistema es que permite rastrear el éxito profesional de los egresados a través de un mapa interactivo que muestra en qué partes del mundo viven, junto con información sobre las empresas donde más trabajan. Por último, la plataforma cuenta con un espacio dedicado a registrar y destacar los premios y reconocimientos que recibe la comunidad universitaria año tras año.

Problemática que Resuelve:  
1.- Pérdida de contacto con egresados, debido a la dificultad de mantener un registro actualizado sobre la ubicación geográfica y la inserción laboral de sus graduados.  
2.- Limitada proyección y seguimiento del éxito profesional de los egresados ucabistas, debido a la falta de herramientas analíticas que muestren las principales empresas contratantes y el posicionamiento global de la comunidad universitaria.  
3.- Fragmentación de la información académica institucional, debido a la falta de un sistema unificado para consultar el catálogo de tutores activos del semestre, la oferta de asignaturas y la visualización de distinciones académicas por facultad.  

Diagrama de arquitectura:  

<img width="2952" height="1542" alt="Diagrama V1" src="https://github.com/user-attachments/assets/dbc7489f-b8ce-48e3-8e29-d39fe9808ba5" />


## Contenerización (Docker)

Se creó un `Dockerfile` para empaquetar la API Backend (`Backend-SoyUcab`).

* **Imagen Base:** `node:18-alpine` (ligera y optimizada para producción).
* **Contenedor:** Aísla la ejecución del runtime Node.js, Express y sus dependencias.
* **Puertos:** Se expone el puerto `3000` (`EXPOSE 3000`), asociando las peticiones externas al proceso interno de Express.
* **Variables de Entorno:**
  * `PORT`: Puerto de escucha del servidor (3000 por defecto).
  * `NODE_ENV`: Entorno de producción (`production`).
  * `DATABASE_URL`: Inyectada en tiempo de ejecución para la conexión remota con Supabase (aislada del repositorio).
* **Ejecución local del contenedor:**
  ```bash
  docker build -t backend-soyucab .
  docker run -p 3000:3000 --env-file .env backend-soyucab
* **Verificar que está respondiendo:**
  1. Se abre el navegador web o Postman y se ingresa a: http://localhost:3000 (o la ruta de prueba de la API).
  2. Si responde, el contenedor está funcionando bien.
  3. Para ver los logs de lo que pasa dentro del contenedor, se puede usar: docker logs backend-container
  4. Para apagar el contenedor cuando se termine la prueba: docker stop backend-container
# Despliegue en producción (Render)
Se realizó el despliegue del contenedor backend en la plataforma PaaS Render para su ejecución continua en la nube.
- **Plataforma:** Render (Web Service).
- **Runtime:** Docker (construido desde el Dockerfile en la carpeta `Backend-SoyUcab`).
- **Base de Datos:** Conexión remota activa con PostgreSQL en Supabase mediante TLS/SSL.
- **URL Base de Producción:** https://soyucab-backend.onrender.com
- **Endpoints de Verificación:**
  1. Estado del servicio (Health Check): https://soyucab-backend.onrender.com/api/health
  2. Catálogo de rutas de la API: https://soyucab-backend.onrender.com/api
# Despliegue del Frontend (Vercel)

El frontend de la aplicación se encuentra alojado y desplegado de manera continua mediante **Vercel** (PaaS/Serverless Hosting).

### Configuración e Integración
1. **Conexión al Repositorio:** Se vinculó el proyecto directamente con el repositorio de GitHub (`main` branch) para habilitar el despliegue automático ante nuevos cambios (Pipeline CI/CD).
2. **Directorio Raíz (Root Directory):** Se configuró la compilación apuntando al directorio `SoyUcab-Project/` donde reside el código del cliente.
3. **Dominio Público:** La interfaz web quedó disponible en producción a través del dominio generado por la plataforma:
   `https://computacion-en-la-nube-ten.vercel.app`

### Ajustes Técnicos Realizados
- **Compatibilidad de Rutas y Recursos (`Header.vue`):** Se corrigieron las referencias a URLs estáticas y rutas de imágenes en el componente `Header.vue` (`ffc96a2`) para cumplir con las políticas estrictas del motor de compilación y servidor estático de Vercel.
- **Integración Continua (CI/CD):** Cualquier commit o *pull request* integrado a la rama principal activa un build automatizado en Vercel que actualiza el entorno de producción en tiempo real.
