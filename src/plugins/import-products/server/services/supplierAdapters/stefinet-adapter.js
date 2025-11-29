'use strict';

/**
 * Stefinet Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class StefinetAdapter extends BaseSupplier {
        /**
         * Field mapping για Stefinet XML
         */
        getFieldMapping() {
            return {
                isGreater: false,
                splitter: '::',
                category: 'category',
                subcategory: null,
                sub2category: null,
                stock_level: 'availStatus',
                wholesale: 'price',
                retail_price: 'SRP',
                recycle_tax: null,
                in_offer: null,
                name: 'descr',
                brand: 'manufacturer',
                mpn: 'code',
                model: null,
                barcode: 'barcode',
                supplierCode: 'productcode',
                description: 'fulldescr',
                short_description: null,
                image: 'mainimage',
                additional_images: 'detailimage',
                additional_files: null,
                supplierProductURL: 'PID',
                attributes: null,
                weight: 'weight',
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        /**
         * Fetch Stefinet XML data
         */
        async fetchData(importRef) {
            try {
                const url = `${this.entry.importedURL}?username=${process.env.STEFINET_USERNAME}&password=${process.env.STEFINET_PASSWORD}`;
                const config = {
                    headers: {
                        "Accept-Encoding": "gzip,deflate,compress",
                        "Content-Type": "application/xml",
                        "Accept": "application/xml"
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

                // ✅ Clean unwanted categories (KRITIKO!)
                for (let product of xml.PriceCatalog.product) {
                    if (product.category.includes('ΝΕΑ ΠΡΟΪΟΝΤΑ')) {
                        const index = product.category.indexOf('ΝΕΑ ΠΡΟΪΟΝΤΑ');
                        product.category.splice(index, 1);
                    }

                    if (product.category.includes('LAST PIECES')) {
                        const index = product.category.indexOf('LAST PIECES');
                        product.category.splice(index, 1);
                    }

                    if (product.category.includes('Ψηφιακός Μετασχηματισμός')) {
                        const index = product.category.indexOf('Ψηφιακός Μετασχηματισμός');
                        product.category.splice(index, 1);
                    }
                }

                // Filter products that have no categories left
                const filteredProducts = xml.PriceCatalog.product.filter(x => x.category && x.category.length > 0);

                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        filteredProducts,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name
                    );

                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Stefinet data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Transform product - Stefinet specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // Clean prices
            product.wholesale = this.cleanPrice((product.wholesale || "0").replace(',', '.').trim());
            product.retail_price = this.cleanPrice((product.retail_price || "0").replace(',', '.').trim());

            // Clean description
            product.description = product.description
                ?.replace(/(<([^>]+)>)/ig, '')
                .replaceAll('&apos;', "'")
                .replaceAll('&quot;', '"')
                .trim() || "";

            // ✅ Parse weight (Stefinet sends weight in field)
            if (product.weight) {
                const weightStr = String(product.weight).replace(',', '.').trim();
                const weightValue = parseFloat(weightStr);
                
                if (!isNaN(weightValue) && weightValue > 0) {
                    // Stefinet likely sends in grams or kg - check value
                    product.weight = weightValue > 100 ? Math.round(weightValue) : Math.round(weightValue * 1000);
                }
            }

            // ✅ Parse weight and dimensions from characteristics if needed
            if (!product.weight || !product.length) {
                await this.parseWeightAndDimensions(product, rawData, importRef);
            }
        }
    }

    return (entry) => new StefinetAdapter(entry);
};