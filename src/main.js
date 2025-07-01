const Apify = require('apify');
const { PuppeteerCrawler, Dataset } = require('crawlee');
const { extractProductData, calculateCommissions, formatPrice } = require('./utils');

Apify.main(async () => {
    console.log('🚀 Iniciando MercadoLibre Scraper Avanzado...');
    
    // Obtener inputs del usuario
    const input = await Apify.getInput();
    const {
        searchTerms = ['memoria ram'],
        country = 'argentina', // argentina, mexico, colombia, chile
        maxPages = 5,
        minPrice = 0,
        maxPrice = 999999,
        includePromotions = true,
        includeCommissionAnalysis = true,
        outputFormat = 'json' // json, csv, excel
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
        chile: 'mercadolibre.cl'
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
        maxRequestsPerCrawl: maxPages * 50, // ~50 productos por página
        maxConcurrency: 3,
        requestHandlerTimeoutSecs: 120,
        
        async requestHandler({ page, request, log }) {
            const url = request.url;
            log.info(`🔍 Procesando: ${url}`);
            
            try {
                // Esperar a que cargue la página
                await page.waitForSelector('[data-testid="results-section-title"]', { timeout: 30000 });
                
                // Extraer productos de la página
                const products = await page.evaluate(() => {
                    const productElements = document.querySelectorAll('.ui-search-result');
                    const results = [];
                    
                    productElements.forEach((element, index) => {
                        try {
                            // Extraer datos básicos
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
                                position: index + 1
                            });
                            
                        } catch (error) {
                            console.error('Error extrayendo producto:', error);
                        }
                    });
                    
                    return results;
                });
                
                log.info(`✅ Extraídos ${products.length} productos de la página`);
                
                // Procesar cada producto para obtener datos detallados
                for (const product of products) {
                    if (!product.productId) continue;
                    
                    try {
                        // Obtener datos detallados del producto
                        const detailedData = await extractProductData(product.productId, baseUrl, page);
                        
                        // Calcular comisiones si está habilitado
                        let commissionData = {};
                        if (includeCommissionAnalysis && detailedData.price) {
                            commissionData = calculateCommissions(
                                detailedData.price, 
                                detailedData.category,
                                detailedData.publicationType
                            );
                        }
                        
                        // Combinar todos los datos
                        const finalProduct = {
                            ...product,
                            ...detailedData,
                            ...commissionData,
                            searchTerm: request.userData.searchTerm,
                            country: country,
                            scrapedAt: new Date().toISOString()
                        };
                        
                        // Filtrar por precio si está configurado
                        const numericPrice = parseFloat(finalProduct.price?.replace(/[^\d]/g, '') || '0');
                        if (numericPrice >= minPrice && numericPrice <= maxPrice) {
                            await Dataset.pushData(finalProduct);
                            log.info(`💾 Guardado: ${finalProduct.title} - $${numericPrice}`);
                        }
                        
                    } catch (error) {
                        log.error(`❌ Error procesando producto ${product.productId}:`, error);
                    }
                }
                
                // Buscar siguiente página
                const nextPageLink = await page.$eval('.andes-pagination__button--next:not(.andes-pagination__button--disabled)', 
                    el => el.href).catch(() => null);
                
                if (nextPageLink && request.userData.currentPage < maxPages) {
                    await crawler.addRequests([{
                        url: nextPageLink,
                        userData: {
                            ...request.userData,
                            currentPage: request.userData.currentPage + 1
                        }
                    }]);
                    log.info(`➡️ Agregada página siguiente: ${request.userData.currentPage + 1}`);
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
    
    // Generar URLs de búsqueda para cada término
    const requests = [];
    for (const searchTerm of searchTerms) {
        const searchUrl = `${baseUrl}/sitios/search?q=${encodeURIComponent(searchTerm)}`;
        requests.push({
            url: searchUrl,
            userData: {
                searchTerm,
                currentPage: 1
            }
        });
    }
    
    console.log(`🎯 Iniciando scraping de ${requests.length} búsquedas...`);
    
    // Ejecutar el crawler
    await crawler.run(requests);
    
    // Obtener datos finales
    const dataset = await Dataset.open();
    const { items } = await dataset.getData();
    
    console.log(`🎉 Scraping completado! Total de productos: ${items.length}`);
    
    // Generar estadísticas
    const stats = {
        totalProducts: items.length,
        averagePrice: items.reduce((sum, item) => {
            const price = parseFloat(item.price?.replace(/[^\d]/g, '') || '0');
            return sum + price;
        }, 0) / items.length,
        priceRange: {
            min: Math.min(...items.map(item => parseFloat(item.price?.replace(/[^\d]/g, '') || '0'))),
            max: Math.max(...items.map(item => parseFloat(item.price?.replace(/[^\d]/g, '') || '0')))
        },
        topSellers: [...new Set(items.map(item => item.seller))].slice(0, 10),
        categoriesFound: [...new Set(items.map(item => item.category))],
        completedAt: new Date().toISOString()
    };
    
    await Apify.setValue('STATS', stats);
    console.log('📊 Estadísticas guardadas:', stats);
    
    console.log('✅ Actor completado exitosamente!');
}); 