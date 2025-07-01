# Usar imagen base más estable
FROM apify/actor-node-puppeteer-chrome:20

# Configurar el directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivos de configuración primero
COPY package*.json ./

# Instalar dependencias con configuración optimizada
RUN npm ci --only=production --no-audit --no-fund \
    && echo "Dependencias instaladas correctamente" \
    && npm cache clean --force

# Copiar el resto del código
COPY . ./

# Configurar permisos
RUN chmod +x src/main.js

# Comando de inicio
CMD npm start 