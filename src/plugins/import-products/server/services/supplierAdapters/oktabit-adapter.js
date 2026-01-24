'use strict';

/**
 * Oktabit Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class OktabitAdapter extends BaseSupplier {
        /**
         * Field mapping για Oktabit JSON
         */
        getFieldMapping() {
            return {
                splitter: null,
                category: 'parent_category',
                subcategory: 'subcategory',
                sub2category: 'b2b_subcat',
                stock_level: 'availability',
                quantity: null,
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
                attributes: 'product_attributes',
                weight: null,
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        /**
         * Fetch Oktabit JSON data
         */
        async fetchData(importRef) {
            try {
                const url = "https://www.oktabit.gr/api/data/?format=json";
                const config = {
                    headers: {
                        'Content-Type': 'text/json',
                        'Accept': 'application/json',
                        'Authorization': 'Token cbd3fdfc76cd0887a6c099900968cfde6bed93bb'
                    }
                };

                const { response, message } = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .getXmlData(url, config);

                if (message === 'Error') return { message };

                const { data } = await response;

                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        data,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name
                    );

                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Oktabit data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Transform product - Oktabit specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // Clean data
            product.description = product.description
                ?.replace(/(<([^>]+)>)/ig, '')
                .replaceAll('&apos;', "'")
                .replaceAll('&quot;', '"')
                .trim() || "";

            // ✅ Use base helper for price cleaning (handles both number and string)
            product.wholesale = this.cleanPrice(product.wholesale);
            product.retail_price = this.cleanPrice(product.retail_price);
            product.recycle_tax = this.cleanPrice(product.recycle_tax);

            // ✅ Parse characteristics from product_attributes (Object format)
            // This is auto-handled by BaseSupplier.parseCharacteristics()

            // ✅ Parse weight and dimensions from characteristics
            await this.parseWeightAndDimensions(product, rawData, importRef);
        }
    }

    return (entry) => new OktabitAdapter(entry);
};