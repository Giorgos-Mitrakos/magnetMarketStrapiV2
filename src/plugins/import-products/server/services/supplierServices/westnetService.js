'use strict';

module.exports = ({ strapi }) => ({
    async parseWestnetXml({ entry }) {
        try {
            const importRef = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .createImportRef(entry);

            // Αντιστοιχώ τα πεδία του xml του προμηθευτή με τα πεδία που σχετίζονται με τη βάση
            importRef.mapFields = {
                //  isGreater = true όταν η διαθεσιμότητα είναι με αριθμό τεμαχίων
                // isGreater = φαλσε όταν η διαθεσιμότητα είναι με όνομα
                isGreater: true,
                // splitter , αν η κατηγορίες στο xml βρίσκονται σε ένα πεδίο με διαχωρισμό 
                // μέσω καποιου χαρακτήρα συνήθως (/ ή >) αλλιώς αν υπάρχουν ξεχωριστά πεδία για τις
                // υποκατηγορίες βάζω null
                splitter: null,
                category: 'category',
                subcategory: null,
                sub2category: null,
                stock_level: 'availability',
                wholesale: 'price',
                retail_price: null,
                recycle_tax: 'recycle_tax',
                in_offer: 'in_offer',
                name: 'name',
                brand: 'manufacturer',
                mpn: 'partNumber',
                model: null,
                barcode: 'barCode',
                supplierCode: 'id',
                description: 'description',
                short_description: null,
                image: 'image',
                additional_images: null,
                additional_files: null,
                supplierProductURL: 'url',
                attributes: 'specs.spec',
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
                const { products, message } = await this.getWestnetData(entry, importRef);

                if (message === 'Error')
                    return { message }

                if (products.length === 0)
                    return { "message": "xml is empty" }

                // const { categories_map, char_name_map, char_value_map, stock_map,
                //     isWhitelistSelected, whitelist_map, blacklist_map,
                //     xPath, minimumPrice, maximumPrice } = importRef.categoryMap

                // const { mapCharNames, mapCharValues } = importRef.charMaps
                // let index = 0
                for (let dt of products) {
                    const product = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createProductFields(entry, dt, importRef) 

                    product.link = `https://www.mywestnet.com/el${product.link}`

                    // Αν δεν υπάρχει ούτε mpn ούτε barcode προχώρα στην επόμενη εγγραφή
                    if (!product.mpn && !product.barcode)
                        continue

                    const { entryCheck } = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .checkIfProductExists(product.mpn, product.barcode, product.name, product.model);


                    // Αναζητώ στα χαρακτηριστικά για να βρώ το βάρος
                    let weightChar = product.prod_chars?.find(x => x.name === "Weight")
                    if (weightChar) {
                        if (weightChar.value.includes("GW")) {
                            let result = weightChar.value.match(/GW: \d{1,3}(.|,|\s)\d{0,3}\s*kgs/gmi)
                            if (result) {
                                let weightString = result.find(x => x !== undefined)
                                let weight = parseFloat(weightString.replace("GW: ", "").replace("kgs", "").replace(",", ".").trim()) * 1000
                                product.weight = parseInt(weight)
                            }
                        }
                        else if (weightChar.value.includes("Gross")) {
                            let result = weightChar.value.match(/Gross \d{1,3}(.|,|\s)\d{0,3}\s*kg/gmi)
                            if (result) {
                                let weightString = result.find(x => x !== undefined)
                                let weight = parseFloat(weightString.replace("Gross ", "").replace("kgs", "").replace(",", ".").trim()) * 1000
                                product.weight = parseInt(weight)
                            }
                        }
                        else if (weightChar.value.includes("kg") || weightChar.value.includes("Kg")) {
                            let result = weightChar.value.match(/\d{1,3}(.|,|\s)\d{0,3}\s*kg/gmi)
                            if (result) {
                                let weightString = result.find(x => x !== undefined)
                                let weight = parseFloat(weightString.replace("kg", "").replace(",", ".").trim()) * 1000
                                product.weight = parseInt(weight)
                            }
                        }
                        else if (weightChar.value.includes("grams")) {
                            let result = weightChar.value.match(/\d{1,5}\s*grams/gmi)
                            if (result) {
                                let weightString = result.find(x => x !== undefined)
                                let weight = parseFloat(weightString.replace("kg", "").replace(",", ".").trim())
                                product.weight = parseInt(weight)
                            }
                        }
                        else if (weightChar.value.includes("g")) {
                            let result = weightChar.value.match(/\d{1,5}\s*g/gmi)
                            if (result) {
                                let weightString = result.find(x => x !== undefined)
                                let weight = parseFloat(weightString.replace("kg", "").replace(",", ".").trim())
                                product.weight = parseInt(weight)
                            }
                        }
                        else {
                            let result = weightChar.value.match(/\d{1,3}(.|,)\d{0,3}/gmi)
                            if (result) {
                                let weightString = result.find(x => x !== undefined)
                                let weight = parseFloat(weightString.replace(",", ".").trim()) * 1000
                                product.weight = parseInt(weight)
                            }
                        }
                    }


                    let diminsionChar = product.prod_chars?.find(x => x.name.includes("Dimensions"))

                    if (diminsionChar && diminsionChar.value.trim() !== "") {

                        if (diminsionChar.value.includes("mm")) {
                            let result = diminsionChar.value.match(/\d+((\.|\,)\d+)?/gmi)
                            if (result && result.length > 3) {
                                let length = parseFloat(result[0].replace(",", ".").trim())
                                product.length = parseInt(length)
                                let width = parseFloat(result[1].replace(",", ".").trim())
                                product.width = parseInt(width)
                                let height = parseFloat(result[2].replace(",", ".").trim())
                                product.height = parseInt(height)
                            }
                        }
                        else {
                            let result = diminsionChar.value.match(/\d+((\.|\,)\d+)?/gmi)
                            if (result && result.length > 3) {
                                let length = parseFloat(result[0].replace(",", ".").trim()) * 10
                                product.length = parseInt(length)
                                let width = parseFloat(result[1].replace(",", ".").trim()) * 10
                                product.width = parseInt(width)
                                let height = parseFloat(result[2].replace(",", ".").trim()) * 10
                                product.height = parseInt(height)
                            }
                        }

                        // let removedSpecial = diminsionChar.value.replace(/and#\d{3,4};/gmi, ' x ').replace("x", ' ')
                        // let result = removedSpecial.replace("/", "-").match(/(\d+((\.|\,)\d+)?|\d+((\.|\,)\d+)?-\d+((\.|\,)\d+)?)\s*(x|and#215;|and#8206;|\s)\s*(\d+((\.|\,)\d+)?|\d+((\.|\,)\d+)?-\d+((\.|\,)\d+)?)\s*(x|and#215;|and#8206;|\s)\s*(\d+((\.|\,)\d+)?|\d+((\.|\,)\d+)?-\d+((\.|\,)\d+)?)/gmi)

                        // let dim = result[result.length - 1].match(/\d+((\.|\,)\d+)?/gmi)


                    }

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

    async getWestnetData(entry, importRef) {
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

            console.log(xml.products.product.length)

            const availableProducts = strapi
                .plugin('import-products')
                .service('productHelpers')
                .filterData(xml.products.product, importRef.categoryMap, importRef.mapFields)

                console.log(availableProducts.length)
                
            return { products: availableProducts }

        } catch (error) {
            console.log(error)
        }
    },
});