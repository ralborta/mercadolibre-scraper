const { Actor } = require('apify');
const { PuppeteerCrawler } = require('crawlee');

Actor.main(async () => {
    console.log('🚀 Iniciando MercadoLibre Scraper - Kingston Fury Beast...');
    
    // Input con el término específico
    const input = await Actor.getInput();
    const searchTerm = input?.searchTerm || 'Kingston Fury Beast DDR4 16GB';
    
    console.log(`🔍 Buscando: ${searchTerm}`);
    
    // URL de búsqueda estándar más flexible
    const searchUrl = `https://listado.mercadolibre.com.ar/${encodeURIComponent(searchTerm).replace(/%20/g, '-')}`;
    
    console.log(`📄 URL de búsqueda: ${searchUrl}`);
    
    // Usar PuppeteerCrawler para una sola URL
    const crawler = new PuppeteerCrawler({
        async requestHandler({ page, request }) {
            console.log('✅ Página cargada, investigando selectores disponibles...');
            
            // Esperar a que cargue la página (compatible)
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Investigar qué selectores están disponibles
            const availableSelectors = await page.evaluate(() => {
                const selectors = [
                    '.ui-search-result',
                    '.ui-search-item',
                    '.ui-search-item__title',
                    '[data-testid="search-result"]',
                    '.ui-search-cards-grid',
                    '.ui-search-results',
                    '.andes-card',
                    '.poly-card',
                    'article'
                ];
                
                const found = {};
                selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    found[selector] = elements.length;
                });
                
                return found;
            });
            
            console.log('🔍 Selectores encontrados:', availableSelectors);
            
            // Buscar el mejor selector disponible
            let productsSelector = null;
            if (availableSelectors['.poly-card'] > 0) {
                productsSelector = '.poly-card';
            } else if (availableSelectors['.ui-search-result'] > 0) {
                productsSelector = '.ui-search-result';
            } else if (availableSelectors['.ui-search-item'] > 0) {
                productsSelector = '.ui-search-item';
            } else if (availableSelectors['[data-testid="search-result"]'] > 0) {
                productsSelector = '[data-testid="search-result"]';
            } else if (availableSelectors['.andes-card'] > 0) {
                productsSelector = '.andes-card';
            } else if (availableSelectors['article'] > 0) {
                productsSelector = 'article';
            }
            
            console.log(`🎯 Usando selector: ${productsSelector}`);
            
            if (!productsSelector) {
                console.log('❌ No se encontraron productos en la página');
                return;
            }
            
            // Extraer productos con el selector que funciona
            const products = await page.evaluate((selector) => {
                const items = document.querySelectorAll(selector);
                const results = [];
                
                console.log(`Encontrados ${items.length} elementos con selector: ${selector}`);
                
                for (let i = 0; i < Math.min(15, items.length); i++) {
                    const item = items[i];
                    
                    try {
                        // Buscar título
                        let titleElement = item.querySelector('.ui-search-item__title') || 
                                         item.querySelector('h2') || 
                                         item.querySelector('h3') ||
                                         item.querySelector('[data-testid="title"]') ||
                                         item.querySelector('.title');
                        
                        const title = titleElement?.textContent?.trim();
                        
                        // Buscar link
                        const linkElement = item.querySelector('a.ui-search-link') || 
                                          item.querySelector('a') ||
                                          item.querySelector('[href*="MLA"]');
                        const link = linkElement?.href;
                        
                        // Extraer ID del producto
                        const mlMatch = link?.match(/MLA\d+/);
                        const productId = mlMatch ? mlMatch[0] : null;
                        
                        // Precio actual
                        const priceElement = item.querySelector('.andes-money-amount__fraction') ||
                                           item.querySelector('.price') ||
                                           item.querySelector('[data-testid="price"]');
                        const price = priceElement?.textContent?.trim();
                        
                        // Precio tachado
                        const originalPriceElement = item.querySelector('.ui-search-price__original-value .andes-money-amount__fraction') ||
                                                   item.querySelector('.ui-search-price__second-line .andes-money-amount__fraction');
                        const originalPrice = originalPriceElement?.textContent?.trim();
                        
                        // Descuento
                        const discountElement = item.querySelector('.ui-search-price__discount');
                        const discount = discountElement?.textContent?.trim();
                        
                        // Envío gratis
                        const shippingElement = item.querySelector('.ui-search-item__shipping');
                        const freeShipping = shippingElement?.textContent?.includes('gratis') || false;
                        
                        // Vendedor - Simplificado para evitar errores
                        const sellerElement = item.querySelector('.ui-search-official-store-label') ||
                                            item.querySelector('.ui-search-item__store-name');
                        const seller = sellerElement?.textContent?.trim() || 'Vendedor particular';
                        
                        // Ubicación
                        const locationElement = item.querySelector('.ui-search-item__group__element--location');
                        const location = locationElement?.textContent?.trim() || '';
                        
                        // Vendidos
                        const soldElement = item.querySelector('.ui-search-item__group__element--sold');
                        const soldQuantity = soldElement?.textContent?.trim() || '0';
                        
                        // Condición
                        const conditionElement = item.querySelector('.ui-search-item__group__element--condition');
                        const condition = conditionElement?.textContent?.trim() || 'N/A';
                        
                        // Imagen
                        const imageElement = item.querySelector('img');
                        const imageUrl = imageElement?.src || imageElement?.getAttribute('data-src') || '';
                        
                        console.log(`Item ${i}: title="${title}", price="${price}", productId="${productId}"`);
                        
                        // Solo agregar si tiene los datos mínimos
                        if (title && productId) {
                            results.push({
                                productId,
                                title,
                                link,
                                position: i + 1,
                                extractedAt: new Date().toISOString(),
                                status: 'active',
                                precio: price ? `$${price.replace(/\./g, ',')}` : 'Sin precio',
                                precioOriginal: originalPrice ? `$${originalPrice.replace(/\./g, ',')}` : null,
                                descuento: discount || null,
                                seller,
                                location,
                                condition,
                                freeShipping,
                                soldQuantity,
                                imageUrl,
                                hasDiscount: originalPrice && price && originalPrice !== price
                            });
                        }
                        
                    } catch (error) {
                        console.error(`Error procesando item ${i}:`, error);
                    }
                }
                
                return results;
            }, productsSelector);
            
            console.log(`✅ Encontrados ${products.length} productos`);
            
            // Procesar cada producto
            let totalProcessed = 0;
            for (const product of products) {
                totalProcessed++;
                
                console.log('--------------------------------------------------------------------------------');
                console.log(`Procesando: ${product.productId}`);
                console.log(`  - Status: ${product.status}`);
                console.log(`  - Título: ${product.title}`);
                console.log(`  - Precio actual: ${product.precio}`);
                if (product.precioOriginal) {
                    console.log(`  - Precio original: ${product.precioOriginal}`);
                }
                if (product.descuento) {
                    console.log(`  - Descuento: ${product.descuento}`);
                }
                console.log(`  - Vendedor: ${product.seller}`);
                console.log(`  - Ubicación: ${product.location}`);
                console.log(`  - Condición: ${product.condition}`);
                console.log(`  - Envío gratis: ${product.freeShipping}`);
                console.log(`  - Vendidos: ${product.soldQuantity}`);
                console.log(`  - Link: ${product.link}`);
                console.log(`  - Posición: ${product.position}`);
                
                // Guardar en Apify Dataset
                await Actor.pushData(product);
            }
            
            console.log('--------------------------------------------------------------------------------');
            console.log(`Total procesados: ${totalProcessed}`);
        }
    });
    
    // Ejecutar el crawler con la URL
    await crawler.run([searchUrl]);
    
    console.log('🎉 ¡Scraping completado exitosamente!');
});