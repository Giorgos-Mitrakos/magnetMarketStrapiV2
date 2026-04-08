'use strict';

const CryptoJS = require('crypto-js');

/**
 * Logicom API Adapter
 * Χρησιμοποιεί το Logicom QuickConnect REST API
 *
 * .env variables:
 *   LOGICOM_CUSTOMER_ID=
 *   LOGICOM_CONSUMER_KEY=
 *   LOGICOM_CONSUMER_SECRET=
 *   LOGICOM_ACCESS_TOKEN_KEY=
 *   LOGICOM_BASE_URL=https://quickconnect.logicompartners.com/api
 */
module.exports = ({ strapi }) => {
    const { BaseSupplier } = strapi.plugin('import-products').service('baseSupplier');

    class LogicomApiAdapter extends BaseSupplier {

        constructor(entry) {
            super(entry);
            this.customerId = process.env.LOGICOM_CUSTOMER_ID;
            this.consumerKey = process.env.LOGICOM_CONSUMER_KEY;
            this.consumerSecret = process.env.LOGICOM_CONSUMER_SECRET;
            this.accessTokenKey = process.env.LOGICOM_ACCESS_TOKEN_KEY;
            this.baseUrl = process.env.LOGICOM_BASE_URL || 'https://quickconnect.logicompartners.com/api';
        }

        // ─────────────────────────────────────────────
        // FIELD MAPPING
        // ─────────────────────────────────────────────
        getFieldMapping() {
            return {
                isGreater: false,
                splitter: null,
                category: 'Category',
                subcategory: null,
                sub2category: null,
                stock_level: null,
                quantity: '_inventory',
                preOrder: 'preOrder',
                wholesale: '_price',
                retail_price: null,
                recycle_tax: '_recycleTax',
                in_offer: null,
                name: 'Name',
                brand: 'Manufacturer',
                mpn: 'SKU',
                model: null,
                barcode: 'Barcode',
                supplierCode: 'SKU',
                description: 'Description',
                short_description: null,
                image: null,
                additional_images: '_images',
                additional_files: null,
                supplierProductURL: null,
                attributes: 'Specifications',
                weight: null,
                width: null,
                length: null,
                height: null,
                skoutz_url: null
            };
        }

        // ─────────────────────────────────────────────
        // AES-256-CBC με crypto-js
        // ─────────────────────────────────────────────
        aesEncrypt(plaintext, key) {
            const keyPadded = key.padEnd(32, '\0').substring(0, 32);
            const keyWA = CryptoJS.enc.Utf8.parse(keyPadded);
            const ivWA = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');

            const encrypted = CryptoJS.AES.encrypt(plaintext, keyWA, {
                iv: ivWA,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });

            return encrypted.toString(); // Base64
        }

        getTimestamp() {
            return Math.floor(Date.now() / 1000).toString();
        }

        // ─────────────────────────────────────────────
        // GENERATE ACCESS TOKEN
        // Λήγει σε 1 λεπτό - παίρνουμε νέο ανά page
        // ─────────────────────────────────────────────
        async generateAccessToken() {
            const timestamp = this.getTimestamp();

            const bCode = this.aesEncrypt(
                `${this.consumerKey};${this.consumerSecret}`,
                this.accessTokenKey
            );

            const generateSignature = this.aesEncrypt(
                `${this.consumerKey}${this.customerId}${timestamp};${this.consumerSecret}`,
                this.accessTokenKey
            );

            const response = await fetch(`${this.baseUrl}/GenerateAccessToken`, {
                method: 'GET',
                headers: {
                    'CustomerID': this.customerId,
                    'Timestamp': timestamp,
                    'BCode': bCode,
                    'GenerateSignature': generateSignature,
                    'Accept': 'application/json'
                }
            });

            const text = await response.text();
            if (!response.ok) throw new Error(`GenerateAccessToken failed (${response.status}): ${text}`);

            let token = text.trim();

            // ✅ Αν είναι JSON (από proxy που δεν έχει ενημερωθεί), πάρε το token field
            try {
                const parsed = JSON.parse(token);
                if (parsed.token) {
                    token = parsed.token;
                }
            } catch {
                // plain text token - ΟΚ
            }

            // Αφαίρεσε εισαγωγικά αν χρειάζεται
            if (token.startsWith('"') && token.endsWith('"')) {
                token = token.slice(1, -1);
            }

            // ✅ Βεβαιώσου ότι είναι ASCII
            if (!/^[\x00-\xFF]*$/.test(token)) {
                throw new Error('Token contains non-ASCII characters - proxy not updated yet');
            }

            return { token, timestamp };
        }

        buildHeaders(accessToken, timestamp) {
            const encrypted = this.aesEncrypt(`${accessToken}${timestamp}`, this.accessTokenKey);
            const signature = Buffer.from(encrypted).toString('base64');

            return {
                'Authorization': accessToken,
                'Timestamp': timestamp,
                'Signature': signature,
                'CustomerId': this.customerId,
                'Accept': 'application/json'
            };
        }

        // ─────────────────────────────────────────────
        // PARSE RESPONSE - double-encoded JSON fix
        // ─────────────────────────────────────────────
        async parseResponse(response) {
            const text = await response.text();
            try {
                const parsed = JSON.parse(text);
                const json = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;

                // ✅ Normalize: αν έχει data wrapper (από proxy) επέστρεψε το περιεχόμενο
                // αλλιώς επέστρεψε ως έχει (από Logicom απευθείας)
                return json.data ? json.data : json;
            } catch {
                return text;
            }
        }

        // ─────────────────────────────────────────────
        // FETCH DATA - GetProducts με pagination
        // ─────────────────────────────────────────────
        async fetchData(importRef) {
            try {
                if (!this.customerId || !this.consumerKey || !this.consumerSecret || !this.accessTokenKey) {
                    console.error('Logicom API: Missing credentials in .env');
                    return { message: 'Error', error: 'Missing credentials' };
                }

                console.log(`   Logicom API baseUrl: ${this.baseUrl}`);

                const allProducts = [];
                let previousItemNo = '';
                let pageCount = 0;
                const MAX_PAGES = 3000;

                console.log('   Logicom API: Starting full product sync...');

                while (pageCount < MAX_PAGES) {
                    pageCount++;

                    // Fresh token ανά page (λήγει σε 1 λεπτό)
                    const { token, timestamp } = await this.generateAccessToken();
                    const headers = this.buildHeaders(token, timestamp);

                    const url = new URL(`${this.baseUrl}/GetProducts`);
                    url.searchParams.set('Currency', 'EUR');
                    if (previousItemNo) url.searchParams.set('PreviousItemNo', previousItemNo);

                    const response = await fetch(url.toString(), { method: 'GET', headers });

                    if (!response.ok) {
                        console.error(`GetProducts page ${pageCount} failed: ${response.status}`);
                        break;
                    }

                    const json = await this.parseResponse(response);

                    if (json.StatusCode !== 1 || !Array.isArray(json.Message) || json.Message.length === 0) {
                        console.log(`   Logicom API: No more products at page ${pageCount}`);
                        break;
                    }

                    const normalized = json.Message.map(p => this.normalizeProduct(p));

                    allProducts.push(...normalized);

                    console.log(`   Page ${pageCount}: +${json.Message.length} (total: ${allProducts.length})`);

                    if (!json.NextItemNo) {
                        console.log('   Logicom API: Last page reached');
                        break;
                    }

                    previousItemNo = json.NextItemNo;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                console.log(`   Logicom API: Total fetched: ${allProducts.length}`);

                if (allProducts.length === 0) return { message: 'No products' };

                const availableProducts = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .filterData(
                        allProducts,
                        importRef.categoryMap,
                        importRef.mapFields,
                        this.name,
                        importRef.brand_excl_map
                    );

                console.log(`   Logicom API available: ${availableProducts.length}`);
                return { products: availableProducts };

            } catch (error) {
                console.error('Error fetching Logicom API data:', error);
                return { message: 'Error', error: error.message };
            }
        }

        /**
         * Normalize Logicom API product για filterData/createProductFields
         */
        normalizeProduct(p) {
            return {
                SKU: String(p.SKU || ''),
                Name: p.Name || '',
                Description: p.Description || '',
                Manufacturer: p.Manufacturer || '',
                Category: p.Category || '',
                Barcode: String(p.Barcode || ''),
                Specifications: p.Specifications || [],

                // Synthetic fields από nested objects
                _price: p.Price?.PriceExclVAT || '0',
                _recycleTax: p.Price?.RecycleTax || '0',
                _inventory: String(p.Inventory?.Quantity || '0'),
                preOrder: String(p.Inventory?.PO?.Quantity),

                // Images array - έτοιμα URLs από το API
                _images: Array.isArray(p.Images) ? p.Images : []
            };
        }

        // ─────────────────────────────────────────────
        // TRANSFORM PRODUCT
        // ─────────────────────────────────────────────
        async transformProduct(product, rawData, importRef) {
            product.wholesale = parseFloat(this.cleanPrice(product.wholesale)) || 0;
            product.retail_price = 0;
            product.recycle_tax = parseFloat(this.cleanPrice(product.recycle_tax)) || 0;
            product.description = (product.description || '').replace(/(<([^>]+)>)/ig, '').trim();

            const stockLevel = Number(product.quantity) === 0 && Number(product.preOrder) !== 0 ? 'Is Expected' :
                Number(product.quantity) === 0 ? 'Out of Stock' :
                    Number(product.quantity) > 0 && Number(product.quantity) < 5 ? 'Low Stock' :
                        Number(product.quantity) >= 5 && Number(product.quantity) < 10 ? 'Medium Stock' :
                            Number(product.quantity) >= 10 ? 'In Stock' : 'Out of Stock'

            product.stock_level = stockLevel

            // Αποθηκεύουμε images για χρήση στο resolveImages()
            product._images = rawData._images || [];
            product.imagesSrc = [];
        }

        // ─────────────────────────────────────────────
        // VALIDATE IMAGE URL
        // ─────────────────────────────────────────────
        async validateImageUrl(url) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                return response.ok;
            } catch {
                return false;
            }
        }

        // ─────────────────────────────────────────────
        // RESOLVE IMAGES - μόνο για νέα προϊόντα
        // Δοκιμάζει large πρώτα, fallback σε medium
        // ─────────────────────────────────────────────
        async resolveImages(toCreate, importRef) {
            const resolved = [];

            for (const product of toCreate) {
                const images = product._images || [];

                if (images.length === 0) {
                    console.log(`   ⚠️  No images for ${product.mpn} - skipping`);
                    continue;
                }

                // ✅ Κρατάμε μόνο medium, αφαιρούμε duplicates βάσει filename
                const seen = new Set();
                const mediumImages = images
                    .filter(u => u.includes('/medium/'))
                    .filter(url => {
                        const filename = url.split('/').pop();
                        if (seen.has(filename)) return false;
                        seen.add(filename);
                        return true;
                    });

                const finalImages = [];

                for (const mediumUrl of mediumImages) {
                    // ✅ Δοκίμασε large πρώτα - αν υπάρχει πάρτο, αλλιώς κράτα medium
                    const largeUrl = mediumUrl.replace('/medium/', '/large/');
                    if (await this.validateImageUrl(largeUrl)) {
                        finalImages.push({ url: largeUrl });
                    } else {
                        finalImages.push({ url: mediumUrl });
                    }
                }

                if (finalImages.length > 0) {
                    product.imagesSrc = finalImages;
                    delete product._images;
                    resolved.push(product);
                } else {
                    console.log(`   ⚠️  No images for ${product.mpn} - skipping`);
                }
            }

            return resolved;
        }
    }

    return (entry) => new LogicomApiAdapter(entry);
};