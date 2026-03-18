'use strict';
const fs = require('fs');

/**
 * Logicom Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class LogicomAdapter extends BaseSupplier {
        /**
         * Field mapping για Logicom XML
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
         * Fetch Logicom XML data από τοπικό αρχείο
         */
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

                const processedProducts = await this.preprocessProducts(products, importRef);

                const { toCreate, toUpdate } = await strapi
                    .plugin('import-products')
                    .service('batchHelpers')
                    .categorizeProducts(processedProducts, this.entry, importRef);

                console.log(`   To create (before image check): ${toCreate.length}`);
                console.log(`   To update: ${toUpdate.length}`);

                // ✅ Resolve images ΜΟΝΟ για νέα προϊόντα
                const toCreateWithImages = [];
                for (const product of toCreate) {
                    product.imagesSrc = await this.buildLogicomImageUrls(product.mpn);
                    if (product.imagesSrc.length > 0) {
                        toCreateWithImages.push(product);
                    } else {
                        console.log(`   ⚠️  No images found for ${product.mpn} - skipping`);
                    }
                }

                console.log(`   To create (after image check): ${toCreateWithImages.length}`);

                await strapi
                    .plugin('import-products')
                    .service('batchHelpers')
                    .processCreateBatch(toCreateWithImages, importRef);

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
                strapi.plugin('import-products').service('cacheService').clear(this.name);
            }
        }

        // transformProduct - χωρίς image logic πλέον
        async transformProduct(product, rawData, importRef) {
            product.wholesale = this.cleanPrice(product.wholesale);
            product.retail_price = "0";
            product.recycle_tax = this.cleanPrice(product.recycle_tax);
            product.description = "";
            // imagesSrc set στο import() μόνο για toCreate
        }

        /**
         * Encode ItemCode για χρήση σε URL
         * Known transformations:
         *   ':' → '-'
         *   '/' → '%2F'
         *   υπόλοιποι unsafe χαρακτήρες → encodeURIComponent
         */
        buildLogicomEncodedCode(itemCode) {
            if (!itemCode) return null;

            // ✅ Μετατροπή σε string - ο XML parser μπορεί να επιστρέψει number ή array
            const code = Array.isArray(itemCode) ? itemCode[0] : String(itemCode);
            if (!code || code === 'undefined' || code === 'null') return null;

            return code
                .toLowerCase()
                .split('')
                .map(char => {
                    if (char === ':') return '-';
                    if (char === '/') return '-3%3D';
                    if (/[^a-z0-9\-_\.~]/.test(char)) return encodeURIComponent(char);
                    return char;
                })
                .join('');
        }

        /**
         * HEAD request για να ελεγχθεί αν υπάρχει η εικόνα
         */
        async validateImageUrl(url) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                return response.ok;
            } catch {
                return false;
            }
        }

        /**
         * Βρες όλες τις διαθέσιμες εικόνες για ένα ItemCode
         * Για κάθε index (~1, ~2, ...):
         *   1. Δοκίμασε large - αν υπάρχει, πάρτην
         *   2. Αλλιώς δοκίμασε medium - αν υπάρχει, πάρτην
         *   3. Αν ούτε large ούτε medium → σταμάτα
         */
        async buildLogicomImageUrls(itemCode) {
            const encoded = this.buildLogicomEncodedCode(itemCode);
            if (!encoded) return [];

            const MAX_IMAGES = 10;
            const MAX_CONSECUTIVE_MISSES = 2; // Επιτρέπουμε 2 κενά πριν σταματήσουμε
            const images = [];
            let consecutiveMisses = 0;

            for (let i = 1; i <= MAX_IMAGES; i++) {
                const largeUrl = `https://logicompartners.com/product/image/large/${encoded}~${i}.jpg`;
                const mediumUrl = `https://logicompartners.com/product/image/medium/${encoded}~${i}.jpg`;

                if (await this.validateImageUrl(largeUrl)) {
                    images.push({ url: largeUrl });
                    consecutiveMisses = 0; // Reset counter σε κάθε επιτυχία
                } else if (await this.validateImageUrl(mediumUrl)) {
                    images.push({ url: mediumUrl });
                    consecutiveMisses = 0;
                } else {
                    consecutiveMisses++;
                    if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) {
                        break; // Σταματάμε μόνο μετά από X συνεχόμενα κενά
                    }
                }
            }

            return images;
        }
    }

    return (entry) => new LogicomAdapter(entry);
};