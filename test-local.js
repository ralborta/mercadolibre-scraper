const Apify = require('apify');

// Configuración de prueba local
const testInput = {
    searchTerms: ['memoria ram'],
    country: 'argentina',
    maxPages: 2,
    minPrice: 50000,
    maxPrice: 150000,
    includeCommissionAnalysis: true,
    includeSellerData: true,
    generateReport: true,
    detectArbitrage: true
};

// Simular el input de Apify
Apify.getInput = async () => testInput;

// Ejecutar el scraper
async function runTest() {
    console.log('🧪 Iniciando prueba local del MercadoLibre Scraper...');
    console.log('📝 Configuración de prueba:', testInput);
    
    try {
        // Importar y ejecutar el main
        require('./src/main.js');
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

if (require.main === module) {
    runTest();
} 