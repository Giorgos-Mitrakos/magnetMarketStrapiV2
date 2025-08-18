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

    createSupplierInfoData(product, price_progress) {
        try {
            return {
                name: product.entry.name,
                in_stock: true,
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
                ...(product.quantity && { quantity: parseInt(product.quantity) })
            }
        }
        catch (error) {
            console.error('Failed to create supplier info:', error);
            return {
                name: product.entry.name,
                in_stock: true,
                price_progress: []
            };
        }

        const supplierInfo = {
            name: entry.name,
            in_stock: true,
            wholesale: strapi
                .plugin('import-products')
                .service('categoryHelpers')
                .formatPrice(product.wholesale),
            supplierProductId: product.supplierCode,
            supplierProductURL: product.link,
        }

        if (Array.isArray(price_progress)) {
            supplierInfo.price_progress = price_progress
        }
        else {
            supplierInfo.price_progress = [price_progress]
        }

        if (product.in_offer) {
            supplierInfo.in_offer = product.in_offer
        }

        if (product.initial_retail_price) {
            supplierInfo.initial_retail_price = strapi
                .plugin('import-products')
                .service('categoryHelpers').toFixed(2)
        }

        if (product.retail_price) {
            supplierInfo.retail_price = strapi
                .plugin('import-products')
                .service('categoryHelpers')
                .formatPrice(product.retail_price)
        }

        if (product.recycle_tax) {
            supplierInfo.recycle_tax = strapi
                .plugin('import-products')
                .service('categoryHelpers')
                .formatPrice(product.recycle_tax)
        }

        if (product.quantity) {
            supplierInfo.quantity = parseInt(product.quantity)
        }

        return supplierInfo
    },

    updateSupplierInfo(entryCheck, product, data, dbChange, importRef) {
        try {
            let isNeedUpdate = false

            // Ελέγχω αν το προϊόν έχει προμηθευτή που δεν χρησιμοποιώ πλέον και το κάνει μη διαθέσιμο 
            // για τον συγκεκριμένο προμηθευτή
            let supplierInfo = entryCheck.supplierInfo.map(sup => {
                const isSupplierActive = importRef.suppliers.some(
                    s => s.name.toLowerCase() === sup.name.toLowerCase()
                );

                if (!isSupplierActive) {
                    isNeedUpdate = true;
                    return { ...sup, in_stock: false };
                }

                return sup;
            });

            supplierInfo = supplierInfo.map(supplier => {
                const initialLength = supplier.price_progress.length;
                const filteredPriceProgress = supplier.price_progress.filter(x => x.wholesale && x.date);

                if (initialLength !== filteredPriceProgress.length) {
                    isNeedUpdate = true;
                }

                return {
                    ...supplier,
                    price_progress: filteredPriceProgress
                };
            });

            if (isNeedUpdate) {
                data.supplierInfo = supplierInfo
                dbChange.typeOfChange = 'updated'
            }

            // 3. Find or create supplier entry
            const supplierIndex = supplierInfo.findIndex(o => o.name === product.entry.name);
            const isDotMedia = product.entry.name.toLowerCase() === 'dotmedia';

            // αν υπάρχει ο προμηθευτής ενημερώνω
            // αλλίως δημιουργώ τον προμηθευτή για το προϊόν και κρατάω ιστορικό
            if (supplierIndex !== -1) {
                this.handleExistingSupplier(
                    supplierInfo,
                    supplierIndex,
                    product,
                    data,
                    dbChange,
                    isDotMedia
                );
            }
            else {
                this.createNewSupplier(supplierInfo, product, data, dbChange);
            }

        } catch (error) {
            console.log(error)
        }

    },

    // Helper methods for better organization
    handleExistingSupplier(supplierInfo, index, product, data, dbChange, isDotMedia) {
        const currentSupplier = supplierInfo[index];
        const currentWholesale = parseFloat(currentSupplier.wholesale);

        if (currentWholesale <= 0) {
            this.handleZeroWholesale(currentSupplier, product, data, dbChange, isDotMedia, supplierInfo);
        } else if (this.isPriceDifferent(currentSupplier.wholesale, product.wholesale) || (product.retail_price && this.isPriceDifferent(currentSupplier.retail_price, product.retail_price))) {
           this.updatePriceWithHistory(currentSupplier, product, data, dbChange, supplierInfo, index);
        } else {
            this.updateOtherFields(currentSupplier, product, data, dbChange, supplierInfo);
        }
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

    updatePriceWithHistory(supplier, product, data, dbChange, supplierInfo, index) {
        const priceProgress = supplier.price_progress;
        const newPriceProgress = strapi
            .plugin('import-products')
            .service('supplierHelpers')
            .createPriceProgress(product);

        priceProgress.push(newPriceProgress);

        supplier = this.createSupplierInfoData(product, priceProgress);

        if (product.retail_price && supplier.retail_price !== product.retail_price) {
            supplier.retail_price = product.retail_price;
        }

        supplierInfo[index] = supplier

        data.supplierInfo = supplierInfo;
        dbChange.typeOfChange = 'updated';
    },

    updateOtherFields(supplier, product, data, dbChange, supplierInfo) {
        let needsUpdate = false;

        if (product.retail_price && Number(supplier.retail_price) !== Number(product.retail_price)) {
            supplier.retail_price = product.retail_price;
            needsUpdate = true;
        }

        if (supplier.in_stock === false) {
            supplier.in_stock = true;
            needsUpdate = true;
        }

        if (needsUpdate) {
            data.supplierInfo = supplierInfo;
            dbChange.typeOfChange = 'republished';
        }
    },

    isPriceDifferent(storedPrice, newPrice) {
        return strapi
            .plugin('import-products')
            .service('priceHelpers')
            .is_not_equal(storedPrice, newPrice);
    },

    createNewSupplier(supplierInfo, product, data, dbChange) {
        const priceProgress = strapi
            .plugin('import-products')
            .service('supplierHelpers')
            .createPriceProgress(product);

        supplierInfo.push(
            strapi.plugin('import-products')
                .service('supplierHelpers')
                .createSupplierInfoData(product, priceProgress)
        );

        dbChange.typeOfChange = 'created';
        data.supplierInfo = supplierInfo;
    },
});
