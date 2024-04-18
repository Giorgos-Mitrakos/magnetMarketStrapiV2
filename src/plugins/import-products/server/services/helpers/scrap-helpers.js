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
                executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
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
                fs.readFile(`./public/cookies/${supplier}Cookies.json`, async (err, data) => {
                    if (err)
                        console.log(err);
                    else {
                        const cookies = JSON.parse(data);
                        await page.setCookie(...cookies);
                        console.log("File readen successfully\n");
                    }
                })
            }
        } catch (error) {
            console.log(error)
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

    async updateAndFilterScrapProducts(products, category, subcategory, sub2category, importRef, entry) {
        try {
            const newProducts = []
            let stockLevelFilter = []
            for (let stock of importRef.categoryMap.stock_map) {
                stockLevelFilter.push(stock.name)
            }

            for (let product of products) {
                product.entry = entry
                product.category = { title: category }
                product.sub2category = { title: sub2category }
                product.subcategory = { title: subcategory }

                if (stockLevelFilter.includes(product.stockLevel) && product.wholesale) {

                    const checkIfEntry = await strapi.db.query('api::product.product').findOne({
                        where: {
                            supplierInfo: {
                                supplierProductId: product.supplierCode
                            }
                        },
                        populate: {
                            supplierInfo: {
                                populate: {
                                    price_progress: true,
                                }
                            },
                            brand: true,
                            related_import: true,
                            prod_chars: true,
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
                            platforms: true
                        },
                    });

                    if (checkIfEntry) {
                        const { brandId } = await strapi
                            .plugin('import-products')
                            .service('productHelpers')
                            .brandIdCheck(product.brand, product.name)

                        if (brandId) {
                            product.brand = {
                                id: brandId
                            }
                        } 

                        if ((checkIfEntry.brand && !checkIfEntry.brand.name.toLowerCase().includes("dahua")) ||
                            !checkIfEntry.brand)
                            await strapi
                                .plugin('import-products')
                                .service('importHelpers')
                                .updateEntry(checkIfEntry, product, importRef)
                    }
                    else {
                        if (!product.name.toLowerCase().includes("dahua"))
                            newProducts.push(product)
                    }
                }
            }
            return newProducts
        } catch (error) {
            console.log(error)
        }

    },

    async importScrappedProduct(product, importRef) {
        try {
            if (!product.wholesale || isNaN(product.wholesale) || product.imagesSrc.length === 0)
                return;

            // Αν δεν είναι Διαθέσιμο τότε προχώρα στο επόμενο
            const isAvailable = this.filterScrappedProducts(importRef.categoryMap, product);

            if (!isAvailable)
                return

            const { entryCheck, brandId } = await strapi
                .plugin('import-products')
                .service('productHelpers')
                .checkProductAndBrand(product.mpn, product.name, product.barcode, product.brand, product.model);

            if (product.prod_chars && product.prod_chars.length > 0) {
                const parsedChars = strapi
                    .plugin('import-products')
                    .service('charnameService')
                    .parseChars(product.prod_chars, importRef)

                product.prod_chars = parsedChars
            }

            if (brandId) { product.brand = { id: brandId } }

            if (!entryCheck) {
                try {
                    await await strapi
                        .plugin('import-products')
                        .service('importHelpers')
                        .createEntry(product, importRef)

                } catch (error) {
                    console.log("entryCheck:", entryCheck, "mpn:", product.mpn, "name:", product.name,
                        "barcode:", product.barcode, "brand_name:", product.brand_name, "model:", product.model)
                    console.log(error, error.details?.errors)
                }
            }
            else {
                try {
                    // if (product.entry.name.toLowerCase() === "quest") {
                    //     if (entryCheck.prod_chars) {
                    //         if (entryCheck.prod_chars.find(x => x.name === "Μεικτό βάρος")) {
                    //             let chars = entryCheck.prod_chars.find(x => x.name === "Μεικτό βάρος")
                    //             let weight = parseInt(chars.value.replace("kg", "").replace(",", ".").trim()) * 1000

                    //             product.weight = weight
                    //         }
                    //         else if (entryCheck.prod_chars.find(x => x.name === "Βάρος (κιλά)")) {
                    //             let chars = entryCheck.prod_chars.find(x => x.name === "Βάρος (κιλά)")
                    //             let weight = parseInt(chars.value.replace("kg", "").replace(",", ".").trim()) * 1000

                    //             product.weight = weight
                    //         }
                    //     }
                    // }
                    // else if (product.entry.name.toLowerCase() === "globalsat") {
                    //     if (entryCheck.prod_chars) {
                    //         if (entryCheck.prod_chars.find(x => x.name.toLowerCase().contains("βάρος") || x.name.toLowerCase().contains("specs"))) {
                    //             let chars = entryCheck.prod_chars.find(x => x.name.toLowerCase().contains("βάρος"))

                    //             let specs = entryCheck.prod_chars.find(x => x).toLowerCase().contains("specs")

                    //             let value = chars.value.toLowerCase()
                    //             // if (value.contains("kg")) {
                    //             //     product.weight = parseInt(chars.value.replace("kg", "").replace(",", ".").trim()) * 1000
                    //             // }
                    //             // else if (value.contains("gr")) {
                    //             //     product.weight = parseInt(chars.value.replace("gr", "").replace(",", ".").trim())
                    //             // }
                    //         }
                    //     }
                    // } 

                    await await strapi
                        .plugin('import-products')
                        .service('importHelpers')
                        .updateEntry(entryCheck, product, importRef)

                } catch (error) {
                    console.log(error)
                }
            }
        } catch (error) {
            console.log(error)
        }
    },

    filterScrappedProducts(categoryMap, product) {
        try {
            let isPassingFilteres = true

            let stockLevelFilter = []
            for (let stock of categoryMap.stock_map) {
                stockLevelFilter.push(stock.name)
            }

            if (!stockLevelFilter.includes(product.stockLevel)) {
                isPassingFilteres = false
            }

            let minPrice = categoryMap.minimumPrice ? categoryMap.minimumPrice : 0;
            let maxPrice;
            if (categoryMap.maximumPrice && categoryMap.maximumPrice > 0) {
                maxPrice = categoryMap.maximumPrice;
            }
            else {
                maxPrice = 100000;
            }

            if (Number.isNaN(product.wholesale) || product.wholesale < minPrice || product.wholesale > maxPrice) {
                isPassingFilteres = false
            }

            return isPassingFilteres
        } catch (error) {
            console.log(error)
        }
    },
});
