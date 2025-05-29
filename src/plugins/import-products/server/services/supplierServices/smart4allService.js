'use strict';

const xlsx = require('xlsx')

module.exports = ({ strapi }) => ({
    async parseSmart4AllXml({ entry }) {
        try {

            const importRef = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .createImportRef(entry);

            // Αντιστοιχώ τα πεδία του xml του προμηθευτή με τα πεδία που σχετίζονται με τη βάση
            importRef.mapFields = {
                //  isGreater = true όταν η διαθεσιμότητα είναι με αριθμό τεμαχίων
                // isGreater = false όταν η διαθεσιμότητα είναι με όνομα
                isGreater: false,
                // splitter , αν η κατηγορίες στο xml βρίσκονται σε ένα πεδίο με διαχωρισμό 
                // μέσω καποιου χαρακτήρα συνήθως (/ ή >) αλλιώς αν υπάρχουν ξεχωριστά πεδία για τις
                // υποκατηγορίες βάζω null
                splitter: ">",
                category: 'CATEGORY',
                subcategory: null,
                sub2category: null,
                stock_level: 'AVAILABILITY',
                wholesale: 'WHOLESALE_PRICE',
                retail_price: null,
                recycle_tax: null,
                in_offer: null,
                name: 'NAME',
                brand: 'MANUFACTURER',
                mpn: 'mpn',
                model: null,
                barcode: 'BARCODE',
                supplierCode: 'CODE',
                description: 'DESCRIPTION',
                short_description: null,
                image: 'IMAGE',
                additional_images: null,
                additional_files: null,
                supplierProductURL: null,
                attributes: 'FEATURES.FEATURE',
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

                const { products, message } = await this.getSmart4AllData(entry, importRef);

                if (message === 'Error')
                    return { message }

                if (products.length === 0)
                    return { "message": "xml is empty" }

                // Διαβάζω το excel αρχείο που στέλνουν καθημερινά!

                const wb = xlsx.readFile(`./public${entry.importedFile.url}`)
                const ws = wb.SheetNames
                let excel = []

                ws.forEach(x => {
                    if (x !== 'Φύλλο') {
                        const sheet = wb.Sheets[x]
                        const products = xlsx.utils.sheet_to_json(sheet)
                        excel = excel.concat(products)
                    }
                })

                const stockFilterFields = importRef.categoryMap.stock_map.map(x => x.name.trim())

                const productsInExcel = excel.filter(x => {

                    if (x["Availability"] === undefined || x["Availability"].trim() === "" || !stockFilterFields.includes(x["Availability"].trim())) { return false }

                    if (x["EAN"] !== undefined && !isNaN(x["EAN"]) && x["EAN"] !== "") { return true }
                })


                for (let dt of products) {
                    const product = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createProductFields(entry, dt, importRef)

                    if (!product.supplierCode) { continue }

                    const findProductInExcel = productsInExcel.find(x => { return x["Κωδικός S4ALL"].trim() === product.supplierCode.trim() })

                    if (!findProductInExcel) { continue }

                    if (!findProductInExcel["PN"] && !findProductInExcel["SKU"] && !findProductInExcel["Εναλλακτικός Κωδικός"]) { continue }

                    const mpn = findProductInExcel.PN || findProductInExcel.SKU || findProductInExcel["Εναλλακτικός Κωδικός"]

                    product.mpn = String(mpn)

                    // // Αν δεν υπάρχει ούτε mpn ούτε barcode προχώρα στην επόμενη εγγραφή
                    // if (!product.mpn && !product.barcode)
                    //     continue

                    // product.wholesale = product.wholesale.replace('.', '').replace(',', '.')
                    // product.retail_price = product.retail_price.replace('.', '').replace(',', '.')

                    const { entryCheck } = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .checkIfProductExists(product.mpn, product.barcode, product.name, null);


                    // αν δεν υπάρχει το προϊόν το δημιουργώ αλλιώς ενημερώνω 

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
    },

    async getSmart4AllData(entry, importRef) {
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

            const availableProducts = this.filterData(xml.mywebstore.products[0].product, importRef.categoryMap, importRef.mapFields)

            return { products: availableProducts }

        } catch (error) {
            console.log(error)
        }
    },

    filterData(data, categoryMap, importParams) {
        try {

            const unique_product = []
            const not_unique_product = []

            const newData = data
                .filter(filterStock)
                .filter(filterPriceRange)
                .filter(filterCategories)
                .filter(filterImage)
                .filter(filterSupplierCode)
            // .filter(filterUnique)
            // .filter(filterRemoveDup)

            function filterSupplierCode(code) {

                let supplierCode = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.supplierCode, code)

                if (!supplierCode)
                    return false

                return true
            }

            function filterUnique(unique) {
                let mpn = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.mpn, unique)
                if (!mpn)
                    return false

                if (unique_product.includes(mpn)) {
                    not_unique_product.push(mpn)
                    return false
                }
                else {
                    unique_product.push(mpn)
                    return true
                }
            }

            function filterRemoveDup(unique) {
                let mpn = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.mpn, unique)

                if (!mpn)
                    return false

                if (not_unique_product.includes(mpn)) {
                    return false
                }
                else {
                    return true
                }
            }

            function filterImage(imageUrl) {
                let image = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.image, imageUrl)

                let additional_images = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.additional_images, imageUrl)

                if (!image && !additional_images)
                    return false

                return true

            }

            function filterStock(stockName) {
                let availability = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.stock_level, stockName)

                if (!availability)
                    return false

                if (importParams.isGreater) {

                    if (categoryMap.stock_map.length > 0) {
                        // let catIndex = categoryMap.stock_map[0].findIndex(x => x.name.trim() === stockName.stock[0].trim())
                        if (parseInt(categoryMap.stock_map[0].name) <= parseInt(availability)) {
                            return true
                        }
                        else {
                            return false
                        }
                    }
                    else {
                        return true
                    }
                }
                else {
                    if (categoryMap.stock_map.length > 0) {
                        let catIndex = categoryMap.stock_map.findIndex(x => x.name.trim() === availability.trim())
                        if (catIndex !== -1) {
                            return true
                        }
                        else {
                            return false
                        }
                    }
                    else {
                        return true
                    }
                }

            }

            function filterCategories(cat) {
                // let category = null
                // let subcategory = null
                // let sub2category = null
                // if (splitter) {
                //     const tempCategory = strapi
                //         .plugin('import-products')
                //         .service('productHelpers')
                //         .createFields(importParams.category, cat)

                //     category = tempCategory.split(splitter)[0].trim()
                //     subcategory = tempCategory.split(splitter)[1] ? cat.CATEGORY[0].split(splitter)[1].trim() : null
                //     sub2category = tempCategory.split(splitter)[2] ? cat.CATEGORY[0].split(splitter)[2].trim() : null

                // }
                // else {
                //     category = strapi
                //         .plugin('import-products')
                //         .service('productHelpers')
                //         .createFields(importParams.category, cat)
                //     subcategory = strapi
                //         .plugin('import-products')
                //         .service('productHelpers')
                //         .createFields(importParams.subcategory, cat)
                //     sub2category = strapi
                //         .plugin('import-products')
                //         .service('productHelpers')
                //         .createFields(importParams.sub2category, cat)
                // }

                const { category, subcategory, sub2category } = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createCategories(cat, importParams)


                if (categoryMap.isWhitelistSelected) {
                    if (categoryMap.whitelist_map.length > 0) {
                        let catIndex = categoryMap.whitelist_map.findIndex(x => x.name.trim() === category.trim())
                        if (catIndex !== -1) {
                            // return true
                            if (categoryMap.whitelist_map[catIndex].subcategory.length > 0) {
                                let subIndex = categoryMap.whitelist_map[catIndex].subcategory.findIndex(x => x.name.trim() === subcategory)
                                if (subIndex !== -1) {
                                    if (categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.length > 0) {
                                        let sub2Index = categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.findIndex(x => x.name.trim() === sub2category)
                                        if (sub2Index !== -1) {
                                            return true
                                        }
                                        else {
                                            return false
                                        }
                                    }
                                }
                                else {
                                    return false
                                }
                            }
                            else {
                                return true
                            }
                        }
                        else {
                            return false
                        }
                    }
                    return true
                }
                else {
                    if (categoryMap.blacklist_map.length > 0) {
                        let catIndex = categoryMap.blacklist_map.findIndex(x => x.name.trim() === category)
                        if (catIndex !== -1) {
                            // return false
                            if (categoryMap.blacklist_map[catIndex].subcategory.length > 0) {
                                let subIndex = categoryMap.blacklist_map[catIndex].subcategory.findIndex(x => x.name.trim() === subcategory)
                                if (subIndex !== -1) {
                                    if (categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.length > 0) {
                                        let sub2Index = categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.findIndex(x => x.name.trim() === sub2category)
                                        if (sub2Index !== -1) {
                                            return false
                                        }
                                        else {
                                            return true
                                        }
                                    }
                                }
                                else {
                                    return true
                                }
                            }
                            else {
                                return false
                            }
                        }
                        else {
                            return true
                        }
                    }
                    return true
                }
            }

            function filterPriceRange(priceRange) {

                let minPrice = categoryMap.minimumPrice ? parseFloat(categoryMap.minimumPrice) : 0;
                let maxPrice;
                if (categoryMap.maximumPrice && categoryMap.maximumPrice > 0) {
                    maxPrice = parseFloat(categoryMap.maximumPrice);
                }
                else {
                    maxPrice = 100000;
                }

                const productPrice = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.wholesale, priceRange)

                let suggested = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.retail_price, priceRange)

                if (!productPrice && !suggested) { return false }

                if (parseFloat(productPrice).toFixed(2) >= minPrice && parseFloat(productPrice).toFixed(2) <= maxPrice) {
                    return true
                }
                else {
                    return false
                }
            }

            return newData

        } catch (error) {
            console.log(error)
        }

    },
});