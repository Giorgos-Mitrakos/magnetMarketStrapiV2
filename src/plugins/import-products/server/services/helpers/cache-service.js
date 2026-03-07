'use strict';

/**
 * SMART Cache Service - Supports concurrent imports without duplication
 *
 * - Shared cache for all suppliers (no duplication)
 * - Reference counting: tracks how many suppliers are using cache
 * - Only clears when NO suppliers are active
 * - Lean product cache: no prod_chars, no nested category data
 */
module.exports = ({ strapi }) => ({
    cache: {
        categories: new Map(),
        brands: new Map(),
        existingProducts: new Map(),
        activeSuppliers: new Set(),
        processingProducts: new Set(),
    },

    /**
     * Initialize cache for supplier
     */
    async initialize(entry) {
        const supplierName = entry.name.toLowerCase();

        if (this.cache.activeSuppliers.has(supplierName)) {
            console.warn(`⚠️  ${entry.name} already in activeSuppliers - previous run didn't cleanup.`);
            this.cache.activeSuppliers.delete(supplierName);
        }

        if (this.cache.activeSuppliers.size === 0) {
            console.log(`   No active suppliers - clearing stale cache before reload`);
            // ✅ Αντικατάσταση με new Map() αντί για .clear() για σωστό GC
            this.cache.existingProducts = new Map();
            this.cache.categories = new Map();
            this.cache.brands = new Map();
        }

        this.cache.activeSuppliers.add(supplierName);

        console.log(`🔄 Initializing cache for ${entry.name}...`);
        console.log(`   Active suppliers: ${Array.from(this.cache.activeSuppliers).join(', ')}`);

        const start = Date.now();

        if (this.cache.categories.size === 0) {
            await this.cacheCategories();
        }
        if (this.cache.brands.size === 0) {
            await this.cacheBrands();
        }
        if (this.cache.existingProducts.size === 0) {
            await this.cacheExistingProducts(entry);
        }

        console.log(`✅ Cache initialized for ${entry.name} in ${Date.now() - start}ms`);
        console.log(`   Categories: ${this.cache.categories.size}`);
        console.log(`   Brands: ${this.cache.brands.size}`);
        console.log(`   Products: ${this.cache.existingProducts.size}`);
    },

    async cacheCategories() {
        const categories = await strapi.db.query('api::category.category').findMany({
            select: ['id', 'slug', 'average_weight', 'customer_share_pct'],
            populate: {
                supplierInfo: true,
                cat_percentage: {
                    populate: {
                        brand_perc: {
                            populate: {
                                brand: true
                            }
                        }
                    }
                }
            }
        });

        for (const cat of categories) {
            this.cache.categories.set(cat.slug, cat);
        }
    },

    async cacheBrands() {
        const brands = await strapi.entityService.findMany('api::brand.brand', {
            fields: ['id', 'name', 'slug'],
        });

        const sortedBrands = brands.sort((a, b) => b.name.length - a.name.length);

        for (const brand of sortedBrands) {
            this.cache.brands.set(brand.name.toLowerCase(), brand);
            this.cache.brands.set(brand.slug, brand);
        }
    },

    async cacheExistingProducts(entry) {
        console.log('   Loading existing products...');
        const batchSize = 5000;
        let offset = 0;
        let hasMore = true;
        let totalLoaded = 0;

        while (hasMore) {
            const products = await strapi.db.query('api::product.product').findMany({
                where: {
                    $or: [
                        { mpn: { $notNull: true } },
                        { barcode: { $notNull: true } },
                        { model: { $notNull: true } }
                    ]
                },
                // ✅ Μόνο τα πεδία που χρειάζονται για matching + update logic
                select: [
                    'id', 'mpn', 'barcode', 'model', 'name',
                    'publishedAt', 'status', 'deletedAt', 'inventory',
                    'slug', 'notice_if_available',
                    'weight', 'length', 'width', 'height',
                    'price', 'is_fixed_price'
                ],
                populate: {
                    supplierInfo: {
                        populate: {
                            price_progress: true,
                        }
                    },
                    // ✅ Μόνο id - για related_import check
                    related_import: {
                        select: ['id']
                    },
                    // ✅ Μόνο id + name - για brand comparison
                    brand: {
                        select: ['id', 'name']
                    },
                    // ✅ Μόνο id + slug - category comparison γίνεται με categoryInfo.id
                    // Δεν χρειάζεται cat_percentage/brand_perc - αυτά είναι ήδη στο category cache
                    category: {
                        select: ['id', 'slug']
                    },
                    platforms: true,
                    // ✅ prod_chars ΔΕΝ φορτώνονται - lazy load μόνο όταν χρειαστεί
                },
                limit: batchSize,
                offset: offset
            });

            if (products.length === 0) {
                hasMore = false;
                break;
            }

            for (const product of products) {
                this._indexProduct(product);
            }

            totalLoaded += products.length;
            offset += batchSize;

            if (products.length < batchSize) {
                hasMore = false;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`   Loaded ${totalLoaded} existing products`);
    },

    /**
     * ✅ Shared indexing logic - χρησιμοποιείται από cacheExistingProducts & addProductToCache
     */
    _indexProduct(product) {
        const norm = (str) => str?.trim().toLowerCase() || '';

        const mpn = norm(product.mpn);
        const barcode = norm(product.barcode);
        const model = norm(product.model);

        const cached = {
            ...product,
            brandName: product.brandName || product.brand?.name || null
        };

        if (mpn && barcode) {
            this.cache.existingProducts.set(`mpn+barcode:${mpn}:${barcode}`, cached);
        }
        if (mpn) {
            this.cache.existingProducts.set(`mpn:${mpn}`, cached);
        }
        if (barcode) {
            this.cache.existingProducts.set(`barcode:${barcode}`, cached);
        }
        if (model) {
            this.cache.existingProducts.set(`model:${model}`, cached);
        }
    },

    getCategoryBySlug(slug) {
        return this.cache.categories.get(slug) || this.cache.categories.get('uncategorized');
    },

    getBrandByName(name) {
        if (!name) return null;
        return this.cache.brands.get(name.toLowerCase());
    },

    findBrandInProductName(productName) {
        if (!productName) return null;

        const first3words = productName.trim().split(' ').slice(0, 3).join(' ').toLowerCase();

        for (const [key, brand] of this.cache.brands) {
            if (first3words.includes(brand.name.toLowerCase())) {
                return brand;
            }
        }

        const fullName = productName.toLowerCase();
        for (const [key, brand] of this.cache.brands) {
            if (fullName.includes(brand.name.toLowerCase())) {
                return brand;
            }
        }

        return null;
    },

    getExistingProduct(mpn, barcode, model, name) {
        const norm = (str) => str?.trim().toLowerCase() || '';

        const normMPN = norm(mpn);
        const normBarcode = norm(barcode);
        const normModel = norm(model);

        let product = null;

        // Priority 1: MPN + Barcode
        if (normMPN && normBarcode) {
            product = this.cache.existingProducts.get(`mpn+barcode:${normMPN}:${normBarcode}`);
            if (product) return product;
        }

        // Priority 2: MPN exact
        if (normMPN) {
            product = this.cache.existingProducts.get(`mpn:${normMPN}`);
            if (product) return product;
        }

        // Priority 3: MPN → Model
        if (normMPN) {
            product = this.cache.existingProducts.get(`model:${normMPN}`);
            if (product && norm(product.model) === normMPN) return product;
        }

        // Priority 4: Model → MPN
        if (normModel) {
            product = this.cache.existingProducts.get(`mpn:${normModel}`);
            if (product && norm(product.mpn) === normModel) return product;
        }

        // Priority 5: Barcode only
        if (normBarcode && !normMPN) {
            product = this.cache.existingProducts.get(`barcode:${normBarcode}`);
            if (product) return product;
        }

        // Priority 6: Name (if no identifiers)
        if (name && !normMPN && !normBarcode) {
            product = this.cache.existingProducts.get(`name:${norm(name)}`);
            if (product) return product;
        }

        return null;
    },

    addProductToCache(product) {
        this._indexProduct(product);
    },

    /**
     * ✅ Lazy load prod_chars για ένα προϊόν - μόνο όταν χρειαστεί
     * Καλείται από updateProductChars όταν το cached product δεν έχει chars
     */
    async loadProductChars(productId) {
        try {
            const result = await strapi.db.query('api::product.product').findOne({
                where: { id: productId },
                populate: { prod_chars: true }
            });
            return result?.prod_chars || [];
        } catch (error) {
            console.error(`Error loading prod_chars for product ${productId}:`, error.message);
            return [];
        }
    },

    /**
     * ✅ Invalidate μεμονωμένο προϊόν από cache
     * Καλείται μετά από χειροκίνητη αλλαγή στο Strapi admin
     */
    async invalidateProduct(productId) {
        try {
            // Βρες και αφαίρεσε όλα τα keys που αντιστοιχούν σε αυτό το id
            const keysToDelete = [];
            for (const [key, product] of this.cache.existingProducts) {
                if (product.id === productId) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.cache.existingProducts.delete(key));

            if (keysToDelete.length > 0) {
                // Φόρτωσε το ενημερωμένο προϊόν από τη βάσηKs και ξανάβαλέ το στο cache
                await this.refreshProduct(productId);
                console.log(`🔄 Cache invalidated for product ${productId}`);
            }
        } catch (error) {
            console.error(`Error invalidating product ${productId} from cache:`, error.message);
        }
    },

    /**
     * ✅ Reload ενός προϊόντος στο cache μετά από αλλαγή
     */
    async refreshProduct(productId) {
        try {
            const product = await strapi.db.query('api::product.product').findOne({
                where: { id: productId },
                select: [
                    'id', 'mpn', 'barcode', 'model', 'name',
                    'publishedAt', 'status', 'deletedAt', 'inventory',
                    'slug', 'notice_if_available',
                    'weight', 'length', 'width', 'height', 'price', 'is_fixed_price'
                ],
                populate: {
                    supplierInfo: { populate: { price_progress: true } },
                    related_import: { select: ['id'] },
                    brand: { select: ['id', 'name'] },
                    category: { select: ['id', 'slug'] },
                    platforms: true,
                }
            });

            if (product) {
                this._indexProduct(product);
            }
        } catch (error) {
            console.error(`Error refreshing product ${productId} in cache:`, error.message);
        }
    },

    /**
     * Clear cache - only when NO suppliers are active
     */
    clear(supplierName) {
        const supplierKey = supplierName.toLowerCase();

        this.cache.activeSuppliers.delete(supplierKey);

        console.log(`🧹 ${supplierName} finished importing`);
        console.log(`   Active suppliers: ${this.cache.activeSuppliers.size > 0 ? Array.from(this.cache.activeSuppliers).join(', ') : 'none'}`);

        if (this.cache.activeSuppliers.size === 0) {
            console.log(`🧹 No active suppliers - clearing cache`);
            // ✅ new Map() αντί για .clear() - το παλιό object γίνεται eligible for GC αμέσως
            this.cache.categories = new Map();
            this.cache.brands = new Map();
            this.cache.existingProducts = new Map();
        } else {
            console.log(`⏸️  Keeping cache - ${this.cache.activeSuppliers.size} supplier(s) still active`);
        }
    },

    /**
     * Force clear cache (emergency use only)
     */
    forceClear() {
        console.log(`🧹 Force clearing cache`);
        this.cache.categories = new Map();
        this.cache.brands = new Map();
        this.cache.existingProducts = new Map();
        this.cache.activeSuppliers = new Set();
    }
});