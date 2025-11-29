'use strict';

/**
 * CPI Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class CpiAdapter extends BaseSupplier {
        /**
         * Field mapping για CPI XML
         */
        getFieldMapping() {
            return {
                isGreater: false,
                splitter: '/',
                category: 'CATEGORY',
                subcategory: null,
                sub2category: null,
                stock_level: 'availability',
                wholesale: 'b2bprice',
                retail_price: 'msrp',
                recycle_tax: 'recycle',
                in_offer: null,
                name: 'description',
                brand: 'brand',
                mpn: 'mpn',
                model: null,
                barcode: 'EAN',
                supplierCode: 'code',
                description: 'chars',
                short_description: null,
                image: 'image',
                additional_images: null,
                additional_files: 'pdf',
                supplierProductURL: null,
                attributes: 'specifications.item',
                weight: 'weight_kg',
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        /**
         * Fetch CPI XML data
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
                        xml.STOREITEMS.CREATED[0].PRODUCT,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name
                    );

                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching CPI data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Transform product - CPI specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // Clean prices (CPI uses . for thousands, , for decimals)
            // Helper already handles this format
            product.wholesale = this.cleanPrice(
                (product.wholesale || "0").replace('.', '')  // Remove thousands separator first
            );
            
            product.retail_price = product.retail_price 
                ? this.cleanPrice(String(product.retail_price).replace('.', ''))
                : "0";
            
            product.recycle_tax = product.recycle_tax 
                ? this.cleanPrice(String(product.recycle_tax).replace('.', ''))
                : "0";

            // Clean description
            product.description = product.description
                ?.replace(/(<([^>]+)>)/ig, '')
                .replaceAll('&apos;', "'")
                .replaceAll('&quot;', '"')
                .trim() || "";

            // ✅ Handle weight (CPI sends in kg)
            if (product.weight) {
                const weightStr = String(product.weight)
                    .replace('kg', '')
                    .replace(',', '.')
                    .trim();
                
                const weightKg = parseFloat(weightStr);
                if (!isNaN(weightKg) && weightKg > 0) {
                    product.weight = Math.round(weightKg * 1000); // Convert to grams
                }
            }

            // ✅ Parse characteristics from specifications.item
            // This is auto-handled by BaseSupplier.parseCharacteristics()
            
            // ✅ Parse weight and dimensions from characteristics if not in raw fields
            if (!product.weight || !product.length) {
                await this.parseWeightAndDimensions(product, rawData, importRef);
            }
        }
    }

    return (entry) => new CpiAdapter(entry);
};