'use strict';

/**
 * Novatron Supplier Adapter (Scraped)
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class NovatronAdapter extends BaseSupplier {
        /**
         * Field mapping - Novatron is scraped, so no XML fields
         */
        getFieldMapping() {
            return {
                // Novatron doesn't use XML, all data comes from scraping
                isGreater: false,
                splitter: null,
                category: null,
                subcategory: null,
                sub2category: null,
                stock_level: null,
                quantity: null,
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
         * Fetch Novatron data - delegates to novatronService
         */
        async fetchData(importRef) {
            try {
                // console.log('🕷️  Starting Novatron scraping...');

                // Call the novatronService scraper
                const response = await strapi
                    .plugin('import-products')
                    .service('novatronService')
                    .scrapNovatronCategories(importRef, this.entry);

                if (response?.message === "error") {
                    return { message: 'Error', error: response.error };
                }

                // Novatron processes products inline during scraping
                return { products: [], message: 'ok', info: 'Novatron scraping completed' };

            } catch (error) {
                console.error('Error in Novatron adapter:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Preprocess products - Novatron handles this during scraping
         * Override to skip standard preprocessing
         */
        async preprocessProducts(products, importRef) {
            // Novatron doesn't use this - products are processed during scraping
            return [];
        }

        /**
         * Transform product - Novatron specific
         * This is called by scrapHelpers.importScrappedProduct
         */
        async transformProduct(product, rawData, importRef) {
            // ✅ Novatron sends characteristics from scraping
            if (product.prod_chars?.length > 0) {
                const parsedChars = strapi
                    .plugin('import-products')
                    .service('charnameService')
                    .parseChars(product.prod_chars, importRef);

                product.prod_chars = parsedChars;
            }

            // ✅ Extract weight from characteristics
            if (!product.weight && product.prod_chars?.length > 0) {
                const weightParser = strapi
                    .plugin('import-products')
                    .service('weightParser');

                const weight = weightParser.extractFromCharacteristics(product.prod_chars);
                if (weight) {
                    product.weight = weight;
                }
            }

            // ✅ Parse dimensions from characteristics
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

            // ✅ Brand detection from name if not already set
            if (!product.brand || typeof product.brand === 'string') {
                const brandValue = typeof product.brand === 'string' ? product.brand : '';

                if (brandValue) {
                    const { brandId } = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .brandIdCheck(brandValue, product.name);

                    if (brandId) {
                        product.brand = { id: brandId };
                    }
                }
            }

            // ✅ Clean prices
            if (product.wholesale) {
                product.wholesale = this.cleanPrice(product.wholesale);
            }

            if (product.retail_price) {
                product.retail_price = this.cleanPrice(product.retail_price);
            }

            if (product.initial_wholesale) {
                product.initial_wholesale = this.cleanPrice(product.initial_wholesale);
            }

            // ✅ Handle Novatron-specific mm in lens description
            if (product.short_description && product.short_description.match(/\d+(\.\d+)?mm/)) {
                const mmMatch = product.short_description.match(/(\d+(\.\d+)?mm)/);
                if (mmMatch && !product.name.includes(mmMatch[1])) {
                    product.name = `${product.name} - ${mmMatch[1]}`;
                }
            }

            // ✅ Clean description HTML
            if (product.description) {
                product.description = product.description
                    .replace(/(<([^>]+)>)/ig, '')
                    .replaceAll('&apos;', "'")
                    .replaceAll('&quot;', '"')
                    .replaceAll('&gt;', ">")
                    .replaceAll('&lt;', "<")
                    .replaceAll('&nbsp;', " ")
                    .trim();
            }
        }

        /**
         * Override main import flow for Novatron
         * Novatron uses scraping, not standard XML processing
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
                    console.error(`Novatron scraping failed: ${error}`);
                    return { message: 'Error', error };
                }

                // 4. Cleanup (delete old products)
                await this.cleanup(importRef);

                // 5. Report
                const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
                this.logReport(importRef, duration);

                return { message: "ok", info: info || "Novatron import completed" };

            } catch (error) {
                console.error(`Error importing ${this.name}:`, error);
                return { message: "error", error: error.message };
            }
        }
    }

    return (entry) => new NovatronAdapter(entry);
};