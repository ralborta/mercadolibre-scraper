const Apify = require('apify');
const { PuppeteerCrawler, Dataset } = require('crawlee');

Apify.main(async () => {
    console.log('🚀 Iniciando MercadoLibre Scraper Avanzado...');
    
    // Obtener inputs del usuario
    const input = await Apify.getInput();
    const {
        searchTerms = ['memoria ram'],
        country = 'argentina',
        maxPages = 5,
        minPrice = 0,
        maxPrice = 999999,
        includePromotions = true,
        includeCommissionAnalysis = true,
        outputFormat = 'json'
    } = input;

    console.log('📝 Configuración:', {
        searchTerms,
        country,
        maxPages,
        priceRange: `$${minPrice} - $${maxPrice}`,
        includePromotions,
        includeCommissionAnalysis
    });

    // Configurar dominio según país
    const domains = {
        argentina: 'mercadolibre.com.ar',
        mexico: 'mercadolibre.com.mx',
        colombia: 'mercadolibre.com.co',
        chile: 'mercadolibre.cl',
        peru: 'mercadolibre.com.pe',
        uruguay: 'mercadolibre.com.uy'
    };
    
    const baseUrl = `https://${domains[country]}`;
    
    // Configurar el crawler
    const crawler = new PuppeteerCrawler({
        launchContext: {
            launchOptions: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        },
        maxRequestsPerCrawl: maxPages * 50,
        maxConcurrency: 2,
        requestHandlerTimeoutSecs: 60,
        
        async requestHandler({ page, request, log }) {
            const url = request.url;
            log.info(`🔍 Procesando: ${url}`);
            
            try {
                // Esperar a que cargue la página
                await page.waitForSelector('.ui-search-result', { timeout: 30000 });
                
                // Extraer productos de la página
                const products = await page.evaluate(() => {
                    const productElements = document.querySelectorAll('.ui-search-result');
                    const results = [];
                    
                    productElements.forEach((element, index) => {
                        try {
                            const titleElement = element.querySelector('.ui-search-item__title');
                            const priceElement = element.querySelector('.andes-money-amount__fraction');
                            const linkElement = element.querySelector('.ui-search-item__group__element a');
                            
                            if (!titleElement || !priceElement || !linkElement) return;
                            
                            const title = titleElement.textContent.trim();
                            const price = priceElement.textContent.trim();
                            const link = linkElement.href;
                            
                            // Extraer ID del producto
                            const mlMatch = link.match(/ML[A-Z]\d+/);
                            const productId = mlMatch ? mlMatch[0] : null;
                            
                            // Precio original (tachado)
                            const originalPriceElement = element.querySelector('.ui-search-price__original-value');
                            const originalPrice = originalPriceElement ? 
                                originalPriceElement.textContent.trim() : null;
                            
                            // Descuento
                            const discountElement = element.querySelector('.ui-search-price__discount');
                            const discount = discountElement ? 
                                discountElement.textContent.trim() : null;
                            
                            // Envío gratis
                            const freeShippingElement = element.querySelector('[data-testid="shipping-info"]');
                            const freeShipping = freeShippingElement ? 
                                freeShippingElement.textContent.includes('gratis') : false;
                            
                            // Vendedor
                            const sellerElement = element.querySelector('.ui-search-official-store-label');
                            const seller = sellerElement ? sellerElement.textContent.trim() : 'Vendedor particular';
                            
                            // Ubicación
                            const locationElement = element.querySelector('.ui-search-item__group__element--location');
                            const location = locationElement ? locationElement.textContent.trim() : '';
                            
                            results.push({
                                productId,
                                title,
                                price,
                                originalPrice,
                                discount,
                                link,
                                seller,
                                location,
                                freeShipping,
                                extractedAt: new Date().toISOString(),
                                position: index + 1,
                                searchTerm: 'memoria ram',
                                country: 'argentina'
                            });
                            
                        } catch (error) {
                            console.error('Error extrayendo producto:', error);
                        }
                    });
                    
                    return results;
                });
                
                log.info(`✅ Extraídos ${products.length} productos de la página`);
                
                // Filtrar por precio y guardar
                for (const product of products) {
                    const numericPrice = parseFloat(product.price?.replace(/[^\d]/g, '') || '0');
                    if (numericPrice >= minPrice && numericPrice <= maxPrice) {
                        await Dataset.pushData(product);
                        log.info(`💾 Guardado: ${product.title} - $${numericPrice}`);
                    }
                }
                
            } catch (error) {
                log.error(`❌ Error en requestHandler:`, error);
                throw error;
            }
        },
        
        failedRequestHandler({ request, error, log }) {
            log.error(`❌ Request failed: ${request.url}`, error);
        }
    });
    
    // Generar URLs de búsqueda
    const requests = [];
    for (const searchTerm of searchTerms) {
        const searchUrl = `${baseUrl}/sitios/search?q=${encodeURIComponent(searchTerm)}`;
        requests.push({
            url: searchUrl,
            userData: { searchTerm }
        });
    }
    
    console.log(`🎯 Iniciando scraping de ${requests.length} búsquedas...`);
    
    // Ejecutar el crawler
    await crawler.run(requests);
    
    // Obtener datos finales
    const dataset = await Dataset.open();
    const { items } = await dataset.getData();
    
    console.log(`🎉 Scraping completado! Total de productos: ${items.length}`);
    
    console.log('✅ Actor completado exitosamente!');
}); 