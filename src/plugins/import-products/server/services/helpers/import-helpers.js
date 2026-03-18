'use strict';

const Axios = require('axios');
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
            related_entries: new Set(),
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

        // ✅ Φόρτωσε brand_excl_map με allow_import
        importRef.brand_excl_map = await strapi.db.query('plugin::import-products.brandexclmap').findMany({
            where: { related_import: entry.id },
            select: ['brand_name', 'allow_import']
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
            if (!xml) return

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

        // ✅ Brand block check — μην δημιουργήσεις αν το brand είναι blocked
        const newProductBrandName = product.brandName || product.brand?.name;
        if (this.isBrandBlocked(newProductBrandName, importRef.brand_excl_map)) {
            console.log(`🚫 Brand blocked, skipping create: ${product.name} (${newProductBrandName})`);
            importRef.skipped += 1;
            return { success: false, reason: 'brand_blocked' };
        }

        try {
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

            data.weight = strapi
                .plugin('import-products')
                .service('productHelpers')
                .createProductWeight(product, categoryInfo)

            let responseImage = await strapi
                .plugin('import-products')
                .service('fileHelpers')
                .getAndConvertImgToWep(product);

            if (!responseImage) {
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

            importRef.related_entries.add(newEntry.id);

            if (product.relativeProducts && product.relativeProducts.length > 0) {
                importRef.related_products.push({
                    productID: newEntry.id,
                    relatedProducts: product.relativeProducts
                });
            }

            importRef.created += 1;

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
            let dbChange = { typeOfChange: "Skipped" }
            const data = {}

            const categoryInfo = await strapi
                .plugin('import-products')
                .service('categoryHelpers')
                .getCategory(importRef.categoryMap.categories_map,
                    product.name, product.category.title, product.subcategory?.title, product.sub2category?.title);

            // ✅ Brand block check — unpublish αν το brand είναι blocked
            let updateBrandName = product.brandName || product.brand?.name;
            if (!updateBrandName && entryCheck.brand) {
                if (typeof entryCheck.brand === 'object') {
                    updateBrandName = entryCheck.brand.name;
                } else if (importRef.brand_excl_map?.length > 0) {
                    const brandFromCache = strapi
                        .plugin('import-products')
                        .service('cacheService')
                        .getBrandById?.(entryCheck.brand);
                    updateBrandName = brandFromCache?.name;
                }
            }

            if (this.isBrandBlocked(updateBrandName, importRef.brand_excl_map)) {
                if (entryCheck.publishedAt !== null) {
                    await strapi.entityService.update('api::product.product', entryCheck.id, {
                        data: { publishedAt: null }
                    });
                    console.log(`🚫 Brand blocked, unpublished: ${entryCheck.name} (${updateBrandName})`);
                    importRef.updated += 1;
                } else {
                    importRef.skipped += 1;
                }
                return { success: true, changeType: entryCheck.publishedAt !== null ? 'updated' : 'Skipped' };
            }

            // Update import references
            this.updateImportReferences(importRef, entryCheck, product, data);

            // Update product chars
            this.updateProductChars(importRef, entryCheck, product, data, dbChange);

            // Update product metadata
            await this.updateProductMetadata(entryCheck, product, categoryInfo, data, dbChange);

            // Ενημερώνω τυχών αλλαγές στις τιμές του προμηθευτή
            strapi
                .plugin('import-products')
                .service('supplierHelpers')
                .updateSupplierInfo(entryCheck, product, data, dbChange, importRef)

            // Handle supplier availability notifications
            await this.handleAvailabilityNotifications(entryCheck, product, data);

            const skroutz = entryCheck.platforms.find(x => x.platform === "Skroutz")
            const shopflix = entryCheck.platforms.find(x => x.platform === "Shopflix")

            let info = data.supplierInfo ? data.supplierInfo : entryCheck.supplierInfo

            const productPrices = await strapi
                .plugin('import-products')
                .service('priceHelpers')
                .setPrice(entryCheck, info, categoryInfo, product);

            if (!skroutz || !shopflix ||
                strapi.plugin('import-products').service('priceHelpers').is_not_equal(skroutz.price, productPrices.skroutzPrice.price) ||
                skroutz.is_fixed_price !== productPrices.skroutzPrice.is_fixed_price ||
                strapi.plugin('import-products').service('priceHelpers').is_not_equal(shopflix.price, productPrices.shopflixPrice.price) ||
                shopflix.is_fixed_price !== productPrices.shopflixPrice.is_fixed_price ||
                strapi.plugin('import-products').service('priceHelpers').is_not_equal(entryCheck.price, productPrices.generalPrice.price)) {

                data.is_fixed_price = productPrices.generalPrice.isFixed;
                data.price = productPrices.generalPrice.price
                data.platforms = [
                    productPrices.skroutzPrice,
                    productPrices.shopflixPrice
                ]
                dbChange.typeOfChange = 'updated'
            }

            if (entryCheck.publishedAt === null) {
                data.need_verify = false
                data.publishedAt = new Date()
                data.deletedAt = null
                dbChange.typeOfChange = 'republished'
            }

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
                    productForStatus,
                    importRef.brand_excl_map
                );

            if (calculatedStatus !== entryCheck.status) {
                data.status = calculatedStatus;
                dbChange.typeOfChange = 'updated';
            }

            const finalStatus = data.status !== undefined ? data.status : entryCheck.status;

            if (finalStatus === 'OutOfStock' || finalStatus === 'Discontinued') {
                if (!entryCheck.deletedAt) {
                    data.deletedAt = new Date();
                    if (dbChange.typeOfChange === 'Skipped') {
                        dbChange.typeOfChange = 'updated';
                    }
                }
            } else {
                if (entryCheck.deletedAt) {
                    data.deletedAt = null;
                    if (dbChange.typeOfChange === 'Skipped') {
                        dbChange.typeOfChange = 'updated';
                    }
                }
            }

            if (Object.keys(data).length !== 0) {
                const cacheService = strapi.plugin('import-products').service('cacheService');
                cacheService.cache.processingProducts.add(entryCheck.id);

                try {
                    const updated = await strapi.entityService.update('api::product.product', entryCheck.id, { data });

                    if (!updated) {
                        console.error('Failed to update product:', entryCheck.id);
                        return { success: false, reason: 'update_failed' }
                    }
                } finally {
                    cacheService.cache.processingProducts.delete(entryCheck.id);
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
                                    { publishedAt: { $notNull: true } },
                                    { supplierInfo: { name: entry.name } },
                                ]
                            },
                        }
                    },
                });

            for (let product of importXmlFile.related_products) {

                if (!importRef.related_entries.has(product.id)) {

                    const data = {}
                    let needsUpdate = false;

                    const checkProduct = await strapi.entityService.findOne('api::product.product', product.id, {
                        populate: {
                            supplierInfo: true,
                            related_import: true,
                            brand: true
                        },
                    })

                    let supplierInfo = checkProduct.supplierInfo

                    const index = supplierInfo.findIndex((o) => o.name === entry.name)

                    if (index === -1) {
                        let relatedImports = checkProduct.related_import.filter(x => x.id !== entry.id)
                        data.related_import = relatedImports
                        needsUpdate = true;
                        importRef.deleted += 1;
                    } else {
                        let supplierChanged = false;

                        if (supplierInfo[index].in_stock !== false) {
                            supplierInfo[index].in_stock = false;
                            supplierChanged = true;
                            importRef.deleted += 1;
                        }

                        const fieldsToClean = ['translated_status', 'stock_level', 'quantity'];
                        for (const field of fieldsToClean) {
                            if (supplierInfo[index][field] !== null) {
                                supplierInfo[index][field] = null;
                                supplierChanged = true;
                            }
                        }

                        if (supplierChanged) {
                            needsUpdate = true;
                        }
                    }

                    if (needsUpdate) {
                        data.supplierInfo = supplierInfo;
                    }

                    const productForStatus = {
                        ...product,
                        brandName: checkProduct.brand?.name || checkProduct.brand,
                        status: checkProduct.status
                    };

                    const calculatedStatus = strapi
                        .plugin('import-products')
                        .service('productStatusHelper')
                        .calculateProductStatus(
                            checkProduct.inventory || 0,
                            supplierInfo,
                            productForStatus,
                            importRef.brand_excl_map
                        );

                    if (calculatedStatus !== checkProduct.status) {
                        data.status = calculatedStatus;
                        needsUpdate = true;
                    }

                    const finalStatus = data.status !== undefined ? data.status : checkProduct.status;

                    if (finalStatus === 'OutOfStock' || finalStatus === 'Discontinued') {
                        if (!checkProduct.deletedAt) {
                            data.deletedAt = new Date();
                            needsUpdate = true;
                        }
                    } else {
                        if (checkProduct.deletedAt) {
                            data.deletedAt = null;
                            needsUpdate = true;
                        }
                    }

                    if (needsUpdate) {
                        await strapi.entityService.update('api::product.product', product.id, {
                            data: data,
                        });
                    }
                }
            }

            // ✅ Sync brand blocking/unblocking στο τέλος κάθε import
            await Promise.all([
                this.unpublishBlockedBrandProducts(entry),
                this.republishUnblockedBrandProducts(entry)
            ]);

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
        importRef.related_entries.add(entryCheck.id);

        if (product.relativeProducts?.length > 0) {
            importRef.related_products.push({
                productID: entryCheck.id,
                relatedProducts: product.relativeProducts
            });
        }

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

    async updateProductChars(importRef, entryCheck, product, data, dbChange) {
        if (product.prod_chars?.length === 0) return;

        try {
            const existingChars = await strapi
                .plugin('import-products')
                .service('cacheService')
                .loadProductChars(entryCheck.id);

            if (existingChars.length === 0 && product.prod_chars?.length > 0) {
                data.prod_chars = product.prod_chars;
                dbChange.typeOfChange = 'updated';
            }
        } catch (error) {
            console.error('Error in lazy load of prod_chars:', error.message);
        }
    },

    async handleAvailabilityNotifications(entryCheck, product, data) {
        if (!entryCheck.notice_if_available) return;

        const AVAILABLE_STATUSES = ['InStock', 'MediumStock', 'LowStock'];
        const oldSupplierInfo = entryCheck.supplierInfo;
        const newSupplierInfo = data.supplierInfo || oldSupplierInfo;

        const allSuppliersWereUnavailable = oldSupplierInfo.every(s =>
            !AVAILABLE_STATUSES.includes(s.translated_status)
        );

        if (!allSuppliersWereUnavailable) return;

        const newlyAvailableSuppliers = newSupplierInfo.filter(newSupp => {
            if (!AVAILABLE_STATUSES.includes(newSupp.translated_status)) return false;
            const oldSupp = oldSupplierInfo.find(old => old.name === newSupp.name);
            return !oldSupp || !AVAILABLE_STATUSES.includes(oldSupp.translated_status);
        });

        if (newlyAvailableSuppliers.length === 0) return;

        const supplierThatCameBack = newlyAvailableSuppliers[0];

        const emailVariables = {
            product: {
                name: entryCheck.name,
                id: entryCheck.id,
                currentInventory: entryCheck.inventory || 0,
                currentStatus: entryCheck.status,
                supplier: supplierThatCameBack.name || 'Άγνωστος',
                supplierStatus: supplierThatCameBack.translated_status,
                supplierStockLevel: supplierThatCameBack.stock_level || '-',
                supplierProductId: supplierThatCameBack.supplierProductId ||
                    supplierThatCameBack.supplier_mpn ||
                    supplierThatCameBack.mpn ||
                    supplierThatCameBack.barcode ||
                    product.supplierCode ||
                    '-',
                supplierPrice: supplierThatCameBack.wholesale || supplierThatCameBack.price || '-',
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
            if (!entryCheck.category || entryCheck.category.id !== categoryInfo.id) {
                data.category = categoryInfo.id
                dbChange.typeOfChange = 'updated'
            }

            if (entryCheck.slug?.includes("undefined")) {
                data.slug = this.createSlug(product.name, product.mpn)
                dbChange.typeOfChange = 'updated'
            }

            if (!entryCheck.barcode && product.barcode) {
                data.barcode = product.barcode
                dbChange.typeOfChange = 'updated'
            }

            const dimensions = {
                length: Number(product.length),
                width: Number(product.width),
                height: Number(product.height)
            };

            ['length', 'width', 'height'].forEach(dim => {
                if (isNaN(dimensions[dim])) return
                const ceiledValue = Math.ceil(dimensions[dim]);
                if ((!entryCheck[dim] && ceiledValue > 0) ||
                    (entryCheck[dim] && entryCheck[dim] !== ceiledValue && ceiledValue > 0)) {
                    data[dim] = ceiledValue;
                    dbChange.typeOfChange = 'updated';
                }
            });

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
            }

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
        const suppliers = await strapi.entityService.findMany('plugin::import-products.importxml', {
            filters: { isActive: true },
            populate: {
                brand_excl_map: { select: ['brand_name', 'allow_import'] }
            }
        });

        const brandExclList = [];
        for (const supplier of suppliers) {
            if (supplier.brand_excl_map && supplier.brand_excl_map.length > 0) {
                brandExclList.push(...supplier.brand_excl_map);
            }
        }

        const nonRelatedProducts = await strapi.entityService.findMany('api::product.product', {
            populate: { supplierInfo: true }
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
                    const isAllSuppliersOutOfStock = data.supplierInfo.every(supplier => supplier.in_stock === false)

                    data.status = strapi
                        .plugin('import-products')
                        .service('productStatusHelper')
                        .calculateProductStatus(
                            product.inventory || 0,
                            data.supplierInfo,
                            product,
                            brandExclList
                        );

                    if (isAllSuppliersOutOfStock) {
                        data.deletedAt = new Date();
                    }
                } else {
                    await strapi.entityService.delete('api::product.product', product.id);
                    continue;
                }

                if (Object.keys(data).length !== 0) {
                    await strapi.entityService.update('api::product.product', product.id, { data });
                }
            } else {
                await strapi.entityService.delete('api::product.product', product.id);
            }
        }
    },

    // ─────────────────────────────────────────────
    // BRAND BLOCKING HELPERS
    // ─────────────────────────────────────────────

    /**
     * Ελέγχει αν ένα brand είναι blocked για τον συγκεκριμένο supplier
     */
    isBrandBlocked(brandName, brand_excl_map) {
        if (!brandName || !brand_excl_map?.length) return false;
        const entry = brand_excl_map.find(b =>
            b.brand_name.toLowerCase().trim() === brandName.toLowerCase().trim()
        );
        // ✅ Μπλοκάρει ΜΟΝΟ αν allow_import είναι ρητά false
        return entry !== undefined && entry.allow_import === false;
    },

    /**
     * Unpublish όλων των published προϊόντων με blocked brand για τον συγκεκριμένο supplier
     */
    async unpublishBlockedBrandProducts(entry) {
        try {
            const blockedBrands = await strapi.db.query('plugin::import-products.brandexclmap').findMany({
                where: {
                    related_import: entry.id,
                    allow_import: false
                },
                select: ['brand_name']
            });

            if (!blockedBrands?.length) {
                console.log(`[BrandBlock] No blocked brands for supplier: ${entry.name}`);
                return { unpublished: 0 };
            }

            const blockedBrandNames = blockedBrands.map(b => b.brand_name.toLowerCase().trim());
            console.log(`[BrandBlock] Checking brands: ${blockedBrandNames.join(', ')}`);

            let unpublishedCount = 0;
            let page = 1;
            const pageSize = 100;

            while (true) {
                const products = await strapi.entityService.findMany('api::product.product', {
                    filters: {
                        publishedAt: { $notNull: true },
                        related_import: { id: entry.id },
                        brand: {
                            name: { $in: blockedBrands.map(b => b.brand_name) }
                        }
                    },
                    populate: { brand: { fields: ['name'] } },
                    fields: ['id', 'name', 'publishedAt'],
                    pagination: { page, pageSize }
                });

                if (!products?.length) break;

                for (const product of products) {
                    const brandName = product.brand?.name?.toLowerCase().trim();
                    if (!brandName || !blockedBrandNames.includes(brandName)) continue;

                    try {
                        await strapi.entityService.update('api::product.product', product.id, {
                            data: {
                                publishedAt: null,
                                status: 'OutOfStock',
                                deletedAt: new Date()
                            }
                        });
                        unpublishedCount++;
                        console.log(`🚫 [BrandBlock] Unpublished: ${product.name} (${product.brand?.name})`);
                    } catch (error) {
                        console.error(`[BrandBlock] Failed to unpublish product ${product.id}:`, error.message);
                    }
                }

                if (products.length < pageSize) break;
                page++;
            }

            console.log(`[BrandBlock] Done. Unpublished ${unpublishedCount} products for supplier: ${entry.name}`);
            return { unpublished: unpublishedCount };

        } catch (error) {
            console.error('[BrandBlock] unpublishBlockedBrandProducts failed:', error.message);
            return { unpublished: 0 };
        }
    },

    /**
     * Republish προϊόντων με brand που έγινε πάλι allowed για τον συγκεκριμένο supplier
     */
    async republishUnblockedBrandProducts(entry) {
        try {
            const allowedBrands = await strapi.db.query('plugin::import-products.brandexclmap').findMany({
                where: {
                    related_import: entry.id,
                    allow_import: true
                },
                select: ['brand_name']
            });

            if (!allowedBrands?.length) {
                console.log(`[BrandUnblock] No allowed brands for supplier: ${entry.name}`);
                return { republished: 0 };
            }

            const allowedBrandNames = allowedBrands.map(b => b.brand_name.toLowerCase().trim());
            console.log(`[BrandUnblock] Checking brands: ${allowedBrandNames.join(', ')}`);

            let republishedCount = 0;
            let page = 1;
            const pageSize = 100;

            while (true) {
                const products = await strapi.entityService.findMany('api::product.product', {
                    filters: {
                        publishedAt: { $null: true },
                        related_import: { id: entry.id },
                        brand: {
                            name: { $in: allowedBrands.map(b => b.brand_name) }
                        }
                    },
                    populate: {
                        brand: { fields: ['name'] },
                        supplierInfo: true
                    },
                    fields: ['id', 'name', 'publishedAt', 'inventory'],
                    pagination: { page, pageSize }
                });

                if (!products?.length) break;

                for (const product of products) {
                    const brandName = product.brand?.name?.toLowerCase().trim();
                    if (!brandName || !allowedBrandNames.includes(brandName)) continue;

                    try {
                        const calculatedStatus = strapi
                            .plugin('import-products')
                            .service('productStatusHelper')
                            .calculateProductStatus(
                                product.inventory || 0,
                                product.supplierInfo || [],
                                product,
                                [] // Brand είναι πλέον allowed — δεν χρειάζεται excl check
                            );

                        const hasAvailableSupplier = product.supplierInfo?.some(s => s.in_stock === true);

                        await strapi.entityService.update('api::product.product', product.id, {
                            data: {
                                publishedAt: hasAvailableSupplier ? new Date() : null,
                                status: calculatedStatus,
                                deletedAt: (calculatedStatus === 'OutOfStock' || calculatedStatus === 'Discontinued')
                                    ? new Date()
                                    : null
                            }
                        });

                        if (hasAvailableSupplier) {
                            republishedCount++;
                            console.log(`✅ [BrandUnblock] Republished: ${product.name} (${product.brand?.name}) → ${calculatedStatus}`);
                        } else {
                            console.log(`⏭️ [BrandUnblock] Skipped (no available supplier): ${product.name}`);
                        }
                    } catch (error) {
                        console.error(`[BrandUnblock] Failed to republish product ${product.id}:`, error.message);
                    }
                }

                if (products.length < pageSize) break;
                page++;
            }

            console.log(`[BrandUnblock] Done. Republished ${republishedCount} products for supplier: ${entry.name}`);
            return { republished: republishedCount };

        } catch (error) {
            console.error('[BrandUnblock] republishUnblockedBrandProducts failed:', error.message);
            return { republished: 0 };
        }
    },
});