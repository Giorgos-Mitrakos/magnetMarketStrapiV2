'use strict';

const fs = require('fs');
const { platform } = require('os');

module.exports = ({ strapi }) => ({

    convertPrice(price) {
        return strapi.plugin('platforms-scraper')
            .service('helpers')
            .convertPrice(price);
    },

    async getSkroutzSub3categories(browser, link) {
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

            const categoryWrapper = await page.$('.main-sidebar .categories-container>div.category-item.selected');
            const subcategoryWrapper = await categoryWrapper.$('div.dropdown-container');
            const subcategory2Wrapper = await subcategoryWrapper.$('div.dropdown-container');
            const subcategory3Wrapper = await subcategory2Wrapper.$('div.dropdown-container');
            const subcategoriesList = []

            if (subcategory3Wrapper) {
                await categoryWrapper.scrollIntoView({ behavior: 'smooth' });
                let scrapsubcategories = await subcategory3Wrapper.$$('a.dropdown-item')

                for await (let subcategory of scrapsubcategories) {

                    const href = await subcategory.getProperty('href');
                    const subcategoryLink = await href.jsonValue();
                    const title = await subcategory.getProperty('title');
                    const subcategoryTitle = await title.jsonValue();
                    const numberOfProductsSpan = await subcategory.$('span.category-count')
                    const numberOfProductsFull = await (await numberOfProductsSpan.getProperty('textContent')).jsonValue()
                    let numberOfProducts = numberOfProductsFull.replace('(', '').replace(')', '').trim()
                    if (numberOfProducts.includes('K'))
                        numberOfProducts = parseFloat(numberOfProducts.replace('K', '').trim()) * 1000

                    subcategoriesList.push({ title: subcategoryTitle, link: subcategoryLink, numberOfProducts: numberOfProducts })
                }
            }
            return subcategoriesList

        } catch (error) {
            console.log(error)
        }
        finally {
            await page.close()
        }
    },

    async getSkroutzSub2categories(browser, link) {
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

            const categoryWrapper = await page.$('.main-sidebar .categories-container>div.category-item.selected');
            const subcategoryWrapper = await categoryWrapper.$('div.dropdown-container');
            const subcategory2Wrapper = await subcategoryWrapper.$('div.dropdown-container');
            const subcategoriesList = []

            if (subcategory2Wrapper) {
                await categoryWrapper.scrollIntoView({ behavior: 'smooth' });
                let scrapsubcategories = await subcategory2Wrapper.$$('a.dropdown-item')

                for await (let subcategory of scrapsubcategories) {

                    const href = await subcategory.getProperty('href');
                    const subcategoryLink = await href.jsonValue();
                    const title = await subcategory.getProperty('title');
                    const subcategoryTitle = await title.jsonValue();

                    const sub3categories = await this.getSkroutzSub3categories(browser, subcategoryLink)
                    if (sub3categories.length > 0) {
                        subcategoriesList.push({ title: subcategoryTitle, link: subcategoryLink, subcategories: sub3categories })
                    }
                    else {
                        const numberOfProductsSpan = await subcategory.$('span.category-count')
                        const numberOfProductsFull = await (await numberOfProductsSpan.getProperty('textContent')).jsonValue()
                        let numberOfProducts = numberOfProductsFull.replace('(', '').replace(')', '').trim()
                        if (numberOfProducts.includes('K'))
                            numberOfProducts = parseFloat(numberOfProducts.replace('K', '').trim()) * 1000

                        subcategoriesList.push({ title: subcategoryTitle, link: subcategoryLink, numberOfProducts: numberOfProducts })
                    }
                }
            }
            return subcategoriesList

        } catch (error) {
            console.log(error)
        }
        finally {
            await page.close()
        }
    },

    async getSkroutzSubcategories(browser, link) {
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

            const categoryWrapper = await page.$('.main-sidebar .categories-container>div.category-item.selected');
            const subcategoryWrapper = await categoryWrapper.$('.dropdown-container');
            const subcategoriesList = []

            if (subcategoryWrapper) {
                await categoryWrapper.scrollIntoView({ behavior: 'smooth' });
                let scrapsubcategories = await subcategoryWrapper.$$('a.dropdown-item')

                for await (let subcategory of scrapsubcategories) {
                    await strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .sleep(strapi
                            .plugin('import-products')
                            .service('scrapHelpers')
                            .randomWait(1500, 4500))

                    const href = await subcategory.getProperty('href');
                    const subcategoryLink = await href.jsonValue();
                    const title = await subcategory.getProperty('title');
                    const subcategoryTitle = await title.jsonValue();

                    const sub2categories = await this.getSkroutzSub2categories(browser, subcategoryLink)
                    if (sub2categories.length > 0) {
                        subcategoriesList.push({ title: subcategoryTitle, link: subcategoryLink, subcategories: sub2categories })
                    }
                    else {
                        const numberOfProductsSpan = await subcategory.$('span.category-count')
                        const numberOfProductsFull = await (await numberOfProductsSpan.getProperty('textContent')).jsonValue()
                        let numberOfProducts = numberOfProductsFull.replace('(', '').replace(')', '').trim()
                        if (numberOfProducts.includes('K'))
                            numberOfProducts = parseFloat(numberOfProducts.replace('K', '').trim()) * 1000

                        subcategoriesList.push({ title: subcategoryTitle, link: subcategoryLink, numberOfProducts: numberOfProducts })
                    }
                }
            }
            return subcategoriesList

        } catch (error) {
            console.log(error)
        }
        finally {
            await page.close()
        }
    },

    async getSkroutzCategories({ platform }) {
        const browser = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createBrowser()
        try {

            const categoriesList = []
            const { name, entryURL } = platform

            const loadImages = false;
            let page = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .createPage(await browser, loadImages)

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(entryURL, { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );

            const bodyHandle = await page.$('body');
            const acceptCookiesButton = await bodyHandle.$("div.actions #accept-all")
            if (acceptCookiesButton) {
                await acceptCookiesButton.click()
                await page.waitForNavigation()
            }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(1500, 4500))

            let categoriesContainer = await page.$('.main-sidebar .categories-container');
            await categoriesContainer.scrollIntoView({ behavior: 'smooth' });
            let scrapCategories = await categoriesContainer.$$('.category-item')


            for await (let category of scrapCategories) {
                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .sleep(strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .randomWait(1500, 4500))

                const categoryAnchor = await category.$('a');
                const href = await categoryAnchor.getProperty('href');
                const categoryLink = await href.jsonValue();
                const title = await categoryAnchor.getProperty('title');
                const categoryTitle = await title.jsonValue();

                const categoryObj = { title: categoryTitle, link: categoryLink }

                const subcategories = await this.getSkroutzSubcategories(browser, categoryLink)
                categoryObj.subcategories = subcategories

                categoriesList.push(categoryObj)
            }

            const categories = []

            // let myJsonString = JSON.stringify(categoriesList);

            // fs.writeFile("./public/tmp/categoriesList.json", myJsonString, (error) => {
            //     // throwing the error
            //     // in case of a writing problem
            //     if (error) {
            //       // logging the error
            //       console.error(error);

            //       throw error;
            //     }

            //     console.log("data.json written correctly");
            //   });

            for (let category of categoriesList) {
                if (category.subcategories && category.subcategories.length > 0) {
                    for (let sub of category.subcategories) {
                        if (sub.subcategories && sub.subcategories.length > 0) {
                            for (let sub2 of sub.subcategories) {
                                if (sub2.subcategories && sub2.subcategories.length > 0) {
                                    for (let sub3 of sub2.subcategories) {
                                        categories.push(sub3)
                                    }
                                }
                                else {
                                    categories.push(sub2)
                                }
                            }
                        }
                        else {
                            categories.push(sub)
                        }
                    }
                }
                else {
                    categories.push(category)
                }
            }

            await strapi
                .plugin('platform-scrapper')
                .service('categoryHelpers')
                .updateCategories(platform, categories)

        } catch (error) {
            console.log(error)
        }
        finally {
            await browser.close();
        }
    },

    async scrapSkroutzCategory(browser, categoryLink, categoryTitle) {
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
                    () => page.goto(categoryLink, { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );

            const bodyHandle = await page.$('body');
            const acceptCookiesButton = await bodyHandle.$("div.actions #accept-all")
            if (acceptCookiesButton) {
                await acceptCookiesButton.click()
                await page.waitForNavigation()
            }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(1500, 3500))

            const closeHelperButton = await page.$(".widget-header>button")
            if (closeHelperButton)
                await closeHelperButton.click()

            let productsList = []

            let scrapProductsList = await page.$eval('body', (element) => {
                const productsAnchorList = element.querySelectorAll("#sku-list>li>a")

                const products = []
                for (let anchor of productsAnchorList) {
                    const product = {}
                    product.title = anchor.getAttribute("title").trim()
                    const productLink = anchor.getAttribute("href").split("?")[0]
                    product.link = `https://www.skroutz.gr${productLink}`

                    products.push(product)

                }
                return products;
            })

            productsList = productsList.concat(scrapProductsList)

            await page.$eval('.list-controls', (element) => {
                element.scrollIntoView({ behavior: 'smooth' })
            });

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(1500, 3500))

            // const nextArrow = await page.$(".list-controls  a>i.next-arrow")
            while (await page.$(".list-controls  a>i.next-arrow")) {
                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .sleep(strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .randomWait(1500, 3500))

                const nextPageButton = await page.$(".list-controls  a>i.next-arrow")

                await nextPageButton.click();
                await page.waitForNavigation()

                let scrapProductsList = await page.$eval('body', (element) => {
                    const productsAnchorList = element.querySelectorAll("#sku-list>li>a")
                    // let liElements = navList.length

                    const products = []
                    for (let anchor of productsAnchorList) {
                        const product = {}
                        product.title = anchor.getAttribute("title").trim()
                        const productLink = anchor.getAttribute("href").split("?")[0]
                        product.link = `https://www.skroutz.gr${productLink}`

                        products.push(product)

                    }
                    return products;
                })

                productsList = productsList.concat(scrapProductsList)

            }

            for (let product of productsList) {
                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .sleep(strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .randomWait(2000, 6000))

                const entry = await strapi
                    .plugin('platform-scrapper')
                    .service('helpers')
                    .findIfScrapedProductExists("Skroutz", product)

                const scrapInterval = await strapi
                    .plugin('platform-scrapper')
                    .service('helpers')
                    .findPlatform("Skroutz")


                let currentDate = new Date()
                currentDate.setDate(currentDate.getDate() - scrapInterval)

                // if (!entry
                //     ||
                //     entry.platforms[0].title_in_platform === null ||
                //     entry.platforms[0].title_in_platform === '' ||
                //     entry.platforms[0].code_in_platform === null ||
                //     entry.platforms[0].code_in_platform === '' ||
                //     entry.platforms[0].averageRating === '' ||
                //     entry.platforms[0].averageRating === null ||
                //     entry.platforms[0].numberOfReviews === null ||
                //     entry.platforms[0].numberOfReviews === '' ||
                //     entry.platforms[0].shops.length === 0 ||
                //     new Date(entry.platforms[0].last_scrap) < currentDate
                // ) {

                    await this.scrapSkroutzProduct(browser, product.link, categoryTitle)
                // }
            }
        } catch (error) {
            console.log(error)
        }
        finally {
            await page.close()
        }
    },

    async scrapSkroutzProduct(browser, productLink, categoryTitle) {
        const loadImages = false;
        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(await browser, loadImages)
        try {
            const product = {}
            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto(productLink, { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );

            const bodyHandle = await page.$('body');

            const AcceptCookiesButton = await bodyHandle.$('#accept-essential')
            if (AcceptCookiesButton) {
                AcceptCookiesButton.click()
            }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(800, 1500))

            let scrapProductPage = await page.$eval('.details', (element) => {
                product = {}

                const title = element.querySelector(".page-title") ? element.querySelector(".page-title").textContent.trim() : '';
                const productCode = element.querySelector(".page-title") ? element.querySelector(".page-title>.sku-code").textContent.trim() : '';

                product.title = title ? title.replace(productCode, '').trim() : null
                product.code = productCode ? productCode.split(':')[1].trim() : null
                product.numberOfReviews = element.querySelector(".reviews-count>a") ? element.querySelector(".reviews-count>a").textContent.replace(')', '').replace('(', '').trim() : 0;
                product.averageRating = element.querySelector(".user-actions .rating-wrapper>span") ? element.querySelector(".user-actions .rating-wrapper>span").textContent.trim() : 0;

                return product
            })

            product.title = scrapProductPage.title
            product.code = scrapProductPage.code
            product.category = categoryTitle
            product.link = productLink

            product.statistics = {
                numberOfReviews: scrapProductPage.numberOfReviews,
                averageRating: scrapProductPage.averageRating
            }

            const offeringCard = await page.$('.offering-card');
            if (offeringCard) {
                await bodyHandle.$eval('.offering-card', (element) => {
                    element.scrollIntoView({ behavior: 'smooth' })
                });
            }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(800, 1500))

            const crossSell = await page.$('#cross-sell');
            if (crossSell) {
                await bodyHandle.$eval('#cross-sell', (element) => {
                    element.scrollIntoView({ behavior: 'smooth' })
                });
            }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(800, 1500))

            const similar = await page.$('#similar');
            if (similar) {
                await bodyHandle.$eval('#similar', (element) => {
                    element.scrollIntoView({ behavior: 'smooth' })
                });
            }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(800, 1500))

            const skuActions = await page.$('.sku-actions-wrapper');
            if (skuActions) {
                await bodyHandle.$eval('.sku-actions-wrapper', (element) => {
                    element.scrollIntoView({ behavior: 'smooth' })
                });

                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .sleep(strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .randomWait(2000, 4000))
            }

            const shopsList = await page.$$('#prices>li')
            const shops = []

            const proposedShopWrapper = await page.$('div.sold-by-info>p>button');

            if (proposedShopWrapper) {
                product.proposedShop = await page.$eval('div.sold-by-info>p>button', (element) => {
                    return element.textContent.trim()
                })
            }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(800, 1500))

            for (let shop of shopsList) {
                const shopScrap = {}
                await shop.$eval('.shop', (element) => {
                    element.scrollIntoView({ behavior: 'smooth' })
                });
                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .sleep(strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .randomWait(600, 1200))

                try {
                    await shop.waitForSelector('.price-content');
                } catch (error) {
                    console.log("Error in price-content")
                }

                const shopName = await shop.$eval('.shop', (element) => {
                    let shopInfo = {}
                    let shopNameElement = element.querySelector('.shop-name')
                    if (shopNameElement) { shopInfo.name = shopNameElement.textContent.trim() }
                    let isProShop = element.querySelector('.pro-badge-btn')
                    if (isProShop) { shopInfo.isPro = true }
                    else { shopInfo.isPro = false }

                    return shopInfo
                });

                shopScrap.name = shopName.name
                shopScrap.isProShop = shopName.isPro

                const shopProductDescription = await shop.$eval('.description>.item', (element) => {
                    const productDescription = {}
                    let shopNameElement = element.querySelector('h3>a')
                    productDescription.name = shopNameElement.textContent.trim()
                    let shopAvailabilityElement = element.querySelector('p.availability>span')
                    if (shopAvailabilityElement)
                        productDescription.availability = shopAvailabilityElement.textContent.trim()
                    let shopExpressElement = element.querySelector('.ndd-wrapper')
                    if (shopExpressElement) {
                        productDescription.availability = 'Express παράδοση'
                        productDescription.isExpressDelivery = true
                    } else { productDescription.isExpressDelivery = false }

                    return productDescription
                });

                shopScrap.productDescriptionName = shopProductDescription.name
                shopScrap.productAvailability = shopProductDescription.availability
                shopScrap.isExpressDelivery = shopProductDescription.isExpressDelivery

                const shopPrices = await shop.$eval('.price-content', (element) => {
                    const priceContent = {}
                    const priceElement = element.querySelector('.dominant-price')
                    priceContent.price = priceElement.textContent.replace('€', '').trim()

                    const ecommerceWrapper = element.querySelector('.price-content-ecommerce')
                    if (ecommerceWrapper) {
                        const ecommerceCosts = {}
                        const ecommerceCostsElement = ecommerceWrapper.querySelectorAll('.extra-cost')
                        for (let costs of ecommerceCostsElement) {
                            const name = costs.querySelector('span').textContent.trim()
                            const value = costs.querySelector('em').textContent.replace('€', '').replace('+', '').trim()

                            if (name === 'Μεταφορικά') {
                                ecommerceCosts.shipping = value
                            }
                            else if (name === 'Σύνολο') {
                                ecommerceCosts.total = value
                            }
                        }

                        priceContent.marketplace = ecommerceCosts
                    }

                    const shopWrapper = element.querySelector('.price-content-shop')
                    if (shopWrapper) {
                        const shopCosts = {}
                        const shopCostsElement = shopWrapper.querySelectorAll('.extra-cost')
                        for (let costs of shopCostsElement) {
                            const name = costs.querySelector('span')
                            const value = costs.querySelector('em').textContent.replace('€', '').replace('+', '').trim()

                            if (name.textContent.trim() === 'Μεταφορικά') {
                                const aproxShipping = costs.querySelector('span>em')
                                if (aproxShipping) {
                                    shopCosts.shipping = aproxShipping.textContent.replace('€', '').replace('+', '').trim()

                                }
                                else {
                                    shopCosts.shipping = value
                                }
                            }
                            else if (name.textContent.trim() === 'Σύνολο') {
                                shopCosts.total = value
                            }
                        }

                        priceContent.shop = shopCosts
                    }

                    return priceContent
                });

                shopScrap.shopPrices = shopPrices
                shops.push(shopScrap)
            }

            product.shops = shops
            product.statistics.numberOfShops = shops.length

            const marketplacemarketplaceShops = product.shops.filter(x => x.shopPrices.marketplace !== undefined)
            product.statistics.numberOfShopsInMarketplace = marketplacemarketplaceShops.length

            const entry = await strapi
                .plugin('platform-scrapper')
                .service('helpers')
                .updateScrapedProduct("Skroutz", product)


        } catch (error) {
            console.log(error)
        }
        finally {
            await page.close()
        }
    },

});
