const { Actor } = require('apify');
const { PuppeteerCrawler } = require('crawlee');

Actor.main(async () => {
    console.log('🚀 Iniciando MercadoLibre Scraper - Kingston Fury Beast...');
    
    // Input con el término específico
    const input = await Actor.getInput();
    const searchTerm = input?.searchTerm || 'Kingston Fury Beast DDR4 16GB';
    
    console.log(`🔍 Buscando: ${searchTerm}`);
    
    // Función para armar la URL de catálogo
    function buildCatalogUrl(term) {
        // Quitar tildes y caracteres especiales, pasar a minúsculas y reemplazar espacios por guiones
        const normalized = term.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        return `https://www.mercadolibre.com.ar/catalogo/${normalized}`;
    }

    // URL de catálogo y búsqueda general
    const catalogUrl = buildCatalogUrl(searchTerm);
    const searchUrl = `https://www.mercadolibre.com.ar/search?q=${encodeURIComponent(searchTerm)}`;
    
    console.log(`📄 URL de búsqueda: ${searchUrl}`);
    
    // Función para scrapear una URL y devolver la cantidad de productos encontrados
    async function scrapeAndCount(url) {
        let foundProducts = 0;
        const crawler = new PuppeteerCrawler({
            async requestHandler({ page, request }) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const availableSelectors = await page.evaluate(() => {
                    const selectors = [
                        '.ui-search-result', '.ui-search-item', '[data-testid="search-result"]', '.poly-card', 'article'
                    ];
                    const found = {};
                    selectors.forEach(selector => {
                        found[selector] = document.querySelectorAll(selector).length;
                    });
                    return found;
                });
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
                } else if (availableSelectors['article'] > 0) {
                    productsSelector = 'article';
                }
                if (productsSelector) {
                    foundProducts = await page.evaluate((selector) => document.querySelectorAll(selector).length, productsSelector);
                }
            },
            maxRequestsPerCrawl: 1,
        });
        await crawler.run([url]);
        return foundProducts;
    }

    // 1. Intentar catálogo
    console.log(`🔎 Probando catálogo: ${catalogUrl}`);
    let productsInCatalog = await scrapeAndCount(catalogUrl);
    let finalUrl = catalogUrl;
    if (productsInCatalog === 0) {
        // 2. Si no hay productos, usar búsqueda general
        console.log('❌ No se encontraron productos en el catálogo. Probando búsqueda general...');
        productsInCatalog = await scrapeAndCount(searchUrl);
        finalUrl = searchUrl;
        if (productsInCatalog === 0) {
            console.log('❌ No se encontraron productos en la búsqueda general.');
            return;
        }
    }
    console.log(`✅ Se encontraron ${productsInCatalog} productos en: ${finalUrl}`);

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
                        
                        // Vendedor - Mejorado con más selectores y debug completo
                        const sellerSelectors = [
                            '.ui-search-official-store-label',
                            '.ui-search-item__store-name', 
                            '.ui-search-item__group__element--store',
                            '.ui-search-item__seller',
                            '.ui-search-item__store',
                            '.ui-search-item__subtitle', 
                            '.ui-search-item__group__element--subtitle',
                            '.ui-search-item__group .ui-search-item__group__element',
                            '[data-testid="store-name"]',
                            '.store-name',
                            '.seller-info'
                        ];
                        
                        let seller = '';
                        let sellerElement = null;
                        
                        // Buscar en todos los selectores posibles
                        for (const selectorSeller of sellerSelectors) {
                            sellerElement = item.querySelector(selectorSeller);
                            if (sellerElement && sellerElement.textContent.trim()) {
                                seller = sellerElement.textContent.trim();
                                break;
                            }
                        }
                        
                        // Debug: Extraer TODOS los textos del grupo para ver qué hay disponible
                        const allGroupTexts = [];
                        const groupElements = item.querySelectorAll('.ui-search-item__group *');
                        groupElements.forEach(el => {
                            const text = el.textContent?.trim();
                            if (text && text.length > 0 && text.length < 100) {
                                allGroupTexts.push(text);
                            }
                        });
                        
                        // Si no encontramos vendedor, buscar en todos los textos
                        if (!seller || seller === '') {
                            const vendorPatterns = allGroupTexts.filter(text => 
                                (text.includes('Tienda') && !text.includes('$')) ||
                                (text.includes('Store') && !text.includes('$')) ||
                                (text.includes('MercadoShops') && !text.includes('$')) ||
                                (text.includes('Oficial') && !text.includes('$')) ||
                                (text.includes('Shop') && !text.includes('$')) ||
                                (text.match(/^[A-Za-z\s]{5,40}$/) && !text.includes('cuotas') && !text.includes('gratis') && !text.includes('Capital') && !text.includes('Buenos') && !text.includes('envío'))
                            );
                            
                            if (vendorPatterns.length > 0) {
                                seller = vendorPatterns[0];
                            }
                        }
                        
                        // Última alternativa: buscar en el HTML completo del item
                        if (!seller || seller === '') {
                            const itemHTML = item.innerHTML;
                            if (itemHTML.includes('MercadoShops')) {
                                seller = 'MercadoShops';
                            } else if (itemHTML.includes('Tienda Oficial')) {
                                seller = 'Tienda Oficial';
                            } else if (itemHTML.includes('Store')) {
                                seller = 'Store Oficial';
                            }
                        }
                        
                        if (!seller || seller === '') {
                            seller = 'Vendedor particular';
                        }
                        
                        // Debug completo para el primer item
                        if (i === 0) {
                            console.log(`[DEBUG VENDEDOR] Item ${i}:`);
                            console.log(`  - Textos encontrados:`, allGroupTexts);
                            console.log(`  - Vendedor final: "${seller}"`);
                            console.log(`  - HTML del item:`, item.outerHTML.substring(0, 500) + '...');
                        }
                        
                        // FILTRO: Solo mostrar si NO es vendedor particular
                        const esVendedorParticular = seller === 'Vendedor particular';
                        
                        // Intentar detectar tiendas de otra manera
                        if (esVendedorParticular) {
                            // Buscar en TODOS los elementos del item
                            const allTexts = Array.from(item.querySelectorAll('*')).map(el => el.textContent?.trim()).filter(text => text && text.length > 0);
                            
                            // Buscar patrones de tienda en todos los textos
                            const tiendaPatterns = allTexts.filter(text => 
                                text.includes('MercadoShops') ||
                                text.includes('Tienda Oficial') ||
                                text.includes('Store') ||
                                text.includes('Shop') ||
                                (text.match(/^[A-Z][a-zA-Z\s]{4,30}$/) && !text.includes('$') && !text.includes('cuotas') && !text.includes('gratis'))
                            );
                            
                            if (tiendaPatterns.length > 0) {
                                seller = tiendaPatterns[0];
                                console.log(`[DETECTADO] Tienda encontrada: "${seller}"`);
                            }
                        }
                        
                        // Solo continuar si NO es vendedor particular (filtrar solo comercios)
                        if (seller === 'Vendedor particular') {
                            console.log(`[FILTRADO] Saltando vendedor particular: ${title}`);
                            continue; // Saltar este producto
                        }
                        
                        // Ubicación - Mejorado también
                        const locationSelectors = [
                            '.ui-search-item__group__element--location',
                            '.ui-search-item__location',
                            '[data-testid="location"]',
                            '.item-location'
                        ];
                        
                        let location = '';
                        for (const selectorLoc of locationSelectors) {
                            const locationElement = item.querySelector(selectorLoc);
                            if (locationElement && locationElement.textContent.trim()) {
                                location = locationElement.textContent.trim();
                                break;
                            }
                        }
                        
                        // Si no encontramos ubicación, buscar en los textos del grupo
                        if (!location || location === '') {
                            const locationPatterns = allGroupTexts.filter(text => 
                                text.includes('Capital') || 
                                text.includes('Buenos Aires') || 
                                text.includes('Córdoba') ||
                                text.includes('Mendoza') ||
                                text.includes('Rosario') ||
                                text.includes('Federal') ||
                                text.includes('Provincia') ||
                                text.match(/^[A-Za-z\s]{3,30}$/) && (text.includes('Aires') || text.includes('Capital'))
                            );
                            
                            if (locationPatterns.length > 0) {
                                location = locationPatterns[0];
                            }
                        }
                        
                        // Vendidos
                        const soldElement = item.querySelector('.ui-search-item__group__element--sold');
                        const soldQuantity = soldElement?.textContent?.trim() || '0';
                        
                        // Condición
                        const conditionElement = item.querySelector('.ui-search-item__group__element--condition');
                        const condition = conditionElement?.textContent?.trim() || 'N/A';
                        
                        // Cuotas/Financiamiento - Mejorado
                        const installmentSelectors = [
                            '.ui-search-item__group__element--installments',
                            '.ui-search-installments',
                            '[data-testid="installments"]',
                            '.item-installments',
                            '.ui-search-item__installments'
                        ];
                        
                        let installments = '';
                        for (const selectorInst of installmentSelectors) {
                            const installmentElement = item.querySelector(selectorInst);
                            if (installmentElement && installmentElement.textContent.trim()) {
                                installments = installmentElement.textContent.trim();
                                break;
                            }
                        }
                        
                        // Si no encontramos cuotas, buscar en todos los textos
                        if (!installments || installments === '') {
                            const cuotasPatterns = allGroupTexts.filter(text => 
                                text.includes('cuotas') ||
                                text.includes('sin interés') ||
                                text.includes('x $') ||
                                text.match(/\d+x\s*\$/) ||
                                text.includes('Hasta') && text.includes('cuotas')
                            );
                            
                            if (cuotasPatterns.length > 0) {
                                installments = cuotasPatterns[0];
                            }
                        }
                        
                        // Detectar si tiene financiamiento
                        const hasFinancing = installments && installments !== '' && 
                                           (installments.includes('cuotas') || installments.includes('x $'));
                        
                        // Rating/Estrellas del vendedor
                        const ratingSelectors = [
                            '.ui-search-reviews__rating',
                            '.ui-search-item__reviews',
                            '[data-testid="reviews"]',
                            '.andes-review',
                            '.ui-search-reviews__rating-number'
                        ];
                        
                        let rating = '';
                        let reviewsCount = '';
                        for (const selectorRating of ratingSelectors) {
                            const ratingElement = item.querySelector(selectorRating);
                            if (ratingElement && ratingElement.textContent.trim()) {
                                rating = ratingElement.textContent.trim();
                                break;
                            }
                        }
                        
                        // Buscar reviews en los textos
                        if (!rating || rating === '') {
                            const ratingPatterns = allGroupTexts.filter(text => 
                                text.match(/\d+,\d+/) || // 4,5 estrellas
                                text.match(/\d+\.\d+/) || // 4.5 estrellas
                                text.includes('estrellas') ||
                                text.match(/\(\d+\)/) // (250) reviews
                            );
                            
                            if (ratingPatterns.length > 0) {
                                rating = ratingPatterns[0];
                            }
                        }
                        
                        // Tiempo de entrega
                        const deliverySelectors = [
                            '.ui-search-item__shipping',
                            '.ui-search-shipping',
                            '[data-testid="shipping-info"]',
                            '.shipping-info'
                        ];
                        
                        let deliveryTime = '';
                        for (const selectorDelivery of deliverySelectors) {
                            const deliveryElement = item.querySelector(selectorDelivery);
                            if (deliveryElement && deliveryElement.textContent.trim()) {
                                const deliveryText = deliveryElement.textContent.trim();
                                if (deliveryText.includes('Llega') || deliveryText.includes('días') || deliveryText.includes('mañana')) {
                                    deliveryTime = deliveryText;
                                    break;
                                }
                            }
                        }
                        
                        // Buscar tiempo de entrega en textos
                        if (!deliveryTime || deliveryTime === '') {
                            const deliveryPatterns = allGroupTexts.filter(text => 
                                text.includes('Llega') ||
                                text.includes('mañana') ||
                                text.includes('días') && (text.includes('1-') || text.includes('2-') || text.includes('3-')) ||
                                text.includes('Envío') && text.includes('día') ||
                                text.includes('Express') ||
                                text.includes('Full')
                            );
                            
                            if (deliveryPatterns.length > 0) {
                                deliveryTime = deliveryPatterns[0];
                            }
                        }
                        
                        // Stock disponible
                        const stockSelectors = [
                            '.ui-search-item__stock',
                            '[data-testid="stock"]',
                            '.stock-info'
                        ];
                        
                        let stockInfo = '';
                        for (const selectorStock of stockSelectors) {
                            const stockElement = item.querySelector(selectorStock);
                            if (stockElement && stockElement.textContent.trim()) {
                                stockInfo = stockElement.textContent.trim();
                                break;
                            }
                        }
                        
                        // Buscar info de stock en textos
                        if (!stockInfo || stockInfo === '') {
                            const stockPatterns = allGroupTexts.filter(text => 
                                text.includes('Últimos disponibles') ||
                                text.includes('Solo quedan') ||
                                text.includes('Último disponible') ||
                                text.includes('Pocas unidades') ||
                                text.includes('Stock limitado') ||
                                text.match(/quedan \d+/) ||
                                text.includes('¡Última unidad!')
                            );
                            
                            if (stockPatterns.length > 0) {
                                stockInfo = stockPatterns[0];
                            } else {
                                stockInfo = 'Stock disponible'; // Por defecto si está listado
                            }
                        }
                        
                        // Mejorar cantidad vendida
                        let soldQuantityFormatted = soldQuantity;
                        if (soldQuantity && soldQuantity !== '0') {
                            // Extraer solo el número si tiene texto extra
                            const soldMatch = soldQuantity.match(/\d+/);
                            if (soldMatch) {
                                const number = parseInt(soldMatch[0]);
                                if (number > 1000) {
                                    soldQuantityFormatted = `${Math.floor(number/1000)}k+ vendidos`;
                                } else if (number > 0) {
                                    soldQuantityFormatted = `${number} vendidos`;
                                }
                            }
                        } else {
                            soldQuantityFormatted = 'Sin ventas registradas';
                        }
                        
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
                                soldQuantity: soldQuantityFormatted,
                                imageUrl,
                                hasDiscount: originalPrice && price && originalPrice !== price,
                                installments,
                                hasFinancing,
                                rating,
                                reviewsCount,
                                deliveryTime,
                                stockInfo
                            });
                        }
                        
                    } catch (error) {
                        console.error(`Error procesando item ${i}:`, error);
                    }
                }
                
                return results;
            }, productsSelector});
            
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
                    console.log(`  - Precio original (tachado): ${product.precioOriginal}`);
                    console.log(`  - 🏷️  TIENE DESCUENTO: ${product.hasDiscount ? 'SÍ' : 'NO'}`);
                } else {
                    console.log(`  - Sin precio tachado`);
                }
                if (product.descuento) {
                    console.log(`  - 💰 Descuento: ${product.descuento}`);
                }
                console.log(`  - Vendedor: ${product.seller}`);
                console.log(`  - Ubicación: ${product.location}`);
                console.log(`  - Condición: ${product.condition}`);
                console.log(`  - Envío gratis: ${product.freeShipping}`);
                console.log(`  - 📦 Cantidad vendida: ${product.soldQuantity}`);
                if (product.rating) {
                    console.log(`  - ⭐ Rating: ${product.rating}`);
                } else {
                    console.log(`  - ⭐ Rating: No disponible`);
                }
                if (product.deliveryTime) {
                    console.log(`  - 🚚 Entrega: ${product.deliveryTime}`);
                } else {
                    console.log(`  - 🚚 Entrega: No especificada`);
                }
                console.log(`  - 📋 Stock: ${product.stockInfo}`);
                if (product.installments) {
                    console.log(`  - Cuotas: ${product.installments}`);
                    console.log(`  - Financiamiento disponible: ${product.hasFinancing ? 'SÍ' : 'NO'}`);
                } else {
                    console.log(`  - Cuotas: No disponible`);
                }
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
    await crawler.run([finalUrl]);
    
    console.log('🎉 ¡Scraping completado exitosamente!');
});