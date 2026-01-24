'use strict';

/**
 * DotMedia Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class DotMediaAdapter extends BaseSupplier {
        /**
         * Field mapping για DotMedia XML
         */
        getFieldMapping() {
            return {
                isGreater: false,
                splitter: null,
                category: 'Category',
                subcategory: 'SubCategory',
                sub2category: 'SubCategory2',
                stock_level: 'Availability',
                quantity: null,
                wholesale: 'WholesalePrice',
                retail_price: 'Suggested_Web_Price',
                recycle_tax: 'Eisfora',
                in_offer: null,
                name: 'Description',
                brand: 'Maker',
                mpn: 'MakerID',
                model: null,
                barcode: 'BarCode',
                supplierCode: 'ProductID',
                description: 'DetailedDescription',
                short_description: null,
                image: 'ImageLink',
                additional_images: null, // Will be handled manually (ImageLink2, ImageLink3)
                additional_files: 'ProductPdf',
                supplierProductURL: 'ProIDLink',
                attributes: 'DetailedDescriptionPre', // XML format characteristics
                weight: null,
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        /**
         * Fetch DotMedia XML data
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
                        xml.NewDataSet.table1,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name  // ✅ Pass supplier name
                    );

                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching DotMedia data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Transform product - DotMedia specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // Clean prices
            product.wholesale = this.cleanPrice((product.wholesale || "0").replace(',', '.').trim());
            product.retail_price = this.cleanPrice((product.retail_price || "0").replace(',', '.').trim());
            product.recycle_tax = this.cleanPrice((product.recycle_tax || "0").replace(',', '.').trim());

            // Clean description
            product.description = product.description
                ?.replace(/(<([^>]+)>)/ig, '')
                .replaceAll('&apos;', "'")
                .replaceAll('&quot;', '"')
                .replaceAll('&gt;', ">")
                .replaceAll('&lt;', "<")
                .replaceAll('&nbsp;', " ")
                .replace(/[\u2000-\u2BFF]/g, "")
                .trim() || "";

            // ✅ Parse characteristics from DetailedDescriptionPre (XML format)
            if (rawData.DetailedDescriptionPre) {
                const charsParser = strapi
                    .plugin('import-products')
                    .service('characteristicsParser');

                const chars = await charsParser.parseFromDotMediaXml(rawData.DetailedDescriptionPre);

                if (chars.length > 0) {
                    // Apply charname mapping
                    const parsedChars = strapi
                        .plugin('import-products')
                        .service('charnameService')
                        .parseChars(chars, importRef);

                    product.prod_chars = parsedChars;
                }
            }

            // ✅ Handle DotMedia's 3 images (ImageLink, ImageLink2, ImageLink3)
            const imagesParser = strapi
                .plugin('import-products')
                .service('imagesParser');

            const images = imagesParser.extractFromDotMediaFormat(rawData);
            product.imagesSrc = images;

            // ✅ Extract weight from short_description (if exists)
            // DotMedia sometimes puts weight info in description
            if (rawData.DetailedDescriptionPre) {
                const weightParser = strapi
                    .plugin('import-products')
                    .service('weightParser');

                const weight = weightParser.extractFromDotMediaDescription(rawData.DetailedDescriptionPre);
                if (weight) {
                    product.weight = weight;
                }
            }

            // ✅ Parse weight and dimensions from characteristics
            if (!product.weight || !product.length) {
                await this.parseWeightAndDimensions(product, rawData, importRef);
            }

            // ✅ Clear short_description (not needed, info is in characteristics)
            product.short_description = null;
        }
    }

    return (entry) => new DotMediaAdapter(entry);
};