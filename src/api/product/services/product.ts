/**
 * product service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
export type IProduct = Attribute.GetValues<"api::product.product">;
export type IBrand = Attribute.GetValues<"api::brand.brand">;

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
    getDistinctValuesAndCounts(arr) {

        const countOccurrences = arr.reduce((acc, obj) => {
            if (acc[obj.name]) {
                acc[obj.name].numberOfItems += 1;
            } else {
                acc[obj.name] = { slug: obj.slug, numberOfItems: 1 };
            }
            return acc;
        }, {});

        const resultcountOccurrences = Object.keys(countOccurrences).map((key) => (
            {
                name: key,
                slug: countOccurrences[key].slug,
                numberOfItems: countOccurrences[key].numberOfItems
            }));

        resultcountOccurrences.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        return resultcountOccurrences
    },

    async searchProducts(ctx) {
        try {
            const { searchParams } = ctx.request.body;

            // Input validation and sanitization
            const params = this.validateAndSanitizeParams(searchParams);

            // Build filters
            const filters = this.buildFilters(params);

            // Early return if no search term (matching original logic)
            if (!params.search) {
                return { products: null };
            }

            // Prepare pagination
            const currentPage = params.page ? Number(params.page) : 1;
            const currentPageSize = params.pageSize ? Number(params.pageSize) : 12;

            // Execute database queries
            const [products, total, searchFilters] = await Promise.all([
                strapi.entityService.findMany('api::product.product', {
                    fields: ['price',
                        'id',
                        'name',
                        'slug',
                        'mpn',
                        'barcode',
                        'sale_price',
                        'is_sale',
                        'is_hot',
                        'inventory',
                        'status',
                        'weight',
                        'is_in_house'],
                    filters,
                    sort: [params.sort],
                    start: (currentPage - 1) * currentPageSize,
                    limit: currentPageSize,
                    pagination: {
                        page: params.page,
                        pageSize: params.pageSize,
                    },
                    populate: {
                        brand: { populate: { logo: true } },
                        category: {
                            fields: ['name'],
                            populate: {
                                parents: {
                                    fields: ['name'],
                                    populate: {
                                        parents: { fields: ['name'], }
                                    }
                                }
                            }
                        },
                        image: true
                    }
                }),
                strapi.entityService.count('api::product.product', { filters }),
                this.searchFilters(params)
            ]);

            // Format response
            const response = this.formatResponse(products, total, params, searchFilters);

            return response;

        } catch (error) {
            strapi.log.error('Error in getFilteredProducts:', error);
            return ctx.badRequest('Failed to fetch filtered products', {
                error: error.message
            });
        }
    },

    // Helper methods
    validateAndSanitizeParams(query) {
        const {
            sort = 'is_sale:desc',
            page = '1',
            pageSize = '12',
            brands,
            Κατηγορίες,
            search
        } = query;

        return {
            sort: this.validateSort(sort),
            page: Math.max(1, parseInt(page) || 1),
            pageSize: Math.min(100, Math.max(1, parseInt(pageSize) || 12)), // Limit max pageSize
            brands: this.normalizeArray(brands),
            categories: this.normalizeArray(Κατηγορίες),
            search: search ? String(search).trim() : null
        };
    },

    validateSort(sort) {
        const allowedSorts = [
            'price:asc', 'price:desc',
            'name:asc', 'name:desc',
            'createdAt:asc', 'createdAt:desc',
            'updatedAt:asc', 'updatedAt:desc'
        ];
        return allowedSorts.includes(sort) ? sort : 'is_sale:desc';
    },

    normalizeArray(value) {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    },

    buildFilters(params) {
        const { brands, categories, search } = params;
        const filterAnd = [];
        const searchFilters = [];

        filterAnd.push({ publishedAt: { $notNull: true } });

        // Search filters
        if (search) {
            // Try to parse as number for ID search
            const searchAsNumber = parseInt(search);
            if (!isNaN(searchAsNumber)) {
                searchFilters.push({ id: { $eq: searchAsNumber } });
            }

            searchFilters.push({ name: { $containsi: search } });
            searchFilters.push({ description: { $containsi: search } }); // Additional search field
        }

        // Brand filters
        if (brands.length > 0) {
            const brandFilters = brands.flatMap(brand => [
                { brand: { name: { $eq: brand } } },
                { brand: { slug: { $eq: brand } } }
            ]);
            filterAnd.push({ $or: brandFilters });
        }

        // Category filters
        if (categories.length > 0) {
            const categoryFilters = categories.map(category => ({
                category: { slug: { $eq: category } }
            }));
            filterAnd.push({ $or: categoryFilters });
        }

        // Combine filters
        if (searchFilters.length > 0) {
            filterAnd.push({ $or: searchFilters });
        }

        return { $and: filterAnd };
    },

    formatResponse(products, total, params, searchFilters) {
        const { page, pageSize } = params;

        return {
            products,
            searchFilters,
            meta: {
                pagination: {
                    total,
                    page,
                    pageSize,
                    pageCount: Math.ceil(total / pageSize)
                }
            }
        };
    },

    async searchFilters(params) {
        // Χρησιμοποίησε τα ίδια φίλτρα που χρησιμοποιείς στην κύρια αναζήτηση
        const filters = this.buildFilters(params);

        const products: IProduct[] = await strapi.entityService.findMany('api::product.product', {
            fields: ['id', 'name', 'slug'],
            populate: {
                brand: { fields: ['name', 'slug'] },
                category: { fields: ['name', 'slug'] },
            },
            filters: {
                ...filters,  // Εφαρμόζεις τα ίδια φίλτρα
                publishedAt: { $notNull: true }
            }
        });

        // Extract and deduplicate brands and categories
        const brands = products
            .map(product => product.brand)
            .filter(brand => brand != null);

        const categories = products
            .map(product => product.category)
            .filter(category => category != null);

        const uniqueBrands = this.getDistinctValuesAndCounts(brands);
        const uniqueCategories = this.getDistinctValuesAndCounts(categories);

        return [
            { title: 'Κατασκευαστές', filterBy: 'brands', filterValues: uniqueBrands },
            { title: 'Κατηγορίες', filterBy: 'Κατηγορίες', filterValues: uniqueCategories }
        ];
    },

    async brandFilters(ctx) {
        try {
            const { brand, searchParams } = ctx.request.body

            let searchFilter = {}
            if (searchParams.Κατηγορίες) {
                searchFilter = {
                    where: {
                        slug: searchParams.Κατηγορίες
                    }
                }
            }

            const brands: IBrand = await strapi.db.query('api::brand.brand').findOne({
                where: {
                    slug: brand
                },
                populate: {
                    products: {
                        where: {
                            publishedAt: {
                                $notNull: true,
                            },
                        },
                        populate: {
                            category: {
                                select: ['id', 'name', 'slug']
                            },
                        }
                    }
                }
            })

            const categories = brands ? brands.products.map(cat => { return cat.category }) : []



            // const brands = []
            // const categories = []

            // products.forEach(product => {
            //     if (product.brand && product.brand !== null && product.brand !== undefined)
            //         brands.push(product.brand.name)

            //     if (product.category && product.category !== null && product.category !== undefined)
            //         categories.push(product.category.name)
            // });

            // const notNullBrands = brands.filter(x => x !== undefined)

            // const uniqueBrands = this.getDistinctValuesAndCounts(notNullBrands);

            const notNullCategories = categories.filter(x => x !== undefined)

            const uniqueCategories = this.getDistinctValuesAndCounts(notNullCategories);

            const filters = [
                // { title: 'Κατασκευαστές', filterValues: uniqueBrands },
                { title: 'Κατηγορίες', filterBy: 'brands', filterValues: uniqueCategories }
            ]

            return filters


        } catch (error) {
            console.log(error)
        }
    },

    async getProductBySlug(ctx) {
        const { slug } = ctx.request.body

        const product: IProduct = await strapi.db.query('api::product.product').findOne({
            where: {
                slug: slug
            },
            select: [
                'name',
                'slug',
                'mpn',
                'barcode',
                'description',
                'short_description',
                'price',
                'sale_price',
                'is_sale',
                'is_hot',
                'inventory',
                'is_in_house',
                'status',
                'weight',
                'height',
                'width',
                'length'],
            populate: {
                category: {
                    select: ['name', 'slug'],
                    populate: {
                        parents: {
                            select: ['name', 'slug'],
                            populate: {
                                parents: { select: ['name', 'slug'] }
                            }
                        },
                        cross_categories: {
                            select: ['name', 'slug'],
                            populate: {
                                image: true,
                                parents: {
                                    select: ['name', 'slug'],
                                    populate: {
                                        parents: { select: ['name', 'slug'] }
                                    }
                                },
                            }
                        }
                    }
                },
                image: true,
                additionalImages: true,
                brand: { populate: { logo: true } },
                prod_chars: true,
            },
        })

        const similarProducts = await this.getSimilarProducts({ product })

        return { product, similarProducts }
    },

    async getSimilarProducts({ product }: { product: IProduct }) {

        const createPriceFilter = () => {
            if (product.sale_price > 0 && product.is_sale) {
                return {
                    $or: [
                        { price: { $between: [product.sale_price * 0.8, product.sale_price * 1.2] } },
                        {
                            $and: [
                                { is_sale: { $eq: true } },
                                { sale_price: { $between: [product.sale_price * 0.8, product.sale_price * 1.2] } },
                            ]
                        }]
                }

            }
            else {
                return {
                    $or: [
                        { price: { $between: [product.price * 0.8, product.price * 1.2] } },
                        {
                            $and: [
                                { is_sale: { $eq: true } },
                                { sale_price: { $between: [product.price * 0.8, product.price * 1.2] } },
                            ]
                        }
                    ]
                }
            }
        }
        const priceFilter = createPriceFilter();

        const productChars = product.prod_chars.map(att => {
            return { $and: [{ name: { $eq: att.name } }, { value: { $eq: att.value } }] };
        });

        const products: IProduct[] = await strapi.db.query('api::product.product').findMany({
            where: {
                $and: [
                    { category: { slug: product.category.slug } },
                    priceFilter,
                    { id: { $ne: product.id } },
                    { prod_chars: { $or: productChars } },
                    { publishedAt: { $notNull: true } }
                ]
            },
            select: [
                'name',
                'slug',
                'price',
                'sale_price',
                'is_sale',
                'is_hot',
                'inventory',
                'is_in_house',],
            populate: {
                supplierInfo: true,
                image: true,
            },
        })

        const calculateProfit = (product) => {
            if (!product.supplierInfo || product.supplierInfo.length === 0) return 0;

            const validSuppliers = product.supplierInfo.filter(s => s.wholesale > 0);
            if (validSuppliers.length === 0) return 0;

            const minWholesale = Math.min(...validSuppliers.map(s => s.wholesale));
            return (product.price / 1.24) - minWholesale;
        };

        const similarProducts = products
            .filter(x => x.id !== product.id)
            .filter(p => calculateProfit(p) > 0) // Φίλτρο για θετικό κέρδος
            .sort((a, b) => calculateProfit(b) - calculateProfit(a)) // Ταξινόμηση κατά κέρδος
            .slice(0, 5)
            .map(product => {
                // Αφαίρεσε τα εσωτερικά δεδομένα πριν επιστρέψεις
                const { supplierInfo, ...cleanProduct } = product;
                return cleanProduct;
            });

        return similarProducts
    },

    async getHotOrSale(ctx) {
        const { type } = ctx.request.body

        let filters = {}
        let sortedBy = { createdAt: "desc" }

        switch (type) {
            case 'hot':
                filters = {
                    $and: [
                        { is_hot: { $eq: true } },
                        { publishedAt: { $notNull: true } }
                    ]
                }
                break
            case 'new':
                filters = { publishedAt: { $notNull: true } },
                    sortedBy = { createdAt: "desc" }
                break
            case 'sale':
                filters = {
                    $and: [
                        { is_sale: { $eq: true } },
                        { $not: { sale_price: { $eq: null } } },
                        { publishedAt: { $notNull: true } }]
                }
                break
            default:
                break
        }

        const products: IProduct[] = await strapi.db.query('api::product.product').findMany({
            where: filters,
            limit: 10,
            orderBy: sortedBy,
            select: [
                'name',
                'slug',
                'mpn',
                'barcode',
                'price',
                'sale_price',
                'is_sale',
                'is_hot',
                'inventory',
                'is_in_house',
                'status',
                'weight'],
            populate: {
                category: {
                    select: ['name', 'slug'],
                    populate: {
                        parents: {
                            select: ['name', 'slug'],
                            populate: {
                                parents: { select: ['name', 'slug'] }
                            }
                        }
                    }
                },
                image: { select: ['name', 'url', 'alternativeText', 'formats'] },
                brand: {
                    select: ['name', 'slug'],
                    populate: { logo: { select: ['name', 'url', 'alternativeText', 'formats'] } }
                },
            },
        })

        return products
    }
}));
