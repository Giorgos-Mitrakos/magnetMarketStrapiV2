'use strict';

module.exports = ({ strapi }) => ({

    async parseGlobalsat({ entry }) {
        try {
            const adapter = strapi
                .plugin('import-products')
                .service('globalsatScrapAdapter')(entry);

            return await adapter.import();

        } catch (err) {
            console.error('Error in parseGlobalsat:', err);
            return { message: "Error", error: err.message };
        }
    },

    /**
     * Check if product needs full scraping
     */
    async needsFullScrapGlobalsatProduct(productMeta, entry) {
        try {
            if (!productMeta._existingId) {
                console.log(`🆕 NEW product: ${productMeta.name}`);
                return true;
            }

            const existingProduct = await strapi.entityService.findOne(
                'api::product.product',
                productMeta._existingId,
                {
                    fields: ['id', 'name'],
                    populate: {
                        prod_chars: { fields: ['id'], limit: 1 },
                        image: { fields: ['id'], limit: 1 },
                        additionalImages: { fields: ['id'], limit: 5 }
                    }
                }
            ).catch(err => {
                console.warn(`Error fetching product ${productMeta._existingId}:`, err.message);
                return null;
            });

            if (!existingProduct) {
                return true;
            }

            const hasImages = !!(existingProduct.image?.id ||
                (existingProduct.additionalImages && existingProduct.additionalImages.length > 0));
            const hasCharacteristics = !!(existingProduct.prod_chars && existingProduct.prod_chars.length > 0);

            if (!hasImages || !hasCharacteristics) {
                console.log(`🖼️  Missing data: ${productMeta.name}`);
                return true;
            }

            console.log(`✅ Complete: ${productMeta.name}`);
            return false;

        } catch (error) {
            console.error(`Error in needsFullScrapGlobalsatProduct:`, error.message);
            return true;
        }
    },

    /**
     * Quick update: only prices from list page
     */
    async quickUpdateGlobalsatProduct(productMeta, category, subcategory, sub2category, importRef, entry) {
        try {
            if (!productMeta._existingId) {
                console.warn(`⚠️  No existing ID: ${productMeta.name}`);
                return;
            }

            const product = {
                entry,
                name: productMeta.name,
                supplierCode: productMeta.supplierCode,
                mpn: productMeta.mpn,
                wholesale: productMeta.wholesale,
                retail_price: productMeta.retail_price,
                stockLevel: productMeta.stockLevel,
                category: { title: category },
                subcategory: { title: subcategory },
                sub2category: { title: sub2category }
            };

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
                console.warn(`Error fetching product:`, err.message);
                return null;
            });

            if (!existingProduct) {
                console.warn(`❌ Product not found: ${productMeta._existingId}`);
                return;
            }

            const result = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .updateEntry(existingProduct, product, importRef);

            if (result?.success) {
                console.log(`💰 Quick update: ${product.name}`);
            }

        } catch (error) {
            console.error(`Error in quickUpdateGlobalsatProduct:`, error.message);
        }
    },

    async acceptCookies(body) {
        try {
            await body.evaluate(() => {
                const btn = document.querySelector('.layout-main .cky-notice-btn-wrapper .cky-btn-accept');
                if (btn) {
                    btn.click();
                }
            });
            // Give it time to process
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            // Ignore - cookies might already be accepted
        }
    },

    async closeAlert(body) {
        try {
            await body.evaluate(() => {
                const btn = document.querySelector('#onesignal-slidedown-cancel-button');
                if (btn) {
                    btn.click();
                }
            });
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            // Ignore
        }
    },

    async loginGlobalsat(body, supplier, page) {
        try {
            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(1500);

            await this.acceptCookies(body);

            const mainContent = await body.$('.main-content');
            const loginForm = await mainContent.$('.b2bLogin');

            if (!loginForm)
                return page

            const username = await loginForm.$('#login-email_address');
            const password = await loginForm.$('#login-password');

            await username.type(process.env.GLOBALSAT_USERNAME, {
                delay: strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(300, 700)
            });

            await password.type(process.env.GLOBALSAT_PASSWORD, {
                delay: strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(300, 700)
            });

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(1500);

            const submitLogin = await loginForm.$('button');
            await submitLogin.scrollIntoView({ behavior: 'smooth' });

            await Promise.all([
                submitLogin.click('#loginSubmit'),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
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
            console.log(error);
            throw error;
        }
    },

    async scrapGlobalsat(importRef, entry) {
        let browser = null;

        try {
            browser = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .createBrowser();

            const loadImages = false;
            let page = await strapi
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
                    () => page.goto('https://eshop.globalsat.gr/b2b/', { waitUntil: "networkidle0" }),
                    10,
                    false
                );

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(3500);

            const body = await page.$('body');


            const newPage = await this.loginGlobalsat(body, entry.name, page);
            const newBody = await newPage.$('body');
            await this.closeAlert(newBody);
            await this.acceptCookies(newBody);

            const categories = await this.scrapGlobalsatCategories(newBody);
            const newCategories = strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .filterCategories(categories, importRef);

            // Process each category
            for (let category of newCategories) {
                for (let subCategory of category.subCategories) {
                    for (let sub2Category of subCategory.subCategories) {
                        await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .sleep(strapi
                                .plugin('import-products')
                                .service('scrapHelpers')
                                .randomWait(4000, 8000));

                        await this.scrapGlobalsatCategory(
                            browser,
                            category,
                            subCategory,
                            sub2Category,
                            importRef,
                            entry
                        );
                    }
                }
            }

            return { message: "ok" };

        } catch (error) {
            console.log(error);
            return { message: "error", error: error.message };
        } finally {
            if (browser) {
                await browser.close().catch(err => console.error('Error closing browser:', err));
            }
        }
    },

    async scrapGlobalsatCategories(body) {
        try {
            const scrap = await body.evaluate(() => {
                const categoriesNav = document.querySelectorAll('.menu-content>ul>.parent>ul>li');
                const categories = [];

                for (let li of categoriesNav) {
                    const anchor = li.querySelector('a');
                    const link = anchor.getAttribute('href');
                    const titleAnchor = anchor.textContent;

                    const subCategoryList = li.querySelectorAll('ul.level-3>li');
                    const subCategories = [];

                    for (let subLi of subCategoryList) {
                        const subAnchor = subLi.querySelector('a');
                        const subTitle = subAnchor.textContent;
                        const subLink = subAnchor.getAttribute('href');

                        const subCategoryListItems = subLi.querySelectorAll('ul.level-4>li');
                        const subCategories2 = [];

                        for (let sub2Li of subCategoryListItems) {
                            const sub2Anchor = sub2Li.querySelector('a');
                            const sub2Title = sub2Anchor.textContent;
                            const sub2Link = sub2Anchor.getAttribute('href');
                            subCategories2.push({ title: sub2Title, link: sub2Link });
                        }

                        subCategories.push({ title: subTitle, link: subLink, subCategories: subCategories2 });
                    }

                    categories.push({ title: titleAnchor, link: link, subCategories });
                }

                return categories;
            });

            return scrap;

        } catch (error) {
            console.log(error);
            return [];
        }
    },

    async findCardGroups(page, card) {
        const cardListWrapper = await page.$('div.list-productlisting');
        const cardList = await cardListWrapper.$$("div.item");
        const cardGroups = await cardList[card.index].$$('.radioBox2');
        return cardGroups;
    },

    async scrapCard(page, index) {
        try {
            const productCard = await page.evaluate((index) => {
                const productListWrapper = document.querySelector('div.list-productlisting');
                const productsCardList = productListWrapper.querySelectorAll('div.item');
                const productsCard = productsCardList[index];

                const product = {};

                const productInfoWrapper = productsCard.querySelector('.name');
                const productTitleAnchor = productInfoWrapper.querySelector('a');
                product.link = productTitleAnchor.getAttribute('href');
                product.name = productTitleAnchor.textContent.trim();

                const modelWrapper = productsCard.querySelector('.model');
                const modelProductWrapper = modelWrapper.querySelector('.products-model');
                const modelSpansWrapper = modelProductWrapper.querySelectorAll('span');
                product.mpn = modelSpansWrapper[1].textContent.trim();

                const skuWrapper = productsCard.querySelector('.Sku');
                const skuProductWrapper = skuWrapper.querySelector('.products-model');
                const skuSpansWrapper = skuProductWrapper.querySelectorAll('span');
                product.supplierCode = skuSpansWrapper[1].textContent.trim();

                const priceWrapper = productsCard.querySelector('.price');
                const priceCurrentSpan = priceWrapper.querySelector('span.current');
                const priceSpecialSpan = priceWrapper.querySelector('span.specials');

                if (priceCurrentSpan) {
                    product.wholesale = priceCurrentSpan.textContent.replace('€', '').replace(',', '').trim();
                } else {
                    product.wholesale = priceSpecialSpan.textContent.replace('€', '').replace(',', '').trim();
                }

                const retailPriceWrapper = priceWrapper.querySelector('.b2b_rrp_price');
                if (retailPriceWrapper) {
                    const retailPriceSpanWrapper = retailPriceWrapper.querySelectorAll('span');
                    const retail_price = retailPriceSpanWrapper[1].textContent.replace('€', '').replace(',', '').trim();
                    product.retail_price = parseFloat(retail_price);
                }

                const stockWrapper = productsCard.querySelector('.in-stock');
                if (stockWrapper) {
                    product.stockLevel = stockWrapper.textContent.trim();
                } else {
                    const preOrderWrapper = productsCard.querySelector('.pre-order');
                    product.stockLevel = preOrderWrapper ? preOrderWrapper.textContent.trim() : "Μη διαθέσιμο";
                }

                return product;
            }, index);

            return productCard;
        } catch (error) {
            console.log("An error occurred in scrapCard");
            console.log(error);
            return null;
        }
    },

    async scrapeProducts(browser, link) {
        const loadImages = false;
        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(browser, loadImages);

        try {
            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(link, { waitUntil: "networkidle0" }),
                    10,
                    false
                );

            const body = await page.$('body');
            await this.acceptCookies(body);
            await this.closeAlert(body);

            const cards = [];

            const productListWrapper = await page.$('div.list-productlisting');
            const productsCardList = await productListWrapper.$$("div.item");

            const cardsNumbers = [];
            for (let i = 0; i < productsCardList.length; i++) {
                cardsNumbers.push(i);
            }

            for (let numberOfCard of cardsNumbers) {
                const card = { index: numberOfCard, groups: [] };
                const productGroups = await productsCardList[numberOfCard].$$('.radioBox2');

                if (productGroups.length > 0) {
                    const productGroupsNumbers = [];
                    for (let i = 0; i < productGroups.length; i++) {
                        productGroupsNumbers.push(i);
                    }

                    for (let productGroupNumber of productGroupsNumbers) {
                        try {
                            const group = { index: productGroupNumber };
                            const groupLabels = await productGroups[productGroupNumber].$$('label');

                            if (groupLabels.length > 0) {
                                const productGroupsLabelsNumbers = [];
                                for (let i = 0; i < groupLabels.length; i++) {
                                    productGroupsLabelsNumbers.push(i);
                                }
                                group.labels = productGroupsLabelsNumbers;
                            }

                            card.groups.push(group);

                        } catch (error) {
                            console.log("Error in productGroupNumber");
                        }
                    }
                }
                cards.push(card);
            }

            console.log("cards:", cards)

            const products = [];
            for (let card of cards) {
                try {
                    if (card.groups.length > 0) {
                        await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .sleep(strapi
                                .plugin('import-products')
                                .service('scrapHelpers')
                                .randomWait(300, 500));

                        let firstGroup = card.groups[0];
                        let secondGroup = card.groups[1];

                        if (firstGroup.labels.length > 0) {
                            for (let firstGroupLabel of firstGroup.labels) {
                                await strapi
                                    .plugin('import-products')
                                    .service('scrapHelpers')
                                    .sleep(strapi
                                        .plugin('import-products')
                                        .service('scrapHelpers')
                                        .randomWait(300, 700));

                                if (secondGroup && secondGroup.labels.length > 1) {
                                    for (let secondGroupLabel of secondGroup.labels) {
                                        await strapi
                                            .plugin('import-products')
                                            .service('scrapHelpers')
                                            .sleep(strapi
                                                .plugin('import-products')
                                                .service('scrapHelpers')
                                                .randomWait(500, 800));

                                        let cardGroups = await this.findCardGroups(page, card);
                                        const firstGroupLabels = await cardGroups[firstGroup.index].$$('label');
                                        await firstGroupLabels[firstGroupLabel].waitForSelector('.js-list-prod');
                                        const firstGroupLabelNumber = await firstGroupLabels[firstGroupLabel].$(".js-list-prod");
                                        await firstGroupLabelNumber.scrollIntoView({ behavior: 'smooth' });

                                        if (firstGroup.labels.length > 1) {
                                            await strapi
                                                .plugin('import-products')
                                                .service('scrapHelpers')
                                                .retryClick(
                                                    firstGroupLabelNumber,
                                                    page,
                                                    10,
                                                    false
                                                );
                                        }

                                        cardGroups = await this.findCardGroups(page, card);
                                        const secondGroupLabels = await cardGroups[secondGroup.index].$$('label');
                                        await secondGroupLabels[secondGroupLabel].waitForSelector('.js-list-prod');
                                        const secondGroupLabelNumber = await secondGroupLabels[secondGroupLabel].$(".js-list-prod");
                                        await secondGroupLabelNumber.scrollIntoView({ behavior: 'smooth' });
                                        await strapi
                                            .plugin('import-products')
                                            .service('scrapHelpers')
                                            .retryClick(
                                                secondGroupLabelNumber,
                                                page,
                                                10,
                                                false
                                            );

                                        const product = await this.scrapCard(page, card.index);
                                        if (product) {
                                            const findProduct = products.findIndex(x => x.mpn === product.mpn);
                                            if (findProduct === -1) products.push(product);
                                        }
                                    }
                                } else {
                                    const cardListWrapper = await page.$('div.list-productlisting');
                                    const cardList = await cardListWrapper.$$("div.item");
                                    const cardGroups = await cardList[card.index].$$('.radioBox2');
                                    const firstGroupLabels = await cardGroups[firstGroup.index].$$('label');

                                    await firstGroupLabels[firstGroupLabel].waitForSelector('.js-list-prod');
                                    const labelNumber = await firstGroupLabels[firstGroupLabel].$(".js-list-prod");
                                    if (firstGroup.labels.length > 1) {
                                        await labelNumber.scrollIntoView({ behavior: 'smooth' });
                                        await strapi
                                            .plugin('import-products')
                                            .service('scrapHelpers')
                                            .retryClick(
                                                labelNumber,
                                                page,
                                                10,
                                                false
                                            );
                                    }
                                    const product = await this.scrapCard(page, card.index);
                                    if (product) {
                                        const findProduct = products.findIndex(x => x.mpn === product.mpn);
                                        if (findProduct === -1) products.push(product);
                                    }
                                }
                            }
                        }
                    } else {
                        const product = await this.scrapCard(page, card.index);
                        if (product) {
                            const findProduct = products.findIndex(x => x.mpn === product.mpn);
                            if (findProduct === -1) products.push(product);
                        }
                    }

                } catch (error) {
                    console.log("Error in cards loop", error);
                }
            }

            return products;

        } catch (error) {
            console.log("Error in scrapeProducts",error);
            return [];
        } finally {
            if (page) {
                await page.close().catch(err => console.error('Error closing page:', err));
            }
        }
    },

    async scrapGlobalsatCategory(browser, category, subcategory, sub2category, importRef, entry) {
        const loadImages = false;
        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(browser, loadImages);

        try {
            let status = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(`${sub2category.link}`, { waitUntil: "networkidle0" }),
                    10,
                    false
                );

            status = status.status();

            if (status !== 404) {
                const body = await page.$('body');
                await this.acceptCookies(body);
                await this.closeAlert(body);

                const availableProductsCheck = await page.$('#headerStock');
                await availableProductsCheck.scrollIntoView({ behavior: 'smooth' });
                const isChecked = await (await availableProductsCheck.getProperty("checked")).jsonValue();

                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .sleep(strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .randomWait(1000, 1500));

                if (isChecked) {
                    availableProductsCheck.click();
                    await page.waitForNavigation();
                }

                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .sleep(strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .randomWait(1000, 2000));

                let url = await page.url();
                const newProductList = await this.scrapeProducts(browser, url);

                let lastPageReached = false;

                while (!lastPageReached) {
                    const nextPageLink = await page.$('.block a.next');
                    const href = await nextPageLink?.getProperty('href');
                    const hrefValue = await href?.jsonValue();

                    if (!hrefValue) {
                        lastPageReached = true;
                    } else {
                        await nextPageLink.scrollIntoView({ behavior: 'smooth' });
                        await nextPageLink.click();

                        url = await page.url();

                        await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .sleep(strapi
                                .plugin('import-products')
                                .service('scrapHelpers')
                                .randomWait(1200, 2200));

                        let products = await this.scrapeProducts(browser, url);
                        newProductList.push(...products);
                    }
                }

                // ✅ Filter and check existing products
                const { products: toCreate, updateProducts } = await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .updateAndFilterScrapProducts(
                        newProductList,
                        category.title,
                        subcategory.title,
                        sub2category.title,
                        importRef,
                        entry
                    );

                console.log(`📦 Found ${toCreate.length + updateProducts.length} products to process in ${category.title} > ${subcategory.title} > ${sub2category.title}`);

                // ✅ Process each product - smart decision tree
                for (let product of updateProducts) {
                    if (!product || !product.link) continue;

                    try {
                        // ✅ CHECK: Does it need full scrape?
                        const needsFullScrape = await this.needsFullScrapGlobalsatProduct(product, entry);

                        if (!needsFullScrape) {
                            // ✅ QUICK UPDATE: Just update prices, no scraping
                            console.log(`⏭️  Skipping full scrape, updating prices: ${product.name}`);
                            await this.quickUpdateGlobalsatProduct(
                                product,
                                category.title,
                                subcategory.title,
                                sub2category.title,
                                importRef,
                                entry
                            );
                            continue;
                        }

                        // ✅ FULL SCRAPE: Product is new or missing data
                        await this.scrapGlobalsatProduct(
                            browser,
                            category,
                            subcategory,
                            sub2category,
                            product.link,
                            importRef,
                            entry
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
                                .randomWait(3000, 6000));

                        // ✅ FULL SCRAPE: Product is new or missing data
                        await this.scrapGlobalsatProduct(
                            browser,
                            category,
                            subcategory,
                            sub2category,
                            product.link,
                            importRef,
                            entry
                        );

                    } catch (err) {
                        console.error(`Error processing product ${product?.name}:`, err.message);
                    }
                }
            }

        } catch (error) {
            console.error(error, importRef, entry);
        } finally {
            if (page) {
                await page.close().catch(err => console.error('Error closing page:', err));
            }
        }
    },

    async scrapGlobalsatProduct(browser, category, subcategory, sub2category, productLink, importRef, entry) {
        const loadImages = true;
        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(browser, loadImages);

        try {
            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(productLink, { waitUntil: "networkidle0" }),
                    10,
                    false
                );

            const body = await page.$('body');
            await this.acceptCookies(body);
            await this.closeAlert(body);

            const productPage = await page.$('div.productWrapper');

            const scrapProduct = await productPage.evaluate(() => {
                const product = {};

                product.name = document.querySelector('.w-product-name>h1').textContent.trim();

                const modelWrapper = document.querySelector('.model');
                const modelSpansWrapper = modelWrapper.querySelectorAll('span');
                product.mpn = modelSpansWrapper[modelSpansWrapper.length - 1].textContent.trim();

                const barcodeWrapper = document.querySelector('.ean');
                const barcodeSpansWrapper = barcodeWrapper.querySelectorAll('span');
                product.barcode = barcodeSpansWrapper[barcodeSpansWrapper.length - 1].textContent.trim();

                const supplierCodeWrapper = document.querySelector('.upc');
                const supplierCodeSpansWrapper = supplierCodeWrapper.querySelectorAll('span');
                product.supplierCode = supplierCodeSpansWrapper[supplierCodeSpansWrapper.length - 1].textContent.trim();

                const baseUrl = 'https://eshop.globalsat.gr';
                product.imagesSrc = [];
                const productMainImgUrl = document.querySelector('.images a');
                product.imagesSrc.push({ url: `${baseUrl}${productMainImgUrl.getAttribute('href')}` });

                const productImgUrlsWrapper = document.querySelectorAll('.images img');
                for (let productImgUrl of productImgUrlsWrapper) {
                    let imgURL = productImgUrl.getAttribute("src");
                    product.imagesSrc.push({ url: `${baseUrl}${imgURL}` });
                }

                const productTag = document.querySelector('.in-stock');
                product.stockLevel = productTag.textContent.trim();

                switch (product.stockLevel) {
                    case 'Διαθέσιμο':
                        product.status = "InStock";
                        break;
                    case 'Αναμένεται':
                        product.status = "OutOfStock";
                        break;
                    default:
                        product.status = "OutOfStock";
                        break;
                }

                const wholesaleCurrentNode = document.querySelector("#product-price-current_unit_exl.current-exl");
                const wholesaleSpecialNode = document.querySelector("#product-price-special_unit_exl.special-ex");
                if (wholesaleCurrentNode) {
                    const wholesaleSpansWrapper = wholesaleCurrentNode.querySelectorAll('span');
                    product.wholesale = wholesaleSpansWrapper[wholesaleSpansWrapper.length - 1].textContent.replace("€", "").replace(",", "").trim();
                } else {
                    const wholesaleSpansWrapper = wholesaleSpecialNode.querySelectorAll('span');
                    product.wholesale = wholesaleSpecialNode.textContent.split("€")[0].replace(",", "").trim();
                }

                const retailNode = document.querySelector("#product-price-rrp-b2b");

                if (retailNode) {
                    const retailPrice = retailNode.querySelector('.b2b-price-value');
                    product.retail_price = retailPrice.textContent.replace("€", "").replace(",", "").trim();
                    const initialRetailPrice = retailNode.querySelector('.was');
                    if (initialRetailPrice) {
                        product.initial_retail_price = initialRetailPrice.textContent.replace("€", "").replace(",", "").trim();
                    }
                }

                return product;
            });

            const description = await page.$('#description');
            if (description) {
                scrapProduct.description = await page.$eval('#description', el => el.innerHTML);
            }

            const scrapProductAttributes = await page.evaluate(() => {
                const attributes = [];
                const attributeWrapper = document.querySelector('.product-properties');
                const attributeList = attributeWrapper.querySelectorAll('ul');

                for (let attr of attributeList) {
                    const attribute = {};
                    attribute.name = attr.querySelector('.propertiesName-span').textContent;
                    attribute.value = attr.querySelector('.propertiesValue-span').textContent;
                    attributes.push(attribute);
                }

                return attributes;
            });

            scrapProduct.prod_chars = scrapProductAttributes;
            scrapProduct.supplierProductURL = productLink;
            scrapProduct.entry = entry;
            scrapProduct.category = category;
            scrapProduct.subcategory = subcategory;
            scrapProduct.sub2category = sub2category;
            scrapProduct.link = page.url();

            // Weight extraction logic (kept from original)
            if (scrapProduct.prod_chars) {
                if (scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("βάρος"))) {
                    if (scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("μεικτό βάρος"))) {
                        let weightChar = scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("μεικτό βάρος"));
                        if (weightChar) {
                            if (weightChar.value.toLowerCase().includes("kg")) {
                                let result = weightChar.value.toLowerCase().match(/\d{1,3}(.|,|\s)?\d{0,3}\s*kg/gmi);
                                if (result) {
                                    if (result[result.length - 1].match(/\d{1,3}(.|\s)?\d{0,3}\s*kg/gmi)) {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].replace("kg", "").replace(",", ".").trim()) * 1000;
                                    } else {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].replace("kg", "").replace(".", "").replace(",", ".").trim()) * 1000;
                                    }
                                }
                            } else if (weightChar.value.toLowerCase().includes("gr")) {
                                let result = weightChar.value.toLowerCase().match(/\d*(.|,|\s)?\d{0,3}\s*gr/gmi);
                                if (result[result.length - 1].match(/\d*.\d{3}\s*gr/gmi)) {
                                    scrapProduct.weight = parseFloat(result[result.length - 1].replace("gr", "").replace(".", "").trim());
                                } else {
                                    scrapProduct.weight = parseFloat(result[result.length - 1].replace("gr", "").replace(",", ".").trim());
                                }
                            }
                        }
                    } else {
                        let weightChar = scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("βάρος"));
                        if (weightChar) {
                            if (weightChar.value.toLowerCase().includes("kg")) {
                                let result = weightChar.value.toLowerCase().match(/\d{1,3}(.|,|\s)?\d{0,3}\s*kg/gmi);
                                if (result) {
                                    if (result[result.length - 1].match(/\d{1,3}(.|\s)?\d{0,3}\s*kg/gmi)) {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].replace("kg", "").replace(",", ".").trim()) * 1000;
                                    } else {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].replace("kg", "").replace(".", "").replace(",", ".").trim()) * 1000;
                                    }
                                }
                            } else if (weightChar.value.toLowerCase().includes("gr")) {
                                let result = weightChar.value.toLowerCase().match(/\d*(.|,|\s)?\d{0,3}\s*gr/gmi);
                                if (result[result.length - 1].match(/\d*.\d{3}\s*gr/gmi)) {
                                    scrapProduct.weight = parseFloat(result[result.length - 1].replace("gr", "").replace(".", "").trim());
                                } else {
                                    scrapProduct.weight = parseFloat(result[result.length - 1].replace("gr", "").replace(",", ".").trim());
                                }
                            }
                        }

                        let specsChar = scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("specs"));
                        if (specsChar) {
                            if (specsChar.value.toLowerCase().includes("βάρος") || specsChar.value.toLowerCase().includes("weight")) {
                                let result = specsChar.value.toLowerCase().match(/(βάρος|weight)\s?:\s?\d+(.)?\d+\s?gr?/gmi);
                                if (result) {
                                    if (result[result.length - 1].match(/\d+.?\d+/gmi)) {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].match(/\d+.?\d+/gmi)[0]);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ✅ Import product (transformProduct will be called by GlobalsatAdapter)
            if (scrapProduct.imagesSrc && scrapProduct.imagesSrc.length !== 0) {
                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .importScrappedProduct(scrapProduct, importRef);
            } else {
                console.warn(`⚠️  Product ${scrapProduct.name} has no images, skipping`);
            }

        } catch (error) {
            console.error(error);
        } finally {
            if (page) {
                await page.close().catch(err => console.error('Error closing page:', err));
            }
        }
    },
});