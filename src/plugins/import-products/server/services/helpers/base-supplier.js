'use strict';

/**
 * Base Supplier Class
 * Κοινή λογική για όλους τους προμηθευτές
 */
module.exports = ({ strapi }) => {
    class BaseSupplier {
        constructor(entry) {
            this.entry = entry;
            this.name = entry.name;
            this.isActive = entry.isActive;
        }

        /**
         * Main import flow - TEMPLATE METHOD PATTERN
         */
        async import() {
            try {
                console.log(`\n🚀 Starting import for ${this.name}`);
                const startTime = Date.now();

                // 1. Initialize
                const importRef = await this.initialize();

                // 2. Check if active
                if (!this.isActive) {
                    await this.deleteProducts(importRef);
                    return { message: "ok", info: "Inactive supplier" };
                }

                // 3. Fetch data (προμηθευτή-specific)
                const { products, message } = await this.fetchData(importRef);

                if (message === 'Error' || !products || products.length === 0) {
                    return { message: message || "No products" };
                }

                // 4. Process products (custom per supplier)
                const processedProducts = await this.preprocessProducts(products, importRef);

                // 5. Categorize (create/update)
                const { toCreate, toUpdate } = await strapi
                    .plugin('import-products')
                    .service('batchHelpers')
                    .categorizeProducts(processedProducts, this.entry, importRef);

                console.log(`   To create: ${toCreate.length}`);
                console.log(`   To update: ${toUpdate.length}`);

                // 6. Batch process
                await strapi
                    .plugin('import-products')
                    .service('batchHelpers')
                    .processCreateBatch(toCreate, importRef);

                await strapi
                    .plugin('import-products')
                    .service('batchHelpers')
                    .processUpdateBatch(toUpdate, importRef);

                // 7. Cleanup
                await this.cleanup(importRef);

                // 8. Report
                const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
                this.logReport(importRef, duration);

                return { message: "ok" };

            } catch (error) {
                console.error(`Error importing ${this.name}:`, error);
                return { message: "error", error: error.message };
            }
        }

        /**
         * Initialize cache and import ref
         */
        async initialize() {
            await strapi
                .plugin('import-products')
                .service('cacheService')
                .initialize(this.entry);

            const importRef = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .createImportRef(this.entry);

            importRef.mapFields = this.getFieldMapping();
            return importRef;
        }

        /**
         * Get field mapping - MUST OVERRIDE
         */
        getFieldMapping() {
            throw new Error('getFieldMapping() must be implemented by supplier adapter');
        }

        /**
         * Fetch data - MUST OVERRIDE
         */
        async fetchData(importRef) {
            throw new Error('fetchData() must be implemented by supplier adapter');
        }

        /**
         * Preprocess products - CAN OVERRIDE
         * Default: just creates product fields
         */
        async preprocessProducts(products, importRef) {
            const processed = [];

            for (let dt of products) {
                try {
                    const product = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createProductFields(this.entry, dt, importRef);

                    if (!product.mpn && !product.barcode) continue;

                    // Apply custom transformations
                    await this.transformProduct(product, dt, importRef);

                    processed.push(product);
                } catch (error) {
                    console.error('Error preprocessing product:', error.message);
                }
            }

            return processed;
        }

        /**
         * Transform product - CAN OVERRIDE
         * Για custom logic ανά προμηθευτή
         */
        async transformProduct(product, rawData, importRef) {
            // Default: parse characteristics, weight and dimensions
            await this.parseCharacteristics(product, rawData, importRef);
            await this.parseWeightAndDimensions(product, rawData, importRef);
        }

        /**
         * Parse characteristics using centralized parser
         */
        async parseCharacteristics(product, rawData, importRef) {
            const charsParser = strapi
                .plugin('import-products')
                .service('characteristicsParser');

            const chars = await charsParser.extract({
                rawData,
                mapFields: importRef.mapFields,
                supplier: this.name,
                importRef
            });

            if (chars.length > 0) {
                product.prod_chars = chars;
            }
        }

        /**
         * Parse weight and dimensions using centralized parsers
         */
        async parseWeightAndDimensions(product, rawData, importRef) {
            const weightParser = strapi
                .plugin('import-products')
                .service('weightParser');

            const dimensionsParser = strapi
                .plugin('import-products')
                .service('dimensionsParser');

            // Extract weight using main extraction method
            if (!product.weight) {
                const weight = weightParser.extract({
                    characteristics: product.prod_chars,
                    text: product.short_description || product.description,
                    rawData: rawData,
                    mapFields: importRef.mapFields,
                    supplier: this.name
                });

                if (weight) product.weight = weight;
            }

            // Extract dimensions using main extraction method
            if (!product.length || !product.width || !product.height) {
                const dimensions = dimensionsParser.extract({
                    characteristics: product.prod_chars,
                    rawData: rawData,
                    mapFields: importRef.mapFields,
                    supplier: this.name
                });

                if (dimensions && dimensionsParser.validate(dimensions)) {
                    product.length = dimensions.length;
                    product.width = dimensions.width;
                    product.height = dimensions.height;
                }
            }
        }

        /**
         * Delete products
         */
        async deleteProducts(importRef) {
            await strapi
                .plugin('import-products')
                .service('importHelpers')
                .deleteEntry(this.entry, importRef);
        }

        /**
         * Helper: Clean price value (handles both number and string)
         * @param {number|string} value - Price value
         * @returns {string} Cleaned price as string
         */
        cleanPrice(value) {
            if (value === null || value === undefined) return "0";

            // If already a number, convert to string with proper decimal
            if (typeof value === 'number') {
                return value.toFixed(2);
            }

            // If string, clean it
            return String(value).replace(',', '.').trim();
        }

        /**
         * Cleanup
         */
        async cleanup(importRef) {
            await this.deleteProducts(importRef);

            strapi
                .plugin('import-products')
                .service('cacheService')
                .clear(this.name);
        }

        /**
         * Log report
         */
        logReport(importRef, duration) {
            console.log(`\n✅ ${this.name} import completed in ${duration} minutes`);
            console.log(`   Created: ${importRef.created}`);
            console.log(`   Updated: ${importRef.updated}`);
            console.log(`   Skipped: ${importRef.skipped}`);
            console.log(`   Republished: ${importRef.republished}`);
            console.log(`   Deleted: ${importRef.deleted}`);
        }
    }

    return { BaseSupplier };
};