'use strict';

const index = require("@strapi/plugin-users-permissions/strapi-admin");

module.exports = ({ strapi }) => ({

    async parseGlobalsat({ entry }) {
        const importRef = await strapi
            .plugin('import-products')
            .service('importHelpers')
            .createImportRef(entry);

        if (!entry.isActive) {
            await strapi
                .plugin('import-products')
                .service('importHelpers')
                .deleteEntry(entry, importRef);
        }
        else {
            const response = await this.scrapGlobalsat(importRef, entry);

            if (response && response.message === "error") {
                console.log("An error occured")
                await strapi.entityService.update('plugin::import-products.importxml', entry.id,
                    {
                        data: {
                            lastRun: new Date(),
                            report: `Created: ${importRef.created}, Updated: ${importRef.updated},Republished: ${importRef.republished} Skipped: ${importRef.skipped}, Deleted: ${importRef.deleted},
                            Δημιουργήθηκε κάποιο σφάλμα κατά τη διαδικάσία. Ξαναπροσπασθήστε!`,
                        },
                    })
            }
            else {
                await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .deleteEntry(entry, importRef);
            }
        }

        console.log("End of Import")
        return { "message": "ok" }

    },

    async loginGlobalsat(page, supplier) {
        try {

            const body = await page.$('body');

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(1500)

            const acceptCookiesBtn = await body.$(' #onetrust-button-group  #onetrust-accept-btn-handler')
            if (acceptCookiesBtn) {
                await acceptCookiesBtn.click()
            }

            const mainContent = await body.$('.main-content')
            const loginForm = await mainContent.$('.b2bLogin')

            const username = await loginForm.$('#login-email_address');
            const password = await loginForm.$('#login-password');
            await username.type(process.env.GLOBALSAT_USERNAME, {
                delay: strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(300, 700)
            })
            await password.type(process.env.GLOBALSAT_PASSWORD, {
                delay: strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(300, 700)
            })

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(1500)

            const submitLogin = await loginForm.$('button')
            await submitLogin.scrollIntoView({ behavior: 'smooth' });

            await Promise.all([
                submitLogin.click('#loginSubmit'),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);

            await page.cookies()
                .then((cookies) => {
                    const cookiesJson = JSON.stringify(cookies, null, 2)
                    return cookiesJson
                })
                .then((cookiesJson) => {
                    strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .saveCookies(supplier, cookiesJson)
                })
                .catch((error) => console.log(error))

            return page

        } catch (error) {

        }
    },

    async scrapGlobalsat(importRef, entry) {
        const browser = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createBrowser()
        try {

            const loadImages = true;
            let page = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .createPage(await browser, loadImages)

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .loadCookies(entry.name, await page)

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto('https://www.globalsat.gr/b2b/', { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );
            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(1500)

            await this.loginGlobalsat(page, entry.name)

            const newBody = await page.$('body');

            const categories = await this.scrapGlobalsatCategories(newBody)

            let newCategories = strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .filterCategories(categories, importRef)

            const brandEntries = await strapi.entityService.findMany('api::brand.brand', {
                fields: ['name'],
            });

            let sortedBrandArray = brandEntries.sort(function (a, b) {
                return b.name.length - a.name.length;
            });

            for (let category of newCategories) {
                for (let subCategory of category.subCategories) {
                    for (let sub2Category of subCategory.subCategories) {
                        await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .sleep(strapi
                                .plugin('import-products')
                                .service('scrapHelpers')
                                .randomWait(5000, 10000))
                        await this.scrapGlobalsatCategory(browser, category, subCategory, sub2Category, sortedBrandArray, importRef, entry)
                    }
                }
            }

        } catch (error) {
            return { "message": "error" }
        }
        finally {
            await browser.close();
        }
    },

    async scrapGlobalsatCategories(body) {
        try {
            let scrap = await body.evaluate(() => {
                const categoriesNav = document.querySelectorAll('.menu-content>ul>.parent>ul>li');

                const categories = []

                for (let li of categoriesNav) {
                    const anchor = li.querySelector('a');
                    const link = anchor.getAttribute('href')
                    const titleAnchor = anchor.textContent

                    const subCategoryList = li.querySelectorAll('ul.level-3>li')
                    const subCategories = []
                    for (let subLi of subCategoryList) {
                        const subAnchor = subLi.querySelector('a');
                        const subTitle = subAnchor.textContent
                        const subLink = subAnchor.getAttribute('href')

                        const subCategoryListItems = subLi.querySelectorAll('ul.level-4>li')

                        const subCategories2 = []

                        for (let sub2Li of subCategoryListItems) {
                            const sub2Anchor = sub2Li.querySelector('a');
                            const sub2Title = sub2Anchor.textContent
                            const sub2Link = sub2Anchor.getAttribute('href')
                            subCategories2.push({ title: sub2Title, link: sub2Link })
                        }
                        subCategories.push({ title: subTitle, link: subLink, subCategories: subCategories2 })
                    }

                    categories.push({ title: titleAnchor, link: link, subCategories })
                }
                return categories
            })
            return scrap

        } catch (error) {
            console.log(error)
        }
    },

    async findCardGroups(page, card) {
        const cardListWrapper = await page.$('div.list-productlisting');
        const cardList = await cardListWrapper.$$("div.item")
        const cardGroups = await cardList[card.index].$$('.radioBox2')

        return cardGroups
    },

    async scrapCard(page, index) {
        try {
            const productCard = await page.evaluate((index) => {
                const productListWrapper = document.querySelector('div.list-productlisting');
                const productsCardList = productListWrapper.querySelectorAll('div.item')
                const productsCard = productsCardList[index]

                const product = {}

                const productInfoWrapper = productsCard.querySelector('.name');
                const productTitleAnchor = productInfoWrapper.querySelector('a');
                product.link = productTitleAnchor.getAttribute('href');
                product.name = productTitleAnchor.textContent.trim();

                const modelWrapper = productsCard.querySelector('.model');
                const modelSpansWrapper = modelWrapper.querySelectorAll('span');

                product.mpn = modelSpansWrapper[modelSpansWrapper.length - 1].textContent.trim();

                const skuWrapper = productsCard.querySelector('.Sku');
                const skuSpansWrapper = skuWrapper.querySelectorAll('span');
                product.supplierCode = skuSpansWrapper[skuSpansWrapper.length - 1].textContent.trim();

                const priceWrapper = productsCard.querySelector('.price');
                const priceSpan = priceWrapper.querySelector('.current');

                product.wholesale = priceSpan.textContent.replace('€', '').replace(',', '').trim();

                const stockWrapper = productsCard.querySelector('.in-stock');
                product.stockLevel = stockWrapper.textContent.trim();
                return product
            }, index)

            return productCard
        } catch (error) {
            console.log(error)
        }
    },

    async scrapeProducts(browser, link, sortedBrandArray) {

        const loadImages = false;
        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(await browser, loadImages)

        try {
            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(link, { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );
            const cards = []

            const productListWrapper = await page.$('div.list-productlisting');
            const productsCardList = await productListWrapper.$$("div.item")

            const cardsNumbers = []
            for (let i = 0; i < productsCardList.length; i++) {
                cardsNumbers.push(i)
            }

            for (let numberOfCard of cardsNumbers) {
                const card = { index: numberOfCard, groups: [] }
                const productGroups = await productsCardList[numberOfCard].$$('.radioBox2')

                if (productGroups.length > 0) {
                    const productGroupsNumbers = []
                    for (let i = 0; i < productGroups.length; i++) {
                        productGroupsNumbers.push(i)
                    }

                    for (let productGroupNumber of productGroupsNumbers) {
                        const group = { index: productGroupNumber }
                        const groupLabels = await productGroups[productGroupNumber].$$('label')

                        if (groupLabels.length > 0) {
                            const productGroupsLabelsNumbers = []
                            for (let i = 0; i < groupLabels.length; i++) {
                                productGroupsLabelsNumbers.push(i)
                            }

                            group.labels = productGroupsLabelsNumbers
                        }

                        card.groups.push(group)
                    }
                }
                cards.push(card)
            }

            const products = []
            for await (let card of cards) {
                if (card.groups.length > 0) {
                    await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .sleep(strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .randomWait(500, 800))

                    let firstGroup = card.groups[0]
                    let secondGroup = card.groups[1]
                    if (firstGroup.labels.length > 0) {
                        for await (let firstGroupLabel of firstGroup.labels) {
                            await strapi
                                .plugin('import-products')
                                .service('scrapHelpers')
                                .sleep(strapi
                                    .plugin('import-products')
                                    .service('scrapHelpers')
                                    .randomWait(500, 800))
                            if (secondGroup && secondGroup.labels.length > 1) {
                                for await (let secondGroupLabel of secondGroup.labels) {
                                    await strapi
                                        .plugin('import-products')
                                        .service('scrapHelpers')
                                        .sleep(strapi
                                            .plugin('import-products')
                                            .service('scrapHelpers')
                                            .randomWait(500, 800))

                                    let cardGroups = await this.findCardGroups(page, card)
                                    const firstGroupLabels = await cardGroups[firstGroup.index].$$('label')
                                    await firstGroupLabels[firstGroupLabel].waitForSelector('.js-list-prod');
                                    const firstGroupLabelNumber = await firstGroupLabels[firstGroupLabel].$(".js-list-prod")
                                    await firstGroupLabelNumber.scrollIntoView({ behavior: 'smooth' });

                                    if (firstGroup.labels.length > 1) {
                                        await strapi
                                            .plugin('import-products')
                                            .service('scrapHelpers')
                                            .retryClick(
                                                firstGroupLabelNumber,
                                                page,
                                                10, // retry this 10 times,
                                                false
                                            );
                                    }

                                    cardGroups = await this.findCardGroups(page, card)
                                    const secondGroupLabels = await cardGroups[secondGroup.index].$$('label')

                                    await secondGroupLabels[secondGroupLabel].waitForSelector('.js-list-prod');
                                    const secondGroupLabelNumber = await secondGroupLabels[secondGroupLabel].$(".js-list-prod")
                                    await secondGroupLabelNumber.scrollIntoView({ behavior: 'smooth' });
                                    await strapi
                                        .plugin('import-products')
                                        .service('scrapHelpers')
                                        .retryClick(
                                            secondGroupLabelNumber,
                                            page,
                                            10, // retry this 10 times,
                                            false
                                        );

                                    const product = await this.scrapCard(await page, card.index)
                                    const findProduct = products.findIndex(x => x.mpn === product.mpn)
                                    if (findProduct === -1)
                                        products.push(product)
                                }
                            }
                            else {
                                const cardListWrapper = await page.$('div.list-productlisting');
                                const cardList = await cardListWrapper.$$("div.item")
                                const cardGroups = await cardList[card.index].$$('.radioBox2')
                                const firstGroupLabels = await cardGroups[firstGroup.index].$$('label')

                                await firstGroupLabels[firstGroupLabel].waitForSelector('.js-list-prod');
                                const labelNumber = await firstGroupLabels[firstGroupLabel].$(".js-list-prod")
                                if (firstGroup.labels.length > 1) {
                                    await labelNumber.scrollIntoView({ behavior: 'smooth' });
                                    await strapi
                                        .plugin('import-products')
                                        .service('scrapHelpers')
                                        .retryClick(
                                            labelNumber, 
                                            page,
                                            10, // retry this 10 times,
                                            false
                                        );
                                }
                                const product = await this.scrapCard(await page, card.index)
                                const findProduct = products.findIndex(x => x.mpn === product.mpn)
                                if (findProduct === -1)
                                    products.push(product)
                            }
                        }
                    }
                }
                else {
                    const product = await this.scrapCard(await page, card.index)
                    const findProduct = products.findIndex(x => x.mpn === product.mpn)
                    if (findProduct === -1)
                        products.push(product)
                }
            }

            return products

        } catch (error) {
            console.log(error)
        }
        finally {
            page.close()
        }
    },

    async scrapGlobalsatCategory(browser, category, subcategory, sub2category, sortedBrandArray, importRef, entry) {
        const loadImages = false;
        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(await browser, loadImages)

        try {
            let status = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(`${sub2category.link}`, { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );

            status = status.status();

            if (status !== 404) {
                const availableProductsCheck = await page.$('#headerStock');
                await availableProductsCheck.scrollIntoView({ behavior: 'smooth' });
                const isChecked = await (await availableProductsCheck.getProperty("checked")).jsonValue()

                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .sleep(strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .randomWait(1000, 2000))

                if (isChecked) {
                    availableProductsCheck.click()
                    await page.waitForNavigation()
                }

                let url = await page.url()
                const newProductList = await this.scrapeProducts(browser, url, sortedBrandArray);

                // set last page reached to false
                let lastPageReached = false;

                while (!lastPageReached) {
                    const nextPageLink = await page.$('.block a.next');
                    const href = await nextPageLink?.getProperty('href');
                    const hrefValue = await href?.jsonValue();

                    if (!hrefValue) {
                        lastPageReached = true
                    }
                    else {
                        await nextPageLink.scrollIntoView({ behavior: 'smooth' });
                        await nextPageLink.click();

                        url = await page.url()

                        await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .sleep(strapi
                                .plugin('import-products')
                                .service('scrapHelpers')
                                .randomWait(1500, 2500))

                        // call the function to scrape products on the current page
                        let products = await this.scrapeProducts(browser, url, sortedBrandArray);

                        // Eνοποιώ τους πινακες
                        newProductList.push(...products)
                    }
                }

                const products = await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .updateAndFilterScrapProducts(newProductList, category.title, subcategory.title, sub2category.title, importRef, entry)

                for (let product of products) {
                    await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .sleep(strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .randomWait(4000, 10000))

                    await this.scrapGlobalsatProduct(browser, category, subcategory, sub2category, product.link, importRef, entry)
                }
            }

        } catch (error) {
            console.error(error, importRef, entry)
        }
        finally {
            await page.close()
        }
    },

    async scrapGlobalsatProduct(browser, category, subcategory, sub2category, productLink, importRef, entry) {
        const loadImages = true;
        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(await browser, loadImages)

        try {

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(productLink, { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );

            const productPage = await page.$('div.productWrapper');

            const scrapProduct = await productPage.evaluate(() => {

                const product = {}

                product.name = document.querySelector('.w-product-name>h1').textContent.trim();

                const modelWrapper = document.querySelector('.model')
                const modelSpansWrapper = modelWrapper.querySelectorAll('span');
                product.mpn = modelSpansWrapper[modelSpansWrapper.length - 1].textContent.trim();

                const barcodeWrapper = document.querySelector('.ean')
                const barcodeSpansWrapper = barcodeWrapper.querySelectorAll('span');
                product.barcode = barcodeSpansWrapper[barcodeSpansWrapper.length - 1].textContent.trim();

                const supplierCodeWrapper = document.querySelector('.upc')
                const supplierCodeSpansWrapper = supplierCodeWrapper.querySelectorAll('span');
                product.supplierCode = supplierCodeSpansWrapper[supplierCodeSpansWrapper.length - 1].textContent.trim();

                const baseUrl = 'https://www.globalsat.gr'
                product.imagesSrc = []
                const productMainImgUrl = document.querySelector('.images a');
                product.imagesSrc.push({ url: `${baseUrl}${productMainImgUrl.getAttribute('href')}` })

                const productImgUrlsWrapper = document.querySelectorAll('.images img');
                for (let productImgUrl of productImgUrlsWrapper) {
                    let imgURL = productImgUrl.getAttribute("src")
                    product.imagesSrc.push({ url: `${baseUrl}${imgURL}` })
                }

                const productTag = document.querySelector('.in-stock');
                product.stockLevel = productTag.textContent.trim();

                switch (product.stockLevel) {
                    case 'Διαθέσιμο':
                        product.status = "InStock"
                        break;
                    case 'Αναμένεται':
                        product.status = "OutOfStock"
                        break;
                    default:
                        product.status = "OutOfStock"
                        break;
                }

                const wholesaleNode = document.querySelector("#product-price-current_unit_exl");
                const wholesaleSpansWrapper = wholesaleNode.querySelectorAll('span');
                product.wholesale = wholesaleSpansWrapper[wholesaleSpansWrapper.length - 1].textContent.replace("€", "").replace(",", "").trim();

                const retailNode = document.querySelector("#product-price-rrp-b2b");

                if (retailNode) {
                    const retailPrice = retailNode.querySelector('.b2b-price-value');
                    product.retail_price = retailPrice.textContent.replace("€", "").replace(",", "").trim();
                    const initialRetailPrice = retailNode.querySelector('.was');
                    if (initialRetailPrice)
                        product.initial_retail_price = initialRetailPrice.textContent.replace("€", "").replace(",", "").trim();
                }

                return product
            })

            const description = await page.$('#description')
            if (description) {
                scrapProduct.description = await page.$eval('#description', el => el.innerHTML);
            }
            const scrapProductAttributes = await page.evaluate(() => {
                const attributes = []
                const attributeWrapper = document.querySelector('.product-properties')
                const attributeList = attributeWrapper.querySelectorAll('ul');

                for (let attr of attributeList) {
                    const attribute = {}
                    attribute.name = attr.querySelector('.propertiesName-span').textContent
                    attribute.value = attr.querySelector('.propertiesValue-span').textContent
                    attributes.push(attribute)
                }

                return attributes
            })

            scrapProduct.prod_chars = scrapProductAttributes
            scrapProduct.supplierProductURL = productLink
            scrapProduct.entry = entry
            scrapProduct.category = category
            scrapProduct.subcategory = subcategory
            scrapProduct.sub2category = sub2category
            scrapProduct.link = page.url()

            if (scrapProduct.prod_chars) {
                if (scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("βάρος"))) {
                    if (scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("μεικτό βάρος"))) {
                        let weightChar = scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("μεικτό βάρος"))
                        if (weightChar) {
                            if (weightChar.value.toLowerCase().includes("kg")) {
                                let result = weightChar.value.toLowerCase().match(/\d{1,3}(.|,|\s)?\d{0,3}\s*kg/gmi)
                                if (result) {
                                    if (result[result.length - 1].match(/\d{1,3}(.|\s)?\d{0,3}\s*kg/gmi)) {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].replace("kg", "").replace(",", ".").trim()) * 1000
                                    }
                                    else {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].replace("kg", "").replace(".", "").replace(",", ".").trim()) * 1000
                                    }

                                }
                            }
                            else if (weightChar.value.toLowerCase().includes("gr")) {
                                let result = weightChar.value.toLowerCase().match(/\d*(.|,|\s)?\d{0,3}\s*gr/gmi)
                                if (result[result.length - 1].match(/\d*.\d{3}\s*gr/gmi)) {
                                    scrapProduct.weight = parseFloat(result[result.length - 1].replace("gr", "").replace(".", "").trim())
                                }
                                else {
                                    scrapProduct.weight = parseFloat(result[result.length - 1].replace("gr", "").replace(",", ".").trim())
                                }
                            }
                        }
                    }
                    else {
                        let weightChar = scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("βάρος"))
                        if (weightChar) {
                            if (weightChar.value.toLowerCase().includes("kg")) {
                                let result = weightChar.value.toLowerCase().match(/\d{1,3}(.|,|\s)?\d{0,3}\s*kg/gmi)
                                if (result) {
                                    if (result[result.length - 1].match(/\d{1,3}(.|\s)?\d{0,3}\s*kg/gmi)) {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].replace("kg", "").replace(",", ".").trim()) * 1000
                                    }
                                    else {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].replace("kg", "").replace(".", "").replace(",", ".").trim()) * 1000
                                    }

                                }
                            }
                            else if (weightChar.value.toLowerCase().includes("gr")) {
                                let result = weightChar.value.toLowerCase().match(/\d*(.|,|\s)?\d{0,3}\s*gr/gmi)
                                if (result[result.length - 1].match(/\d*.\d{3}\s*gr/gmi)) {
                                    scrapProduct.weight = parseFloat(result[result.length - 1].replace("gr", "").replace(".", "").trim())
                                }
                                else {
                                    scrapProduct.weight = parseFloat(result[result.length - 1].replace("gr", "").replace(",", ".").trim())
                                }
                            }
                        }

                        let specsChar = scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("specs"))
                        if (specsChar) {
                            if (specsChar.value.toLowerCase().includes("βάρος") || specsChar.value.toLowerCase().includes("weight")) {
                                let result = specsChar.value.toLowerCase().match(/(βάρος|weight)\s?:\s?\d+(.)?\d+\s?gr?/gmi)
                                if (result) {
                                    if (result[result.length - 1].match(/\d+.?\d+/gmi)) {
                                        scrapProduct.weight = parseFloat(result[result.length - 1].match(/\d+.?\d+/gmi)[0])
                                    }
                                }
                            }
                        }
                    }
                }
            }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .importScrappedProduct(scrapProduct, importRef)

        } catch (error) {
            console.error(error)
        }
        finally {
            await page.close()
        }
    },
});
