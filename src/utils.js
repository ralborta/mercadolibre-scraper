const axios = require('axios');

/**
 * Extrae datos detallados de un producto usando la API de MercadoLibre
 */
async function extractProductData(productId, baseUrl, page) {
    try {
        // Intentar obtener datos via API de MercadoLibre
        const apiUrl = `https://api.mercadolibre.com/items/${productId}`;
        const response = await axios.get(apiUrl, { timeout: 10000 });
        const apiData = response.data;
        
        // Obtener datos del vendedor
        let sellerData = {};
        try {
            const sellerResponse = await axios.get(`https://api.mercadolibre.com/users/${apiData.seller_id}`);
            sellerData = {
                sellerId: apiData.seller_id,
                sellerNickname: sellerResponse.data.nickname,
                sellerReputation: sellerResponse.data.seller_reputation,
                sellerLevel: sellerResponse.data.seller_reputation?.level_id || 'unknown'
            };
        } catch (error) {
            console.log(`⚠️ No se pudo obtener datos del vendedor para ${productId}`);
        }
        
        return {
            productId: apiData.id,
            status: apiData.status,
            title: apiData.title,
            price: apiData.price,
            originalPrice: apiData.original_price,
            currencyId: apiData.currency_id,
            availableQuantity: apiData.available_quantity,
            soldQuantity: apiData.sold_quantity,
            condition: apiData.condition,
            permalink: apiData.permalink,
            thumbnail: apiData.thumbnail,
            categoryId: apiData.category_id,
            listingTypeId: apiData.listing_type_id,
            warranty: apiData.warranty,
            shipping: {
                freeShipping: apiData.shipping?.free_shipping || false,
                mode: apiData.shipping?.mode || 'unknown',
                tags: apiData.shipping?.tags || []
            },
            attributes: apiData.attributes?.map(attr => ({
                id: attr.id,
                name: attr.name,
                value: attr.value_name || attr.value_struct?.number || attr.values?.[0]?.name
            })) || [],
            ...sellerData,
            lastUpdated: new Date().toISOString()
        };
        
    } catch (error) {
        console.log(`⚠️ Error con API para ${productId}, intentando scraping directo...`);
        
        // Fallback: scraping directo de la página del producto
        try {
            await page.goto(`${baseUrl}/p/${productId}`, { waitUntil: 'networkidle2', timeout: 30000 });
            
            const scrapedData = await page.evaluate(() => {
                const data = {};
                
                // Título
                const titleEl = document.querySelector('h1.ui-pdp-title') || 
                               document.querySelector('.x-item-title-label');
                data.title = titleEl?.textContent?.trim() || '';
                
                // Precio
                const priceEl = document.querySelector('.andes-money-amount__fraction') ||
                               document.querySelector('.price-tag-fraction');
                data.price = priceEl?.textContent?.trim() || '';
                
                // Stock
                const stockEl = document.querySelector('.ui-pdp-buybox__quantity__available') ||
                               document.querySelector('[data-testid="quantity-available"]');
                data.availableQuantity = stockEl ? 
                    parseInt(stockEl.textContent.match(/\d+/)?.[0] || '0') : 0;
                
                // Vendidos
                const soldEl = document.querySelector('.ui-pdp-subtitle') ||
                              document.querySelector('[data-testid="sales-quantity"]');
                data.soldQuantity = soldEl ? 
                    parseInt(soldEl.textContent.match(/\d+/)?.[0] || '0') : 0;
                
                // Condición
                const conditionEl = document.querySelector('.ui-pdp-color--BLACK.ui-pdp-size--XSMALL');
                data.condition = conditionEl?.textContent?.trim() || 'unknown';
                
                return data;
            });
            
            return {
                productId,
                ...scrapedData,
                source: 'direct_scraping',
                lastUpdated: new Date().toISOString()
            };
            
        } catch (scrapingError) {
            console.error(`❌ Error en scraping directo para ${productId}:`, scrapingError);
            return {
                productId,
                error: 'failed_to_extract_details',
                lastUpdated: new Date().toISOString()
            };
        }
    }
}

/**
 * Calcula comisiones de MercadoLibre basado en categoría y tipo de publicación
 */
function calculateCommissions(price, categoryId, listingType) {
    // Limpiar precio
    const numericPrice = typeof price === 'string' ? 
        parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.')) : price;
    
    if (!numericPrice || numericPrice <= 0) {
        return {
            commissionError: 'invalid_price'
        };
    }
    
    // Tabla de comisiones por categoría (aproximada)
    const commissionRates = {
        // Electrónicos
        'MLA1051': { classic: 0.13, gold: 0.11, premium: 0.09 }, // Celulares
        'MLA1648': { classic: 0.15, gold: 0.13, premium: 0.11 }, // Computación
        'MLA1694': { classic: 0.155, gold: 0.135, premium: 0.115 }, // Componentes PC
        'MLA1000': { classic: 0.14, gold: 0.12, premium: 0.10 }, // Electrónicos
        
        // Hogar y Jardín
        'MLA1574': { classic: 0.16, gold: 0.14, premium: 0.12 }, // Hogar
        'MLA1499': { classic: 0.17, gold: 0.15, premium: 0.13 }, // Construcción
        
        // Moda
        'MLA1430': { classic: 0.18, gold: 0.16, premium: 0.14 }, // Ropa
        'MLA1144': { classic: 0.16, gold: 0.14, premium: 0.12 }, // Calzado
        
        // Default
        'default': { classic: 0.16, gold: 0.14, premium: 0.12 }
    };
    
    // Determinar tipo de publicación
    let pubType = 'classic';
    if (listingType) {
        if (listingType.includes('gold')) pubType = 'gold';
        if (listingType.includes('premium')) pubType = 'premium';
    }
    
    // Obtener tasa de comisión
    const rates = commissionRates[categoryId] || commissionRates['default'];
    const commissionRate = rates[pubType];
    
    // Calcular comisión
    const commissionAmount = numericPrice * commissionRate;
    const netAmount = numericPrice - commissionAmount;
    const profitMargin = (netAmount / numericPrice) * 100;
    
    return {
        originalPrice: numericPrice,
        commissionRate: commissionRate,
        commissionPercentage: (commissionRate * 100).toFixed(1) + '%',
        commissionAmount: commissionAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        profitMargin: profitMargin.toFixed(1) + '%',
        publicationType: pubType,
        categoryId: categoryId || 'unknown'
    };
}

/**
 * Formatea precios de manera consistente
 */
function formatPrice(price, currency = 'ARS') {
    if (!price) return null;
    
    const numericPrice = typeof price === 'string' ? 
        parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.')) : price;
    
    if (!numericPrice || isNaN(numericPrice)) return null;
    
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numericPrice);
}

/**
 * Detecta oportunidades de arbitraje
 */
function detectArbitrageOpportunities(products) {
    const opportunities = [];
    
    // Agrupar productos similares
    const productGroups = {};
    
    products.forEach(product => {
        // Crear clave de agrupación basada en título normalizado
        const normalizedTitle = product.title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const key = normalizedTitle.substring(0, 50); // Primeros 50 caracteres
        
        if (!productGroups[key]) {
            productGroups[key] = [];
        }
        productGroups[key].push(product);
    });
    
    // Analizar cada grupo
    Object.entries(productGroups).forEach(([key, group]) => {
        if (group.length < 2) return;
        
        // Ordenar por precio
        group.sort((a, b) => {
            const priceA = parseFloat(a.price?.replace(/[^\d]/g, '') || '0');
            const priceB = parseFloat(b.price?.replace(/[^\d]/g, '') || '0');
            return priceA - priceB;
        });
        
        const cheapest = group[0];
        const mostExpensive = group[group.length - 1];
        
        const cheapestPrice = parseFloat(cheapest.price?.replace(/[^\d]/g, '') || '0');
        const expensivePrice = parseFloat(mostExpensive.price?.replace(/[^\d]/g, '') || '0');
        
        const priceDifference = expensivePrice - cheapestPrice;
        const percentageDifference = ((priceDifference / cheapestPrice) * 100);
        
        // Si hay una diferencia significativa (>20%), es una oportunidad
        if (percentageDifference > 20 && priceDifference > 1000) {
            opportunities.push({
                productGroup: key,
                cheapestOption: {
                    title: cheapest.title,
                    price: cheapest.price,
                    seller: cheapest.seller,
                    link: cheapest.link
                },
                mostExpensiveOption: {
                    title: mostExpensive.title,
                    price: mostExpensive.price,
                    seller: mostExpensive.seller,
                    link: mostExpensive.link
                },
                priceDifference: priceDifference.toFixed(2),
                percentageDifference: percentageDifference.toFixed(1) + '%',
                potentialProfit: (priceDifference * 0.7).toFixed(2), // Estimando 70% de margen
                totalVariants: group.length
            });
        }
    });
    
    return opportunities.sort((a, b) => 
        parseFloat(b.priceDifference) - parseFloat(a.priceDifference)
    );
}

/**
 * Genera reporte de análisis de mercado
 */
function generateMarketReport(products) {
    if (!products || products.length === 0) {
        return { error: 'No products to analyze' };
    }
    
    const prices = products
        .map(p => parseFloat(p.price?.replace(/[^\d]/g, '') || '0'))
        .filter(p => p > 0);
    
    const sellers = products.map(p => p.seller).filter(Boolean);
    const categories = products.map(p => p.categoryId).filter(Boolean);
    
    // Estadísticas de precios
    prices.sort((a, b) => a - b);
    const priceStats = {
        min: Math.min(...prices),
        max: Math.max(...prices),
        average: prices.reduce((a, b) => a + b, 0) / prices.length,
        median: prices[Math.floor(prices.length / 2)],
        q1: prices[Math.floor(prices.length * 0.25)],
        q3: prices[Math.floor(prices.length * 0.75)]
    };
    
    // Top sellers
    const sellerCount = {};
    sellers.forEach(seller => {
        sellerCount[seller] = (sellerCount[seller] || 0) + 1;
    });
    
    const topSellers = Object.entries(sellerCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([seller, count]) => ({ seller, productCount: count }));
    
    // Análisis de categorías
    const categoryCount = {};
    categories.forEach(cat => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    return {
        totalProducts: products.length,
        priceAnalysis: {
            ...priceStats,
            priceRange: `$${priceStats.min.toLocaleString()} - $${priceStats.max.toLocaleString()}`,
            averageFormatted: `$${priceStats.average.toLocaleString()}`
        },
        marketConcentration: {
            topSellers,
            totalSellers: Object.keys(sellerCount).length,
            averageProductsPerSeller: (products.length / Object.keys(sellerCount).length).toFixed(1)
        },
        categoryDistribution: Object.entries(categoryCount)
            .sort(([,a], [,b]) => b - a)
            .map(([category, count]) => ({ category, count, percentage: ((count / products.length) * 100).toFixed(1) + '%' })),
        arbitrageOpportunities: detectArbitrageOpportunities(products),
        generatedAt: new Date().toISOString()
    };
}

module.exports = {
    extractProductData,
    calculateCommissions,
    formatPrice,
    detectArbitrageOpportunities,
    generateMarketReport
}; 