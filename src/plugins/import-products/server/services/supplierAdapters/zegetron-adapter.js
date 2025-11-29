'use strict';

/**
 * Zegetron Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class ZegetronAdapter extends BaseSupplier {
        /**
         * Field mapping για Zegetron XML
         */
        getFieldMapping() {
            return {
                isGreater: true,
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
            };
        }

        /**
         * Fetch Zegetron XML data
         */
        async fetchData(importRef) {
            try {
                const url = `${this.entry.importedURL}`;
                const config = {
                    headers: {
                        "Accept-Encoding": "gzip,deflate,compress"
                    }
                };

                // Download XML
                const { response, message } = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .getXmlData(url, config);

                if (message === 'Error') return { message };

                let { data } = await response;

                // Parse XML
                const xml = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .parseXml(data);

                // Clear data immediately
                data = null;

                // Filter products
                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        xml.mywebstore.products[0].product,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name  // ✅ Pass supplier name
                    );

                // Clear XML
                xml.mywebstore.products = null;
                xml.mywebstore = null;

                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Zegetron data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Transform product - Zegetron specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // Clean data
            product.description = product.description?.replace(/(<([^>]+)>)/ig, '').trim() || "";
            product.wholesale = this.cleanPrice((product.wholesale || "0").replace(',', '.').trim());
            product.retail_price = this.cleanPrice((product.retail_price || "0").replace(',', '.').trim());
            product.recycle_tax = this.cleanPrice((product.recycle_tax || "0").replace(',', '.').trim());
            product.weight = product.weight?.replace(',', '.').trim() || null;
            product.width = product.width?.replace(',', '.').trim() || null;
            product.length = product.length?.replace(',', '.').trim() || null;
            product.height = product.height?.replace(',', '.').trim() || null;

            // // Zegetron sends weight in kg, convert to grams
            // if (product.weight) {
            //     product.weight = parseInt(parseFloat(product.weight) * 1000);
            // }

            // // Zegetron sends dimensions in cm, convert to mm
            // if (product.length) {
            //     product.length = parseInt(parseFloat(product.length) * 10);
            // }
            // if (product.width) {
            //     product.width = parseInt(parseFloat(product.width) * 10);
            // }
            // if (product.height) {
            //     product.height = parseInt(parseFloat(product.height) * 10);
            // }
        }
    }

    return (entry) => new ZegetronAdapter(entry);
};