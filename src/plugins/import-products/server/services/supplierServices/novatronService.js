'use strict';

/**
 * Novatron Service - Scraping implementation
 * Works with NovatronAdapter
 * 
 * Uses new cache-based flow:
 * 1. Scrape categories
 * 2. For each subcategory: scrape products list
 * 3. Filter via updateAndFilterScrapProducts (uses cache + supplierProductId)
 * 4. For each product: scrape details → apply transformations → importScrappedProduct
 */
module.exports = ({ strapi }) => ({
    async parseNovatron({ entry }) {
        try {
            // Get the adapter
            const adapter = strapi
                .plugin('import-products')
                .service('novatronAdapter')(entry);

            // Run import
            return await adapter.import();

        } catch (err) {
            console.error('Error in parseQuest:', err);
            return { message: "Error", error: err.message };
        }
    },

    /**
     * Check if product needs full scraping
     * Returns false if:
     * - Product already exists in DB
     * - Has images
     * - Has characteristics
     * Returns true if:
     * - Product is new
     * - Missing images or characteristics
     */
    async needsFullScrapNovatronProduct(productMeta, category, subcategory, entry) {
        try {
            if (!productMeta.supplierCode) {
                return true; // Can't check without supplier code
            }

            // ✅ Search by supplierProductId
            const existingProduct = await strapi.db.query('api::product.product').findOne({
                where: {
                    supplierInfo: {
                        $and: [
                            { name: entry.name },
                            { supplierProductId: productMeta.supplierCode }
                        ]
                    }
                },
                select: ['id', 'name'],
                populate: {
                    prod_chars: { select: ['id'] },
                    image: { select: ['id'] },
                    additionalImages: { select: ['id'] }
                }
            }).catch(err => {
                console.warn(`Error searching existing product:`, err.message);
                return null;
            });

            // New product - needs full scrape
            if (!existingProduct) {
                console.log(`🆕 New product: ${productMeta.name}`);
                return true;
            }

            // ✅ Check if existing product needs data
            const hasImages = existingProduct.image?.id || (existingProduct.additionalImages?.length > 0);

            // If missing images or characteristics - need full scrape
            if (!hasImages) {
                console.log(`🖼️  Missing images: ${productMeta.name}`);
                return true;
            }

            // Product exists with all data - quick update only
            console.log(`✅ Has images & characteristics: ${productMeta.name}`);
            return false;

        } catch (error) {
            console.error(`Error in needsFullScrapNovatronProduct:`, error.message);
            return true; // Default to full scrape on error
        }
    },

    /**
     * Quick update: just update prices from list page (NO full scrape)
     */
    async quickUpdateNovatronProduct(productMeta, category, subcategory, importRef, entry) {
        try {
            if (!productMeta._existingId) {
                console.warn(`⚠️  No existing ID for quick update: ${productMeta.name}`);
                return;
            }

            // ✅ Create minimal product object (only fields that changed)
            const product = {
                entry,
                name: productMeta.name,
                supplierCode: productMeta.supplierCode,
                wholesale: productMeta.wholesale,
                initial_wholesale: productMeta.initial_wholesale,
                in_offer: productMeta.in_offer,
                discount: productMeta.discount,
                stockLevel: productMeta.stockLevel,
                category: { title: category },
                subcategory: { title: subcategory },
            };

            // ✅ Get existing product by ID - FULL populate like cache does
            const existingProduct = await strapi.db.query('api::product.product').findOne({
                where: { id: productMeta._existingId },
                populate: {
                    supplierInfo: {
                        populate: {
                            price_progress: true,
                        }
                    },
                    related_import: true,
                    brand: true,
                    category: {
                        populate: {
                            cat_percentage: {
                                populate: {
                                    brand_perc: {
                                        populate: {
                                            brand: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    platforms: true,
                    prod_chars: true
                }
            }).catch(err => {
                console.warn(`Error fetching product for update:`, err.message);
                return null;
            });

            if (!existingProduct) {
                console.warn(`❌ Product not found for update: ${productMeta._existingId}`);
                return;
            }

            // ✅ Update product (prices only)
            const result = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .updateEntry(existingProduct, product, importRef);

            if (result?.success) {
                // console.log(`💰 Quick update: ${product.name}`);
            } else {
                console.warn(`❌ Quick update failed: ${product.name}`);
            }
        } catch (error) {
            console.error(`Error in quickUpdateNovatronProduct:`, error.message);
        }
    },

    /**
     * Main scraping entry point
     * Called by NovatronAdapter.fetchData()
     */
    async scrapNovatronCategories(importRef, entry) {
        let browser = null;
        let page = null;

        try {
            // Get supplier config for retail price logic
            const supplier = await strapi.db.query('plugin::import-products.importxml').findOne({
                select: ['name', 'useRetailPrice'],
                where: { name: 'novatron' },
                populate: {
                    useRetailPriceBrands: true,
                    useRetailPriceCategories: true,
                    useRetailPriceContainName: true
                }
            });

            if (!supplier) {
                throw new Error('Supplier "novatron" not found in database');
            }

            browser = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .createBrowser();

            const loadImages = false;
            page = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .createPage(browser, loadImages);

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .loadCookies(entry.name, page);

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto('https://novatronsec.com/', {
                        waitUntil: "networkidle0",
                        timeout: 30000
                    }),
                    10,
                    false
                );

            const pageUrl = page.url();

            // Login if needed
            if (pageUrl?.includes('/Account/Login')) {
                page = await this.loginNovatron(page, entry.name);
            }

            await page.waitForSelector("ul.navbar-nav", { timeout: 10000 });
            const navList = await page.$("ul.navbar-nav");

            if (!navList) {
                throw new Error('Navigation menu not found');
            }

            const scrapCategories = await navList.evaluate(() => {
                const navListElements = document.querySelectorAll("li.nav-item");
                const categories = [];

                for (let li of navListElements) {
                    try {
                        const categoryAnchor = li.querySelector("a");
                        if (!categoryAnchor) continue;

                        const categoryTitle = categoryAnchor.textContent?.trim();
                        if (!categoryTitle) continue;

                        const category = {
                            title: categoryTitle,
                            subCategories: []
                        };

                        const subCategoryList = li.querySelectorAll("a.dropdown-item");
                        for (let sub of subCategoryList) {
                            try {
                                const text = sub.textContent || '';
                                const href = sub.getAttribute("href");

                                if (!href) continue;

                                const lastParenIndex = text.lastIndexOf("(");
                                const title = lastParenIndex > 0
                                    ? text.substring(0, lastParenIndex).trim()
                                    : text.trim();

                                if (title) {
                                    category.subCategories.push({
                                        title,
                                        link: href
                                    });
                                }
                            } catch (err) {
                                console.warn('Error processing subcategory:', err);
                            }
                        }

                        if (category.subCategories.length > 0) {
                            categories.push(category);
                        }
                    } catch (err) {
                        console.warn('Error processing category:', err);
                    }
                }
                return categories;
            });

            if (!scrapCategories || scrapCategories.length === 0) {
                throw new Error('No categories found');
            }

            const newCategories = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .filterCategories(scrapCategories, importRef);

            if (page) {
                await page.close().catch(err => console.error('Error closing initial page:', err));
            }

            // Process each category
            for (let cat of newCategories) {
                if (!cat || !cat.subCategories) continue;

                for (let sub of cat.subCategories) {
                    if (!sub || !sub.link) continue;

                    let categoryPage = null;

                    try {
                        await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .sleep(strapi
                                .plugin('import-products')
                                .service('scrapHelpers')
                                .randomWait(4000, 10000));

                        await this.scrapNovatronCategoryProducts(
                            browser,
                            sub.link,
                            cat.title,
                            sub.title,
                            importRef,
                            entry,
                            supplier
                        );
                    } catch (err) {
                        console.error(`Error processing ${cat.title} > ${sub.title}:`, err.message);
                    }
                }
            }

            return { message: "ok" };

        } catch (error) {
            console.error('Error in scrapNovatronCategories:', error);
            return { message: "error", error: error.message };
        } finally {
            if (browser) {
                await browser.close().catch(err => console.error('Error closing browser:', err));
            }
        }
    },

    /**
     * Login to Novatron
     */
    async loginNovatron(page, supplier) {
        try {
            if (!page) throw new Error('Page is required');

            await page.waitForSelector('body', { timeout: 10000 });
            const bodyHandle = await page.$('body');
            if (!bodyHandle) throw new Error('Body not found');

            const formHandle = await bodyHandle.$('form');
            if (!formHandle) throw new Error('Login form not found');

            const username = await formHandle.$('#Email');
            const password = await formHandle.$('#Password');
            const button = await formHandle.$('button');

            if (!username || !password || !button) {
                throw new Error('Login form elements not found');
            }

            const usernameValue = process.env.NOVARTONSEC_USERNAME;
            const passwordValue = process.env.NOVARTONSEC_PASSWORD;

            if (!usernameValue || !passwordValue) {
                throw new Error('Login credentials not configured');
            }

            await username.type(usernameValue, {
                delay: strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(300, 700)
            });

            await password.type(passwordValue, {
                delay: strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(300, 700)
            });

            await Promise.all([
                button.click(),
                page.waitForNavigation({ timeout: 30000 }).catch(err => {
                    console.warn('Navigation timeout:', err.message);
                })
            ]);

            const cookies = await page.cookies();
            if (cookies && cookies.length > 0) {
                const cookiesJson = JSON.stringify(cookies, null, 2);
                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .saveCookies(supplier, cookiesJson);
            }

            return page;
        } catch (error) {
            console.error('Error in loginNovatron:', error);
            throw error;
        }
    },

    /**
     * Scrape category products list
     */
    async scrapNovatronCategoryProducts(browser, link, category, subcategory, importRef, entry, supplier) {
        let page = null;

        try {
            if (!link) {
                console.warn('Invalid category link');
                return;
            }

            const loadImages = false;
            page = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .createPage(browser, loadImages);

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(`https://novatronsec.com${link}?top=all&stock=1`, {
                        waitUntil: "networkidle0",
                        timeout: 30000
                    }),
                    10,
                    false
                );

            await page.waitForSelector("body", { timeout: 10000 });
            const bodyHandle = await page.$("body");
            if (!bodyHandle) {
                console.warn(`Body not found for ${subcategory}`);
                return;
            }

            const scrap = await bodyHandle.evaluate(() => {
                const productsGrid = document.querySelector(".products-grid");
                if (!productsGrid) return [];

                const productsRow = productsGrid.querySelector(".row");
                if (!productsRow) return [];

                const productsList = productsRow.querySelectorAll(".product");
                const products = [];

                for (let prod of productsList) {
                    try {
                        const anchor = prod.querySelector("a");
                        if (!anchor) continue;

                        const productLink = anchor.getAttribute("href");
                        if (!productLink) continue;

                        const product = {
                            link: `https://novatronsec.com${productLink}`
                        };

                        const productImageBadge = anchor.querySelector("img.product-image-badge");
                        product.in_offer = productImageBadge?.getAttribute("src") === '/Content/img/prosfora-R.png';

                        const productBody = prod.querySelector('.product-body');
                        if (!productBody) continue;

                        const productTitleAnchor = productBody.querySelector('.product-title>a');
                        const name = productTitleAnchor?.textContent?.trim();
                        if (!name) continue;

                        product.name = name;
                        product.short_description = productBody.querySelector('.mini-description')?.textContent?.trim() || '';

                        // Extract brand
                        if (name.startsWith('TP-LINK')) {
                            product.brand = 'TP-LINK';
                        } else {
                            const parts = name.split("-");
                            product.brand = parts[0]?.trim() || '';
                        }

                        const priceElement = productBody.querySelector('.product-price>div>div>span');
                        const priceText = priceElement?.textContent || '0';
                        product.wholesale = priceText.replace('€', '').replace(/\./g, '').replace(',', '.').trim();

                        product.supplierCode = productBody.querySelector('.product-code')?.textContent?.trim() || '';

                        const stockLevelWrapper = productBody.querySelector('div>p>img');
                        const productStockImg = stockLevelWrapper?.getAttribute('src') || '';
                        const stockParts = productStockImg.split('/');
                        const stockFile = stockParts[stockParts.length - 1] || '';
                        const stockLevelImg = stockFile.split('.')[0]?.split('-')[1] || '';

                        switch (stockLevelImg) {
                            case '3':
                                product.stockLevel = "InStock";
                                break;
                            case '2':
                                product.stockLevel = "MediumStock";
                                break;
                            case '1':
                                product.stockLevel = "LowStock";
                                break;
                            default:
                                product.stockLevel = "OutOfStock";
                                break;
                        }

                        if (product.brand?.toLowerCase().includes('dahua') || product.brand?.toLowerCase().includes('iris')) continue;

                        products.push(product);
                    } catch (err) {
                        console.warn('Error processing product in list:', err);
                    }
                }
                return products;
            });

            if (!scrap || scrap.length === 0) {
                // console.log(`No products found in ${category} > ${subcategory}`);
                return;
            }

            // console.log(`📦 Found ${scrap.length} products in ${category} > ${subcategory}`);

            // ✅ Filter products - uses cache + supplierProductId
            const { products: toCreate, updateProducts } = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .updateAndFilterScrapProducts(
                    scrap,
                    category,
                    subcategory,
                    null,
                    importRef,
                    entry
                );

            // console.log(`📦 Found ${toCreate.length + updateProducts.length} products in ${category} > ${subcategory}`);

            // ✅ Process each product - check if needs full scraping
            for (let product of updateProducts) {
                if (!product || !product.link) continue;

                try {
                    // ✅ Check if product exists and needs full scraping
                    const needsFullScrape = await this.needsFullScrapNovatronProduct(
                        product,
                        category,
                        subcategory,
                        entry
                    );

                    if (!needsFullScrape) {
                        // Quick update: just update prices from list page
                        // console.log(`⏭️  Skipping full scrape for ${product.name}, updating prices only`);
                        await this.quickUpdateNovatronProduct(
                            product,
                            category,
                            subcategory,
                            importRef,
                            entry
                        );
                        continue;
                    }

                    await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .sleep(strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .randomWait(2000, 5000));

                    // Full scrape: price changes + missing data
                    await this.scrapNovatronProduct(
                        browser,
                        product,
                        category,
                        subcategory,
                        importRef,
                        entry,
                        supplier
                    );
                } catch (err) {
                    console.error(`Error processing product ${product?.name}:`, err.message);
                }
            }

            for (let product of toCreate) {
                if (!product || !product.link) continue;

                try {
                    await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .sleep(strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .randomWait(2000, 5000));

                    // Full scrape: price changes + missing data
                    await this.scrapNovatronProduct(
                        browser,
                        product,
                        category,
                        subcategory,
                        importRef,
                        entry,
                        supplier
                    );

                } catch (err) {
                    console.error(`Error processing product ${product?.name}:`, err.message);
                }
            }

        } catch (error) {
            console.error(`Error in scrapNovatronCategoryProducts for ${category} > ${subcategory}:`, error);
        } finally {
            if (page) {
                await page.close().catch(err => console.error('Error closing page:', err));
            }
        }
    },

    /**
     * Scrape individual product details AND import
     */
    async scrapNovatronProduct(browser, productMeta, category, subcategory, importRef, entry, supplier) {
        let page = null;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (!productMeta.link) {
                    throw new Error('Product link is required');
                }

                const loadImages = true;
                page = await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .createPage(browser, loadImages);

                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .retry(
                        () => page.goto(productMeta.link, {
                            waitUntil: "networkidle0",
                            timeout: 30000
                        }),
                        10,
                        false
                    );

                const productUrl = page.url();
                const urlArray = productUrl.split("/");
                const productID = urlArray[urlArray.length - 1]?.split("?")[0];

                if (!productID) {
                    throw new Error('Could not extract product ID from URL');
                }

                await page.waitForSelector("body", { timeout: 10000 });
                const bodyHandle = await page.$("body");
                if (!bodyHandle) {
                    throw new Error('Body element not found');
                }

                const scrapProduct = await this.extractNovatronProductData(bodyHandle);

                if (!scrapProduct) {
                    throw new Error('Failed to extract product data');
                }

                // ✅ Merge with metadata from list page
                const product = {
                    ...productMeta,
                    ...scrapProduct,
                    mpn: productID.toString(),
                    supplierCode: productID.toString(),
                    link: productUrl,
                    entry,
                    category: { title: category || '' },
                    subcategory: { title: subcategory || '' },
                    sub2category: { title: null }
                };

                // ✅ Import product (transformProduct will be called by NovatronAdapter)
                if (product.imagesSrc && product.imagesSrc.length !== 0) {
                    await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .importScrappedProduct(product, importRef);
                } else {
                    console.warn(`⚠️  Product ${product.name} has no images, skipping`);
                }

                // Success - exit retry loop
                break;

            } catch (error) {
                console.error(
                    `Error scraping product (attempt ${attempt}/${maxRetries}):`,
                    error.message
                );

                if (attempt === maxRetries) {
                    console.error(`❌ Failed after ${maxRetries} attempts`);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                }
            } finally {
                if (page) {
                    await page.close().catch(err => console.error('Error closing product page:', err));
                    page = null;
                }
            }
        }
    },

    /**
     * Extract product data from Novatron product page
     */
    async extractNovatronProductData(bodyHandle) {
        return await bodyHandle.evaluate(() => {
            try {
                const product = {};

                const productDetailsSection = document.querySelector("section.product-details");
                if (!productDetailsSection) return null;

                // Images
                const productImageWrapper = productDetailsSection.querySelector(".owl-thumbs");
                product.imagesSrc = [];
                if (productImageWrapper) {
                    const productImages = productImageWrapper.querySelectorAll("img");
                    for (let imgSrc of productImages) {
                        const src = imgSrc.getAttribute('src');
                        if (src) {
                            product.imagesSrc.push({ url: `https://novatronsec.com${src}` });
                        }
                    }
                }

                // Offer badge
                const inOfferImage = productDetailsSection.querySelector(".active .product-image-badge");
                product.in_offer = inOfferImage?.getAttribute('src') === '/Content/img/prosfora-R.png';

                // Name and brand
                const name = productDetailsSection.querySelector("h1.product-title")?.textContent?.trim();
                if (!name) return null;

                product.name = name;
                product.brand = name.startsWith('TP-LINK') ? 'TP-LINK' : name.split("-")[0]?.trim() || '';

                // Description
                product.short_description = productDetailsSection.querySelector("p.mini-description")?.textContent?.trim() || '';

                // Prices
                const productPriceWrapper = productDetailsSection.querySelector("div.product-price");
                const wholesaleText = productPriceWrapper?.querySelector("span")?.textContent || '0';
                product.wholesale = wholesaleText.replace('€', '').replace(',', '.').trim();

                const productPriceRetailWrapper = productDetailsSection.querySelector("div.product-price-retail");
                const retailText = productPriceRetailWrapper?.querySelector("span")?.textContent || '0';
                product.retail_price = retailText.replace('€', '').replace(',', '.').trim();

                // Stock level
                const productRow = productDetailsSection.querySelector("div.row");
                const productStock = productRow?.querySelector("div>span>img");
                const stockImg = productStock?.getAttribute('src')?.trim() || '';
                const stockLevelImg = stockImg.substring(stockImg.length - 5, stockImg.length - 4);

                switch (stockLevelImg) {
                    case '3':
                        product.stockLevel = "InStock";
                        product.status = "InStock";
                        break;
                    case '2':
                        product.stockLevel = "MediumStock";
                        product.status = "MediumStock";
                        break;
                    case '1':
                        product.stockLevel = "LowStock";
                        product.status = "LowStock";
                        break;
                    default:
                        product.stockLevel = "OutOfStock";
                        product.status = "OutOfStock";
                        break;
                }

                // Description details
                const productDetailsExtraSection = document.querySelector("section.product-details-extra");
                product.description = '';

                if (productDetailsExtraSection) {
                    const productDescriptionWrapper = productDetailsExtraSection.querySelector("#description");
                    if (productDescriptionWrapper) {
                        const additionalFilesWrapper = productDescriptionWrapper.querySelector(".additional-links a");
                        if (additionalFilesWrapper) {
                            const fileHref = additionalFilesWrapper.getAttribute("href");
                            if (fileHref) {
                                product.additional_files = { url: fileHref };
                            }
                        }

                        const descDiv = productDescriptionWrapper.querySelector("div:not(.additional-links)");
                        if (descDiv) {
                            product.description = descDiv.innerHTML?.trim() || '';
                        }
                    }
                }

                // FOV Section
                const productFovSection = document.querySelector("section.fov");
                if (productFovSection) {
                    const productFovContainer = productFovSection.querySelector(".container");
                    if (productFovContainer) {
                        const fovTitle = productFovContainer.querySelector("h4")?.textContent || '';
                        const fovTable = productFovContainer.querySelector("table")?.innerHTML || '';
                        product.description += fovTitle + fovTable;
                    }
                }

                // Product characteristics
                product.prod_chars = [];
                if (productDetailsExtraSection) {
                    const productAdditionalInfoWrapper = productDetailsExtraSection.querySelector("#additional-information");
                    if (productAdditionalInfoWrapper) {
                        const productAdditionalInfoTables = productAdditionalInfoWrapper.querySelectorAll("tbody");
                        for (let tbl of productAdditionalInfoTables) {
                            const tableRows = tbl.querySelectorAll("tr");
                            for (let row of tableRows) {
                                try {
                                    const name = row.querySelector("th")?.textContent?.trim();
                                    const value = row.querySelector("td")?.textContent?.trim();
                                    if (name && value) {
                                        product.prod_chars.push({ name, value });
                                    }
                                } catch (err) {
                                    console.warn('Error processing characteristic row:', err);
                                }
                            }
                        }
                    }
                }

                // Relative products
                product.relativeProducts = [];
                const productRelativeWrapper = document.querySelector("section.relative-products");
                if (productRelativeWrapper) {
                    const productRelativeRow = productRelativeWrapper.querySelectorAll("div.product");
                    for (let prod of productRelativeRow) {
                        try {
                            const anchor = prod.querySelector("a");
                            const relativeProductURL = anchor?.getAttribute("href")?.trim();
                            if (relativeProductURL) {
                                const urlArray = relativeProductURL.split("/");
                                const relativeProductID = urlArray[urlArray.length - 1];
                                if (relativeProductID) {
                                    product.relativeProducts.push({ mpn: relativeProductID });
                                }
                            }
                        } catch (err) {
                            console.warn('Error processing relative product:', err);
                        }
                    }
                }

                return product;
            } catch (error) {
                console.error('Error in extractNovatronProductData evaluate:', error);
                return null;
            }
        });
    },
});