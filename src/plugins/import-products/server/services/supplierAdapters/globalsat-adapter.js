'use strict';

/**
 * Globalsat Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class GlobalsatAdapter extends BaseSupplier {
        /**
         * Field mapping για Globalsat XML
         */
        getFieldMapping() {
            return {
                isGreater: false,
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
                image: null, // Globalsat uses Image1Link-Image5Link format
                additional_images: null,
                additional_files: null,
                supplierProductURL: null,
                attributes: 'Attributes',
                weight: null, // Extracted from Attributes
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        /**
         * Fetch Globalsat XML data
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

                const json = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .parseXml(data);

                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        json.response.item,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name  // ✅ Pass supplier name for custom image filtering
                    );

                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Globalsat data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Transform product - Globalsat specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // Clean data
            product.description = product.description?.replace(/(<([^>]+)>)/ig, '').trim() || "";
            product.wholesale = this.cleanPrice((product.wholesale || "0").replace(',', '.').trim());
            product.retail_price = this.cleanPrice((product.retail_price || "0").replace(',', '.').trim());
            product.recycle_tax = this.cleanPrice((product.recycle_tax || "0").replace(',', '.').trim());

            // ✅ Handle Globalsat's 5 images (Image1Link - Image5Link)
            const imagesParser = strapi
                .plugin('import-products')
                .service('imagesParser');

            const images = imagesParser.extractFromGlobalsatFormat(rawData, 5);
            product.imagesSrc = images;

            // ✅ Handle Globalsat dimensions (format: "100x200x300" or "10χ20χ30")
            if (rawData.DimensionsPackage) {
                const dimensionsParser = strapi
                    .plugin('import-products')
                    .service('dimensionsParser');

                const dimensions = dimensionsParser.extractFromGlobalsatFormat(rawData.DimensionsPackage);

                if (dimensions && dimensionsParser.validate(dimensions)) {
                    product.length = dimensions.length;
                    product.width = dimensions.width;
                    product.height = dimensions.height;
                }
            }

            // ✅ Parse weight and other dimensions from Attributes string
            // Attributes format: "Brand : X| Weight : 2.5 kg| Other : value"
            if (rawData.Attributes) {
                // Weight from attributes
                const weightParser = strapi
                    .plugin('import-products')
                    .service('weightParser');

                const weight = weightParser.extractFromGlobalsatAttributes(rawData.Attributes);
                if (weight) {
                    product.weight = weight;
                }

                // Parse attributes into prod_chars
                const attrs = this.parseGlobalsatAttributes(rawData.Attributes);
                if (attrs.length > 0) {
                    // Merge with existing prod_chars or replace
                    product.prod_chars = attrs;

                    // Parse through charname service
                    const parsedChars = strapi
                        .plugin('import-products')
                        .service('charnameService')
                        .parseChars(attrs, importRef);

                    product.prod_chars = parsedChars;
                }
            }

            // ✅ If still no weight/dimensions, try from characteristics
            if (!product.weight || !product.length) {
                await this.parseWeightAndDimensions(product, rawData, importRef);
            }
        }

        /**
         * Parse Globalsat Attributes string into characteristics array
         * Format: "Brand : HUAWEI| Weight : 2.5 kg| Other : value"
         */
        parseGlobalsatAttributes(attributesString) {
            if (!attributesString || typeof attributesString !== 'string') return [];

            const chars = [];
            const attributes = attributesString.split('|');

            for (const attr of attributes) {
                const [name, value] = attr.split(':').map(s => s.trim());

                if (name && value) {
                    chars.push({ name, value });
                }
            }

            return chars;
        }
    }

    return (entry) => new GlobalsatAdapter(entry);
};