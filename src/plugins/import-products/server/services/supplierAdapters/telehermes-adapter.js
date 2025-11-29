'use strict';

/**
 * Telehermes Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class TelehermesAdapter extends BaseSupplier {
        /**
         * Field mapping για Telehermes XML
         */
        getFieldMapping() {
            return {
                isGreater: false,
                splitter: null,
                category: 'category_level_1',
                subcategory: 'category_level_2',
                sub2category: null,
                stock_level: 'availability',
                wholesale: 'wholesale_price',
                retail_price: 'retail_price',
                recycle_tax: null,
                in_offer: null,
                name: 'title',
                brand: 'manufacturer',
                mpn: 'mpn',
                model: null,
                barcode: 'ean',
                supplierCode: 'sku',
                description: 'full_description',
                short_description: 'short_description',
                image: 'image',
                additional_images: null,
                additional_files: null,
                supplierProductURL: null,
                attributes: 'specifications.item',
                weight: null,
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        /**
         * Fetch Telehermes XML data
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

                const { data } = await response;

                // Parse XML
                const xml = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .parseXml(data);

                // Filter products
                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        xml.telehermes.products[0].product,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name  // ✅ Pass supplier name
                    );

                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Telehermes data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Transform product - Telehermes specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // Clean data
            product.description = product.description?.replace(/(<([^>]+)>)/ig, '').trim() || "";
            product.wholesale = this.cleanPrice((product.wholesale || "0").replace(',', '.').trim());
            product.retail_price = this.cleanPrice((product.retail_price || "0").replace(',', '.').trim());

            // Telehermes has attributes with weight/dimensions
            await this.parseWeightAndDimensions(product, rawData, importRef);
        }
    }

    return (entry) => new TelehermesAdapter(entry);
};