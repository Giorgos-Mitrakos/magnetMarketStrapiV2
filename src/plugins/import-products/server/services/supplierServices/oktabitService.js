'use strict';

module.exports = ({ strapi }) => ({
    async parseOktabitXml({ entry }) {
        try {
            // Δημιουργώ τις μεταβλητές που χρειάζονται για την ενημέρωση 
            // προΪόντων του προμηθευτή
            const importRef = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .createImportRef(entry);

            // Αντιστοιχώ τα πεδία του xml του προμηθευτή με τα πεδία που σχετίζονται με τη βάση
            importRef.mapFields = {
                //  isGreater = true όταν η διαθεσιμότητα είναι με αριθμό τεμαχίων
                // isGreater = φαλσε όταν η διαθεσιμότητα είναι με όνομα
                isGreater: false,
                // splitter , αν η κατηγορίες στο xml βρίσκονται σε ένα πεδίο με διαχωρισμό 
                // μέσω καποιου χαρακτήρα συνήθως (/ ή >) αλλιώς αν υπάρχουν ξεχωριστά πεδία για τις
                // υποκατηγορίες βάζω null
                splitter: null,
                category: 'parent_category',
                subcategory: 'subcategory',
                sub2category: 'b2b_subcat',
                stock_level: 'availability',
                wholesale: 'timi_xontrikis',
                retail_price: 'timi_lianikis',
                recycle_tax: 'kostos_anakyklosis_proiontos',
                in_offer: 'on_offer',
                name: 'titlos',
                brand: 'brand',
                mpn: 'part_no',
                model: null,
                barcode: 'ean_code',
                supplierCode: 'product_code',
                description: 'description',
                short_description: null,
                image: 'image',
                additional_images: 'media',
                additional_files: 'technical_guide',
                supplierProductURL: 'url',
                attributes: 'product_attributes'
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
                const { products, message } = await this.getOktabitData(importRef);

                if (message) {
                    return { message: "Error" }
                }

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

                    const { entryCheck } = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .checkIfProductExists(product.mpn, product.barcode, product.name, product.model);

                    // Πρέπει να δω αν μπορώ να βρω τα κιλά μέσα απο τα χαρακτηριστικά μέσω τις παρακάτω συνάρτησης
                    // product.weight = this.findProductWeight(mappedFields)

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
        } catch (error) {
            console.log(error)
        }
    },

    async getOktabitData(importRef) {
        try {
            // Δημιουργώ url και config meta opo;ia θα τρέξει η συνάρτηση
            // που θα κατεβάσει το xml
            const url = "https://www.oktabit.gr/api/data/?format=json"
            const config = {
                headers: {
                    'Content-Type': 'text/json',
                    Accept: 'application/json',
                    Authorization: 'Token cbd3fdfc76cd0887a6c099900968cfde6bed93bb'
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

            const availableProducts = strapi
                .plugin('import-products')
                .service('productHelpers')
                .filterData(data, importRef.categoryMap, importRef.mapFields)

            return { products: availableProducts }
        } catch (error) {
            console.log(error)
            return { message: "Error" }
        }
    },

    findProductWeight(mappedFields) {
        let weightChar = mappedFields.chars.find(x => x.name.toLowerCase().includes("βάρος") && !x.name.toLowerCase().includes("μέγιστο"))
        if (weightChar)
            return 0
    }
});
