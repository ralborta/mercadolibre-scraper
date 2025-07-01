# 🛒 MercadoLibre Advanced Scraper

Un Actor avanzado para extraer datos de productos de MercadoLibre con análisis de comisiones, inteligencia competitiva y detección de oportunidades de arbitraje.

## 🚀 Características principales

### 📊 Extracción de datos completa
- **Información básica**: Título, precio, stock, vendidos
- **Datos del vendedor**: Reputación, nivel, historial
- **Especificaciones técnicas**: Atributos y características
- **Información de envío**: Costos, modalidades, tiempos
- **Promociones**: Descuentos, ofertas especiales

### 💰 Análisis financiero
- **Cálculo de comisiones** de MercadoLibre por categoría
- **Análisis de márgenes** de ganancia
- **Comparación de precios** entre vendedores
- **Detección de oportunidades** de arbitraje

### 🌎 Soporte multi-país
- Argentina (mercadolibre.com.ar)
- México (mercadolibre.com.mx)
- Colombia (mercadolibre.com.co)
- Chile (mercadolibre.cl)
- Perú (mercadolibre.com.pe)
- Uruguay (mercadolibre.com.uy)

### 📈 Inteligencia competitiva
- **Análisis de mercado** automático
- **Identificación de competidores** principales
- **Estadísticas de precios** (min, max, promedio, mediana)
- **Concentración de mercado** por vendedores

## 🔧 Configuración

### Parámetros básicos
- **Términos de búsqueda**: Lista de productos a buscar
- **País**: Seleccionar mercado de MercadoLibre
- **Páginas máximas**: Límite de páginas por búsqueda
- **Rango de precios**: Filtros de precio mínimo y máximo

### Parámetros avanzados
- **Análisis de comisiones**: Calcular fees de MercadoLibre
- **Datos del vendedor**: Extraer información de sellers
- **Atributos del producto**: Especificaciones técnicas
- **Detección de arbitraje**: Encontrar oportunidades de precio

## 📋 Ejemplo de uso

```json
{
  "searchTerms": ["memoria ram", "disco ssd", "procesador"],
  "country": "argentina",
  "maxPages": 5,
  "minPrice": 10000,
  "maxPrice": 200000,
  "includeCommissionAnalysis": true,
  "generateReport": true,
  "detectArbitrage": true
}
```

## 📊 Datos extraídos

### Información del producto
```json
{
  "productId": "MLA1106139031",
  "title": "Memoria Ram Pc 16gb Kingston Fury Beast Ddr4 3200mhz",
  "price": 97488,
  "originalPrice": 94988,
  "currencyId": "ARS",
  "condition": "new",
  "availableQuantity": 62,
  "soldQuantity": 5,
  "categoryId": "MLA1694",
  "listingTypeId": "gold_pro"
}
```

### Análisis de comisiones
```json
{
  "commissionRate": 0.274,
  "commissionPercentage": "27.4%",
  "commissionAmount": "26711.71",
  "netAmount": "70776.29",
  "profitMargin": "72.6%"
}
```

### Datos del vendedor
```json
{
  "sellerId": "123456789",
  "sellerNickname": "VENDEDOR_EJEMPLO",
  "sellerReputation": {
    "level_id": "5_green",
    "power_seller_status": "gold"
  }
}
```

## 📈 Reportes generados

### Estadísticas de mercado
- Análisis de precios (min, max, promedio, mediana)
- Top 10 vendedores por volumen
- Distribución por categorías
- Concentración de mercado

### Oportunidades de arbitraje
- Productos similares con diferencias de precio >20%
- Cálculo de ganancia potencial
- Análisis de competidores

## 🛠️ Casos de uso

### Para vendedores
- **Investigación de competencia**: Analizar precios y estrategias
- **Optimización de precios**: Encontrar el precio óptimo
- **Identificación de nichos**: Descubrir oportunidades de mercado
- **Análisis de rentabilidad**: Calcular márgenes reales

### Para compradores
- **Comparación de precios**: Encontrar las mejores ofertas
- **Análisis de vendedores**: Evaluar reputación y confiabilidad
- **Tracking de precios**: Monitorear cambios en el tiempo
- **Detección de ofertas**: Identificar descuentos reales

### Para analistas
- **Estudios de mercado**: Análisis sectorial completo
- **Inteligencia competitiva**: Monitoreo de competidores
- **Tendencias de precios**: Análisis temporal
- **Oportunidades de inversión**: Identificar nichos rentables

## 🔄 Formatos de salida

### JSON (por defecto)
Formato estructurado para procesamiento programático

### CSV
Ideal para análisis en Excel o herramientas de BI

### Excel
Formato completo con múltiples hojas:
- Productos
- Estadísticas
- Oportunidades de arbitraje
- Análisis de vendedores

## ⚡ Rendimiento

- **Velocidad**: Hasta 1000 productos por minuto
- **Concurrencia**: 3 navegadores simultáneos
- **Memoria**: 4GB RAM recomendados
- **Timeout**: 60 minutos máximo por ejecución

## 🔒 Consideraciones legales

Este Actor está diseñado para:
- ✅ Investigación de mercado legítima
- ✅ Análisis de competencia
- ✅ Comparación de precios públicos
- ✅ Estudios académicos

**Importante**: Respeta los términos de servicio de MercadoLibre y las leyes locales de protección de datos.

## 🆘 Soporte

Para soporte técnico o consultas:
- 📧 Email: support@tu-empresa.com
- 💬 Discord: Tu servidor
- 🐛 Issues: GitHub repository

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver archivo LICENSE para más detalles.

---

**Desarrollado con ❤️ para la comunidad de Apify** 