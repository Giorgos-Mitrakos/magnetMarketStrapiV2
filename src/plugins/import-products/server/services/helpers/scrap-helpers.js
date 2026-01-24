'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const userAgent = require('user-agents');
const fs = require('fs');

module.exports = ({ strapi }) => ({
    async createBrowser() {
        try {
            puppeteer.use(StealthPlugin())
            return await puppeteer.launch({
                headless: false,
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } catch (error) {
            console.log(error)
        }
    },

    async createPage(browser, loadImages) {
        try {
            const agents = userAgent.random().toString()

            const page = await browser.newPage();
            await page.setViewport({ width: 1400, height: 600 })
            await page.setUserAgent(agents)

            if (!loadImages) {
                await page.setRequestInterception(true)

                page.on('request', (request) => {
                    if (request.resourceType() === 'image') request.abort()
                    else request.continue()
                })
            }
            return page

        } catch (error) {
            console.log(error)
        }
    },

    async loadCookies(supplier, page) {
        try {
            if (fs.existsSync(`./public/cookies/${supplier}Cookies.json`)) {
                const data = await fs.promises.readFile(`./public/cookies/${supplier}Cookies.json`, 'utf8');

                // Check if file is empty or contains only whitespace
                if (!data || data.trim().length === 0) {
                    console.log("Cookie file is empty, skipping...\n");
                    return;
                }

                const cookies = JSON.parse(data);

                // Check if cookies array is empty
                if (!Array.isArray(cookies) || cookies.length === 0) {
                    console.log("No cookies to load\n");
                    return;
                }

                await page.setCookie(...cookies);
                // console.log("Cookies loaded successfully\n");
            }
        } catch (error) {
            console.log("Error loading cookies:", error.message);
        }
    },

    async saveCookies(supplier, cookies) {
        fs.writeFile(`./public/cookies/${supplier}Cookies.json`, cookies, (err) => {
            if (err)
                console.log(err);
            else {
                console.log("File written successfully\n");
            }
        })
    },

    async retry(promiseFactory, retryCount, isRetry) {
        try {
            return await promiseFactory();
        } catch (error) {
            if (retryCount <= 0) {
                throw error;
            }
            return await this.retry(promiseFactory, retryCount - 1, true);
        }
    },

    async retryClick(promiseFactory, page, retryCount) {
        try {
            await promiseFactory.click()
            return await page.waitForResponse((response) => {
                return response.url().startsWith("https://eshop.globalsat.gr/b2b/catalog/list-product")
            },
                { timeout: 10000 });
        } catch (error) {
            await strapi
                .plugin('import-products')
                .service('globalsatService')
                .closeAlert(page)
            if (retryCount <= 0) {
                throw error;
            }
            return await this.retryClick(promiseFactory, page, retryCount - 1);
        }
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    randomWait(min, max) {
        return Math.random() * (max - min) + min
    },

    filterCategories(categories, importRef) {
        const isWhitelistSelected = importRef.categoryMap.isWhitelistSelected
        const whitelist_map = importRef.categoryMap.whitelist_map
        const blacklist_map = importRef.categoryMap.blacklist_map

        try {
            let newData = []
            for (let cat of categories) {
                if (isWhitelistSelected) {
                    if (whitelist_map.length > 0) {
                        let catIndex = whitelist_map.findIndex(x => x.name.trim() === cat.title.trim())
                        if (catIndex !== -1) {
                            let subCategories = []
                            if (whitelist_map[catIndex].subcategory.length > 0) {
                                for (let sub of cat.subCategories) {
                                    let subIndex = whitelist_map[catIndex].subcategory.findIndex((x) => sub.title.trim() === x.name.trim())
                                    if (subIndex !== -1) {
                                        let subCategories2 = []
                                        if (whitelist_map[catIndex].subcategory[subIndex].subcategory.length > 0) {
                                            for (let sub2 of sub.subCategories) {
                                                let sub2Index = whitelist_map[catIndex].subcategory[subIndex].subcategory.findIndex((x) => sub2.title.trim() === x.name.trim())
                                                if (sub2Index !== -1) {
                                                    subCategories2.push({ title: sub2.title, link: sub2.link })
                                                }
                                            }
                                        }
                                        else {
                                            if (sub.subCategories) {
                                                for (let sub2 of sub.subCategories) {
                                                    subCategories2.push({ title: sub2.title, link: sub2.link })
                                                }
                                            }
                                        }
                                        subCategories.push({ title: sub.title, link: sub.link, subCategories: subCategories2 })
                                    }
                                }
                            }
                            else {
                                if (cat.subCategories) {
                                    for (let sub of cat.subCategories) {
                                        let subCategories2 = []
                                        if (sub.subCategories) {
                                            for (let sub2 of sub.subCategories) {
                                                subCategories2.push({ title: sub2.title, link: sub2.link })
                                            }
                                        }

                                        subCategories.push({ title: sub.title, link: sub.link, subCategories: subCategories2 })
                                    }
                                }
                            }
                            newData.push({ title: cat.title.trim(), link: cat.link, subCategories: subCategories })
                        }
                    }
                    else {
                        let subCategories = []
                        if (cat.subCategories) {
                            for (let sub of cat.subCategories) {
                                let subCategories2 = []
                                if (sub.subCategories) {
                                    for (let sub2 of sub.subCategories) {
                                        subCategories2.push({ title: sub2.title, link: sub2.link })
                                    }
                                }

                                subCategories.push({ title: sub.title, link: sub.link, subCategories: subCategories2 })
                            }
                        }
                        newData.push({ title: cat.title.trim(), link: cat.link, subCategories: subCategories })
                    }
                }
                else {
                    if (blacklist_map.length > 0) {
                        let catIndex = blacklist_map.findIndex(x => x.name.trim() === cat.title.trim())
                        if (catIndex !== -1) {
                            let subCategories = []
                            if (blacklist_map[catIndex].subcategory.length > 0) {
                                for (let sub of cat.subCategories) {
                                    let subIndex = blacklist_map[catIndex].subcategory.findIndex((x) => sub.title.trim() === x.name.trim())
                                    if (subIndex !== -1) {
                                        let subCategories2 = []
                                        if (blacklist_map[catIndex].subcategory[subIndex].subcategory.length > 0) {
                                            for (let sub2 of sub.subCategories) {
                                                let subIndex2 = blacklist_map[catIndex].subcategory[subIndex].subcategory.findIndex((x) => sub2.title.trim() === x.name.trim())
                                                if (subIndex2 === -1) {
                                                    subCategories2.push({ title: sub2.title, link: sub2.link })
                                                }
                                            }
                                        }
                                        subCategories.push({ title: sub.title, link: sub.link, subCategories: subCategories2 })
                                    }
                                    else {
                                        let subCategories2 = []
                                        if (sub.subCategories) {
                                            for (let sub2 of sub.subCategories) {
                                                subCategories2.push({ title: sub2.title, link: sub2.link })
                                            }
                                        }
                                        subCategories.push({ title: sub.title, link: sub.link, subCategories: subCategories2 })
                                    }
                                }
                                newData.push({ title: cat.title.trim(), link: cat.link, subCategories: subCategories })
                            }
                        }
                        else {
                            let subCategories = []
                            if (cat.subCategories) {
                                for (let sub of cat.subCategories) {
                                    let subCategories2 = []
                                    if (sub.subCategories) {
                                        for (let sub2 of sub.subCategories) {
                                            subCategories2.push({ title: sub2.title, link: sub2.link })
                                        }
                                    }

                                    subCategories.push({ title: sub.title, link: sub.link, subCategories: subCategories2 })
                                }
                            }
                            newData.push({ title: cat.title.trim(), link: cat.link, subCategories: subCategories })
                        }
                    }
                    else {
                        let subCategories = []
                        if (cat.subCategories) {
                            for (let sub of cat.subCategories) {
                                let subCategories2 = []
                                if (sub.subCategories) {
                                    for (let sub2 of sub.subCategories) {
                                        subCategories2.push({ title: sub2.title, link: sub2.link })
                                    }
                                }

                                subCategories.push({ title: sub.title, link: sub.link, subCategories: subCategories2 })
                            }
                        }
                        newData.push({ title: cat.title.trim(), link: cat.link, subCategories: subCategories })
                    }
                }
            }
            return newData
        } catch (error) {
            console.log(error)
        }
    },

    async importScrappedProduct(scrapedProduct, importRef) {
        try {
            if (!scrapedProduct.wholesale || isNaN(scrapedProduct.wholesale) || !scrapedProduct.imagesSrc?.length) {
                console.warn(`Skipping product ${scrapedProduct.name}: missing price or images`);
                return { success: false, reason: 'invalid_data' };
            }

            // ✅ 1. Apply transformations via adapter
            // The adapter's transformProduct is called BEFORE this
            // So product is already enriched with characteristics, weight, dimensions, etc.

            // ✅ 2. Create product fields from scraped data
            const product = await strapi
                .plugin('import-products')
                .service('productHelpers')
                .createScrapedProductFields(scrapedProduct.entry, scrapedProduct, importRef);

            if (!product.mpn && !product.barcode) {
                console.warn(`Product ${scrapedProduct.name}: no MPN or barcode`);
                return { success: false, reason: 'no_identifiers' };
            }

            // ✅ 3. Categorize: check cache and decide create or update
            const { toCreate, toUpdate } = await strapi
                .plugin('import-products')
                .service('batchHelpers')
                .categorizeProducts([product], scrapedProduct.entry, importRef);

            // ✅ 4. Process: create or update
            if (toCreate.length > 0) {
                // New product
                const result = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .createEntry(product, importRef);

                if (result?.success && result.product) {
                    // ✅ Add to cache for future matching
                    strapi
                        .plugin('import-products')
                        .service('cacheService')
                        .addProductToCache(result.product);

                    // console.log(`✅ Created: ${product.name.substring(0, 50)}`);
                    return { success: true, action: 'created', id: result.id };
                } else {
                    console.log(`❌ Failed to create: ${product.name.substring(0, 50)}`);
                    return { success: false, reason: result?.reason || 'creation_failed' };
                }
            } else if (toUpdate.length > 0) {
                // Existing product - update
                const { product: existingProduct, existingProduct: dbProduct } = toUpdate[0];

                const result = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .updateEntry(dbProduct, product, importRef);

                if (result?.success) {
                    // console.log(`🔄 Updated: ${product.name.substring(0, 50)}`);
                    return { success: true, action: 'updated', id: dbProduct.id };
                } else {
                    console.log(`❌ Failed to update: ${product.name.substring(0, 50)}`);
                    return { success: false, reason: 'update_failed' };
                }
            } else {
                console.warn(`No matching product found for: ${product.name}`);
                return { success: false, reason: 'no_match' };
            }

        } catch (error) {
            console.error(`Error importing scraped product:`, error.message);
            return { success: false, reason: 'exception', error: error.message };
        }
    },

    /**
     * Update and filter scraped products
     * NEW: Uses cache AND checks by supplierProductId
     * ALSO: Returns mapping of product -> existingId for quick updates
     * 
     * @param {Array} products - Scraped products from category listing
     * @param {string} category - Category name
     * @param {string} subcategory - Subcategory name
     * @param {string} sub2category - Sub2category name
     * @param {Object} importRef - Import reference
     * @param {Object} entry - Supplier entry
     * @returns {Object} { products: [], updateProducts: [] }
     */
    async updateAndFilterScrapProducts(products, category, subcategory, sub2category, importRef, entry) {
        try {
            const newProducts = [];
            const updateProducts = [];
            let stockLevelFilter = [];

            // Get stock filter
            for (let stock of importRef.stock_map) {
                stockLevelFilter.push(stock.name_in_xml);
            }

            let minPrice = importRef.categoryMap.minimumPrice ? importRef.categoryMap.minimumPrice : 0;
            let maxPrice;
            if (importRef.categoryMap.maximumPrice && importRef.categoryMap.maximumPrice > 0) {
                maxPrice = importRef.categoryMap.maximumPrice;
            }
            else {
                maxPrice = 100000;
            }

            for (let product of products) {
                // Set category info
                product.entry = entry;
                product.category = { title: category };
                product.subcategory = { title: subcategory };
                product.sub2category = { title: sub2category };

                //filter product
                if (!this.filterScrappedProducts(product, stockLevelFilter, minPrice, maxPrice)) {
                    continue
                }


                // Filter by price
                if (!product.wholesale) {
                    continue;
                }

                // ✅ 1. First try to find by supplierProductId (most reliable)
                let existingBySupplier = null;
                if (product.supplierCode) {
                    existingBySupplier = await strapi.db.query('api::product.product').findOne({
                        where: {
                            supplierInfo: {
                                $and: [
                                    { name: entry.name },
                                    { supplierProductId: product.supplierCode }
                                ]
                            }
                        },
                        select: ['id', 'mpn', 'barcode', 'model', 'name'],
                        populate: {
                            supplierInfo: {
                                fields: ['supplierProductId']
                            }
                        }
                    }).catch(err => {
                        console.warn(`Error searching by supplierProductId ${product.supplierCode}:`, err.message);
                        return null;
                    });

                    if (existingBySupplier) {
                        // console.log(`📦 Found existing product by supplierProductId: ${product.name}`);
                        product._existingId = existingBySupplier.id;

                        updateProducts.push(product);
                        continue;
                    }
                }

                // Keep product for processing (whether new or existing)
                newProducts.push(product);
            }

            // ✅ Return both products and map
            return {
                products: newProducts,
                updateProducts: updateProducts
            };

        } catch (error) {
            console.log('Error in updateAndFilterScrapProducts:', error);
            return { products: [], updateProducts: [] };
        }
    },

    filterScrappedProducts(product, stockLevelFilter, minPrice, maxPrice) {
        try {

            let isPassingFilters = true

            if (!stockLevelFilter.includes(product.stock_level)) {
                isPassingFilters = false
            }

            if (Number.isNaN(product.wholesale) || product.wholesale < minPrice || product.wholesale > maxPrice) {
                isPassingFilters = false
            }

            return isPassingFilters
        } catch (error) {
            console.log(error)
        }
    },
});
