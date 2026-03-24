'use strict';
const fs = require('fs');

/**
 * Iason Supplier Adapter
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class IasonAdapter extends BaseSupplier {

        getFieldMapping() {
            return {
                isGreater: false,
                splitter: ' > ',           // Category format: "Cat1 > Cat2 > Cat3"
                category: 'category',
                subcategory: null,
                sub2category: null,
                stock_level: 'availability',
                wholesale: 'price',
                quantity: 'quantity',
                retail_price: null,
                recycle_tax: 'recycling-tax',
                in_offer: null,
                name: 'name',
                brand: 'brand',
                mpn: 'international-code',
                model: null,
                barcode: 'barcode',
                supplierCode: 'sku',
                description: null,
                short_description: null,
                image: 'image-url',
                additional_images: null,
                additional_files: null,
                supplierProductURL: null,
                attributes: 'properties',
                weight: 'weight',
                width: null,
                length: null,
                height: null,
                skoutz_url: null,
                quantity: 'quantity'
            };
        }

        async fetchData(importRef) {
            let browser = null;
            try {
                browser = await strapi
                    .plugin('import-products')
                    .service('scrapHelpers')
                    .createBrowser();

                const cookie = await strapi
                    .plugin('import-products')
                    .service('iasonService')
                    .scrapIasonForCookies(browser, importRef, this.entry);

                const url = `${this.entry.importedURL}`;
                const config = {
                    headers: {
                        "Accept-Encoding": "gzip,deflate,compress",
                        "Cookie": `${cookie.name}=${cookie.value}`

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

                const items = xml?.products?.product;
                if (!items || items.length === 0) {
                    console.warn('Iason: No items found in XML');
                    return { message: 'No products' };
                }

                // ✅ Normalize: { _: 'value', $: { type: '...' } } → 'value'
                // Απαραίτητο γιατί τα Iason tags έχουν type attribute
                const normalizedItems = items.map(item => this.normalizeIasonItem(item));

                // Debug: τσέκαρε αν normalization δούλεψε
                console.log('Sample normalized:', normalizedItems[0]?.availability, normalizedItems[0]?.quantity);

                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        normalizedItems,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name
                    );

                console.log(`Iason available products: ${availableProducts.length}`);
                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Iason data:', error);
                return { message: 'Error', error: error.message };
            }
            finally {
                if (browser) {
                    await browser.close().catch(err => console.error('Error closing browser:', err));
                }
            }
        }

        async transformProduct(product, rawData, importRef) {
            product.wholesale = this.cleanPrice(product.wholesale);
            product.retail_price = "0";
            product.recycle_tax = this.cleanPrice(product.recycle_tax);
            product.description = "";

            // ✅ Weight: Iason δίνει σε kg → μετατροπή σε γραμμάρια
            if (product.weight) {
                const weightKg = parseFloat(String(product.weight).replace(',', '.').trim());
                if (!isNaN(weightKg) && weightKg > 0) {
                    product.weight = Math.round(weightKg * 1000);
                }
            }

            // ✅ Αποθηκεύουμε προσωρινά το base image URL
            // Το πλήρες resolve γίνεται στο resolveImages() μόνο για νέα προϊόντα
            const baseImageUrl = rawData['image-url'];
            if (baseImageUrl && typeof baseImageUrl === 'string' && baseImageUrl.trim()) {
                product.imagesSrc = [{ url: baseImageUrl.trim() }];
            } else {
                product.imagesSrc = [];
            }
        }

        /**
         * ✅ Override resolveImages hook από BaseSupplier
         * HEAD requests μόνο για νέα προϊόντα
         */
        async resolveImages(toCreate, importRef) {
            const resolved = [];

            for (const product of toCreate) {
                const baseUrl = product.imagesSrc?.[0]?.url;
                console.log(baseUrl)
                const images = await this.buildIasonImageUrls(baseUrl);

                if (images.length > 0) {
                    product.imagesSrc = images;
                    resolved.push(product);
                } else {
                    console.log(`   ⚠️  No images found for ${product.mpn} - skipping`);
                }
            }

            return resolved;
        }

        /**
         * Normalize Iason item
         * { _: 'Διαθέσιμο', $: { type: 'string' } } → 'Διαθέσιμο'
         */
        normalizeIasonItem(item) {
            const normalized = {};
            const stringFields = ['international-code', 'barcode', 'sku', 'name', 'brand',
                'availability', 'category', 'image-url'];

            for (const [key, val] of Object.entries(item)) {
                if (key === 'properties') {
                    normalized[key] = this.normalizeProperties(val);
                } else if (Array.isArray(val)) {
                    const first = val[0];
                    const raw = (first && typeof first === 'object' && '_' in first) ? first._ : (first ?? null);
                    // ✅ String fields → String(), numeric fields → αφήνουμε ως number
                    normalized[key] = (raw != null && stringFields.includes(key)) ? String(raw) : raw;
                } else if (val && typeof val === 'object' && '_' in val) {
                    const raw = val._;
                    normalized[key] = (raw != null && stringFields.includes(key)) ? String(raw) : raw;
                } else {
                    normalized[key] = val;
                }
            }

            return normalized;
        }

        /**
         * Normalize properties array
         * <property code="Χρώμα">Cyan</property>
         * → { name: 'Χρώμα', value: 'Cyan' }
         */
        normalizeProperties(properties) {
            // ✅ Το properties είναι array λόγω type="array" attribute
            // [{ $: { type: 'array' }, property: [...] }] → παίρνουμε το πρώτο element
            const propsObj = Array.isArray(properties) ? properties[0] : properties;

            if (!propsObj?.property) return [];

            const propArray = Array.isArray(propsObj.property)
                ? propsObj.property
                : [propsObj.property];

            return propArray
                .filter(p => p?.$ && p?._)
                .map(p => ({
                    name: p.$.code?.trim(),
                    value: String(p._).trim()
                }))
                .filter(p => p.name && p.value);
        }

        async validateImageUrl(url) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                return response.ok;
            } catch {
                return false;
            }
        }

        /**
         * Βρες όλες τις διαθέσιμες εικόνες για ένα Iason προϊόν
         * base: https://www.iason.gr/.../BRO31036_2.jpg
         * extra: https://www.iason.gr/.../BRO31036_2-1.jpg, -2.jpg, ...
         */
        async buildIasonImageUrls(baseUrl) {
            if (!baseUrl) return [];

            const MAX_EXTRA_IMAGES = 10;
            const MAX_CONSECUTIVE_MISSES = 2;
            const images = [];

            // ✅ Detect format:
            // Format A: "...HPD09GBA_1.jpg"  → insert -N before "_1.jpg"
            // Format B: "...VER60102.jpg"    → insert -N before ".jpg"
            const suffixWithCounter = baseUrl.match(/(_\d+)(\.[a-z]+)$/i);
            const suffixSimple = baseUrl.match(/(\.[a-z]+)$/i);

            let urlBase, buildUrl;

            if (suffixWithCounter) {
                // Format A: split off "_1.jpg"
                const counter = suffixWithCounter[1]; // "_1"
                const ext = suffixWithCounter[2];     // ".jpg"
                urlBase = baseUrl.slice(0, -(counter.length + ext.length)); // "...HPD09GBA"
                buildUrl = (i) => `${urlBase}-${i}${counter}${ext}`; // "...HPD09GBA-1_1.jpg"
            } else if (suffixSimple) {
                // Format B: split off ".jpg"
                const ext = suffixSimple[1]; // ".jpg"
                urlBase = baseUrl.slice(0, -ext.length); // "...VER60102"
                buildUrl = (i) => `${urlBase}-${i}${ext}`; // "...VER60102-1.jpg"
            } else {
                return [];
            }

            // ✅ Βήμα 1: Base URL από το feed
            if (await this.validateImageUrl(baseUrl)) {
                images.push({ url: baseUrl });
            }

            // ✅ Βήμα 2: Extra images
            let consecutiveMisses = 0;
            for (let i = 1; i <= MAX_EXTRA_IMAGES; i++) {
                const url = buildUrl(i);

                if (await this.validateImageUrl(url)) {
                    images.push({ url });
                    consecutiveMisses = 0;
                } else {
                    consecutiveMisses++;
                    if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) break;
                }
            }

            return images;
        }
    }

    return (entry) => new IasonAdapter(entry);
};