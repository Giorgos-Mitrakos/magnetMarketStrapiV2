'use strict';

/**
 * Quest Supplier Adapter (Scraped)
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class QuestAdapter extends BaseSupplier {
        /**
         * Field mapping - Quest is scraped, so no XML fields
         */
        getFieldMapping() {
            return {
                // Quest doesn't use XML, all data comes from scraping
                isGreater: false,
                splitter: null,
                category: null,
                subcategory: null,
                sub2category: null,
                stock_level: null,
                wholesale: null,
                retail_price: null,
                recycle_tax: null,
                in_offer: null,
                name: null,
                brand: null,
                mpn: null,
                model: null,
                barcode: null,
                supplierCode: null,
                description: null,
                short_description: null,
                image: null,
                additional_images: null,
                additional_files: null,
                supplierProductURL: null,
                attributes: null,
                weight: null,
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        /**
         * Fetch Quest data - delegates to questService
         */
        async fetchData(importRef) {
            try {
                console.log('🕷️  Starting Quest scraping...');

                // Call the existing questService scraper
                const response = await strapi
                    .plugin('import-products')
                    .service('questService')
                    .scrapQuest(importRef, this.entry);

                if (response?.message === "error") {
                    return { message: 'Error', error: response.error };
                }

                // Quest processes products inline during scraping
                // So we return empty array here (products already imported)
                return { products: [], message: 'ok', info: 'Quest scraping completed' };

            } catch (error) {
                console.error('Error in Quest adapter:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Preprocess products - Quest handles this during scraping
         * Override to skip standard preprocessing
         */
        async preprocessProducts(products, importRef) {
            // Quest doesn't use this - products are processed during scraping
            return [];
        }

        /**
         * Transform product - Quest specific
         * This is called by scrapHelpers.importScrappedProduct
         */
        async transformProduct(product, rawData, importRef) {
            // ✅ Quest sends characteristics from scraping
            // Parse them through charname service
            if (product.prod_chars?.length > 0) {
                const parsedChars = strapi
                    .plugin('import-products')
                    .service('charnameService')
                    .parseChars(product.prod_chars, importRef);

                product.prod_chars = parsedChars;
            }

            // ✅ Extract weight from characteristics
            // Quest has "Μεικτό βάρος" or "Βάρος (κιλά)" in characteristics
            if (!product.weight && product.prod_chars?.length > 0) {
                const weightKgChar = product.prod_chars.find(x => x.name === "Μεικτό βάρος");
                const weightChar = product.prod_chars.find(x => x.name === "Βάρος (κιλά)");

                if (weightKgChar?.value) {
                    try {
                        const weight = parseFloat(weightKgChar.value.replace("kg", "").replace(",", ".").trim()) * 1000;
                        product.weight = Math.round(weight);
                    } catch (err) {
                        console.warn('Error parsing Quest weight:', err);
                    }
                } else if (weightChar?.value) {
                    try {
                        const weight = parseFloat(weightChar.value.replace("kg", "").replace(",", ".").trim()) * 1000;
                        product.weight = Math.round(weight);
                    } catch (err) {
                        console.warn('Error parsing Quest weight:', err);
                    }
                }
            }

            // ✅ Extract other data from characteristics
            if (product.prod_chars?.length > 0) {
                // MPN from characteristics
                if (!product.mpn) {
                    const mpnChar = product.prod_chars.find(x => x.name === "Part Number");
                    product.mpn = mpnChar?.value?.trim();
                }

                // Barcode from characteristics
                if (!product.barcode) {
                    const barcodeChar = product.prod_chars.find(x => x.name === "EAN Number");
                    product.barcode = barcodeChar?.value?.trim();
                }

                // Model from characteristics
                if (!product.model) {
                    const modelChar = product.prod_chars.find(x => x.name === "Μοντέλο");
                    product.model = modelChar?.value?.trim();
                }

                // Brand from characteristics
                if (!product.brand) {
                    const brandChar = product.prod_chars.find(x => x.name === "Κατασκευαστής");
                    if (brandChar?.value) {
                        const { brandId } = await strapi
                            .plugin('import-products')
                            .service('productHelpers')
                            .brandIdCheck(brandChar.value, product.name);

                        if (brandId) {
                            product.brand = { id: brandId };
                        }
                    }
                }
            }

            // ✅ Parse dimensions from characteristics if needed
            if (!product.length || !product.width || !product.height) {
                const dimensionsParser = strapi
                    .plugin('import-products')
                    .service('dimensionsParser');

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

            // ✅ Clean wholesale price
            if (product.wholesale) {
                product.wholesale = this.cleanPrice(product.wholesale);
            }

            // ✅ Clean initial_wholesale if exists
            if (product.initial_wholesale) {
                product.initial_wholesale = this.cleanPrice(product.initial_wholesale);
            }
        }

        /**
         * Override main import flow for Quest
         * Quest uses scraping, not standard XML processing
         */
        async import() {
            try {
                // console.log(`\n🚀 Starting import for ${this.name}`);
                const startTime = Date.now();

                // 1. Initialize
                const importRef = await this.initialize();

                // 2. Check if active
                if (!this.isActive) {
                    await this.deleteProducts(importRef);
                    return { message: "ok", info: "Inactive supplier" };
                }

                // 3. Fetch data (scraping happens here, products are imported inline)
                const { message, error, info } = await this.fetchData(importRef);

                if (message === 'Error') {
                    console.error(`Quest scraping failed: ${error}`);
                    return { message: 'Error', error };
                }

                // 4. Cleanup (delete old products)
                await this.cleanup(importRef);

                // 5. Report
                const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
                this.logReport(importRef, duration);

                return { message: "ok", info: info || "Quest import completed" };

            } catch (error) {
                console.error(`Error importing ${this.name}:`, error);
                return { message: "error", error: error.message };
            }
        }
    }

    return (entry) => new QuestAdapter(entry);
};