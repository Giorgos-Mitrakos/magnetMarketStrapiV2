'use strict';

module.exports = ({ strapi }) => ({
    async parseZegetronXml({ entry }) {
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
                stock_level: 'stock',
                wholesale: 'price',
                retail_price: 'suggested_retail_price',
                recycle_tax: 'recycling_fee',
                in_offer: null,
                name: 'title',
                brand: 'manufacturer',
                mpn: 'part_number',
                model: null,
                barcode: 'barcode',
                supplierCode: 'product_id',
                description: 'description',
                short_description: null,
                image: null,
                additional_images: 'images.image',
                additional_files: null,
                supplierProductURL: null,
                attributes: null,
                weight: 'weight',
                width: 'width',
                length: 'length',
                height: 'height',
                skoutz_url: 'skroutz'
            }

            // αν ο προμηθευτής είναι ανενεργός διαγράφω όλα τα προϊόντα του
            // αλλιώς προχωρώ στην ενημέρωση
            if (!entry.isActive) {
                await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .deleteEntry(entry, importRef);
            }
            else {
                const { products, message } = await this.getZegetronData(entry, importRef);

                if (message === 'Error')
                    return { message }

                if (products.length === 0)
                    return { "message": "xml is empty" }

                for (let dt of products) {

                    const product = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createProductFields(entry, dt, importRef)

                    if (!product.mpn && !product.barcode)
                        continue

                    const { entryCheck } = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .checkIfProductExists(product.mpn, product.barcode, product.name, product.model);

                    const stripContent = product.description?.replace(/(<([^>]+)>)/ig, '').trim();
                    const productPrice = product.wholesale.replace(',', '.').trim();
                    const suggested_retail_price = product.retail_price.replace(',', '.').trim();
                    const recycle_tax = product.recycle_tax.replace(',', '.').trim();
                    const weight = product.weight?.replace(',', '.').trim();
                    const width = product.width?.replace(',', '.').trim();
                    const length = product.length?.replace(',', '.').trim();
                    const height = product.height?.replace(',', '.').trim();


                    product.description = stripContent ? stripContent : ""
                    product.wholesale = productPrice
                    product.retail_price = suggested_retail_price
                    product.recycle_tax = recycle_tax
                    product.weight = weight ? weight : null
                    product.width = width ? width : null
                    product.length = length ? length : null
                    product.height = height ? height : null

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

    async getZegetronData(entry, importRef) {
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
                .filterData(xml.mywebstore.products[0].product, importRef.categoryMap, importRef.mapFields)

            return { products: availableProducts }

        } catch (error) {
            console.log(error)
        }
    },
});
