'use strict';

/**
 * SMART Cache Service - Supports concurrent imports without duplication
 * 
 * - Shared cache for all suppliers (no duplication)
 * - Reference counting: tracks how many suppliers are using cache
 * - Only clears when NO suppliers are active
 */
module.exports = ({ strapi }) => ({
    cache: {
        categories: new Map(),
        brands: new Map(),
        existingProducts: new Map(),
        activeSuppliers: new Set(), // ✅ Track which suppliers are currently importing
    },

    /**
     * Initialize cache for supplier
     * Increments reference count
     */
    async initialize(entry) {
        const supplierName = entry.name.toLowerCase();
        
        // ✅ Add supplier to active set
        this.cache.activeSuppliers.add(supplierName);
        
        console.log(`🔄 Initializing cache for ${entry.name}...`);
        console.log(`   Active suppliers: ${Array.from(this.cache.activeSuppliers).join(', ')}`);
        
        const start = Date.now();

        // ✅ Load shared data only if cache is empty
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
            select: ['id', 'slug', 'average_weight'],
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
                populate: {
                    supplierInfo: {
                        populate: {
                            price_progress: true,
                        }
                    },
                    related_import: true,
                    brand: true,
                    category: {
                        populate: {
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
                    },
                    platforms: true,
                    prod_chars: true
                },
                limit: batchSize,
                offset: offset
            });

            if (products.length === 0) {
                hasMore = false;
                break;
            }

            for (const product of products) {
                const norm = (str) => str?.trim().toLowerCase() || '';

                const mpn = norm(product.mpn);
                const barcode = norm(product.barcode);
                const model = norm(product.model);

                // Simple keys - exact matching only
                if (mpn && barcode) {
                    this.cache.existingProducts.set(`mpn+barcode:${mpn}:${barcode}`, product);
                }
                if (mpn) {
                    this.cache.existingProducts.set(`mpn:${mpn}`, product);
                }
                if (barcode) {
                    this.cache.existingProducts.set(`barcode:${barcode}`, product);
                }
                if (model) {
                    this.cache.existingProducts.set(`model:${model}`, product);
                }
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
        const norm = (str) => str?.trim().toLowerCase() || '';

        const mpn = norm(product.mpn);
        const barcode = norm(product.barcode);
        const model = norm(product.model);

        if (mpn && barcode) {
            this.cache.existingProducts.set(`mpn+barcode:${mpn}:${barcode}`, product);
        }
        if (mpn) {
            this.cache.existingProducts.set(`mpn:${mpn}`, product);
        }
        if (barcode) {
            this.cache.existingProducts.set(`barcode:${barcode}`, product);
        }
        if (model) {
            this.cache.existingProducts.set(`model:${model}`, product);
        }
    },

    /**
     * Clear cache only when NO suppliers are active
     * Called when supplier finishes importing
     */
    clear(supplierName) {
        const supplierKey = supplierName.toLowerCase();
        
        // ✅ Remove supplier from active set
        this.cache.activeSuppliers.delete(supplierKey);
        
        console.log(`🧹 ${supplierName} finished importing`);
        console.log(`   Active suppliers: ${this.cache.activeSuppliers.size > 0 ? Array.from(this.cache.activeSuppliers).join(', ') : 'none'}`);
        
        // ✅ Only clear if NO suppliers are active
        if (this.cache.activeSuppliers.size === 0) {
            console.log(`🧹 No active suppliers - clearing cache`);
            this.cache.categories.clear();
            this.cache.brands.clear();
            this.cache.existingProducts.clear();
        } else {
            console.log(`⏸️  Keeping cache - ${this.cache.activeSuppliers.size} supplier(s) still active`);
        }
    },

    /**
     * Force clear cache (emergency use only)
     */
    forceClear() {
        console.log(`🧹 Force clearing cache`);
        this.cache.categories.clear();
        this.cache.brands.clear();
        this.cache.existingProducts.clear();
        this.cache.activeSuppliers.clear();
    }
});