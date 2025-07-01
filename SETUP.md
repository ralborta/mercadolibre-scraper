# 🚀 Guía de configuración - MercadoLibre Advanced Scraper

## 📋 Pasos para subir el Actor a Apify

### 1. Preparar el repositorio en GitHub

```bash
# Navegar al directorio del proyecto
cd Users/ralborta/mercadolibre-scraper

# Inicializar git
git init

# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit: MercadoLibre Advanced Scraper"

# Conectar con tu repositorio de GitHub
git remote add origin https://github.com/TU-USUARIO/mercadolibre-scraper.git

# Subir a GitHub
git push -u origin main
```

### 2. Conectar con Apify

1. **Ir a Apify Console**: https://console.apify.com/
2. **Crear nuevo Actor**: Click en "Create new Actor"
3. **Seleccionar "Link Git repository"**
4. **Pegar la URL de tu repo**: `https://github.com/TU-USUARIO/mercadolibre-scraper`
5. **Configurar build**: Seleccionar rama `main`

### 3. Configurar el Actor en Apify

#### Información básica:
- **Nombre**: `mercadolibre-advanced-scraper`
- **Título**: `MercadoLibre Advanced Scraper`
- **Descripción**: Usar la del README.md
- **Categorías**: E-commerce, Business Intelligence, Price Monitoring

#### Configuración de build:
- **Dockerfile**: `./Dockerfile`
- **Build tag**: `latest`
- **Memory**: 4096 MB
- **Timeout**: 3600 segundos

### 4. Probar el Actor

#### Input de prueba:
```json
{
  "searchTerms": ["memoria ram", "disco ssd"],
  "country": "argentina",
  "maxPages": 2,
  "minPrice": 10000,
  "maxPrice": 200000,
  "includeCommissionAnalysis": true,
  "generateReport": true,
  "detectArbitrage": true
}
```

### 5. Publicar en Apify Store

1. **Configurar pricing**: Decidir modelo de precios
2. **Agregar screenshots**: Capturas de los resultados
3. **Escribir descripción completa**: Usar README como base
4. **Configurar categorías y tags**
5. **Publicar**: Submit for review

## 🛠️ Desarrollo local (opcional)

### Instalar dependencias:
```bash
npm install
```

### Probar localmente:
```bash
node test-local.js
```

### Instalar Apify CLI:
```bash
npm install -g @apify/cli
apify login
```

### Ejecutar con Apify CLI:
```bash
apify run
```

## 📊 Funcionalidades implementadas

### ✅ Básicas
- [x] Scraping de productos de MercadoLibre
- [x] Soporte multi-país
- [x] Filtros de precio y páginas
- [x] Extracción de datos completos

### ✅ Avanzadas
- [x] Cálculo de comisiones de MercadoLibre
- [x] Análisis de márgenes de ganancia
- [x] Datos detallados del vendedor
- [x] Información de promociones
- [x] Especificaciones técnicas

### ✅ Inteligencia competitiva
- [x] Detección de oportunidades de arbitraje
- [x] Análisis de mercado automático
- [x] Estadísticas de precios
- [x] Top vendedores por volumen
- [x] Concentración de mercado

### ✅ Exportación
- [x] Formato JSON
- [x] Formato CSV
- [x] Reportes estadísticos
- [x] Datos estructurados

## 🎯 Próximas mejoras

### 🔄 Versión 2.0
- [ ] Tracking histórico de precios
- [ ] Alertas por email/webhook
- [ ] Dashboard web interactivo
- [ ] API REST para consultas
- [ ] Integración con Google Sheets
- [ ] Análisis predictivo con ML

### 📈 Monetización
- [ ] Modelo freemium (100 productos gratis)
- [ ] Suscripciones premium
- [ ] API de datos en tiempo real
- [ ] Consultoria personalizada

## 💡 Ideas de marketing

### 🎯 Target audience
- **Vendedores de MercadoLibre**: Análisis de competencia
- **Dropshippers**: Identificación de productos rentables
- **Analistas de mercado**: Estudios sectoriales
- **Inversionistas**: Oportunidades de arbitraje

### 📢 Canales de promoción
- **Grupos de Facebook**: Vendedores de ML
- **LinkedIn**: Profesionales de e-commerce
- **YouTube**: Tutoriales de uso
- **Blog**: Casos de estudio

## 🆘 Soporte técnico

### Errores comunes:
1. **Timeout**: Reducir maxPages o usar proxies
2. **Blocked**: Activar proxy configuration
3. **Memory**: Aumentar memoria a 8GB para grandes volúmenes

### Logs importantes:
- `🔍 Procesando:` - URL siendo scrapeada
- `✅ Extraídos X productos` - Productos encontrados por página
- `💾 Guardado:` - Producto guardado exitosamente
- `❌ Error:` - Errores que requieren atención

---

**¡Tu Actor está listo para conquistar el mercado! 🚀** 