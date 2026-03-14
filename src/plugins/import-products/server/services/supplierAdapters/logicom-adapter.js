'use strict';
const fs = require('fs');

/**
 * CPI Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class LogicomAdapter extends BaseSupplier {
        /**
         * Field mapping για CPI XML
         */
        getFieldMapping() {
            return {
                isGreater: false,
                splitter: null,
                category: 'Cat1_Desc',
                subcategory: 'Cat2_Desc',
                sub2category: 'Cat3_Desc',
                stock_level: 'StockLevel',
                wholesale: 'NetPrice',
                retail_price: null,
                recycle_tax: 'RecycleTax',
                in_offer: null,
                name: 'ItemTitle',
                brand: 'Brand',
                mpn: 'ItemCode',
                model: null,
                barcode: 'EANBarcode',
                supplierCode: 'ItemCode',
                description: null,
                short_description: null,
                image: 'PictureURL',
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
         * Fetch CPI XML data
         */
        async fetchData(importRef) {
            try {
                const filePath = `./public${this.entry.importedFile.url}`;

                if (!fs.existsSync(filePath)) {
                    console.error(`File not found: ${filePath}`);
                    return { message: 'Error', error: 'File not found' };
                }

                const xmlData = await fs.promises.readFile(filePath, 'utf8');

                const xml = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .parseXml(xmlData);

                // Προσάρμοσε ανάλογα με τη δομή του XML
                const items = xml.Pricelist.Items[0].Item;

                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        items,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name,
                        importRef.brand_excl_map
                    );

                console.log(`Logicom available products: ${availableProducts[0]}`);
                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Logicom data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Transform product - CPI specific logic
         */
        async transformProduct(product, rawData, importRef) {
            // ✅ Logicom τιμές είναι ήδη δεκαδικοί αριθμοί (33.33, 314.6)
            // ΔΕΝ κάνουμε replace('.', '') - αυτό ήταν μόνο για CPI
            product.wholesale = this.cleanPrice(product.wholesale);
            product.retail_price = "0"; // Logicom δεν έχει RRP
            product.recycle_tax = this.cleanPrice(product.recycle_tax);

            // Logicom δεν έχει description
            product.description = "";

            // Logicom δεν έχει attributes/weight/dimensions
            // Δεν καλούμε parseWeightAndDimensions - δεν υπάρχει τίποτα να παρσάρουμε
        }
    }

    return (entry) => new LogicomAdapter(entry);
};