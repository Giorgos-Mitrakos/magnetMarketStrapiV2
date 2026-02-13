'use strict';

module.exports = ({ strapi }) => ({
    createPriceProgress(product) {
        try {
            return {
                date: new Date(),
                ...(product.in_offer && { in_offer: product.in_offer }),
                ...(product.discount && { discount: product.discount }),
                ...(product.initial_wholesale && {
                    initial_wholesale: strapi
                        .plugin('import-products')
                        .service('priceHelpers')
                        .formatPrice(product.initial_wholesale)
                }),
                ...(product.wholesale && {
                    wholesale: strapi
                        .plugin('import-products')
                        .service('priceHelpers')
                        .formatPrice(product.wholesale)
                }),
                ...(product.retail_price && {
                    retail_price: strapi
                        .plugin('import-products')
                        .service('priceHelpers')
                        .formatPrice(product.retail_price)
                })
            };

        } catch (error) {
            console.log(error)
        }

    },

    createSupplierInfoData(product, price_progress, stockMap = []) {
        try {
            // ✅ ULTRA SIMPLE: Field mapping έχει ήδη κάνει τη δουλειά
            // product.quantity = αριθμός (αν υπάρχει numeric field)
            // product.stock_level = string status (ό,τι και να είναι - "Διαθέσιμο", "1-3", "Coming Soon")

            const quantity = product.quantity ? parseInt(product.quantity) : null;
            const stockLevel = product.stock_level ? String(product.stock_level).trim() : null;

            // ✅ Translate stock_level → translated_status
            let translatedStatus = null;
            if (stockLevel && stockMap && stockMap.length > 0) {
                const mapEntry = stockMap.find(x =>
                    x.name_in_xml.trim().toLowerCase() === stockLevel.trim().toLowerCase()
                );

                if (mapEntry) {
                    translatedStatus = mapEntry.translate_to;
                }
            }

            // Simple in_stock logic
            const availableStatuses = ["InStock", "MediumStock", "LowStock"];

            let inStock;
            if (translatedStatus) {
                inStock = availableStatuses.includes(translatedStatus);
            } else if (quantity !== null) {
                inStock = quantity > 0;
            } else {
                inStock = false;
            }

            return {
                name: product.entry.name,
                in_stock: inStock,
                quantity: quantity,
                stock_level: stockLevel,
                translated_status: translatedStatus,
                wholesale: strapi
                    .plugin('import-products')
                    .service('priceHelpers')
                    .formatPrice(product.wholesale),
                supplierProductId: product.supplierCode,
                supplierProductURL: product.link,
                price_progress: Array.isArray(price_progress) ? price_progress : [price_progress],
                ...(product.in_offer && { in_offer: product.in_offer }),
                ...(product.initial_retail_price && {
                    initial_retail_price: strapi
                        .plugin('import-products')
                        .service('priceHelpers')
                        .formatPrice(product.initial_retail_price)
                }),
                ...(product.retail_price && {
                    retail_price: strapi
                        .plugin('import-products')
                        .service('priceHelpers')
                        .formatPrice(product.retail_price)
                }),
                ...(product.recycle_tax && {
                    recycle_tax: strapi
                        .plugin('import-products')
                        .service('priceHelpers')
                        .formatPrice(product.recycle_tax)
                }),
            }
        }
        catch (error) {
            console.error('Failed to create supplier info:', error);
            return {
                name: product.entry.name,
                in_stock: true,
                quantity: null,
                stock_level: null,
                translated_status: null,
                price_progress: []
            };
        }
    },

    updateSupplierInfo(entryCheck, product, data, dbChange, importRef) {
        try {
            let isNeedUpdate = false;
            const allowedStatuses = strapi.components['products.info'].attributes.translated_status.enum;

            let supplierInfo = entryCheck.supplierInfo.map(sup => {
                let updatedSup = { ...sup };
                const isSupplierActive = importRef.suppliers.some(
                    s => s.name.toLowerCase() === sup.name.toLowerCase()
                );
                if (!isSupplierActive && sup.in_stock !== false) {
                    isNeedUpdate = true;
                    updatedSup.in_stock = false;
                }
                return updatedSup;
            });

            const supplierIndex = supplierInfo.findIndex(o => o.name === product.entry.name);

            if (supplierIndex !== -1) {
                // Υπολογισμός νέου status
                const currentStockLevel = product.stock_level ? String(product.stock_level).trim() : null;
                let currentTranslatedStatus = null;

                if (currentStockLevel && importRef.categoryMap.stock_map) {
                    const mapEntry = importRef.categoryMap.stock_map.find(x =>
                        x.name_in_xml.trim().toLowerCase() === currentStockLevel.toLowerCase()
                    );
                    if (mapEntry && allowedStatuses.includes(mapEntry.translate_to)) {
                        currentTranslatedStatus = mapEntry.translate_to;
                    }
                }

                // inject τα status για να τα βρει η updateOtherFields
                supplierInfo[supplierIndex].old_translated_status = supplierInfo[supplierIndex].translated_status;
                supplierInfo[supplierIndex].translated_status = currentTranslatedStatus;

                this.handleExistingSupplier(supplierInfo, supplierIndex, product, data, dbChange, false, importRef);
            } else {
                this.createNewSupplier(supplierInfo, product, data, dbChange, importRef);
            }

            if (isNeedUpdate) {
                data.supplierInfo = supplierInfo;
                if (dbChange.typeOfChange === 'Skipped') dbChange.typeOfChange = 'updated';
            }
        } catch (error) {
            console.log("Error in updateSupplierInfo:", error);
        }
    },

    // Helper methods for better organization
    handleExistingSupplier(supplierInfo, index, product, data, dbChange, isDotMedia, importRef) {
        let currentSupplier = supplierInfo[index];

        const currentWholesale = strapi.plugin('import-products').service('priceHelpers').formatPrice(currentSupplier.wholesale);
        const productWholesalePrice = strapi.plugin('import-products').service('priceHelpers').formatPrice(product.wholesale);
        const currentRetailPrice = strapi.plugin('import-products').service('priceHelpers').formatPrice(currentSupplier.retail_price);
        const productRetailPrice = product.retail_price ? strapi.plugin('import-products').service('priceHelpers').formatPrice(product.retail_price) : null;

        // 1. Έλεγχος Τιμών & Ιστορικού
        if (currentWholesale <= 0) {
            this.handleZeroWholesale(currentSupplier, product, data, dbChange, isDotMedia, supplierInfo);
        } else if (this.isPriceDifferent(currentWholesale, productWholesalePrice) ||
            (productRetailPrice && this.isPriceDifferent(currentRetailPrice, productRetailPrice))) {
            this.updatePriceWithHistory(currentSupplier, product, data, dbChange, supplierInfo, index, importRef);
        }

        // 2. Έλεγχος Status & Λοιπών Πεδίων (Τρέχει ΠΑΝΤΑ)
        this.updateOtherFields(currentSupplier, product, data, dbChange, supplierInfo, index);
    },

    handleZeroWholesale(supplier, product, data, dbChange, isDotMedia, supplierInfo) {
        const newWholesale = parseFloat(product.wholesale);

        if (newWholesale > 0) {
            supplier.wholesale = newWholesale;
            supplier.in_stock = true;
            data.supplierInfo = supplierInfo;
            dbChange.typeOfChange = 'updated';
        } else if (!isDotMedia && supplier.in_stock) {
            supplier.in_stock = false;
            data.supplierInfo = supplierInfo;
            dbChange.typeOfChange = 'updated';
        } else if (isDotMedia && !supplier.in_stock) {
            supplier.in_stock = true;
            data.supplierInfo = supplierInfo;
            dbChange.typeOfChange = 'republished';
        }
    },

    updatePriceWithHistory(supplier, product, data, dbChange, supplierInfo, index, importRef) {
        const priceProgress = supplier.price_progress;
        const newPriceProgress = strapi
            .plugin('import-products')
            .service('supplierHelpers')
            .createPriceProgress(product);

        const supplierRetailPrice = strapi
            .plugin('import-products')
            .service('priceHelpers')
            .formatPrice(supplier.retail_price);

        const productRetailPrice = strapi
            .plugin('import-products')
            .service('priceHelpers')
            .formatPrice(product.retail_price);

        priceProgress.push(newPriceProgress);

        // ✅ ΜΗΝ δημιουργείς νέο object - ενημέρωσε το υπάρχον!
        supplier.wholesale = strapi
            .plugin('import-products')
            .service('priceHelpers')
            .formatPrice(product.wholesale);

        if (productRetailPrice && supplierRetailPrice !== productRetailPrice) {
            supplier.retail_price = productRetailPrice;
        }

        // ✅ Ενημέρωσε και τα υπόλοιπα πεδία που χρειάζονται
        supplier.supplierProductId = product.supplierCode;
        supplier.supplierProductURL = product.link;

        if (product.in_offer !== undefined) {
            supplier.in_offer = product.in_offer;
        }

        if (product.initial_retail_price) {
            supplier.initial_retail_price = strapi
                .plugin('import-products')
                .service('priceHelpers')
                .formatPrice(product.initial_retail_price);
        }

        if (product.recycle_tax) {
            supplier.recycle_tax = strapi
                .plugin('import-products')
                .service('priceHelpers')
                .formatPrice(product.recycle_tax);
        }

        // ✅ ΔΕΝ χρειάζεται να ξανα-assign στο array - το object ενημερώθηκε by reference
        data.supplierInfo = supplierInfo;
        dbChange.typeOfChange = 'updated';
    },

    updateOtherFields(supplier, product, data, dbChange, supplierInfo, index) {
        let needsUpdate = false;

        // Translated Status (IsExpected, κλπ)
        if (supplier.translated_status !== supplier.old_translated_status) {
            needsUpdate = true;
        }

        // Stock Level String (λεκτικό προμηθευτή)
        const newStockLevel = product.stock_level ? String(product.stock_level).trim() : null;
        if (newStockLevel !== supplier.stock_level) {
            supplier.stock_level = newStockLevel;
            needsUpdate = true;
        }

        // Quantity (αριθμητικό)
        const newQuantity = product.quantity ? parseInt(product.quantity) : null;
        if (newQuantity !== supplier.quantity) {
            supplier.quantity = newQuantity;
            needsUpdate = true;
        }

        // ✅ ΛΟΓΙΚΗ 2: Προτεραιότητα στο translated_status, fallback στο quantity
        const availableStatuses = ["InStock", "MediumStock", "LowStock"];

        let inStockFromXml;

        if (supplier.translated_status) {
            // Αν υπάρχει translated_status, αυτό κυριαρχεί
            inStockFromXml = availableStatuses.includes(supplier.translated_status);
        } else if (newQuantity !== null) {
            // Αν δεν υπάρχει translated_status, χρησιμοποιούμε quantity
            inStockFromXml = newQuantity > 0;
        } else {
            // Αν δεν υπάρχει τίποτα, θεωρούμε out of stock
            inStockFromXml = false;
        }

        // In Stock Logic
        if (supplier.in_stock !== inStockFromXml) {
            supplier.in_stock = inStockFromXml;
            needsUpdate = true;
        }

        if (needsUpdate) {
            delete supplier.old_translated_status; // Καθαρισμός
            supplierInfo[index] = supplier;
            data.supplierInfo = supplierInfo;
            if (dbChange.typeOfChange === 'Skipped') {
                dbChange.typeOfChange = 'updated';
            }
        }
    },

    isPriceDifferent(storedPrice, newPrice) {
        return strapi
            .plugin('import-products')
            .service('priceHelpers')
            .is_not_equal(storedPrice, newPrice);
    },

    createNewSupplier(supplierInfo, product, data, dbChange, importRef) {
        const priceProgress = strapi
            .plugin('import-products')
            .service('supplierHelpers')
            .createPriceProgress(product);

        supplierInfo.push(
            strapi.plugin('import-products')
                .service('supplierHelpers')
                .createSupplierInfoData(product, priceProgress, importRef.stock_map)
        );

        dbChange.typeOfChange = 'created';
        data.supplierInfo = supplierInfo;
    },
});
