const { Actor } = require('apify');

Actor.main(async () => {
    console.log('🚀 Iniciando MercadoLibre Scraper - Kingston Fury Beast...');
    
    // Input con el término específico
    const input = await Actor.getInput();
    const searchTerm = input?.searchTerm || 'Kingston Fury Beast DDR4 16GB';
    
    console.log(`🔍 Buscando: ${searchTerm}`);
    
    // URL específica para Argentina
    const searchUrl = `https://listado.mercadolibre.com.ar/${encodeURIComponent(searchTerm)}`;
    
    console.log(`📄 URL de búsqueda: ${searchUrl}`);
    
    // Usar Puppeteer
    const browser = await Actor.launchPuppeteer({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar productos
        await page.waitForSelector('.ui-search-result', { timeout: 15000 });
        
        console.log('✅ Página cargada, extrayendo productos...');
        
        // Extraer productos con todos los detalles
        const products = await page.evaluate(() => {
            const items = document.querySelectorAll('.ui-search-result');
            const results = [];
            
            for (let i = 0; i < Math.min(15, items.length); i++) {
                const item = items[i];
                
                try {
                    // Datos básicos
                    const titleElement = item.querySelector('.ui-search-item__title');
                    const title = titleElement?.textContent?.trim();
                    
                    const linkElement = item.querySelector('a.ui-search-link');
                    const link = linkElement?.href;
                    
                    // Extraer ID del producto (MLA...)
                    const mlMatch = link?.match(/MLA\d+/);
                    const productId = mlMatch ? mlMatch[0] : null;
                    
                    // Precio actual
                    const priceElement = item.querySelector('.andes-money-amount__fraction');
                    const price = priceElement?.textContent?.trim();
                    
                    // Precio tachado (original)
                    const originalPriceElement = item.querySelector('.ui-search-price__original-value .andes-money-amount__fraction');
                    const originalPrice = originalPriceElement?.textContent?.trim();
                    
                    // Descuento
                    const discountElement = item.querySelector('.ui-search-price__discount');
                    const discount = discountElement?.textContent?.trim();
                    
                    // Envío gratis
                    const shippingElement = item.querySelector('.ui-search-item__shipping');
                    const freeShipping = shippingElement?.textContent?.includes('gratis') || false;
                    
                    // Vendedor
                    const sellerElement = item.querySelector('.ui-search-official-store-label');
                    const seller = sellerElement?.textContent?.trim() || 'Vendedor particular';
                    
                    // Ubicación
                    const locationElement = item.querySelector('.ui-search-item__group__element--location');
                    const location = locationElement?.textContent?.trim() || '';
                    
                    // Solo agregar si tiene los datos mínimos
                    if (title && price && productId) {
                        results.push({
                            productId,
                            title,
                            precio: price ? `$${price.replace(/\./g, ',')}` : null,
                            precioOriginal: originalPrice ? `$${originalPrice.replace(/\./g, ',')}` : null,
                            descuento: discount || null,
                            link,
                            seller,
                            location,
                            freeShipping,
                            position: i + 1,
                            extractedAt: new Date().toISOString(),
                            status: 'active' // Asumimos que está activo si aparece en búsqueda
                        });
                    }
                    
                } catch (error) {
                    console.error(`Error procesando item ${i}:`, error);
                }
            }
            
            return results;
        });
        
        console.log(`✅ Encontrados ${products.length} productos`);
        
        // Procesar cada producto y mostrar como en tu ejemplo
        let totalProcessed = 0;
        for (const product of products) {
            totalProcessed++;
            
            console.log('--------------------------------------------------------------------------------');
            console.log(`Procesando: ${product.productId}`);
            console.log(`  - Status: ${product.status}`);
            console.log(`  - Título: ${product.title}`);
            console.log(`  - Precio: ${product.precio}`);
            if (product.precioOriginal) {
                console.log(`  - Precio tachado: ${product.precioOriginal}`);
            }
            if (product.descuento) {
                console.log(`  - Descuento: ${product.descuento}`);
            }
            console.log(`  - Link: ${product.link}`);
            console.log(`  - Vendedor: ${product.seller}`);
            console.log(`  - Ubicación: ${product.location}`);
            console.log(`  - Envío gratis: ${product.freeShipping}`);
            console.log(`  - Posición: ${product.position}`);
            
            // Guardar en Apify Dataset
            await Actor.pushData(product);
        }
        
        console.log('--------------------------------------------------------------------------------');
        console.log(`Total procesados: ${totalProcessed}`);
        
    } catch (error) {
        console.error('❌ Error durante el scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
    
    console.log('🎉 ¡Scraping completado exitosamente!');
}); 