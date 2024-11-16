'use strict';

module.exports = ({ strapi }) => ({
    createPriceProgress(product) {

        let price_progress = {
            date: new Date(),
        }

        if (product.in_offer) {
            price_progress.in_offer = product.in_offer
        }

        if (product.discount) {
            price_progress.discount = product.discount
        }

        if (product.initial_wholesale) {
            price_progress.initial_wholesale = parseFloat(product.initial_wholesale).toFixed(2)
        }

        if (product.wholesale) {
            price_progress.wholesale = parseFloat(product.wholesale).toFixed(2)
        }

        return price_progress

    },

    createSupplierInfoData(entry, product, price_progress) {

        const supplierInfo = {
            name: entry.name,
            in_stock: true,
            wholesale: parseFloat(product.wholesale).toFixed(2),
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
            supplierInfo.initial_retail_price = parseFloat(product.initial_retail_price).toFixed(2)
        }

        if (product.retail_price) {
            supplierInfo.retail_price = parseFloat(product.retail_price).toFixed(2)
        }

        if (product.recycle_tax) {
            supplierInfo.recycle_tax = parseFloat(product.recycle_tax).toFixed(2)
        }

        if (product.quantity) {
            supplierInfo.quantity = parseInt(product.quantity)
        }

        return supplierInfo
    },

    // async updateSupplierInfo(entry, product, supplierInfo) {

    //     let isUpdated = false;
    //     let dbChange = 'skipped'

    //     let supplierInfoUpdate = supplierInfo.findIndex(o => o.name === entry.name)

    //     if (supplierInfoUpdate !== -1) {
    //         if (parseFloat(supplierInfo[supplierInfoUpdate].wholesale) === 0 && parseFloat(product.wholesale) !== 0) {
    //             parseFloat(supplierInfo[supplierInfoUpdate].wholesale) = parseFloat(product.wholesale)
    //             isUpdated = true;
    //             dbChange = 'updated'
    //         }

    //         if (parseFloat(product.wholesale) > 0 && parseFloat(supplierInfo[supplierInfoUpdate].wholesale) !== parseFloat(product.wholesale)) {

    //             const price_progress = supplierInfo[supplierInfoUpdate].price_progress;

    //             const price_progress_data = this.createPriceProgress(product)

    //             price_progress.push(price_progress_data)

    //             supplierInfo[supplierInfoUpdate] = this.createSupplierInfoData(entry, product, price_progress)

    //             isUpdated = true;
    //             dbChange = 'updated'
    //         }

    //         if (supplierInfo[supplierInfoUpdate].in_stock === false) {
    //             supplierInfo[supplierInfoUpdate].in_stock = true
    //             isUpdated = true;
    //             dbChange = 'updated'
    //         }
    //     }
    //     else {
    //         const price_progress_data = this.createPriceProgress(product)

    //         supplierInfo.push(this.createSupplierInfoData(entry, product, price_progress_data))

    //         isUpdated = true;
    //         dbChange = 'created'
    //     }

    //     return { updatedSupplierInfo: supplierInfo, isUpdated, dbChange }

    // },
});
