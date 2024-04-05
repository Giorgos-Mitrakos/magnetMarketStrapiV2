'use strict';

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
                    .service('helpers')
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

            const loginForm = await body.$('.form')

            const username = await loginForm.$('#UserName');
            const password = await loginForm.$('#Password');
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

            const submitLogin = await loginForm.$('button')

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
                    () => page.goto('https://b2b.globalsat.gr/', { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );
            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(1500)

            const pageUrl = page.url();

            if (pageUrl === "https://b2b.globalsat.gr/account/login/") {
                await this.loginGlobalsat(page, entry.name)
            }

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
                        await this.scrapGlobalsatCategory(page, category, subCategory, sub2Category, sortedBrandArray, importRef, entry)
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
                const categoriesNav = document.querySelector('nav.main_nav');
                const productsNav = categoriesNav.querySelector('li.first_li');
                const productsNavList = productsNav.querySelector('ul.level2');
                const productsNavList1 = productsNavList.querySelectorAll('li.level2_1');

                const categories = []


                for (let li of productsNavList1) {
                    const titleSpan = li.querySelector('span');
                    const titleAnchor = titleSpan.querySelector('a').textContent
                    const linkAnchor = titleSpan.querySelector('a').getAttribute('href')

                    const megaMenuInner = li.querySelector('div.megamenu_inner')
                    const subCategoryList = megaMenuInner.querySelectorAll('ul.level3')

                    const subCategories = []
                    for (let subLi of subCategoryList) {
                        const titleSpan = subLi.querySelector('li');
                        const titleAnchor = titleSpan.querySelector('a').textContent
                        const linkAnchor = titleSpan.querySelector('a').getAttribute('href')

                        const subCategoryList = subLi.querySelector('ul.level4')
                        const subCategoryListItems = subCategoryList.querySelectorAll('li')

                        const subCategories2 = []

                        for (let sub2Li of subCategoryListItems) {
                            const titleAnchor = sub2Li.querySelector('a').textContent
                            const titleLink = sub2Li.querySelector('a').getAttribute('href')
                            subCategories2.push({ title: titleAnchor, link: titleLink })
                        }
                        subCategories.push({ title: titleAnchor, link: linkAnchor, subCategories: subCategories2 })
                    }

                    categories.push({ title: titleAnchor, link: linkAnchor, subCategories })
                }

                return categories
            })

            return scrap

        } catch (error) {
            console.log(error)
        }
    },

    async scrapGlobalsatCategory(page, category, subcategory, sub2category, sortedBrandArray, importRef, entry) {
        try {

            const navigationParams = sub2category.link === "https://b2b.globalsat.gr/kiniti-tilefonia/a_axesouar-prostasias/b_thikes-gia-smartphones/" ?
                { waitUntil: "networkidle0", timeout: 0 } :
                { waitUntil: "networkidle0" }

            let status = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(`${sub2category.link}?wbavlb=Διαθέσιμο&sz=3`, navigationParams),
                    10, // retry this 10 times,
                    false
                );

            status = status.status();

            if (status !== 404) {
                const listContainer = await page.$('div.list_container');

                // const productLinksList = []

                const productList = await listContainer.evaluate(() => {
                    const productsList = document.querySelectorAll(".product_box")

                    let products = []
                    for (let prod of productsList) {
                        const product = {}

                        const productInfoWrapper = prod.querySelector('.product_info');
                        const productTitleAnchor = productInfoWrapper.querySelector('h2 a');
                        product.link = productTitleAnchor.getAttribute('href');
                        product.name = productTitleAnchor.textContent.trim();
                        product.supplierCode = productInfoWrapper.querySelector('.product_code span').textContent.trim();

                        const productPriceWrapper = productInfoWrapper.querySelector('.price_row');
                        const productPriceItems = productPriceWrapper.querySelectorAll('.price-item');

                        for (let item of productPriceItems) {
                            const txtPrice = item.querySelector('.txt').textContent.trim()
                            if (txtPrice === 'Τλ:') {
                                product.initial_retail_price = item.querySelector('.initial_price')?.textContent.replace('€', '').replace('.', '').replace(',', '.').trim()

                                const sale_prices = item.querySelectorAll('.price')
                                if (sale_prices.length === 1) {
                                    product.retail_price = item.querySelector('.price').textContent.replace('€', '').replace('.', '').replace(',', '.').trim()
                                }
                                else {
                                    product.retail_price = sale_prices[1].textContent.replace('€', '').replace('.', '').replace(',', '.').trim();
                                }
                            }
                            else {
                                product.wholesale = item.querySelector('.price').textContent.replace('€', '').replace(".", "").replace(',', '.').trim()
                            }
                        }

                        const productAvailability = prod.querySelector('.tag_line span').textContent.trim();
                        product.stockLevel = productAvailability

                        products.push(product)
                    }
                    return products
                })

                productList.forEach(prod => {
                    const brandFound = sortedBrandArray.find(x => prod.name?.toLowerCase().startsWith(x.name.toLowerCase()))

                    if (brandFound) {
                        prod.brand = brandFound.name
                    }
                })

                const products = await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .updateAndFilterScrapProducts(productList, category.title, subcategory.title, sub2category.title, importRef, entry)

                for (let product of products) {
                    await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .sleep(strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .randomWait(4000, 10000))

                    await this.scrapGlobalsatProduct(page, category, subcategory, sub2category, product.link, importRef, entry)
                }
            }

        } catch (error) {
            console.error(error, importRef, entry)
        }
    },

    async scrapGlobalsatProduct(page, category, subcategory, sub2category, productLink, importRef, entry, auth) {
        try {

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(productLink, { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );

            const productPage = await page.$('section.product_page');

            const scrapProduct = await productPage.evaluate(() => {

                const product = {}

                const productContainer = document.querySelector('div.product_container');
                product.name = productContainer.querySelector('div.main_prod_title h1').textContent;
                const productCodesWrapper = productContainer.querySelectorAll('div.product_code>span');

                for (let code of productCodesWrapper) {

                    let codeSpan = code.querySelector("span")
                    const indexOfSpan = code.innerHTML.indexOf("</span>")
                    if (codeSpan.textContent.trim() === "ΚΩΔΙΚΟΣ ΠΡΟΪΟΝΤΟΣ:") {
                        product.supplierCode = code.innerHTML.slice(indexOfSpan + 7).trim()
                    }
                    else if (codeSpan.textContent.trim() === "BarCode:") {
                        product.barcode = code.innerHTML.slice(indexOfSpan + 7).trim()
                    }
                    else if (codeSpan.textContent.trim() === "PartNumber:") {
                        product.mpn = code.innerHTML.slice(indexOfSpan + 7).trim()
                    }
                }

                const productImgUrlsWrapper = productContainer.querySelectorAll('div.main_slider_thumbs figure>img');

                product.imagesSrc = []
                for (let productImgUrl of productImgUrlsWrapper) {
                    let imgURL = productImgUrl.getAttribute("src")
                    product.imagesSrc.push({ url: imgURL })
                }

                const productInfo = productContainer.querySelector('div.product_info');
                const productTag = productInfo.querySelector('div.tag_line');
                product.stockLevel = productTag.querySelector('span').textContent.trim();

                switch (product.stockLevel) {
                    case 'Διαθέσιμο':
                        product.status = "InStock"
                        break;
                    case 'Αναμένεται Σύντομα':
                        product.status = "OutOfStock"
                        break;
                    default:
                        product.status = "OutOfStock"
                        break;
                }

                const suggestedPriceWrapper = productInfo.querySelector("div.trade");
                const suggestedPrices = suggestedPriceWrapper.querySelectorAll("span.price");

                if (suggestedPrices.length > 1) {
                    for (let price of suggestedPrices) {
                        if (price.getAttribute("class") === "price initial_price") {
                            product.initial_retail_price = price.textContent.replace("€", "").replace('.', '').replace(",", ".").trim();
                        }
                        else {
                            product.retail_price = price.textContent.replace("€", "").replace('.', '').replace(",", ".").trim();
                        }
                    }
                }
                else {
                    product.retail_price = suggestedPrices[0].textContent.replace(".", "").replace("€", "").replace('.', '').replace(",", ".").trim();
                }

                const wholesalePriceWrapper = productInfo.querySelector("div.price_row:not(.trade)");
                const wholesaleNode = wholesalePriceWrapper.querySelector("span.price").textContent;
                product.wholesale = wholesaleNode.replace("€", "").replace(".", "").replace(",", ".").trim();

                const description = productContainer.querySelector("div.main_prod_info>div");
                product.description = description.textContent.trim();

                const productCharsContainer = document.querySelector('div.product_chars');

                if (productCharsContainer) {
                    const charTable = productCharsContainer.querySelector('tbody')
                    const charRow = charTable.querySelectorAll('tr')
                    product.prod_chars = []
                    charRow.forEach(tr => {
                        const charValue = tr.querySelectorAll('td')
                        product.prod_chars.push({
                            "name": charValue[0].innerHTML.trim(),
                            "value": charValue[1].querySelector('b').innerHTML.trim()
                        })

                    });
                }

                return product
            })
            scrapProduct.supplierProductURL = productLink
            scrapProduct.entry = entry
            scrapProduct.category = category
            scrapProduct.subcategory = subcategory
            scrapProduct.sub2category = sub2category

            if (scrapProduct.prod_chars) {
                if (scrapProduct.prod_chars.find(x => x.name.toLowerCase().includes("βάρος") ||
                    x.name.toLowerCase().includes("specs"))) {
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
    },
});
