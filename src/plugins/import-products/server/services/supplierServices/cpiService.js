'use strict';

module.exports = ({ strapi }) => ({
    async parseCpiXml({ entry }) {
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
                splitter: '/',
                category: 'CATEGORY',
                subcategory: null,
                sub2category: null,
                stock_level: 'availability',
                wholesale: 'b2bprice',
                retail_price: 'msrp',
                recycle_tax: 'recycle',
                in_offer: null,
                name: 'description',
                brand: 'brand',
                mpn: 'mpn',
                model: null,
                barcode: 'EAN',
                supplierCode: 'code',
                description: 'chars',
                short_description: null,
                image: 'image',
                additional_images: null,
                additional_files: 'pdf',
                supplierProductURL: null,
                attributes: 'specifications.item',
                weight: 'weight_kg',
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

                const { products, message } = await this.getCpiData(entry, importRef);

                if (message === 'Error')
                    return { message }

                if (products.length === 0)
                    return { "message": "xml is empty" }

                for (let dt of products) {

                    const product = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createProductFields(entry, dt, importRef)

                    // Αν δεν υπάρχει ούτε mpn ούτε barcode προχώρα στην επόμενη εγγραφή
                    if (!product.mpn && !product.barcode)
                        continue

                    if (product.weight) {
                        product.weight = parseFloat(product.weight.replace("kg", "").replace(",", ".").trim()) * 1000
                    }

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
            console.log(err);
        }
    },

    async getCpiData(entry, importRef) {
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
                .filterData(xml.STOREITEMS.CREATED[0].PRODUCT, importRef.categoryMap, importRef.mapFields)

            return { products: availableProducts }

        } catch (error) {
            console.log(error)
        }
    },
});
