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
            const startTime = Date.now();
            let importRef = null;

            try {
                console.log(`\n🚀 Starting import for ${this.name}`);

                importRef = await this.initialize();

                if (!this.isActive) {
                    await this.deleteProducts(importRef);
                    return { message: "ok", info: "Inactive supplier" };
                }

                const { products, message } = await this.fetchData(importRef);

                if (message === 'Error' || !products || products.length === 0) {
                    return { message: message || "No products" };
                }

                // ✅ Ένα pass: preprocess + categorize μαζί
                const { toCreate, toUpdate } = await this.preprocessAndCategorize(products, importRef);

                // ✅ Hook για image resolution - μόνο για νέα προϊόντα
                // Default: επιστρέφει toCreate ως έχει (χωρίς επιπλέον processing)
                // Override: Logicom, Iason κάνουν HEAD requests μόνο εδώ
                const toCreateResolved = await this.resolveImages(toCreate, importRef);

                console.log(`   To create: ${toCreateResolved.length}`);
                console.log(`   To update: ${toUpdate.length}`);

                await strapi
                    .plugin('import-products')
                    .service('batchHelpers')
                    .processCreateBatch(toCreateResolved, importRef);

                await strapi
                    .plugin('import-products')
                    .service('batchHelpers')
                    .processUpdateBatch(toUpdate, importRef);

                await this.deleteProducts(importRef);

                const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
                this.logReport(importRef, duration);

                return { message: "ok" };

            } catch (error) {
                console.error(`Error importing ${this.name}:`, error);
                return { message: "error", error: error.message };

            } finally {
                strapi
                    .plugin('import-products')
                    .service('cacheService')
                    .clear(this.name);
            }
        }

        /**
         * ✅ Ένα pass: createProductFields + transformProduct + cache lookup
         * Αντικαθιστά το preprocessProducts() + categorizeProducts() (2 ξεχωριστά loops)
         * CAN OVERRIDE αν χρειάζεται τελείως custom λογική
         */
        async preprocessAndCategorize(products, importRef) {
            const toCreate = [];
            const toUpdate = [];
            const cacheService = strapi.plugin('import-products').service('cacheService');

            for (const dt of products) {
                try {
                    const product = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createProductFields(this.entry, dt, importRef);

                    if (!product.mpn && !product.barcode) continue;

                    // Apply custom transformations
                    await this.transformProduct(product, dt, importRef);

                    // Cache lookup στο ίδιο loop - χωρίς δεύτερο pass
                    const existingProduct = cacheService.getExistingProduct(
                        product.mpn,
                        product.barcode,
                        product.model,
                        product.name
                    );

                    if (existingProduct) {
                        toUpdate.push({ product, existingProduct });
                    } else {
                        toCreate.push(product);
                    }

                } catch (error) {
                    console.error('Error preprocessing product:', error.message);
                    console.error(error.stack); // ✅ Πρόσθεσε αυτό προσωρινά
                }
            }

            return { toCreate, toUpdate };
        }

        /**
         * Resolve images για νέα προϊόντα - CAN OVERRIDE
         * Default: επιστρέφει toCreate ως έχει
         * Override: Logicom, Iason κάνουν HEAD requests και φιλτράρουν χωρίς εικόνες
         *
         * @param {Array} toCreate - Νέα προϊόντα
         * @param {Object} importRef
         * @returns {Array} Φιλτραρισμένα προϊόντα με resolved images
         */
        async resolveImages(toCreate, importRef) {
            return toCreate;
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

            if (!product.length || !product.width || !product.height) {
                const dimensions = dimensionsParser.extract({
                    characteristics: product.prod_chars,
                    rawData: rawData,
                    mapFields: importRef.mapFields,
                    supplier: this.name,
                    product: product
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
         */
        cleanPrice(value) {
            if (value === null || value === undefined) return "0";
            if (typeof value === 'number') return value.toFixed(2);
            return String(value).replace(',', '.').trim();
        }

        /**
         * Cleanup
         */
        async cleanup(importRef) {
            await this.deleteProducts(importRef);
            strapi.plugin('import-products').service('cacheService').clear(this.name);
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