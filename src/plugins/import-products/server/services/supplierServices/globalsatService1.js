'use strict';

module.exports = ({ strapi }) => ({
    async parseGlobalsat({ entry }) {
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
                category: 'Category',
                subcategory: 'SubCategory1',
                sub2category: 'SubCategory2',
                stock_level: 'Stock',
                wholesale: 'PriceNet',
                retail_price: 'RRP',
                recycle_tax: 'SpecialTaxNet',
                in_offer: null,
                name: 'Name',
                brand: 'fItemFamilyCode',
                mpn: 'PartNumber',
                model: null,
                barcode: 'barcode',
                supplierCode: 'Code',
                description: 'PINSNotesEL',
                short_description: 'Description',
                image: 'Image1Link',
                additional_images: null,
                additional_files: null,
                supplierProductURL: null,
                attributes: 'Attributes'
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
                const { products, message } = await this.getGlobalsatData(entry, importRef);

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

                    //Ελέγχω αν έχει έξτρα φωτογραφίες και τις προσθέτω
                    for (let i = 2; i < 6; i++) {
                        const image = await strapi
                            .plugin('import-products')
                            .service('productHelpers')
                            .createFields(`Image${i}Link`, dt)

                        if (image)
                            product.imagesSrc.push({ url: image.trim() })
                    }

                    // ελέγχω αν στο XML υπάρχουν διαστάσεις και τις προσθέτω στο προΪόν ώστε
                    // να υπολογίζεται στη συνέχεια το βάρος

                    const dimensions = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createFields("DimensionsPackage", dt)

                    if (dimensions) {

                        // Replace Greek chi with x just in case, normalize spaces
                        const normalized = dimensions.replace(/χ/gi, 'x').replace(/\s+/g, '').replace(/,/gi, '.');

                        const dimensionsValues = normalized.split("x");
                        product.length = Number(dimensionsValues[0].trim());
                        product.width = Number(dimensionsValues[1].trim());
                        product.height = Number(dimensionsValues[2].trim());
                    }

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

    async getGlobalsatData(entry, importRef) {
        try {
            // Δημιουργώ url και config meta opo;ia θα τρέξει η συνάρτηση
            // που θα κατεβάσει το xml
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

            const json = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .parseXml(await data)

            const availableProducts = strapi
                .plugin('import-products')
                .service('productHelpers')
                .filterData(json.response.item, importRef.categoryMap, importRef.mapFields)

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
