'use strict';

module.exports = ({ strapi }) => ({
    // Helper για ασφαλή εξαγωγή text
    safeGetText(element, selector, defaultValue = '') {
        try {
            const el = selector ? element?.querySelector(selector) : element;
            return el?.textContent?.trim() || defaultValue;
        } catch (error) {
            console.warn(`Error getting text for selector "${selector}":`, error.message);
            return defaultValue;
        }
    },

    // Helper για ασφαλή εξαγωγή attribute
    safeGetAttribute(element, selector, attribute, defaultValue = '') {
        try {
            const el = selector ? element?.querySelector(selector) : element;
            return el?.getAttribute(attribute) || defaultValue;
        } catch (error) {
            console.warn(`Error getting attribute "${attribute}" for selector "${selector}":`, error.message);
            return defaultValue;
        }
    },

    // Helper για ασφαλή εξαγωγή τιμής
    safeParsePrice(priceString, defaultValue = '0') {
        try {
            if (!priceString) return defaultValue;
            const cleaned = priceString.replace('€', '').replace(/\./g, '').replace(',', '.').trim();
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? defaultValue : cleaned;
        } catch (error) {
            console.warn('Error parsing price:', error.message);
            return defaultValue;
        }
    },

    async parseNovatron({ entry }) {
        let browser = null;
        try {
            if (!entry) {
                throw new Error('Entry is required');
            }

            const importRef = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .createImportRef(entry);

            if (!entry.isActive) {
                await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .deleteEntry(entry, importRef);
                return { message: "ok", info: "Entry is inactive, deleted products" };
            }

            const response = await this.scrapNovatronCategories(importRef, entry);

            if (response?.message === "error") {
                const report = `Created: ${importRef.created || 0}, Updated: ${importRef.updated || 0}, ` +
                    `Republished: ${importRef.republished || 0}, Skipped: ${importRef.skipped || 0}, ` +
                    `Deleted: ${importRef.deleted || 0}. Δημιουργήθηκε σφάλμα κατά τη διαδικασία.`;
                
                await strapi.entityService.update('plugin::import-products.importxml', entry.id, {
                    data: {
                        lastRun: new Date(),
                        report,
                    },
                });
                return { message: "error", report };
            } else {
                await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .deleteEntry(entry, importRef);
            }

            console.log("End of Import");
            return { message: "ok" };
        } catch (error) {
            console.error('Critical error in parseNovatron:', error);
            return { message: "error", error: error.message };
        }
    },

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

    async scrapNovatronCategories(importRef, entry) {
        let browser = null;
        let page = null;

        try {
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
                    () => page.goto('https://novatronsec.com/', { waitUntil: "networkidle0", timeout: 30000 }),
                    10,
                    false
                );

            const pageUrl = page.url();

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

            await this.scrapNovatronCategory(browser, newCategories, importRef, entry, supplier);

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

    async scrapNovatronCategory(browser, novatronCategories, importRef, entry, supplier) {
        if (!novatronCategories || novatronCategories.length === 0) {
            console.warn('No categories to scrape');
            return;
        }

        for (let cat of novatronCategories) {
            if (!cat || !cat.subCategories) continue;

            for (let sub of cat.subCategories) {
                if (!sub || !sub.link) continue;

                let page = null; // Κάθε subcategory έχει το δικό του page
                
                try {
                    const loadImages = false;
                    page = await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .createPage(browser, loadImages);

                    try {
                        await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .sleep(strapi
                                .plugin('import-products')
                                .service('scrapHelpers')
                                .randomWait(4000, 10000));

                        await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .retry(
                                () => page.goto(`https://novatronsec.com${sub.link}?top=all&stock=1`, 
                                    { waitUntil: "networkidle0", timeout: 30000 }),
                                10,
                                false
                            );

                        await page.waitForSelector("body", { timeout: 10000 });
                        const bodyHandle = await page.$("body");
                        if (!bodyHandle) {
                            console.warn(`Body not found for ${sub.title}`);
                            continue;
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
                                    product.in_offer = productImageBadge?.getAttribute("href") === '/Content/img/prosfora-R.png';

                                    const productBody = prod.querySelector('.product-body');
                                    if (!productBody) continue;

                                    const productTitleAnchor = productBody.querySelector('.product-title>a');
                                    const name = productTitleAnchor?.textContent?.trim();
                                    if (!name) continue;

                                    product.name = name;
                                    product.short_description = productBody.querySelector('.mini-description')?.textContent?.trim() || '';

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

                                    if (product.brand?.toLowerCase().includes('dahua')) continue;

                                    products.push(product);
                                } catch (err) {
                                    console.warn('Error processing product in list:', err);
                                }
                            }
                            return products;
                        });

                        if (!scrap || scrap.length === 0) {
                            console.log(`No products found in ${cat.title} > ${sub.title}`);
                            continue;
                        }

                        const matches = scrap.filter(product =>
                            product?.name && strapi
                                .plugin('import-products')
                                .service('priceHelpers')
                                .containsRetailPriceName(product.name, supplier)
                        );

                        const enrichedMatches = await Promise.allSettled(
                            matches.map(async (p) => {
                                try {
                                    const enrichedProduct = await this.scrapNovatronProductForUpdates(
                                        browser, p.link, cat.title, sub.title, importRef, entry
                                    );
                                    return {
                                        ...p,
                                        retail_price: enrichedProduct?.retail_price
                                    };
                                } catch (err) {
                                    console.warn(`Error enriching product ${p.name}:`, err.message);
                                    return p;
                                }
                            })
                        );

                        const successfulEnriched = enrichedMatches
                            .filter(result => result.status === 'fulfilled')
                            .map(result => result.value);

                        const allProducts = scrap.map(p => {
                            const enriched = successfulEnriched.find(m => m?.name === p?.name);
                            return enriched || p;
                        });

                        const products = await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .updateAndFilterScrapProducts(allProducts, cat.title, sub.title, null, importRef, entry);

                        if (!products || products.length === 0) continue;

                        for (let prod of products) {
                            if (!prod || !prod.link) continue;

                            try {
                                await strapi
                                    .plugin('import-products')
                                    .service('scrapHelpers')
                                    .sleep(strapi
                                        .plugin('import-products')
                                        .service('scrapHelpers')
                                        .randomWait(4000, 10000));

                                await this.scrapNovatronProduct(browser, prod.link, cat.title, sub.title, importRef, entry);
                            } catch (err) {
                                console.error(`Error scraping product ${prod.link}:`, err.message);
                                // Συνεχίζει στο επόμενο προϊόν
                            }
                        }
                    } catch (err) {
                        console.error(`Error processing subcategory ${sub.title}:`, err.message);
                        // Συνεχίζει στο επόμενο subcategory
                    }
                } catch (err) {
                    console.error(`Critical error in subcategory ${sub.title}:`, err.message);
                } finally {
                    // Κλείνει το page του subcategory σίγουρα
                    if (page) {
                        await page.close().catch(err => console.error('Error closing subcategory page:', err));
                    }
                }
            }
        }
    },

    async scrapNovatronProduct(browser, productLink, category, subcategory, importRef, entry) {
        let page = null;
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (!productLink) {
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
                        () => page.goto(productLink, { waitUntil: "networkidle0", timeout: 30000 }),
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

                const scrapProduct = await this.extractProductData(bodyHandle);

                if (!scrapProduct) {
                    throw new Error('Failed to extract product data');
                }

                scrapProduct.mpn = productID.toString();
                scrapProduct.supplierCode = productID.toString();
                scrapProduct.link = productUrl;
                scrapProduct.entry = entry;
                scrapProduct.category = { title: category || '' };
                scrapProduct.subcategory = { title: subcategory || '' };
                scrapProduct.sub2category = { title: null };

                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .importScrappedProduct(scrapProduct, importRef);

                // Επιτυχία - βγαίνουμε από το loop
                break;

            } catch (error) {
                lastError = error;
                console.error(`Error scraping product ${productLink} (attempt ${attempt}/${maxRetries}):`, error.message);
                
                if (attempt === maxRetries) {
                    console.error(`Failed to scrape product after ${maxRetries} attempts: ${productLink}`);
                } else {
                    // Περιμένουμε λίγο πριν το retry
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                }
            } finally {
                // Κλείνουμε τη σελίδα πάντα, ακόμα και σε error
                if (page) {
                    await page.close().catch(err => console.error('Error closing product page:', err));
                    page = null; // Reset για το επόμενο retry
                }
            }
        }
    },

    async scrapNovatronProductForUpdates(browser, productLink, category, subcategory, importRef, entry) {
        let page = null;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (!productLink) {
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
                        () => page.goto(productLink, { waitUntil: "networkidle0", timeout: 30000 }),
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

                const scrapProduct = await this.extractProductData(bodyHandle);

                if (!scrapProduct) {
                    throw new Error('Failed to extract product data');
                }

                scrapProduct.mpn = productID.toString();
                scrapProduct.supplierCode = productID.toString();
                scrapProduct.link = productUrl;
                scrapProduct.entry = entry;
                scrapProduct.category = { title: category || '' };
                scrapProduct.subcategory = { title: subcategory || '' };
                scrapProduct.sub2category = { title: null };

                return scrapProduct;

            } catch (error) {
                console.error(`Error scraping product for updates ${productLink} (attempt ${attempt}/${maxRetries}):`, error.message);
                
                if (attempt === maxRetries) {
                    console.error(`Failed to scrape product after ${maxRetries} attempts: ${productLink}`);
                    return null;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                }
            } finally {
                if (page) {
                    await page.close().catch(err => console.error('Error closing page:', err));
                    page = null;
                }
            }
        }
        
        return null;
    },

    // Extracted για να μην επαναλαμβάνεται ο κώδικας
    async extractProductData(bodyHandle) {
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
                console.error('Error in extractProductData evaluate:', error);
                return null;
            }
        });
    }
});