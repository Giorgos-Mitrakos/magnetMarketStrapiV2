'use strict';

module.exports = ({ strapi }) => ({
    async parseDotMediaXml({ entry }) {
        try {
            const importRef = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .createImportRef(entry);

            // Αντιστοιχώ τα πεδία του xml του προμηθευτή με τα πεδία που σχετίζονται με τη βάση
            importRef.mapFields = {
                // isGreater = true όταν η διαθεσιμότητα είναι με αριθμό τεμαχίων
                // isGreater = false όταν η διαθεσιμότητα είναι με όνομα
                isGreater: false,
                // splitter , αν η κατηγορίες στο xml βρίσκονται σε ένα πεδίο με διαχωρισμό 
                // μέσω καποιου χαρακτήρα συνήθως (/ ή >) αλλιώς αν υπάρχουν ξεχωριστά πεδία για τις
                // υποκατηγορίες βάζω null
                splitter: null,
                category: 'Category',
                subcategory: 'SubCategory',
                sub2category: 'SubCategory2',
                stock_level: 'Availability',
                wholesale: 'WholesalePrice',
                retail_price: 'Suggested_Web_Price',
                recycle_tax: 'Eisfora',
                in_offer: null,
                name: 'Description',
                brand: 'Maker',
                mpn: 'MakerID',
                model: null,
                barcode: 'BarCode',
                supplierCode: 'ProductID',
                description: 'DetailedDescription',
                short_description: null,
                image: 'ImageLink',
                additional_images: 'ImageLink2',
                additional_files: 'ProductPdf',
                supplierProductURL: 'ProIDLink',
                attributes: 'DetailedDescriptionPre',
                weight: null,
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            }

            if (!entry.isActive) {
                await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .deleteEntry(entry, importRef);
            }
            else {
                const { products, message } = await this.getDotmediaData(entry, importRef);

                if (message === 'Error')
                    return { message }

                if (products.length === 0)
                    return { "message": "xml is empty" }

                // for await (let dt of products) {

                //     const attributes = await strapi
                //         .plugin('import-products')
                //         .service('importHelpers')
                //         .parseXml(`<attr>${dt.DetailedDescriptionPre}</attr>`)

                //     console.log(dt.DetailedDescriptionPre, attributes.attr.Specification)
                // }

                for await (let dt of products) {

                    const product = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createProductFields(entry, dt, importRef)

                    product.wholesale = product.wholesale.replace(",", ".")
                    product.retail_price = product.retail_price.replace(",", ".")
                    product.recycle_tax = product.recycle_tax.replace(",", ".")

                    const attributes = await strapi
                        .plugin('import-products')
                        .service('importHelpers')
                        .parseXml(`<attr>${dt.DetailedDescriptionPre}</attr>`)

                    const chars = []
                    for (let productChar of attributes.attr.Specification) {
                        const char = {}
                        char.name = productChar.Name[0]
                        char.value = productChar.Value[0]
                        chars.push(char)
                    }

                    const parsedChars = strapi
                        .plugin('import-products')
                        .service('charnameService')
                        .parseChars(chars, importRef)

                    product.prod_chars = parsedChars

                    // Αν δεν υπάρχει ούτε mpn ούτε barcode προχώρα στην επόμενη εγγραφή
                    if (!product.mpn && !product.barcode)
                        continue

                    // let weight = []
                    // let weightInKilos = []
                    // let weightInKilos1 = product.short_description.match(/(?<!Gross )Weight\s*:?\s*\d{1,3}(.|,|\s)\d{0,3}\s*kg/gmi)
                    // if (weightInKilos1 && weightInKilos1.length > 0)
                    //     weightInKilos.push(weightInKilos1)

                    // let weightInKilos2 = product.short_description.match(/(?<!Gross )Weight\s*\(kg\)\s*:?\s*\d{1,3}(.|,|\s)\d{0,3}/gmi)
                    // if (weightInKilos2 && weightInKilos2.length > 0)
                    //     weightInKilos.push(weightInKilos2)

                    // if (weightInKilos.length > 0) {
                    //     let weightsList = []
                    //     let weightFlattenArray = weightInKilos.flat()
                    //     weightFlattenArray.forEach(wt => {
                    //         let result = wt.match(/\d{1,3}(.|,)\d{0,3}/)
                    //         if (result) { weightsList.push(result[0]) }
                    //     });
                    //     if (weightsList.length > 0) {
                    //         let maxWeight = weightsList?.reduce((prev, current) => {
                    //             return (parseFloat(prev.replace(",", ".")) > parseFloat(current.replace(",", "."))) ? prev : current
                    //         })
                    //         weight.push(parseFloat(maxWeight.replace(",", ".")) * 1000)
                    //     }
                    // }

                    // let weightInGrams = []
                    // let weightInGrams1 = product.short_description.match(/Weight\s*:?\s*\d*\s*g/gmi)
                    // if (weightInGrams1 && weightInGrams1.length > 0)
                    //     weightInGrams.push(weightInGrams1)

                    // let weightInGrams2 = product.short_description.match(/Weight\s*\((gram|g)\)\s*:?\s*\d*/gmi)
                    // if (weightInGrams2 && weightInGrams2.length > 0)
                    //     weightInGrams.push(weightInGrams2)

                    // if (weightInGrams.length > 0) {
                    //     let weightsList = []
                    //     let weightFlattenArray = weightInGrams.flat()
                    //     weightFlattenArray.forEach(wt => {
                    //         let result = wt.match(/\d{1,3}(.|,)\d{0,3}/)
                    //         if (result) { weightsList.push(result[0]) }
                    //     });
                    //     if (weightsList.length > 0) {
                    //         let maxWeight = weightsList?.reduce((prev, current) => {
                    //             return (parseFloat(prev.replace(",", ".")) > parseFloat(current.replace(",", "."))) ? prev : current
                    //         })
                    //         weight.push(parseFloat(maxWeight.replace(",", ".")))
                    //     }
                    // }

                    // if (weight.length > 0) {
                    //     let maxWeight = weight.reduce((prev, current) => {
                    //         return (parseFloat(prev) > parseFloat(current)) ? prev : current
                    //     })
                    //     product.weight = parseInt(maxWeight)
                    // }

                    product.short_description = null

                    const secondImage = strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createFields('ImageLink2', dt)
                    const thirdImage = strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createFields('ImageLink3', dt)

                    if (secondImage)
                        product.imagesSrc.push({ url: secondImage })
                    if (thirdImage)
                        product.imagesSrc.push({ url: thirdImage })

                    const { entryCheck } = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .checkIfProductExists(product.mpn, product.barcode, product.name, product.model);

                    // αν δεν υπάρχει το προϊόν το δημιουργώ αλλιώς ενημερώνω 
                    if (!entryCheck) {
                        try {
                            const result = await strapi
                                .plugin('import-products')
                                .service('importHelpers')
                                .createEntry(product, importRef);

                            if (!result?.success) {
                                console.log(`Failed to create product: ${dt.title}, reason: ${result?.reason}`)
                            }
                                
                        } catch (error) {
                            console.error("errors in create:", error, error.details?.errors, "Προϊόν:", dt.title)
                        }
                    }
                    else {
                        try {
                            await strapi
                                .plugin('import-products')
                                .service('importHelpers')
                                .updateEntry(entryCheck, product, importRef);
                        } catch (error) {
                            console.log(error)
                        }
                    }
                }

                await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .deleteEntry(entry, importRef);
            }
            console.log("End of Import")
            return { "message": "ok" }
        }
        catch (err) {
            console.log(err)
            return { "message": "Error" }
        }
    },

    async getDotmediaData(entry, importRef) {
        try {
            const url = `${entry.importedURL}`
            const config = {
                headers: {
                    "Accept-Encoding": "gzip,deflate,compress"
                }
            }

            // Κατεβάζω το xml
            const { response, message } = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .getXmlData(url, config)

            const { data } = await response

            if (message === 'Error')
                return { message }

            const xml = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .parseXml(await data)

            const availableProducts = strapi
                .plugin('import-products')
                .service('productHelpers')
                .filterData(xml.NewDataSet.table1, importRef.categoryMap, importRef.mapFields)


            return { products: availableProducts }

        } catch (error) {
            console.log(error)
        }
    },

    async scrapDotMedia({ entry }) {
        const browser = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createBrowser()

        try {
            const importRef = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .createImportRef(entry);

            // Αντιστοιχώ τα πεδία του xml του προμηθευτή με τα πεδία που σχετίζονται με τη βάση
            importRef.mapFields = {
                // isGreater = true όταν η διαθεσιμότητα είναι με αριθμό τεμαχίων
                // isGreater = false όταν η διαθεσιμότητα είναι με όνομα
                isGreater: false,
                // splitter , αν η κατηγορίες στο xml βρίσκονται σε ένα πεδίο με διαχωρισμό 
                // μέσω καποιου χαρακτήρα συνήθως (/ ή >) αλλιώς αν υπάρχουν ξεχωριστά πεδία για τις
                // υποκατηγορίες βάζω null
                splitter: null,
                category: 'Category',
                subcategory: 'SubCategory',
                sub2category: 'Category3',
                stock_level: 'Availability',
                wholesale: 'WholesalePrice',
                retail_price: 'Suggested_x0020_Web_x0020_Price',
                recycle_tax: 'Eisfora',
                in_offer: null,
                name: 'Description',
                brand: 'Maker',
                mpn: 'MakerID',
                model: null,
                barcode: 'BarCode',
                supplierCode: 'ProductID',
                description: 'DetailedDescription',
                short_description: 'DetailedDescriptionPre',
                image: 'ImageLink',
                additional_images: null,
                additional_files: 'ProductPdf',
                supplierProductURL: 'ProIDLink',
                attributes: null,
                weight: null,
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            }

            if (!entry.isActive) {
                await strapi
                    .plugin('import-products')
                    .service('helpers')
                    .deleteEntry(entry, importRef);
            }
            else {

                const { products, message } = await this.getDotmediaData(entry, importRef);

                if (message === 'Error')
                    return { message }

                if (products.length === 0)
                    return { "message": "xml is empty" }

                const login = await this.loginToDotMedia(browser, entry.name);

                for (let dt of products) {

                    const product = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createProductFields(entry, dt, importRef)

                    // Αν δεν υπάρχει ούτε mpn ούτε barcode προχώρα στην επόμενη εγγραφή
                    if (!product.mpn && !product.barcode)
                        continue

                    let weight = []
                    let weightInKilos = []
                    let weightInKilos1 = product.short_description.match(/(?<!Gross )Weight\s*:?\s*\d{1,3}(.|,|\s)\d{0,3}\s*kg/gmi)
                    if (weightInKilos1 && weightInKilos1.length > 0)
                        weightInKilos.push(weightInKilos1)

                    let weightInKilos2 = product.short_description.match(/(?<!Gross )Weight\s*\(kg\)\s*:?\s*\d{1,3}(.|,|\s)\d{0,3}/gmi)
                    if (weightInKilos2 && weightInKilos2.length > 0)
                        weightInKilos.push(weightInKilos2)

                    if (weightInKilos.length > 0) {
                        let weightsList = []
                        let weightFlattenArray = weightInKilos.flat()
                        weightFlattenArray.forEach(wt => {
                            let result = wt.match(/\d{1,3}(.|,)\d{0,3}/)
                            if (result) { weightsList.push(result[0]) }
                        });
                        if (weightsList.length > 0) {
                            let maxWeight = weightsList?.reduce((prev, current) => {
                                return (parseFloat(prev.replace(",", ".")) > parseFloat(current.replace(",", "."))) ? prev : current
                            })
                            weight.push(parseFloat(maxWeight.replace(",", ".")) * 1000)
                        }
                    }

                    let weightInGrams = []
                    let weightInGrams1 = product.short_description.match(/Weight\s*:?\s*\d*\s*g/gmi)
                    if (weightInGrams1 && weightInGrams1.length > 0)
                        weightInGrams.push(weightInGrams1)

                    let weightInGrams2 = product.short_description.match(/Weight\s*\((gram|g)\)\s*:?\s*\d*/gmi)
                    if (weightInGrams2 && weightInGrams2.length > 0)
                        weightInGrams.push(weightInGrams2)

                    if (weightInGrams.length > 0) {
                        let weightsList = []
                        let weightFlattenArray = weightInGrams.flat()
                        weightFlattenArray.forEach(wt => {
                            let result = wt.match(/\d{1,3}(.|,)\d{0,3}/)
                            if (result) { weightsList.push(result[0]) }
                        });
                        if (weightsList.length > 0) {
                            let maxWeight = weightsList?.reduce((prev, current) => {
                                return (parseFloat(prev.replace(",", ".")) > parseFloat(current.replace(",", "."))) ? prev : current
                            })
                            weight.push(parseFloat(maxWeight.replace(",", ".")))
                        }
                    }

                    if (weight.length > 0) {
                        let maxWeight = weight.reduce((prev, current) => {
                            return (parseFloat(prev) > parseFloat(current)) ? prev : current
                        })
                        product.weight = parseInt(maxWeight)
                    }

                    product.description = `${product.description} Χαρακτηριστικά\n 
                        ${product.short_description}`

                    product.short_description = null

                    const secondImage = strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createFields('ImageLink2', dt)
                    const thirdImage = strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createFields('ImageLink3', dt)

                    if (secondImage)
                        product.imagesSrc.push({ url: secondImage })
                    if (thirdImage)
                        product.imagesSrc.push({ url: thirdImage })

                    const { wholesale, initial_wholesale } = await this.getPrices(product.wholesale, product.link, browser);

                    product.wholesale = wholesale
                    product.initial_wholesale = initial_wholesale
                    const { entryCheck } = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .checkIfProductExists(product.mpn, product.barcode, product.name, product.model);

                    // αν δεν υπάρχει το προϊόν το δημιουργώ αλλιώς ενημερώνω 
                    if (!entryCheck) {
                        try {
                            const response = await strapi
                                .plugin('import-products')
                                .service('importHelpers')
                                .createEntry(product, importRef);

                            await response
                        } catch (error) {
                            console.error("errors in create:", error, error.details?.errors, "Προϊόν:", dt.title)
                        }
                    }
                    else {
                        try {
                            await strapi
                                .plugin('import-products')
                                .service('importHelpers')
                                .updateEntry(entryCheck, product, importRef);
                        } catch (error) {
                            console.log(error)
                        }
                    }
                }

                await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .deleteEntry(entry, importRef);
            }
            console.log("End of Import")
            return { "message": "ok" }
        }
        catch (err) {
            console.log(err)
            return { "message": "Error" }
        }
        finally {
            await browser.close()
        }
    },

    async loginToDotMedia(browser, supplier) {

        try {
            const loadImages = false;

            let page = await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .createPage(await browser, loadImages)

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .loadCookies(supplier, await page)

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .retry(
                    () => page.goto('https://www.dot-media.gr/index.aspx', { waitUntil: "networkidle0" }),
                    10, // retry this 10 times,
                    false
                );

            const pageBody = await page.$('body');
            const loginMessage = await pageBody.$('#ctl00_cphLogin_ztLoginMes')

            if (!loginMessage || !loginMessage.innerHTML) {
                await this.saveDotMediaCookies(page, supplier)
            }

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(1500, 3000))

        } catch (error) {
            console.log(error)
        }
    },

    async saveDotMediaCookies(page, supplier) {
        try {
            const pageBody = await page.$('body');
            const username = await pageBody.$('#ctl00_cphLogin_ztUser');
            const password = await pageBody.$('#ctl00_cphLogin_ztPwd');
            await username.type(process.env.DOTMEDIA_USERNAME, {
                delay: strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(300, 700)
            })
            await password.type(process.env.DOTMEDIA_PASSWORD, {
                delay: strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(300, 700)
            })
            const submitLogin = await pageBody.$('#ctl00_cphLogin_btnLogin')

            submitLogin.click('#loginSubmit')

            await strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .sleep(strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .randomWait(3000, 5000))

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

            return await page

        } catch (error) {
            console.log(error)
        }
    },

    async getPrices(wholesale, link, browser) {

        const loadImages = false;
        let page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(await browser, loadImages)

        await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .sleep(strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .randomWait(2000, 5000))

        try {
            if (parseFloat(wholesale) > 0) {
                return { initial_wholesale: null, wholesale }
            }
            else {

                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .retry(
                        () => page.goto(link, { waitUntil: "networkidle0" }),
                        10, // retry this 10 times,
                        false
                    );

                await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .sleep(strapi
                        .plugin('import-products')
                        .service('scrapHelpers')
                        .randomWait(1500, 2500))

                const scrapProduct = await page.evaluate(() => {
                    let prices = {}
                    const priceWrapper = document.querySelector('#ctl00_cphProductData_zlTmonTel')
                    const priceSpans = priceWrapper.querySelectorAll('#ctl00_cphProductData_zlTmonTel>span');
                    if (priceSpans.length === 2) {
                        prices.initial_wholesale = priceSpans[0].textContent.replace(",", ".")
                        prices.wholesale = priceSpans[1].textContent.replace(",", ".")
                    }
                    else {
                        prices.wholesale = priceSpans[0].textContent.replace(",", ".")
                    }
                    return { prices }
                })

                return { initial_wholesale: scrapProduct.prices.initial_wholesale, wholesale: scrapProduct.prices.wholesale }
            }

        } catch (error) {
            console.log(error)
        }
        finally {
            await page.close()
        }
    }
});
