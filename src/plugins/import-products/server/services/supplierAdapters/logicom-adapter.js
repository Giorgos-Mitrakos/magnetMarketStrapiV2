'use strict';
const fs = require('fs');

/**
 * Logicom Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class LogicomAdapter extends BaseSupplier {

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

        async fetchData(importRef) {
            try {
                const filePath = `./public${this.entry.importedFile.url}`;

                if (!fs.existsSync(filePath)) {
                    console.error(`Logicom file not found: ${filePath}`);
                    return { message: 'Error', error: 'File not found' };
                }

                const xmlData = await fs.promises.readFile(filePath, 'utf8');

                const xml = await strapi
                    .plugin('import-products')
                    .service('importHelpers')
                    .parseXml(xmlData);

                const items = xml.Pricelist.Items[0].Item;
                if (!items || items.length === 0) {
                    console.warn('Logicom: No items found in XML');
                    return { message: 'No products' };
                }

                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        items,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name
                    );

                console.log(`Logicom available products: ${availableProducts.length}`);
                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Logicom data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        async transformProduct(product, rawData, importRef) {
            product.wholesale = this.cleanPrice(product.wholesale);
            product.retail_price = "0";
            product.recycle_tax = this.cleanPrice(product.recycle_tax);
            product.description = "";
            // imagesSrc: set στο resolveImages() μόνο για νέα προϊόντα
        }

        /**
         * ✅ Override resolveImages hook από BaseSupplier
         * HEAD requests μόνο για νέα προϊόντα
         */
        async resolveImages(toCreate, importRef) {
            const resolved = [];

            for (const product of toCreate) {
                const images = await this.buildLogicomImageUrls(product.mpn);
                if (images.length > 0) {
                    product.imagesSrc = images;
                    resolved.push(product);
                } else {
                    console.log(`   ⚠️  No images found for ${product.mpn} - skipping`);
                }
            }

            return resolved;
        }

        buildLogicomEncodedCode(itemCode) {
            if (!itemCode) return null;
            const code = Array.isArray(itemCode) ? itemCode[0] : String(itemCode);
            if (!code || code === 'undefined' || code === 'null') return null;

            return code
                .toLowerCase()
                .split('')
                .map(char => {
                    if (char === ':') return '-';
                    if (char === '/') return '%2F';
                    if (/[^a-z0-9\-_\.~]/.test(char)) return encodeURIComponent(char);
                    return char;
                })
                .join('');
        }

        async validateImageUrl(url) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                return response.ok;
            } catch {
                return false;
            }
        }

        async buildLogicomImageUrls(itemCode) {
            const encoded = this.buildLogicomEncodedCode(itemCode);
            if (!encoded) return [];

            const MAX_IMAGES = 10;
            const MAX_CONSECUTIVE_MISSES = 2;
            const images = [];
            let consecutiveMisses = 0;

            for (let i = 1; i <= MAX_IMAGES; i++) {
                const largeUrl = `https://logicompartners.com/product/image/large/${encoded}~${i}.jpg`;
                const mediumUrl = `https://logicompartners.com/product/image/medium/${encoded}~${i}.jpg`;

                if (await this.validateImageUrl(largeUrl)) {
                    images.push({ url: largeUrl });
                    consecutiveMisses = 0;
                } else if (await this.validateImageUrl(mediumUrl)) {
                    images.push({ url: mediumUrl });
                    consecutiveMisses = 0;
                } else {
                    consecutiveMisses++;
                    if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) break;
                }
            }

            return images;
        }
    }

    return (entry) => new LogicomAdapter(entry);
};