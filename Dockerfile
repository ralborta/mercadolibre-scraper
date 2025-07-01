# Usar imagen base más estable
FROM apify/actor-node-puppeteer-chrome:20

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias de forma más simple
RUN npm install --production \
    && npm cache clean --force

# Copiar el resto del código
COPY . ./

# Comando de inicio
CMD npm start 