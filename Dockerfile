# Usar la imagen base oficial de Apify con Node.js y navegadores
FROM apify/actor-node-puppeteer-chrome:18

# Copiar archivos del proyecto
COPY package*.json ./

# Instalar dependencias
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Instaladas dependencias del Actor" \
    && rm -r ~/.npm

# Copiar código fuente
COPY . ./

# Ejecutar el Actor
CMD npm start 