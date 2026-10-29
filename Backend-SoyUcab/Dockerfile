# 1. Imagen base oficial de Node.js (liviana y segura)
FROM node:18-alpine

# 2. Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 3. Copiar manifest de dependencias
COPY package*.json ./

# 4. Instalar dependencias de producción
RUN npm install --only=production

# 5. Copiar el código fuente
COPY . .

# 6. Exponer el puerto de la API
EXPOSE 3000

# 7. Variables de entorno por defecto
ENV PORT=3000
ENV NODE_ENV=production

# 8. Comando de inicio
CMD ["npm", "start"]
