'use strict';

/**
 * Westnet Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class WestnetAdapter extends BaseSupplier {
        /**
         * Field mapping για Westnet XML
         */
        getFieldMapping() {
            return {
                isGreater: true,
                splitter: null,
                category: 'category',
                subcategory: null,
                sub2category: null,
                stock_level: 'availability',
                wholesale: 'price',
                retail_price: null,
                recycle_tax: 'recycle_tax',
                in_offer: 'in_offer',
                name: 'name',
                brand: 'manufacturer',
                mpn: 'partNumber',
                model: null,
                barcode: 'barCode',
                supplierCode: 'id',
                description: 'description',
                short_description: null,
                image: 'image',
                additional_images: null,
                additional_files: null,
                supplierProductURL: 'url',
                attributes: 'specs.spec',
                weight: null,
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        /**
         * Fetch Westnet XML data
         */
        async fetchData(importRef) {
            try {
                const url = `${this.entry.importedURL}`;
                const config = {
                    headers: {
                        "Accept-Encoding": "gzip,deflate,compress"
                    }
                };

                const { response, message } = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .getXmlData(url, config);

                if (message === 'Error') return { message };

                const { data } = await response;

                const xml = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .parseXml(data);

                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        xml.products.product,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name
                    );

                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Westnet data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Transform product - Westnet specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // Clean prices
            product.wholesale = this.cleanPrice((product.wholesale || "0").replace(',', '.').trim());
            product.recycle_tax = this.cleanPrice((product.recycle_tax || "0").replace(',', '.').trim());

            // Clean description
            product.description = product.description
                ?.replace(/(<([^>]+)>)/ig, '')
                .trim() || "";

            // Fix product link (add domain)
            if (product.link && !product.link.startsWith('http')) {
                product.link = `https://www.mywestnet.com/el${product.link}`;
            }

            // ✅ Parse characteristics first (Westnet has them in specs.spec)
            await this.parseCharacteristics(product, rawData, importRef);

            // ✅ Extract weight from characteristics using centralized parser
            // Westnet has complex weight patterns (GW, Gross, kg, grams, etc.)
            if (!product.weight && product.prod_chars?.length > 0) {
                const weightParser = strapi
                    .plugin('import-products')
                    .service('weightParser');

                const weight = weightParser.extractFromCharacteristics(product.prod_chars);
                if (weight) {
                    product.weight = weight;
                }
            }

            // ✅ Extract dimensions from characteristics
            if ((!product.length || !product.width || !product.height) && product.prod_chars?.length > 0) {
                const dimensionsParser = strapi
                    .plugin('import-products')
                    .service('dimensionsParser');

                const dimensions = dimensionsParser.extractFromWestnetCharacteristics(product.prod_chars);

                if (dimensions && dimensionsParser.validate(dimensions)) {
                    product.length = dimensions.length;
                    product.width = dimensions.width;
                    product.height = dimensions.height;
                }
            }
        }
    }

    return (entry) => new WestnetAdapter(entry);
};