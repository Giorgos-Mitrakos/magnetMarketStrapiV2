/**
 * brand service
 */

import { factories } from '@strapi/strapi';
import product from '../../product/controllers/product';



export default factories.createCoreService('api::brand.brand', ({ strapi }) => ({
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

    // Helper function for brand filters
    async getBrandFilters(brand) {
        try {

            // Get brand with all published products and their categories
            const brandData = await strapi.db.query('api::brand.brand').findOne({
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
            });

            if (!brandData) {
                return [];
            }

            // Extract categories from products
            const categories = brandData.products.map(product => product.category).filter(cat => cat !== undefined && cat !== null);

            // Get unique categories with counts
            const uniqueCategories = this.getDistinctValuesAndCounts(categories);

            const filters = [
                { title: 'Κατηγορίες', filterBy: 'Κατηγορίες', filterValues: uniqueCategories }
            ];

            return filters;

        } catch (error) {
            console.error('Error fetching brand filters:', error);
            return [];
        }
    },

    async getBrandProducts(ctx) {
        const { brand, searchParams } = ctx.request.body
        const { sort, page, pageSize, Κατηγορίες } = searchParams;

        let sortedBy: any = [{ is_sale: "desc" }]; // default
        if (sort) {
            const sortStr = sort.toString();
            // Convert from GraphQL format (field:direction) to Strapi object format
            const [field, direction] = sortStr.split(':');
            sortedBy = [{ [field]: direction }];
        }

        // Build filters object
        let filters = {};

        if (Κατηγορίες) {
            if (typeof Κατηγορίες !== "string") {
                filters = {
                    $and: [
                        { brand: { name: { $eq: brand } } },
                        { category: { slug: { $in: Κατηγορίες } } },
                        { publishedAt: { $notNull: true } }
                    ]
                };
            } else {
                filters = {
                    $and: [
                        { brand: { name: { $eq: brand } } },
                        { category: { slug: { $eq: Κατηγορίες } } },
                        { publishedAt: { $notNull: true } }
                    ]
                };
            }
        } else {
            filters = {
                $and: [
                    { brand: { name: { $eq: brand } } },
                    { publishedAt: { $notNull: true } }
                ]
            };
        }

        // Prepare pagination
        const currentPage = page ? Number(page) : 1;
        const currentPageSize = pageSize ? Number(pageSize) : 12;

        try {
            // Parallel execution for better performance
            const [products, total, brandFilters] = await Promise.all([
                // Get products
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
                    filters: filters,
                    sort: sortedBy,
                    start: (currentPage - 1) * currentPageSize,
                    limit: currentPageSize,
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
                        image: true,
                        additionalImages: true
                        // Add any other relations you need to populate
                    }
                }),

                // Get total count
                strapi.entityService.count('api::product.product', {
                    filters: filters
                }),

                // Get brand filters
                this.getBrandFilters(brand)
            ]);

            const pageCount = Math.ceil(total / currentPageSize);

            // Transform the response to match the expected structure
            const res = {
                products: products,
                meta: {
                    pagination: {
                        total: total,
                        page: currentPage,
                        pageSize: currentPageSize,
                        pageCount: pageCount
                    }
                },
                filters: brandFilters
            };

            return res;

        } catch (error) {
            console.error('Error fetching brand products:', error);
            throw error;
        }
    }

}))
