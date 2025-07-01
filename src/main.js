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
                
                // Obtener el HTML de la página para debug
                const pageTitle = await page.title();
                const currentUrl = page.url();
                
                console.log(`📄 Título de página: ${pageTitle}`);
                console.log(`🔗 URL actual: ${currentUrl}`);
                
                // Verificar si hay algún mensaje de "sin resultados"
                const noResultsMessage = await page.evaluate(() => {
                    const messages = [
                        'No hay publicaciones que coincidan con tu búsqueda',
                        'sin resultados',
                        'no se encontraron resultados',
                        'no hay resultados'
                    ];
                    
                    const pageText = document.body.textContent.toLowerCase();
                    for (const msg of messages) {
                        if (pageText.includes(msg)) {
                            return msg;
                        }
                    }
                    return null;
                });
                
                if (noResultsMessage) {
                    console.log(`⚠️  Mensaje de sin resultados: ${noResultsMessage}`);
                }
                
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
                        // Buscar título con múltiples selectores
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
                        
                        // Extraer ID del producto (MLA...)
                        const mlMatch = link?.match(/MLA\d+/);
                        const productId = mlMatch ? mlMatch[0] : null;
                        
                        // PRECIO ACTUAL (sin tachar)
                        const priceElement = item.querySelector('.andes-money-amount__fraction') ||
                                           item.querySelector('.price') ||
                                           item.querySelector('[data-testid="price"]');
                        const price = priceElement?.textContent?.trim();
                        
                        // PRECIO TACHADO (original)
                        const originalPriceElement = item.querySelector('.ui-search-price__original-value .andes-money-amount__fraction') ||
                                                   item.querySelector('.ui-search-price__second-line .andes-money-amount__fraction') ||
                                                   item.querySelector('[data-testid="original-price"] .andes-money-amount__fraction');
                        const originalPrice = originalPriceElement?.textContent?.trim();
                        
                        // DESCUENTO
                        const discountElement = item.querySelector('.ui-search-price__discount') ||
                                              item.querySelector('[data-testid="discount"]') ||
                                              item.querySelector('.discount-tag');
                        const discount = discountElement?.textContent?.trim();
                        
                        // ENVÍO GRATIS
                        const shippingElement = item.querySelector('.ui-search-item__shipping') ||
                                              item.querySelector('[data-testid="shipping"]');
                        const freeShipping = shippingElement?.textContent?.includes('gratis') || 
                                           shippingElement?.textContent?.includes('Gratis') || false;
                        
                        // VENDEDOR/TIENDA OFICIAL
                        const sellerElement = item.querySelector('.ui-search-official-store-label') ||
                                            item.querySelector('.ui-search-item__store-name') ||
                                            item.querySelector('[data-testid="store-name"]');
                        const seller = sellerElement?.textContent?.trim() || 'Vendedor particular';
                        
                        // UBICACIÓN
                        const locationElement = item.querySelector('.ui-search-item__group__element--location') ||
                                              item.querySelector('[data-testid="location"]') ||
                                              item.querySelector('.item-location');
                        const location = locationElement?.textContent?.trim() || '';
                        
                        // VENDIDOS (cantidad)
                        const soldElement = item.querySelector('.ui-search-item__group__element--sold') ||
                                          item.querySelector('[data-testid="sold-quantity"]') ||
                                          item.querySelector('.item-sold-quantity');
                        const soldQuantity = soldElement?.textContent?.trim() || '0';
                        
                        // CONDICIÓN (nuevo/usado)
                        const conditionElement = item.querySelector('.ui-search-item__group__element--condition') ||
                                               item.querySelector('[data-testid="condition"]') ||
                                               item.querySelector('.item-condition');
                        const condition = conditionElement?.textContent?.trim() || 'N/A';
                        
                        // CUOTAS
                        const installmentsElement = item.querySelector('.ui-search-item__group__element--installments') ||
                                                  item.querySelector('[data-testid="installments"]') ||
                                                  item.querySelector('.item-installments');
                        const installments = installmentsElement?.textContent?.trim() || '';
                        
                        // RATING/VALORACIÓN
                        const ratingElement = item.querySelector('.ui-search-reviews__rating') ||
                                            item.querySelector('[data-testid="rating"]');
                        const rating = ratingElement?.textContent?.trim() || '';
                        
                        // NÚMERO DE REVIEWS
                        const reviewsElement = item.querySelector('.ui-search-reviews__amount') ||
                                             item.querySelector('[data-testid="reviews-count"]');
                        const reviewsCount = reviewsElement?.textContent?.trim() || '0';
                        
                        // THUMBNAIL/IMAGEN
                        const imageElement = item.querySelector('img') ||
                                           item.querySelector('[data-testid="product-image"]');
                        const imageUrl = imageElement?.src || imageElement?.getAttribute('data-src') || '';
                        
                        // TIPO DE PUBLICACIÓN (extraer de atributos o clases)
                        const publicationType = item.className?.includes('highlighted') ? 'premium' : 
                                              item.className?.includes('gold') ? 'gold' : 'clasica';
                        
                        console.log(`Item ${i}: title="${title}", price="${price}", originalPrice="${originalPrice}", productId="${productId}"`);
                        
                        // Solo agregar si tiene los datos mínimos
                        if (title && productId) {
                            results.push({
                                // Datos básicos
                                productId,
                                title,
                                link,
                                position: i + 1,
                                extractedAt: new Date().toISOString(),
                                status: 'active',
                                
                                // Precios y descuentos
                                precio: price ? `$${price.replace(/\./g, ',')}` : 'Sin precio',
                                precioOriginal: originalPrice ? `$${originalPrice.replace(/\./g, ',')}` : null,
                                descuento: discount || null,
                                
                                // Información comercial
                                seller,
                                location,
                                condition,
                                freeShipping,
                                soldQuantity,
                                installments,
                                
                                // Valoraciones
                                rating,
                                reviewsCount,
                                
                                // Multimedia
                                imageUrl,
                                
                                // Metadata
                                publicationType,
                                
                                // Datos adicionales para análisis
                                hasDiscount: originalPrice && price && originalPrice !== price,
                                discountPercentage: originalPrice && price ? 
                                    Math.round(((parseFloat(originalPrice.replace(/[,.]/g, '')) - parseFloat(price.replace(/[,.]/g, ''))) / parseFloat(originalPrice.replace(/[,.]/g, ''))) * 100) : 0
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
                if (product.hasDiscount) {
                    console.log(`  - Porcentaje descuento: ${product.discountPercentage}%`);
                }
                console.log(`  - Vendedor: ${product.seller}`);
                console.log(`  - Ubicación: ${product.location}`);
                console.log(`  - Condición: ${product.condition}`);
                console.log(`  - Envío gratis: ${product.freeShipping}`);
                console.log(`  - Vendidos: ${product.soldQuantity}`);
                if (product.installments) {
                    console.log(`  - Cuotas: ${product.installments}`);
                }
                if (product.rating) {
                    console.log(`  - Rating: ${product.rating} (${product.reviewsCount} reviews)`);
                }
                console.log(`  - Tipo publicación: ${product.publicationType}`);
                console.log(`  - Link: ${product.link}`);
                console.log(`  - Imagen: ${product.imageUrl}`);
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