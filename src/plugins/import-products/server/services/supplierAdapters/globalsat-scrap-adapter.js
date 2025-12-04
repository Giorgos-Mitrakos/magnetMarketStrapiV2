'use strict';

/**
 * Globalsat Supplier Adapter (Scraped)
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class GlobalsatAdapter extends BaseSupplier {
        /**
         * Field mapping - Globalsat is scraped, so no XML fields
         */
        getFieldMapping() {
            return {
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
         * Fetch Globalsat data - delegates to globalsatService
         */
        async fetchData(importRef) {
            try {
                console.log('🕷️  Starting Globalsat scraping...');

                const response = await strapi
                    .plugin('import-products')
                    .service('globalsatService')
                    .scrapGlobalsat(importRef, this.entry);

                if (response?.message === "error") {
                    return { message: 'Error', error: response.error };
                }

                return { products: [], message: 'ok', info: 'Globalsat scraping completed' };

            } catch (error) {
                console.error('Error in Globalsat adapter:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Preprocess products - Globalsat handles this during scraping
         */
        async preprocessProducts(products, importRef) {
            return [];
        }

        /**
         * Transform product - Globalsat specific
         */
        async transformProduct(product, rawData, importRef) {
            // Parse characteristics
            if (product.prod_chars?.length > 0) {
                const parsedChars = strapi
                    .plugin('import-products')
                    .service('charnameService')
                    .parseChars(product.prod_chars, importRef);

                product.prod_chars = parsedChars;
            }

            // Validate weight
            if (product.weight) {
                product.weight = parseInt(product.weight);
            }

            // Parse dimensions
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

            // Brand detection
            if (!product.brand) {
                const cacheService = strapi
                    .plugin('import-products')
                    .service('cacheService');

                const foundBrand = cacheService.findBrandInProductName(product.name);
                
                if (foundBrand) {
                    product.brand = { id: foundBrand.id };
                }
            }

            // Clean prices
            if (product.wholesale) {
                product.wholesale = this.cleanPrice(product.wholesale);
            }
            if (product.retail_price) {
                product.retail_price = this.cleanPrice(product.retail_price);
            }
            if (product.initial_retail_price) {
                product.initial_retail_price = this.cleanPrice(product.initial_retail_price);
            }

            // Clean description
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
         * Override main import flow for Globalsat
         */
        async import() {
            try {
                console.log(`\n🚀 Starting import for ${this.name}`);
                const startTime = Date.now();

                const importRef = await this.initialize();

                if (!this.isActive) {
                    await this.deleteProducts(importRef);
                    return { message: "ok", info: "Inactive supplier" };
                }

                const { message, error, info } = await this.fetchData(importRef);

                if (message === 'Error') {
                    console.error(`Globalsat scraping failed: ${error}`);
                    return { message: 'Error', error };
                }

                await this.cleanup(importRef);

                const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
                this.logReport(importRef, duration);

                return { message: "ok", info: info || "Globalsat import completed" };

            } catch (error) {
                console.error(`Error importing ${this.name}:`, error);
                return { message: "error", error: error.message };
            }
        }
    }

    return (entry) => new GlobalsatAdapter(entry);
};