'use strict';

module.exports = ({ strapi }) => ({

    /**
     * Categorize products into create/update batches
     * Products are already processed by adapters
     */
    async categorizeProducts(products, entry, importRef) {
        const toCreate = [];
        const toUpdate = [];

        const cacheService = strapi.plugin('import-products').service('cacheService');

        for (let product of products) {
            try {
                // Products are already processed by adapter
                if (!product.mpn && !product.barcode) continue;

                // ✅ Check cache with prioritized matching
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
                console.error('Error categorizing product:', error.message);
            }
        }

        return { toCreate, toUpdate };
    },

    async processCreateBatch(products, importRef) {
        const BATCH_SIZE = 10; // Smaller batches for creates (images are slow)
        let processed = 0;

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE);

            // console.log(`📝 Creating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}`);

            // Process batch sequentially (images need to be processed one by one)
            for (const product of batch) {
                try {
                    const result = await strapi
                        .plugin('import-products')
                        .service('importHelpers')
                        .createEntry(product, importRef);

                    if (!result?.success) {
                        console.log(`   ❌ Failed: ${product.name.substring(0, 50)} - ${result?.reason}`);
                    } else {
                        processed++;

                        // ✅ Add newly created product to cache
                        if (result.product) {
                            strapi
                                .plugin('import-products')
                                .service('cacheService')
                                .addProductToCache(result.product);
                        }
                    }
                } catch (error) {
                    console.error(`   ❌ Error: ${product.name}:`, error.message);
                }
            }

            // Memory cleanup
            for (let j = 0; j < batch.length; j++) {
                batch[j] = null;
            }

            // Force GC and delay
            if (global.gc) global.gc();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // console.log(`   Progress: ${processed}/${products.length} (${((processed / products.length) * 100).toFixed(1)}%)`);
        }
    },

    async processUpdateBatch(products, importRef) {
        const BATCH_SIZE = 20; // Larger batches for updates (no images)
        let processed = 0;

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE);

            // console.log(`🔄 Updating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}`);

            // ✅ SEQUENTIAL UPDATES
            for (const { product, existingProduct } of batch) {
                try {
                    await strapi
                        .plugin('import-products')
                        .service('importHelpers')
                        .updateEntry(existingProduct, product, importRef);
                    processed++;
                } catch (error) {
                    // ✅ Check if deadlock and retry
                    if (error.code === 'ER_LOCK_DEADLOCK') {
                        console.warn(`   ⚠️  Deadlock on ${product.name}, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        try {
                            await strapi
                                .plugin('import-products')
                                .service('importHelpers')
                                .updateEntry(existingProduct, product, importRef);
                            processed++;
                        } catch (retryError) {
                            console.error(`   ❌ Retry failed: ${product.name}:`, retryError.message);
                        }
                    } else {
                        console.error(`   ❌ Error: ${product.name}:`, error.message);
                    }
                }
            }

            // Memory cleanup
            for (let j = 0; j < batch.length; j++) {
                batch[j] = null;
            }

            if (global.gc) global.gc();
            await new Promise(resolve => setTimeout(resolve, 500));

            // console.log(`   Progress: ${processed}/${products.length} (${((processed / products.length) * 100).toFixed(1)}%)`);
        }
    },
});