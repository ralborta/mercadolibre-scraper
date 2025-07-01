const Apify = require('apify');

Apify.main(async () => {
    console.log('🚀 Iniciando MercadoLibre Scraper Simple...');
    
    // Input simple
    const input = await Apify.getInput();
    const searchTerm = input?.searchTerm || 'memoria ram';
    
    console.log(`🔍 Buscando: ${searchTerm}`);
    
    // URL simple para Argentina
    const searchUrl = `https://mercadolibre.com.ar/sitios/search?q=${encodeURIComponent(searchTerm)}`;
    
    // Usar Puppeteer simple
    const browser = await Apify.launchPuppeteer({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log(`📄 Navegando a: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar productos
        await page.waitForSelector('.ui-search-result', { timeout: 15000 });
        
        // Extraer productos simples
        const products = await page.evaluate(() => {
            const items = document.querySelectorAll('.ui-search-result');
            const results = [];
            
            for (let i = 0; i < Math.min(10, items.length); i++) {
                const item = items[i];
                
                const title = item.querySelector('.ui-search-item__title')?.textContent?.trim();
                const price = item.querySelector('.andes-money-amount__fraction')?.textContent?.trim();
                const link = item.querySelector('a')?.href;
                
                if (title && price) {
                    results.push({
                        title,
                        price: `$${price}`,
                        link,
                        position: i + 1,
                        extractedAt: new Date().toISOString()
                    });
                }
            }
            
            return results;
        });
        
        console.log(`✅ Encontrados ${products.length} productos`);
        
        // Guardar resultados
        for (const product of products) {
            await Apify.pushData(product);
            console.log(`💾 ${product.title} - ${product.price}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
    
    console.log('🎉 ¡Scraping completado!');
}); 