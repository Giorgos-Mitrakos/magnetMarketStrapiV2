'use strict';

const Axios = require('axios');
const { update } = require('lodash');
const slugify = require('slugify');
const xml2js = require('xml2js');

module.exports = ({ strapi }) => ({

    async updateAll() {

        await updateZEGETRON()
            .then(async () => { return await updateOKTABIT() })
            .then(async () => { return await updateWESTNET() })
            .then(async () => { return await scrapQUEST() })

        async function updateZEGETRON() {
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Zegetron" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name_in_xml', 'translate_to', 'allow_import'],
                        sort: 'name_in_xml:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('zegetronService')
                .parseZegetronXml({ entry });
        }

        async function updateOKTABIT() {
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Oktabit" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name_in_xml', 'translate_to', 'allow_import'],
                        sort: 'name_in_xml:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('oktabitService')
                .parseOktabitXml({ entry });
        }

        async function updateWESTNET() {
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Westnet" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name_in_xml', 'translate_to', 'allow_import'],
                        sort: 'name_in_xml:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('westnetService')
                .parseWestnetXml({ entry });
        }

        async function scrapQUEST() {
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "QUEST" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name_in_xml', 'translate_to', 'allow_import'],
                        sort: 'name_in_xml:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('questService')
                .parseQuest({ entry });
        }

    },

    async createImportRef(entry) {
        const importRef = {
            created: 0,
            updated: 0,
            skipped: 0,
            deleted: 0,
            republished: 0,
            related_entries: new Set(),  // ✅ USE SET INSTEAD OF ARRAY
            related_products: [],
            charMaps: {},
        }

        importRef.categoryMap = await strapi
            .plugin('import-products')
            .service('importxmlService')
            .getImportMapping(entry);

        importRef.charMaps = strapi
            .plugin('import-products')
            .service('charnameService')
            .parseCharsToMap(importRef.categoryMap.char_name_map, importRef.categoryMap.char_value_map);

        importRef.suppliers = await strapi.entityService.findMany('plugin::import-products.importxml', {
            fields: ['name', 'shipping'],
        });

        importRef.stock_map = await strapi.db.query('plugin::import-products.stockmap').findMany({
            where: { related_import: entry.id },
            select: ['name_in_xml', 'translate_to', 'allow_import']
        });

        importRef.brand_excl_map = await strapi.db.query('plugin::import-products.brandexclmap').findMany({
            where: { related_import: entry.id },
            select: ['brand_name']
        });

        return importRef

    },

    async getXmlData(url, config) {
        try {
            const response = await Axios.get(url, config)

            return { response, message: "Ok" }
        } catch (error) {
            console.log(error)
            return { message: "Error" }
        }

    },

    async postXmlData(url, data, config) {
        try {
            const response = await Axios.post(url, data, config)
            return { response, message: "Ok" }
        } catch (error) {
            console.log(error)
            return { message: "Error" }
        }

    },

    async parseXml(xml) {
        try {
            if (!xml)
                return

            const parser = new xml2js.Parser();
            return new Promise((resolve, reject) => {
                parser.parseString(xml, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        } catch (error) {
            return
        }

    },

    async createEntry(product, importRef) {
        if (!product.name || (!product.mpn && !product.barcode))
            return

        try {
            //Βρίσκω τον κωδικό της κατηγορίας ώστε να συνδέσω το προϊόν με την κατηγορία
            const categoryInfo = await strapi
                .plugin('import-products')
                .service('categoryHelpers')
                .getCategory(importRef.categoryMap.categories_map, product.name, product.category.title, product.subcategory.title, product.sub2category.title);

            const price_progress_data = strapi
                .plugin('import-products')
                .service('supplierHelpers')
                .createPriceProgress(product)

            const supplierInfoData = strapi
                .plugin('import-products')
                .service('supplierHelpers')
                .createSupplierInfoData(product, price_progress_data, importRef.stock_map);

            const supplierInfo = [supplierInfoData];

            const productPrices = await strapi
                .plugin('import-products')
                .service('priceHelpers')
                .setPrice(null, supplierInfo, categoryInfo, product);

            product.supplierInfo = supplierInfo
            product.category = categoryInfo.id;
            product.price = parseFloat(productPrices.generalPrice.price).toFixed(2);
            product.is_fixed_price = productPrices.generalPrice.isFixed;

            product.status = strapi
                .plugin('import-products')
                .service('productStatusHelper')
                .calculateProductStatus(
                    0,
                    supplierInfo,
                    product,
                    importRef.brand_excl_map
                );

            let platforms = [
                productPrices.skroutzPrice,
                productPrices.shopflixPrice
            ]

            const data = {
                name: product.name.replaceAll('&apos;', "'"),
                slug: this.createSlug(product.name, product.mpn),
                category: categoryInfo.id,
                price: parseFloat(productPrices.generalPrice.price).toFixed(2),
                is_fixed_price: product.is_fixed_price,
                publishedAt: new Date(),
                status: product.status,
                related_import: product.entry.id,
                supplierInfo: supplierInfo,
                prod_chars: product.prod_chars,
                additionalFiles: product.additional_files,
                platforms: platforms
            }

            data.deletedAt = (product.status === 'OutOfStock' || product.status === 'Discontinued')
                ? new Date()
                : null;

            //********  ΑΥτό να μπει στο αρχείο της νοβατρον για να συμπληρώνει  τα mm του φακού  *********
            // if (product.entry.name.toLowerCase() === "novatron" && product.short_description) {
            //     let result = product.short_description.match(/[0-9].[0-9]mm/g)
            //     if (result) {
            //         data.name = `${product.name}-${result[0]}`;
            //         data.slug = slugify(`${product.name}-${result[0]}-${product.mpn}`, { lower: true, remove: /[*+~=#.,°;_()/'"!:@]/g })
            //     }
            // }

            if (product.mpn) {
                data.mpn = product.mpn.trim()
            }

            if (product.barcode) {
                data.barcode = product.barcode.trim()
            }

            if (product.model) {
                data.model = product.model.trim()
            }

            if (product.description) {
                data.description = product.description
                    .replaceAll('&apos;', "'")
                    .replaceAll('&quot;', '"')
                    .replaceAll('&gt;', ">")
                    .replaceAll('&lt;', "<")
                    .replaceAll('&nbsp;', " ")
                    // .replace(/[^\x00-\x7F]/g, "") 
                    .replace(/[\u2000-\u2BFF]/g, "")
                    .trim()
            }

            if (product.short_description) {
                data.short_description = product.short_description.trim()
            }

            if (product.brand) {
                data.brand = product.brand.id
            }

            if (product.length && product.width && product.height) {
                data.length = parseInt(product.length)
                data.width = parseInt(product.width)
                data.height = parseInt(product.height)
            }

            // //Υπολογισμός βάρους
            data.weight = strapi
                .plugin('import-products')
                .service('productHelpers')
                .createProductWeight(product, categoryInfo)

            //Κατεβάζω τις φωτογραφίες του προϊόντος , τις μετατρέπω σε webp και τις συνδέω με το προϊόν
            let responseImage = await strapi
                .plugin('import-products')
                .service('fileHelpers')
                .getAndConvertImgToWep(product);

            if (!responseImage) {
                // console.log('No images for product:', product.name);
                return { success: false, reason: 'no_images' }
            }

            data.image = responseImage?.mainImage[0]
            data.additionalImages = responseImage?.additionalImages
            data.ImageURLS = responseImage?.imgUrls

            let responseFile = await strapi
                .plugin('import-products')
                .service('fileHelpers')
                .getAdditionalFile(product);

            data.additionalFiles = responseFile ? responseFile : null

            data.seo = await strapi
                .plugin('import-products')
                .service('productHelpers')
                .saveSEO(data.image, product)

            const newEntry = await strapi.entityService.create('api::product.product', {
                data: data,
            });

            importRef.related_entries.add(newEntry.id);  // ✅ CHANGED FROM PUSH TO ADD

            if (product.relativeProducts && product.relativeProducts.length > 0) {
                importRef.related_products.push({
                    productID: newEntry.id,
                    relatedProducts: product.relativeProducts
                });
            }

            importRef.created += 1;

            // ✅ RETURN PRODUCT FOR CACHING
            return {
                success: true,
                id: newEntry.id,
                product: {
                    id: newEntry.id,
                    mpn: data.mpn,
                    barcode: data.barcode,
                    model: data.model,
                    name: data.name,
                    supplierInfo: data.supplierInfo,
                    related_import: [product.entry],
                    brand: data.brand,
                    brandName: product.brandName,
                    category: categoryInfo,
                    platforms: data.platforms,
                    prod_chars: data.prod_chars
                }
            };
        } catch (error) {
            console.log("Error in Entry Function:", error, error.details?.errors, product.name)
            return { success: false, reason: 'exception', error: error.message }
        }

    },

    async updateEntry(entryCheck, product, importRef) {

        try {
            let dbChange = { typeOfChange: "Skipped" } //Εδώ αποθηκεύω το είδος της αλλαγής
            const data = {}   //Εδώ αποθηκεύω τα δεδομένα που χρειάζονται αλλαγή

            // // Να το δώ καλυτερα αυτό
            // // Τσεκάρω αν η προτεινόμενη τιμή είναι μικρότερη από την παλαιότερη
            // if (entryCheck.related_import.findIndex(x => x.name.toLowerCase() === "globalsat") !== -1
            //     && entryCheck.supplierInfo.findIndex(x => x.name.toLowerCase() === "globalsat" && Number(x.retail_price) < Number(product.retail_price)) !== -1)
            //     return

            //Βρίσκω τον κωδικό της κατηγορίας ώστε να συνδέσω το προϊόν με την κατηγορία
            const categoryInfo = await strapi
                .plugin('import-products')
                .service('categoryHelpers')
                .getCategory(importRef.categoryMap.categories_map,
                    product.name, product.category.title, product.subcategory?.title, product.sub2category?.title);

            // Update import references
            this.updateImportReferences(importRef, entryCheck, product, data);

            // Update product chars
            this.updateProductChars(importRef, entryCheck, product, data, dbChange);

            // Update product metadata
            await this.updateProductMetadata(entryCheck, product, categoryInfo, data, dbChange);

            // ενημερώνω τυχών αλλαγές στις τιμές του προμηθευτή
            strapi
                .plugin('import-products')
                .service('supplierHelpers')
                .updateSupplierInfo(entryCheck, product, data, dbChange, importRef)

            // Handle supplier availability notifications
            await this.handleAvailabilityNotifications(entryCheck, product, data);


            const skroutz = entryCheck.platforms.find(x => x.platform === "Skroutz")
            const shopflix = entryCheck.platforms.find(x => x.platform === "Shopflix")

            let info = data.supplierInfo ? data.supplierInfo : entryCheck.supplierInfo

            // Δημιουργώ τις τιμές για το προϊόν
            const productPrices = await strapi
                .plugin('import-products')
                .service('priceHelpers')
                .setPrice(entryCheck, info, categoryInfo, product);

            if (!skroutz || !shopflix ||
                strapi
                    .plugin('import-products')
                    .service('priceHelpers')
                    .is_not_equal(skroutz.price, productPrices.skroutzPrice.price) ||
                skroutz.is_fixed_price !== productPrices.skroutzPrice.is_fixed_price ||
                strapi
                    .plugin('import-products')
                    .service('priceHelpers')
                    .is_not_equal(shopflix.price, productPrices.shopflixPrice.price) ||
                shopflix.is_fixed_price !== productPrices.shopflixPrice.is_fixed_price ||
                strapi
                    .plugin('import-products')
                    .service('priceHelpers')
                    .is_not_equal(entryCheck.price, productPrices.generalPrice.price)) {

                data.is_fixed_price = productPrices.generalPrice.isFixed;
                data.price = productPrices.generalPrice.price
                data.platforms = [
                    productPrices.skroutzPrice,
                    productPrices.shopflixPrice
                ]
                dbChange.typeOfChange = 'updated'
            }

            if (entryCheck.publishedAt === null) {

                // if (product.entry.name.toLowerCase() === "globalsat") {
                data.need_verify = false
                //     dbChange.typeOfChange = 'updated'
                // }
                // else {
                data.publishedAt = new Date()
                data.deletedAt = null
                dbChange.typeOfChange = 'republished'
                // }
            }

            // ✅ Χρησιμοποιούμε το brandName από το product αν υπάρχει,
            // αλλιώς το entryCheck.brand (που είναι ID)
            const productForStatus = {
                ...product,
                brandName: product.brandName || entryCheck.brand?.name || entryCheck.brand
            };

            const supplierInfoForStatus = data.supplierInfo || entryCheck.supplierInfo;
            const inventoryForStatus = data.inventory !== undefined ? data.inventory : entryCheck.inventory;

            const calculatedStatus = strapi
                .plugin('import-products')
                .service('productStatusHelper')
                .calculateProductStatus(
                    inventoryForStatus,
                    supplierInfoForStatus,
                    productForStatus, // ✅ Περνάμε το object με brandName
                    importRef.brand_excl_map
                );

            if (calculatedStatus !== entryCheck.status) {
                data.status = calculatedStatus;
                dbChange.typeOfChange = 'updated';
            }

            // ✅ ΚΡΙΣΙΜΟ: Χειρισμός deletedAt με βάση το τελικό status
            const finalStatus = data.status !== undefined ? data.status : entryCheck.status;

            if (finalStatus === 'OutOfStock' || finalStatus === 'Discontinued') {
                // Αν το προϊόν είναι OutOfStock ή Discontinued και δεν έχει deletedAt, βάλε ημερομηνία
                if (!entryCheck.deletedAt) {
                    data.deletedAt = new Date();
                    if (dbChange.typeOfChange === 'Skipped') {
                        dbChange.typeOfChange = 'updated';
                    }
                }
            } else {
                // Αν το προϊόν ΔΕΝ είναι OutOfStock/Discontinued και έχει deletedAt, καθάρισέ το
                if (entryCheck.deletedAt) {
                    data.deletedAt = null;
                    if (dbChange.typeOfChange === 'Skipped') {
                        dbChange.typeOfChange = 'updated';
                    }
                }
            }

            if (Object.keys(data).length !== 0) {

                const updated = await strapi.entityService.update('api::product.product', entryCheck.id, {
                    data
                });

                if (!updated) {
                    console.error('Failed to update product:', entryCheck.id);
                    return { success: false, reason: 'update_failed' }
                }
            }

            switch (dbChange.typeOfChange) {
                case 'republished':
                    importRef.republished += 1
                    break;
                case 'updated':
                    importRef.updated += 1
                    break;
                case 'created':
                    importRef.created += 1
                    break;
                default:
                    importRef.skipped += 1
                    break;
            }

            return { success: true, changeType: dbChange.typeOfChange }
        } catch (error) {
            console.log(error, error?.details?.errors)
            return { success: false, reason: 'exception', error: error.message }
        }
    },

    async deleteEntry(entry, importRef) {
        try {
            const importXmlFile = await strapi.entityService.findOne('plugin::import-products.importxml', entry.id,
                {
                    populate: {
                        related_products: {
                            filters: {
                                $and: [
                                    {
                                        publishedAt: { $notNull: true, }
                                    },
                                    {
                                        supplierInfo: { name: entry.name },
                                    },
                                ]
                            },
                        }
                    },
                });

            for (let product of importXmlFile.related_products) {

                if (!importRef.related_entries.has(product.id)) {

                    const data = {}
                    let needsUpdate = false; // ✅ ΠΡΟΣΘΗΚΗ: Flag για να ξέρουμε αν χρειάζεται update

                    // Βρίσκω το προϊόν
                    const checkProduct = await strapi.entityService.findOne('api::product.product', product.id, {
                        populate: {
                            supplierInfo: true,
                            related_import: true,
                            brand: true
                        },
                    })

                    let supplierInfo = checkProduct.supplierInfo

                    // Βρίσκω αν προμηθευόμαστε το προϊόν από το συγκεκριμένο προμηθευτή
                    const index = supplierInfo.findIndex((o) => {
                        return o.name === entry.name
                    })

                    // Αν δεν βρίσκω τον προμηθευτή στο συγκεκριμένο προϊόν διαγράφω τη συσχέτιση του με τον προμηθευτή
                    // αλλιώς κάνω τη διαθεσιμότητα του απο το συγκεκριμένο προμηθευτή σε μη διαθέσιμο
                    if (index === -1) {
                        let relatedImports = checkProduct.related_import.filter(x => x.id !== entry.id)
                        data.related_import = relatedImports
                        needsUpdate = true;
                        // ✅ Αυξάνουμε το deleted γιατί ο supplier δεν έχει πια αυτό το προϊόν
                        importRef.deleted += 1;
                    }
                    else {
                        /// Το προϊόν υπάρχει στη βάση αλλά ΟΧΙ στο τρέχον XML
                        let supplierChanged = false;

                        if (supplierInfo[index].in_stock !== false) {
                            supplierInfo[index].in_stock = false;
                            supplierChanged = true;
                            importRef.deleted += 1;
                        }

                        // ΚΑΘΑΡΙΣΜΟΣ: Πρέπει να μηδενιστούν όλα ώστε ο helper να δει OutOfStock
                        const fieldsToClean = ['translated_status', 'stock_level', 'quantity'];
                        for (const field of fieldsToClean) {
                            if (supplierInfo[index][field] !== null) {
                                supplierInfo[index][field] = null; // Θέτουμε null για να μην επηρεάζει τον helper
                                supplierChanged = true;
                            }
                        }

                        if (supplierChanged) {
                            needsUpdate = true;
                        }
                    }

                    // ✅ ΠΡΟΣΘΗΚΗ: Ενημερώνουμε supplierInfo μόνο αν χρειάζεται
                    if (needsUpdate) {
                        data.supplierInfo = supplierInfo;
                    }

                    // ✅ Δημιουργούμε product object με brandName
                    const productForStatus = {
                        ...product,
                        brandName: checkProduct.brand?.name || checkProduct.brand,
                        status: checkProduct.status // ✅ Προσθήκη για Discontinued check
                    };

                    // ✅ Υπολογισμός status
                    const calculatedStatus = strapi
                        .plugin('import-products')
                        .service('productStatusHelper')
                        .calculateProductStatus(
                            checkProduct.inventory || 0,
                            supplierInfo,
                            productForStatus,
                            importRef.brand_excl_map
                        );

                    // ✅ ΑΛΛΑΓΗ: Ενημερώνουμε status μόνο αν άλλαξε
                    if (calculatedStatus !== checkProduct.status) {
                        data.status = calculatedStatus;
                        needsUpdate = true;
                    }

                    // ✅ Χειρισμός deletedAt με βάση το status
                    const finalStatus = data.status !== undefined ? data.status : checkProduct.status;

                    if (finalStatus === 'OutOfStock' || finalStatus === 'Discontinued') {
                        // Αν δεν έχει ήδη deletedAt, βάλε την τρέχουσα ημερομηνία
                        if (!checkProduct.deletedAt) {
                            data.deletedAt = new Date();
                            needsUpdate = true;
                        }
                    } else {
                        // Αν το status δεν είναι OutOfStock/Discontinued, καθάρισε το deletedAt
                        if (checkProduct.deletedAt) {
                            data.deletedAt = null;
                            needsUpdate = true;
                        }
                    }

                    // ✅ ΑΛΛΑΓΗ: Ενημερώνουμε τη βάση ΜΟΝΟ αν χρειάζεται
                    if (needsUpdate) {
                        await strapi.entityService.update('api::product.product', product.id, {
                            data: data,
                        });
                    }
                }
            }

            // ενημερώνω το report για την ενημέρωση των προϊόντων
            await strapi.entityService.update('plugin::import-products.importxml', entry.id,
                {
                    data: {
                        lastRun: new Date(),
                        report: `Created: ${importRef.created}, Updated: ${importRef.updated}, Republished: ${importRef.republished}, Skipped: ${importRef.skipped}, Deleted: ${importRef.deleted}`,
                    },
                })

        } catch (error) {
            console.log(error)
        }
    },

    updateImportReferences(importRef, entryCheck, product, data) {
        // ✅ USE SET.ADD INSTEAD OF ARRAY.PUSH
        importRef.related_entries.add(entryCheck.id);

        if (product.relativeProducts?.length > 0) {
            importRef.related_products.push({
                productID: entryCheck.id,
                relatedProducts: product.relativeProducts
            });
        }

        // ✅ FIX: Check if related_import exists and is an array
        const relatedImport = entryCheck.related_import;
        if (!relatedImport || !Array.isArray(relatedImport)) {
            console.warn(`Product ${entryCheck.id} has invalid related_import`);
            return;
        }

        const relatedImportIds = relatedImport.map(x => x.id);
        const findImport = relatedImport.findIndex(x => x.id === product.entry.id);

        if (findImport === -1) {
            data.related_import = [...relatedImportIds, product.entry.id];
        }
    },

    updateProductChars(importRef, entryCheck, product, data, dbChange) {

        if (entryCheck.prod_chars?.length === 0 && product.prod_chars?.length > 0) {
            data.prod_chars = product.prod_chars
            dbChange.typeOfChange = 'updated'
        }

        // Προσθέτω το id του προϊόντος στη βάση ώστε αργότερα όταν γίνει η διαγραφή
        // των προϊόντων να μην δαγραφεί.
        // //////////////////////////////importRef.related_entries.push(entryCheck.id);

        // // Για τις περιπτώσεις όπου ο προμηθευτής έχει σχετικά προϊόντα αποθηκεύω 
        // // τα προϊόντα ώστε να τα συσχετίσω στη βάση
        // if (product.relativeProducts?.length > 0) {
        //     importRef.related_products.push({
        //         productID: entryCheck.id,
        //         relatedProducts: product.relativeProducts
        //     });
        // }

        // // Βρίσκω τους προμηθευτές που έχουν το προϊόν 
        // const relatedImport = entryCheck.related_import;
        // const relatedImportIds = relatedImport.map(x => x.id)

        // // Αναζητώ αν προμηθεύομαι ήδη το προϊόν απο τον συγκεκριμένο προμηθευτή
        // const findImport = relatedImport.findIndex(x =>
        //     x.id === product.entry.id)

        // // Αν δεν υπάρχει ο προμηθευτής σε αυτο το προϊόν ενημερώνω τη συσχέτιση
        // if (findImport === -1) { data.related_import = [...relatedImportIds, product.entry.id] }
    },

    async handleAvailabilityNotifications(entryCheck, product, data) {
        // Αν δεν υπάρχει το flag, skip
        if (!entryCheck.notice_if_available) return;

        // ✅ Τα statuses που θεωρούνται "διαθέσιμα"
        const AVAILABLE_STATUSES = ['InStock', 'MediumStock', 'LowStock'];

        // ✅ Παίρνουμε τα OLD supplierInfo
        const oldSupplierInfo = entryCheck.supplierInfo;

        // ✅ Παίρνουμε τα NEW supplierInfo (από το data αν υπάρχουν, αλλιώς τα παλιά)
        const newSupplierInfo = data.supplierInfo || oldSupplierInfo;

        // ✅ Έλεγχος: ΟΛΟΙ οι παλιοί suppliers ΔΕΝΔΝ ήταν σε available status
        const allSuppliersWereUnavailable = oldSupplierInfo.every(s =>
            !AVAILABLE_STATUSES.includes(s.translated_status)
        );

        if (!allSuppliersWereUnavailable) return; // Αν κάποιος ήδη είχε διαθέσιμο status, skip

        // ✅ Βρες ποιος supplier ΑΚΡΙΒΩΣ επέστρεψε σε available status
        const newlyAvailableSuppliers = newSupplierInfo.filter(newSupp => {
            // Πρέπει να έχει ένα από τα available statuses
            if (!AVAILABLE_STATUSES.includes(newSupp.translated_status)) return false;

            const oldSupp = oldSupplierInfo.find(old => old.name === newSupp.name);

            // True αν:
            // 1. Δεν υπήρχε καθόλου (νέος supplier με available status)
            // 2. Υπήρχε αλλά ΔΕΝ είχε available status (επέστρεψε σε available)
            return !oldSupp || !AVAILABLE_STATUSES.includes(oldSupp.translated_status);
        });

        if (newlyAvailableSuppliers.length === 0) return; // Κανείς δεν επέστρεψε

        // ✅ Στείλε email για τον πρώτο που επέστρεψε
        const supplierThatCameBack = newlyAvailableSuppliers[0];

        const emailVariables = {
            product: {
                name: entryCheck.name,
                id: entryCheck.id,
                currentInventory: entryCheck.inventory || 0,
                currentStatus: entryCheck.status,
                supplier: supplierThatCameBack.name || 'Άγνωστος',
                supplierStatus: supplierThatCameBack.translated_status, // ✅ Προσθήκη του status
                supplierStockLevel: supplierThatCameBack.stock_level || '-', // ✅ Το ακριβές stock level
                supplierProductId: supplierThatCameBack.supplierProductId ||
                    supplierThatCameBack.supplier_mpn ||
                    supplierThatCameBack.mpn ||
                    supplierThatCameBack.barcode ||
                    product.supplierCode ||
                    '-',
                supplierPrice: supplierThatCameBack.wholesale ||
                    supplierThatCameBack.price ||
                    '-',
                supplierRetailPrice: supplierThatCameBack.retail_price || '-',
                totalSuppliersReturned: newlyAvailableSuppliers.length,
                allSuppliers: newlyAvailableSuppliers.map(s => `${s.name} (${s.translated_status})`).join(', ')
            },
        };

        try {
            await strapi.service('api::order.order').sendConfirmOrderEmail({
                templateReferenceId: 10,
                to: ['giorgos_mitrakos@yahoo.com', "info@magnetmarket.gr", "kkoulogiannis@gmail.com"],
                emailVariables,
                subject: "⚠️ Προμηθευτής ξανά διαθέσιμος!"
            });

            // ✅ Reset το flag
            data.notice_if_available = false;

            strapi.log.info(
                `[Import] ✅ Supplier availability notification sent for product: ${entryCheck.name} (${entryCheck.id})` +
                ` - Supplier(s): ${emailVariables.product.allSuppliers}`
            );
        } catch (error) {
            strapi.log.error(`[Import] ❌ Failed to send notification for product ${entryCheck.id}:`, error);
        }
    },

    async updateProductMetadata(entryCheck, product, categoryInfo, data, dbChange) {
        try {
            // Αν το προϊόν δεν είναι σε κάποια κατηγορία ή αν είναι σε διαφορετική 
            // από ότι βρήκα στο μαπάρισμα του προμηθευτή ενημερώνω την κατηγορία.
            // εδώ κινδυνέυω αν εχει γίνει λάθος μαπάρισμα να αλλάζει το προϊόν συνεχώς κατηγορίες
            // μελλοντικά θα συμβαίνει και όταν θα διορθώνω τις κατηγορίες μέσω το σκρουτζ
            if (!entryCheck.category || entryCheck.category.id !== categoryInfo.id) {
                data.category = categoryInfo.id
                dbChange.typeOfChange = 'updated'
            }

            // Αν δεν υπάρχει slug το δημιουργώ
            if (entryCheck.slug?.includes("undefined")) {
                data.slug = this.createSlug(product.name, product.mpn)
                dbChange.typeOfChange = 'updated'
            }

            // Αν δεν υπάρχει barcode και έχει barcode στο import τότε το ενημερώνω
            if (!entryCheck.barcode && product.barcode) {
                data.barcode = product.barcode
                dbChange.typeOfChange = 'updated'
            }

            // Αν δεν υπάρχουν διαστάσεις και έχει στο import τότε το ενημερώνω
            // Update dimensions if missing
            const dimensions = {
                length: Number(product.length),
                width: Number(product.width),
                height: Number(product.height)
            };

            ['length', 'width', 'height'].forEach(dim => {
                if (isNaN(dimensions[dim])) return
                const ceiledValue = Math.ceil(dimensions[dim]);

                // Update only if:
                // 1. Database has no value and new value is valid (> 0)
                // 2. Database has value but it's different from new value
                if ((!entryCheck[dim] && ceiledValue > 0) ||
                    (entryCheck[dim] && entryCheck[dim] !== ceiledValue && ceiledValue > 0)) {
                    data[dim] = ceiledValue;
                    dbChange.typeOfChange = 'updated';
                }
            });

            //Εδώ κάνω έλεγχο Κατασκευαστή
            // Update brand if different
            if (product.brand) {

                if (!entryCheck.brand || entryCheck.brand.id !== product.brand.id) {
                    data.brand = product.brand.id;
                    dbChange.typeOfChange = 'updated';
                }
            }

            try {
                strapi.plugin('import-products')
                    .service('productHelpers')
                    .updateProductWeight(entryCheck, product, categoryInfo, data, dbChange);
            } catch (error) {
                console.error('Error updating product weight:', error, 'Product:', entryCheck.id);
                // Continue - don't let weight calculation break the entire update
            }

            // //Υπολογισμός βάρους
            // if (!product.weight) {
            //     product.weight = strapi
            //         .plugin('import-products')
            //         .service('productHelpers')
            //         .createProductWeight(product, categoryInfo)
            // }

            // // Να το ελέγξω όταν θα έχω περάσει όλους τους προμηθευτές
            // if (!entryCheck.weight) {
            //     if (entryCheck.weight === 0) {
            //         if (parseInt(product.weight) === 0) {
            //             if (categoryInfo.average_weight) {
            //                 data.weight = parseInt(categoryInfo.average_weight)
            //                 dbChange.typeOfChange = 'updated'
            //             }
            //         }
            //         else if (parseInt(product.weight) !== 0) {
            //             data.weight = parseInt(product.weight)
            //             dbChange.typeOfChange = 'updated'
            //         }
            //     }
            //     else {
            //         data.weight = categoryInfo.average_weight ? parseInt(categoryInfo.average_weight) : parseInt(0)
            //         dbChange.typeOfChange = 'updated'
            //     }
            // }
            // else {
            //     if (product.weight && product.weight > 0) {
            //         if (parseInt(entryCheck.weight) !== parseInt(product.weight)) {
            //             data.weight = parseInt(product.weight)
            //             dbChange.typeOfChange = 'updated'
            //         }
            //     }
            //     else {
            //         if (categoryInfo.average_weight && parseInt(categoryInfo.average_weight) !== parseInt(entryCheck.weight)) {
            //             data.weight = parseInt(categoryInfo.average_weight)
            //             dbChange.typeOfChange = 'updated'
            //         }
            //     }
            // }


        } catch (error) {
            console.error(error)
        }
    },

    createSlug(name, mpn) {
        try {
            const newName = name.replaceAll('-', ' ').replaceAll('&apos;', " ")
            if (!mpn) {
                const slug = slugify(`${newName}`, { lower: true, remove: /[^A-Za-z0-9_'.~\s]/g })
                return slug
            }

            const slug = slugify(`${newName}-${mpn}`, { lower: true, remove: /[^A-Za-z0-9_.~\s]/g })
            return slug
        } catch (error) {
            console.log(error)
        }
    },

    async deleteNonRelatedProducts() {

        // ✅ ΠΡΟΣΘΗΚΗ: Φόρτωση brand exclusions
        const suppliers = await strapi.entityService.findMany('plugin::import-products.importxml', {
            filters: { isActive: true },
            populate: {
                brand_excl_map: { select: ['brand_name'] }
            }
        });

        const brandExclList = [];
        for (const supplier of suppliers) {
            if (supplier.brand_excl_map && supplier.brand_excl_map.length > 0) {
                brandExclList.push(...supplier.brand_excl_map);
            }
        }

        const nonRelatedProducts = await strapi.entityService.findMany('api::product.product', {
            populate: {
                supplierInfo: true
            }
        });

        for (let product of nonRelatedProducts) {
            const data = {}
            const newSuppliers = []
            if (product.supplierInfo) {
                product.supplierInfo.forEach(element => {
                    element.in_stock = false
                    newSuppliers.push(element)
                });

                if (newSuppliers.length > 0) {
                    data.supplierInfo = newSuppliers
                    // Ελέγχω αν δεν υπάρχει διαθέσιμο σε κανένα προμηθευτή
                    const isAllSuppliersOutOfStock = data.supplierInfo.every(supplier => supplier.in_stock === false)

                    // Αν υπάρχει ακόμα διαθέσιμο σε κάποιον τότε ενημερώνω τη βάση
                    // με τη διαθεσιμότητα του προϊόντος στους προμηθευτές
                    // αλλίως ενημερώνω τη βάση με τη διαθεσιμότητα του προϊόντος στους προμηθευτές
                    // προσθέτω ημερομηνία διαγραφής (δεν υπάρχει διαθέσιμο σε κανένα προμηθευτή)
                    // και ελέγχω αν υπάρχει στην αποθήκη μας, αν όχι τότε κάνω το προϊόν draft
                    if (isAllSuppliersOutOfStock) {
                        data.deletedAt = new Date();
                        // Υπολογίζουμε status βάσει inventory
                        // ✅ Χρήση του brandExclList:
                        data.status = strapi
                            .plugin('import-products')
                            .service('productStatusHelper')
                            .calculateProductStatus(
                                checkProduct.inventory || 0,
                                data.supplierInfo,
                                product,
                                brandExclList  // ✅ Τώρα υπάρχει
                            );
                    }
                    else {
                        // Κάποιος supplier έχει ακόμα - υπολογίζουμε status
                        // ✅ Χρήση του brandExclList:
                        data.status = strapi
                            .plugin('import-products')
                            .service('productStatusHelper')
                            .calculateProductStatus(
                                checkProduct.inventory || 0,
                                data.supplierInfo,
                                product,
                                brandExclList  // ✅ Τώρα υπάρχει
                            );
                    }
                }
                else {
                    await strapi.entityService.delete('api::product.product', product.id);
                    continue; // Skip το update
                }

                if (Object.keys(data).length !== 0) {
                    await strapi.entityService.update('api::product.product', product.id, {
                        data
                    });
                }
            }
            else {
                // Αν δεν έχει supplierInfo, διέγραψε το προϊόν
                await strapi.entityService.delete('api::product.product', product.id);
            }
        }


    }
});
