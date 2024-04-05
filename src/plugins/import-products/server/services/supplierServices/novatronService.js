'use strict';

module.exports = ({ strapi }) => ({
    async parseNovatron({ entry }) {
        try {

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

                let response = await this.scrapNovatronCategories(importRef, entry);

                if (response && response.message === "error") {
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
        } catch (error) {
            console.log(error)
        }
    },

    async loginNovatron(page, supplier) {
        const bodyHandle = await page.$('body');
        const formHandle = await bodyHandle.$('form');

        const username = await formHandle.$('#Email');
        const password = await formHandle.$('#Password');
        const button = await formHandle.$('button');
        await username.type(process.env.NOVARTONSEC_USERNAME, {
            delay: strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .randomWait(300, 700)
        })
        await password.type(process.env.NOVARTONSEC_PASSWORD, {
            delay: strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .randomWait(300, 700)
        })
        await Promise.all([
            await button.click(),
            await page.waitForNavigation()
        ])
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
    },

    async scrapNovatronCategories(importRef, entry) {

        const browser = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createBrowser()

        const loadImages = false;
        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(await browser, loadImages)

        try {
            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .loadCookies(entry.name, await page)

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto('https://novatronsec.com/', { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );

            const pageUrl = page.url();

            if (pageUrl === "https://novatronsec.com/Account/Login?ReturnUrl=%2F") {
                page = await this.loginNovatron(page, entry.name)

            }

            const navList = await page.$("ul.navbar-nav")
            let scrapCategories = await navList.evaluate(() => {
                const navListElements = document.querySelectorAll("li.nav-item")
                let liElements = navListElements.length

                const categories = []
                for (let li of navListElements) {

                    let category = {}
                    let categoryAnchor = li.querySelector("a");
                    let categoryTitle = categoryAnchor.textContent;
                    category.title = categoryTitle.trim();

                    let subCategoryList = li.querySelectorAll("a.dropdown-item")

                    const subCategories = []
                    for (let sub of subCategoryList) {
                        const subCategory = {}
                        subCategory.title = sub.textContent.substring(0, sub.textContent.lastIndexOf("(")).trim()
                        subCategory.link = sub.getAttribute("href")
                        subCategories.push(subCategory)
                    }

                    category.subCategories = subCategories;

                    categories.push(category)
                }
                return categories
            });

            let newCategories = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .filterCategories(scrapCategories, importRef)

            await this.scrapNovatronCategory(browser, newCategories, importRef, entry)

        } catch (error) {
            return { "message": "error" }
        }
        finally {
            await browser.close();
        }
    },

    async scrapNovatronCategory(browser, novatronCategories, importRef, entry) {
        const loadImages = false;

        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(await browser, loadImages)

        try {
            for (let cat of novatronCategories) {
                for (let sub of cat.subCategories) {
                    await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .sleep(strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .randomWait(4000, 10000))

                    await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .retry(
                            () => page.goto(`https://novatronsec.com${sub.link}?top=all&stock=1`, { waitUntil: "networkidle0" }),
                            10, // retry this 10 times,
                            false
                        );

                    const bodyHandle = await page.$("body");

                    let scrap = await bodyHandle.evaluate(() => {
                        const productsGrid = document.querySelector(".products-grid");
                        const productsRow = productsGrid.querySelector(".row");
                        const productsList = productsRow.querySelectorAll(".product");

                        let products = []
                        for (let prod of productsList) {
                            const product = {}
                            const anchor = prod.querySelector("a");
                            let productLink = anchor.getAttribute("href");
                            product.link = `https://novatronsec.com${productLink}`

                            const productImageBadge = anchor.querySelector("img.product-image-badge");
                            if (productImageBadge)
                                product.in_offer = productImageBadge.getAttribute("href") === '/Content/img/prosfora-R.png'

                            const productBody = prod.querySelector('.product-body')
                            const productTitleAnchor = productBody.querySelector('.product-title>a')
                            product.name = productTitleAnchor.textContent.trim()
                            product.short_description = productBody.querySelector('.mini-description').textContent.trim()
                            product.brand_name = product.name.split("-")[0].trim()
                            product.wholesale = productBody.querySelector('.product-price>div>div>span').textContent.replace('€', '').replace('.', '').replace(',', '.').trim()
                            product.supplierCode = productBody.querySelector('.product-code').textContent.trim()
                            const stockLevelWrapper = productBody.querySelector('div>p>img');
                            const productStockImg = stockLevelWrapper.getAttribute('src')
                            const stockLevelImg = productStockImg.split('/')[4].split('.')[0].split('-')[1].trim()

                            switch (stockLevelImg) {
                                case '3':
                                    product.stockLevel = "InStock"
                                    break;
                                case '2':
                                    product.stockLevel = "MediumStock"
                                    break;
                                case '1':
                                    product.stockLevel = "LowStock"
                                    break;
                                default:
                                    product.stockLevel = "OutOfStock"
                                    break;
                            }

                            if (product.brand_name.toLowerCase().includes('dahua'))
                                continue

                            products.push(product)
                        }
                        return products
                    })

                    const products = await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .updateAndFilterScrapProducts(scrap, cat.title, sub.title, null, importRef, entry)

                    for (let prod of products) {
                        await strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .sleep(strapi
                                .plugin('import-products')
                                .service('scrapHelpers')
                                .randomWait(4000, 10000))
                        await this.scrapNovatronProduct(browser, prod.link, cat.title, sub.title, importRef, entry)
                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
        finally {
            page.close()
        }
    },

    async scrapNovatronProduct(browser, productLink, category, subcategory,
        importRef, entry) {

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

            let productUrl = page.url();
            const urlArray = productUrl.split("/")
            const productID = urlArray[urlArray.length - 1].split("?")[0]

            const bodyHandle = await page.$("body");

            let scrapProduct = await bodyHandle.evaluate(() => {
                const product = {}

                const productDetailsSection = document.querySelector("section.product-details");
                const productImageWrapper = productDetailsSection.querySelector(".owl-thumbs");
                const productImages = productImageWrapper.querySelectorAll("img");
                product.imagesSrc = []
                for (let imgSrc of productImages) {
                    product.imagesSrc.push({ url: `https://novatronsec.com${imgSrc.getAttribute('src')}` })
                }

                const inOfferImage = productDetailsSection.querySelector(".active .product-image-badge");
                if (inOfferImage) {
                    product.in_offer = inOfferImage.getAttribute('src') === '/Content/img/prosfora-R.png'
                }
                else {
                    product.in_offer = false
                }
                product.name = productDetailsSection.querySelector("h1.product-title").textContent.trim();
                if (product.name.startsWith('TP-LINK')) {
                    product.brand_name = 'TP-LINK'
                }
                else {
                    product.brand_name = product.name.split("-")[0].trim()
                }
                product.short_description = productDetailsSection.querySelector("p.mini-description").textContent.trim();
                const productPriceWrapper = productDetailsSection.querySelector("div.product-price");
                product.wholesale = productPriceWrapper.querySelector("span").textContent.replace('€', '').replace(',', '.').trim();

                const productPriceRetailWrapper = productDetailsSection.querySelector("div.product-price-retail");
                product.retail_price = productPriceRetailWrapper.querySelector("span").textContent.replace('€', '').replace(',', '.').trim();

                const productRow = productDetailsSection.querySelector("div.row");
                const productStock = productRow.querySelector("div>span>img");
                const stockImg = productStock.getAttribute('src').trim();
                let stockLevelImg = stockImg.substring(stockImg.length - 5, stockImg.length - 4);

                switch (stockLevelImg) {
                    case '3':
                        product.stockLevel = "InStock"
                        product.status = "InStock"
                        break;
                    case '2':
                        product.stockLevel = "MediumStock"
                        product.status = "MediumStock"
                        break;
                    case '1':
                        product.stockLevel = "LowStock"
                        product.status = "LowStock"
                        break;
                    default:
                        product.stockLevel = "OutOfStock"
                        product.status = "OutOfStock"
                        break;
                }

                const productDetailsExtraSection = document.querySelector("section.product-details-extra");

                const productDescriptionWrapper = productDetailsExtraSection.querySelector("#description");

                if (productDescriptionWrapper) {
                    const additionalFilesWrapper = productDescriptionWrapper.querySelector(".additional-links a")
                    if (additionalFilesWrapper) {
                        product.additional_files = { url: additionalFilesWrapper.getAttribute("href") }
                    }

                    product.description = productDescriptionWrapper.querySelector("div:not(.additional-links)").innerHTML.trim();
                }
                const productFovSection = document.querySelector("section.fov");
                if (productFovSection) {
                    let productFovContainer = productFovSection.querySelector(".container");
                    let productFovTitle = productFovContainer.querySelector("h4").textContent;
                    let productFovTable = productFovContainer.querySelector("table").innerHTML;

                    product.description += productFovTitle
                    product.description += productFovTable
                }

                const productAdditionalInfoWrapper = productDetailsExtraSection.querySelector("#additional-information");

                product.prod_chars = []

                if (productAdditionalInfoWrapper) {
                    let productAdditionalInfoTables = productAdditionalInfoWrapper.querySelectorAll("tbody");


                    for (let tbl of productAdditionalInfoTables) {
                        let tableRows = tbl.querySelectorAll("tr");

                        for (let row of tableRows) {
                            product.prod_chars.push({
                                name: row.querySelector("th").textContent.trim(),
                                value: row.querySelector("td").textContent.trim(),
                            })
                        }
                    }
                }

                product.relativeProducts = []
                const productRelativeWrapper = document.querySelector("section.relative-products");

                if (productRelativeWrapper) {
                    const productRelativeRow = productRelativeWrapper.querySelectorAll("div.product");
                    for (let prod of productRelativeRow) {
                        let relativeProductURL = prod.querySelector("a").getAttribute("href").trim();
                        const urlArray = relativeProductURL.split("/")
                        let relativeProductID = urlArray[urlArray.length - 1]

                        product.relativeProducts.push({
                            mpn: relativeProductID,
                        })
                    }
                }

                return product
            })

            scrapProduct.mpn = productID.toString()
            scrapProduct.supplierCode = productID.toString()
            scrapProduct.link = productUrl
            scrapProduct.entry = entry
            scrapProduct.category = { title: category }
            scrapProduct.subcategory = { title: subcategory }
            scrapProduct.sub2category = { title: null }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .importScrappedProduct(scrapProduct, importRef)

        } catch (error) { 
            console.log(error)
        }
        finally {
            page.close()
        }
    },
});
