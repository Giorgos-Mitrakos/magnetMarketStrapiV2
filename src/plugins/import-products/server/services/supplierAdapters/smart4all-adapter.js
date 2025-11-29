'use strict';

const xlsx = require('xlsx');
const fs = require('fs');

/**
 * Smart4All Supplier Adapter
 * Uses XML + Excel file for MPN matching
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class Smart4AllAdapter extends BaseSupplier {
        /**
         * Field mapping για Smart4All XML
         */
        getFieldMapping() {
            return {
                isGreater: false,
                splitter: ">",
                category: 'CATEGORY',
                subcategory: null,
                sub2category: null,
                stock_level: 'AVAILABILITY',
                wholesale: 'WHOLESALE_PRICE',
                retail_price: null,
                recycle_tax: null,
                in_offer: null,
                name: 'NAME',
                brand: 'MANUFACTURER',
                mpn: null, // Will be filled from Excel
                model: null,
                barcode: 'BARCODE',
                supplierCode: 'CODE',
                description: 'DESCRIPTION',
                short_description: null,
                image: 'IMAGE',
                additional_images: null,
                additional_files: null,
                supplierProductURL: null,
                attributes: 'FEATURES.FEATURE',
                weight: null,
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        /**
         * Fetch Smart4All XML data
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

                // ✅ Custom filter that checks for supplierCode (not mpn)
                const availableProducts = this.filterDataWithSupplierCode(
                    xml.mywebstore.products[0].product,
                    importRef.categoryMap,
                    importRef.mapFields
                );

                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Smart4All data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Custom filter for Smart4All (checks supplierCode instead of mpn)
         */
        filterDataWithSupplierCode(data, categoryMap, importParams) {
            try {
                const newData = data
                    .filter(item => {
                        // Check if has supplier code
                        const supplierCode = strapi
                            .plugin('import-products')
                            .service('productHelpers')
                            .createFields(importParams.supplierCode, item);

                        if (!supplierCode) return false;

                        // Check stock
                        const availability = strapi
                            .plugin('import-products')
                            .service('productHelpers')
                            .createFields(importParams.stock_level, item);

                        if (!availability) return false;

                        if (categoryMap.stock_map.length > 0) {
                            const catIndex = categoryMap.stock_map.findIndex(x => x.name.trim() === availability.trim());
                            if (catIndex === -1) return false;
                        }

                        // Check image
                        const image = strapi
                            .plugin('import-products')
                            .service('productHelpers')
                            .createFields(importParams.image, item);

                        if (!image) return false;

                        // Check price range
                        const productPrice = strapi
                            .plugin('import-products')
                            .service('productHelpers')
                            .createFields(importParams.wholesale, item);

                        if (!productPrice) return false;

                        const minPrice = categoryMap.minimumPrice ? parseFloat(categoryMap.minimumPrice) : 0;
                        const maxPrice = categoryMap.maximumPrice && categoryMap.maximumPrice > 0 
                            ? parseFloat(categoryMap.maximumPrice) 
                            : 100000;

                        const price = parseFloat(productPrice);
                        if (price < minPrice || price > maxPrice) return false;

                        // Check categories (same as standard)
                        const { category, subcategory, sub2category } = strapi
                            .plugin('import-products')
                            .service('productHelpers')
                            .createCategories(item, importParams);

                        return this.checkCategoryFilter(category, subcategory, sub2category, categoryMap);
                    });

                return newData;

            } catch (error) {
                console.error('Error filtering Smart4All data:', error);
                return [];
            }
        }

        /**
         * Helper for category filtering
         */
        checkCategoryFilter(category, subcategory, sub2category, categoryMap) {
            if (categoryMap.isWhitelistSelected) {
                if (categoryMap.whitelist_map.length > 0) {
                    const catIndex = categoryMap.whitelist_map.findIndex(x => x.name.trim() === category.trim());
                    if (catIndex === -1) return false;

                    if (categoryMap.whitelist_map[catIndex].subcategory.length > 0) {
                        const subIndex = categoryMap.whitelist_map[catIndex].subcategory.findIndex(x => x.name.trim() === subcategory);
                        if (subIndex === -1) return false;

                        if (categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.length > 0) {
                            const sub2Index = categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.findIndex(x => x.name.trim() === sub2category);
                            if (sub2Index === -1) return false;
                        }
                    }
                }
                return true;
            } else {
                if (categoryMap.blacklist_map.length > 0) {
                    const catIndex = categoryMap.blacklist_map.findIndex(x => x.name.trim() === category);
                    if (catIndex !== -1) {
                        if (categoryMap.blacklist_map[catIndex].subcategory.length > 0) {
                            const subIndex = categoryMap.blacklist_map[catIndex].subcategory.findIndex(x => x.name.trim() === subcategory);
                            if (subIndex !== -1) {
                                if (categoryMap.blacklist_map[catIndex].subcategory[subIndex].subcategory.length > 0) {
                                    const sub2Index = categoryMap.blacklist_map[catIndex].subcategory[subIndex].subcategory.findIndex(x => x.name.trim() === sub2category);
                                    if (sub2Index !== -1) return false;
                                }
                            }
                        } else {
                            return false;
                        }
                    }
                }
                return true;
            }
        }

        /**
         * Preprocess products - Smart4All specific (Excel matching)
         */
        async preprocessProducts(products, importRef) {
            // ✅ Check if Excel file exists
            if (!this.entry.importedFile || !fs.existsSync(`./public${this.entry.importedFile.url}`)) {
                console.error('Excel file not found for Smart4All!');
                return [];
            }

            // ✅ Read Excel file
            const wb = xlsx.readFile(`./public${this.entry.importedFile.url}`);
            const ws = wb.SheetNames;
            let excel = [];

            ws.forEach(x => {
                if (x !== 'Φύλλο') {
                    const sheet = wb.Sheets[x];
                    const sheetProducts = xlsx.utils.sheet_to_json(sheet);
                    excel = excel.concat(sheetProducts);
                }
            });

            const stockFilterFields = importRef.categoryMap.stock_map.map(x => x.name.trim());

            // ✅ Filter Excel products by stock and EAN
            const productsInExcel = excel.filter(x => {
                if (!x["Availability"] || x["Availability"].trim() === "" || 
                    !stockFilterFields.includes(x["Availability"].trim())) {
                    return false;
                }

                if (x["EAN"] !== undefined && !isNaN(x["EAN"]) && x["EAN"] !== "") {
                    return true;
                }

                return false;
            });

            // ✅ Process products with Excel matching
            const processed = [];

            for (let dt of products) {
                try {
                    const product = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .createProductFields(this.entry, dt, importRef);

                    if (!product.supplierCode) continue;

                    // ✅ Find product in Excel
                    const findProductInExcel = productsInExcel.find(x => 
                        x["Κωδικός S4ALL"]?.trim() === product.supplierCode.trim()
                    );

                    if (!findProductInExcel) continue;

                    // ✅ Get MPN from Excel
                    if (!findProductInExcel["PN"] && !findProductInExcel["SKU"] && !findProductInExcel["Εναλλακτικός Κωδικός"]) {
                        continue;
                    }

                    const mpn = findProductInExcel.PN || findProductInExcel.SKU || findProductInExcel["Εναλλακτικός Κωδικός"];
                    product.mpn = String(mpn);

                    // ✅ Get barcode from Excel if missing
                    if (!product.barcode || product.barcode === "") {
                        product.barcode = String(findProductInExcel.EAN);
                    }

                    // Apply transformations
                    await this.transformProduct(product, dt, importRef);

                    processed.push(product);

                } catch (error) {
                    console.error('Error preprocessing Smart4All product:', error.message);
                }
            }

            return processed;
        }

        /**
         * Transform product - Smart4All specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // Clean prices
            product.wholesale = this.cleanPrice((product.wholesale || "0").replace(',', '.').trim());

            // Clean description
            product.description = product.description
                ?.replace(/(<([^>]+)>)/ig, '')
                .trim() || "";

            // ✅ Parse characteristics and weight/dimensions
            
            // Smart4all sends dimensions in mm, convert to cm
            if (product.length) {
                product.length = parseInt(parseFloat(product.length) / 10);
            }
            if (product.width) {
                product.width = parseInt(parseFloat(product.width) / 10);
            }
            if (product.height) {
                product.height = parseInt(parseFloat(product.height) / 10);
            }
        }
    }

    return (entry) => new Smart4AllAdapter(entry);
};