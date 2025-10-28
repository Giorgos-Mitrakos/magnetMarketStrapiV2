/**
 * category service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
import category from '../controllers/category';
export type IProduct = Attribute.GetValues<"api::product.product">;
export type ICategory = Attribute.GetValues<"api::category.category">;

export default factories.createCoreService('api::category.category', ({ strapi }) => ({

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

    async getMetadata(ctx) {

        const { slug } = ctx.request.body;

        try {
            return await strapi.db.query('api::category.category').findOne({
                where: {
                    slug: { $eq: slug },
                    publishedAt: { $notNull: true }
                },
                select: ['name', 'slug'],
                populate: {
                    image: {
                        select: ['name', 'alternativeText', 'url', 'formats'],
                    },
                    categories: {
                        select: ['name'],
                    }
                }
            });
        } catch (error) {
            console.log(error)
        }
    },

    async getCategoriesMapping(ctx) {
        try {
            return await strapi.db.query('api::category.category').findMany({
                where: {
                    parents: { $null: true, },
                    publishedAt: { $notNull: true }
                },
                select: ['name', 'slug'],
                populate: {
                    categories: {
                        select: ['name', 'slug'],
                        populate: {
                            categories: {
                                select: ['name', 'slug'],
                            }
                        }
                    }
                }
            });
        } catch (error) {
            return null
        }
    },

    async getMenu(ctx) {
        try {
            return await strapi.db.query('api::category.category').findMany({
                where: {
                    parents: { $null: true, },
                    publishedAt: { $notNull: true }
                },
                select: ['name', 'slug', 'isSpecial','description'],
                populate: {
                    image: {
                        select: ['name', 'alternativeText', 'url', 'formats'],
                    },
                    categories: {
                        select: ['name', 'slug', 'isSpecial','description'],
                        populate: {
                            image: {
                                select: ['name', 'alternativeText', 'url', 'formats'],
                            },
                            categories: {
                                select: ['name', 'slug', 'isSpecial','description'],
                                populate: {
                                    image: {
                                        select: ['name', 'alternativeText', 'url', 'formats'],
                                    },
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            return null
        }
    },

    // async categoryFilter(ctx) {
    //     const { name, level, searchParams } = ctx.request.body

    //     const categoryFilters: ICategory = await strapi.db.query("api::category.category").findOne({
    //         select: ['id',],
    //         where: { slug: name },
    //         populate: {
    //             filters: {
    //                 select: ['name'],
    //             }
    //         },
    //     });

    //     const filters = []

    //     for await (let filter of categoryFilters.filters) {
    //         let filtered: { title: string, filterValues: { name: string, numberOfItems: number }[] } = { title: filter.name, filterValues: [] }

    //         let filterBrandString = {}
    //         const filterCharString = []
    //         const values = []

    //         for (let searchParam of searchParams) {

    //             if (searchParam.name === "sort" || searchParam.name === "page" || searchParam.name === "pageSize")
    //                 continue

    //             if (searchParam.name === "brands") {

    //                 if (typeof searchParam.value === "string") {
    //                     values.push(searchParam.value)
    //                 }
    //                 else {

    //                     for (let search of searchParam.value) {
    //                         values.push(search)
    //                     }
    //                 }
    //             }
    //             else {
    //                 const filter = { name: { $eq: `${searchParam.name}` } }
    //                 const values = []
    //                 if (typeof searchParam.value === "string") {
    //                     values.push(searchParam.value)
    //                 }
    //                 else {

    //                     for (let search of searchParam.value) {
    //                         values.push(search)
    //                     }
    //                 }

    //                 filterCharString.push({
    //                     prod_chars: {
    //                         $and: [filter, { value: { $in: values } }]
    //                     }
    //                 })
    //             }
    //         }

    //         filterBrandString = {
    //             name: { $in: values }
    //         }

    //         let products: []

    //         let populateProducts: any = {
    //             products: {
    //                 select: ['id'],
    //                 where: {
    //                     $and: [
    //                         { publishedAt: { $notNull: true, } },
    //                         { prod_chars: { name: `${filter.name}` } }
    //                     ]
    //                 },
    //                 populate: {
    //                     prod_chars: {
    //                         select: ['name', 'value'],
    //                         where: {
    //                             name: `${filter.name}`,
    //                         },
    //                     }
    //                 },
    //             }
    //         }

    //         if (filterCharString.length > 0) {
    //             if (values.length > 0) {
    //                 populateProducts = {
    //                     products: {
    //                         select: ['id'],
    //                         where: {
    //                             $and: [
    //                                 { publishedAt: { $notNull: true, } },
    //                                 { $and: filterCharString },
    //                                 { brand: filterBrandString }
    //                             ]
    //                         },
    //                         populate: {
    //                             prod_chars: {
    //                                 select: ['name', 'value'],
    //                                 where: {
    //                                     name: `${filter.name}`,
    //                                 },
    //                             }
    //                         },
    //                     }
    //                 }
    //             }
    //             else {
    //                 populateProducts = {
    //                     products: {
    //                         select: ['id'],
    //                         where: {
    //                             $and: [
    //                                 { publishedAt: { $notNull: true, } },
    //                                 { $and: filterCharString }
    //                             ]
    //                         },
    //                         populate: {
    //                             prod_chars: {
    //                                 select: ['name', 'value'],
    //                                 where: {
    //                                     name: `${filter.name}`,
    //                                 },
    //                             }
    //                         },
    //                     }
    //                 }
    //             }
    //         }
    //         else {
    //             if (values.length > 0) {
    //                 populateProducts = {
    //                     products: {
    //                         select: ['id'],
    //                         where: {
    //                             $and: [
    //                                 { publishedAt: { $notNull: true, } },
    //                                 { brand: filterBrandString },
    //                                 { prod_chars: { name: `${filter.name}` } }
    //                             ]
    //                         },
    //                         populate: {
    //                             prod_chars: {
    //                                 select: ['name', 'value'],
    //                                 where: {
    //                                     name: `${filter.name}`,
    //                                 },
    //                             }
    //                         },
    //                     }
    //                 }
    //             }
    //             else {
    //                 populateProducts = {
    //                     products: {
    //                         select: ['id'],
    //                         where: {
    //                             $and: [
    //                                 { publishedAt: { $notNull: true, } },
    //                                 { prod_chars: { name: `${filter.name}` } }
    //                             ]
    //                         },
    //                         populate: {
    //                             prod_chars: {
    //                                 select: ['name', 'value'],
    //                                 where: {
    //                                     name: `${filter.name}`,
    //                                 },
    //                             }
    //                         },
    //                     }
    //                 }
    //             }
    //         }

    //         let populateString: any = {}

    //         switch (level) {
    //             case 1:
    //                 populateString = {
    //                     categories: {
    //                         populate: {
    //                             categories: {
    //                                 populate: populateProducts
    //                             }
    //                         }
    //                     }
    //                 }
    //                 break;
    //             case 2:
    //                 populateString = {
    //                     categories: {
    //                         populate: populateProducts
    //                     }
    //                 }
    //                 break;
    //             case 3:
    //                 populateString = populateProducts
    //                 break;
    //             default:
    //                 populateString = populateProducts
    //                 break;
    //         }

    //         const category = await strapi.db.query("api::category.category").findOne({
    //             where: { slug: name },
    //             populate: populateString
    //         })

    //         switch (level) {
    //             case 1:
    //                 products = category.categories.flatMap(cat => {
    //                     return cat.categories.flatMap(cat1 => {
    //                         return cat1.products.map(product => {
    //                             for (let char of product.prod_chars) {
    //                                 if (char.name === filter.name) {
    //                                     return char.value.trim()
    //                                 }
    //                             }
    //                         })
    //                     })
    //                 })
    //                 break;

    //             case 2:
    //                 products = category.categories.flatMap(cat => {
    //                     return cat.products.map(product => {
    //                         for (let char of product.prod_chars) {
    //                             if (char.name === filter.name) {
    //                                 return char.value.trim()
    //                             }
    //                         }
    //                     })
    //                 })
    //                 break;

    //             case 3:
    //                 products = category.products.map(product => {
    //                     for (let char of product.prod_chars) {
    //                         if (char.name === filter.name) {
    //                             return char.value.trim()
    //                         }
    //                     }
    //                 })
    //                 break;
    //             default:
    //                 products = category.products.map(product => {
    //                     for (let char of product.prod_chars) {
    //                         if (char.name === filter.name) {
    //                             return char.value.trim()
    //                         }
    //                     }
    //                 })
    //                 break;
    //         }

    //         const notNullchars = products.filter(x => x !== undefined)

    //         const unique = this.getDistinctValuesAndCounts(notNullchars);

    //         unique.forEach(x => filtered.filterValues = unique)

    //         filters.push(filtered)
    //     }

    //     return filters
    // },

    async getCategoryProducts(ctx) {
        try {
            const { searchParams } = ctx.request.body;

            // Validate and sanitize parameters
            const params = this.validateCategoryParams(searchParams);

            // Get all child categories recursively
            const allCategoryIds = await this.getAllCategoryChildren(params.slug);

            // Build comprehensive filters
            const filters = await this.buildCategoryFilters(params, allCategoryIds);

            // Prepare pagination
            const currentPage = params.page || 1;
            const currentPageSize = params.pageSize || 12;

            // Execute database queries in parallel
            const [products, total, availableFilters, breadcrumbs, sideMenu] = await Promise.all([
                // Main products query
                strapi.entityService.findMany('api::product.product', {
                    fields: [
                        'price', 'id', 'name', 'slug', 'mpn', 'barcode',
                        'sale_price', 'is_sale', 'is_hot', 'inventory',
                        'status', 'weight', 'is_in_house'
                    ],
                    filters,
                    sort: [params.sort],
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
                        prod_chars: {
                            populate: {
                                characteristic: true
                            }
                        }
                    }
                }),

                // Count total products
                strapi.entityService.count('api::product.product', { filters }),

                // Get available filters for this category
                this.getCategoryAvailableFilters(allCategoryIds, params),

                // Get breadcrumbs
                this.generateCategoryBreadcrumbs(params.slug),

                // Get breadcrumbs
                this.generateSideMenu(params.mainCategory)
            ]);

            // Format response
            return this.formatCategoryResponse(products, total, params, availableFilters, breadcrumbs, sideMenu);

        } catch (error) {
            strapi.log.error('Error in getCategoryProducts:', error);
            return ctx.badRequest('Failed to fetch category products', {
                error: error.message
            });
        }
    },

    // Helper Methods
    validateCategoryParams(query) {
        const {
            mainCategory,
            slug,
            sort = 'is_sale:desc',
            page = '1',
            pageSize = '12',
            brands,
            ...characteristics
        } = query;

        if (!slug) {
            throw new Error('Category slug is required');
        }

        return {
            mainCategory: String(mainCategory).trim(),
            slug: String(slug).trim(),
            sort: this.validateSort(sort),
            page: Math.max(1, parseInt(page) || 1),
            pageSize: Math.min(100, Math.max(1, parseInt(pageSize) || 12)),
            brands: this.normalizeArray(brands),
            characteristics: this.normalizeCharacteristics(characteristics)
        };
    },

    normalizeCharacteristics(characteristics) {
        const normalized = {};

        Object.keys(characteristics).forEach(key => {
            // Skip pagination and sorting params
            if (['sort', 'page', 'pageSize', 'brands', 'search', 'slug'].includes(key)) {
                return;
            }

            const values = this.normalizeArray(characteristics[key]);
            if (values.length > 0) {
                normalized[key] = values;
            }
        });

        return normalized;
    },

    // Recursive function to get all child categories
    async getAllCategoryChildren(slug, visited = new Set()) {
        // Prevent infinite loops
        if (visited.has(slug)) {
            return [];
        }
        visited.add(slug);

        try {
            // Get the main category
            const category = await strapi.entityService.findMany('api::category.category', {
                filters: {
                    slug: { $eq: slug },
                    publishedAt: { $notNull: true }
                },
                populate: {
                    categories: {
                        fields: ['name', 'slug', 'id'],
                        populate: {
                            categories: {
                                fields: ['name', 'slug', 'id'],
                                populate: {
                                    categories: { fields: ['name', 'slug', 'id'], } // Support for deep nesting
                                }
                            }
                        }
                    }
                }
            });

            if (!category || category.length === 0) {
                return [];
            }

            const mainCategory = category[0];
            const allIds = [mainCategory.id];

            // Recursive function to collect all child IDs
            const collectChildIds = async (categories) => {
                for (const cat of categories) {
                    if (!visited.has(cat.slug)) {
                        allIds.push(cat.id);
                        visited.add(cat.slug);

                        if (cat.categories && cat.categories.length > 0) {
                            await collectChildIds(cat.categories);
                        }
                    }
                }
            };

            if (mainCategory.categories && mainCategory.categories.length > 0) {
                await collectChildIds(mainCategory.categories);
            }

            return [...new Set(allIds)]; // Remove duplicates

        } catch (error) {
            strapi.log.error('Error getting category children:', error);
            return [];
        }
    },

    async generateSideMenu(mainCategory) {
        try {
            // Get the main category
            return await strapi.db.query('api::category.category').findOne({
                where: {
                    slug: { $eq: mainCategory },
                    publishedAt: { $notNull: true }
                },
                populate: {
                    categories: {
                        fields: ['name', 'slug'],
                        populate: {
                            categories: {
                                fields: ['name', 'slug'],
                                populate: {
                                    categories: { fields: ['name', 'slug'], } // Support for deep nesting
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            return null
        }
    },

    async buildCategoryFilters(params, categoryIds) {
        const { brands, characteristics } = params;
        const filterAnd = [];

        // Always include published filter
        filterAnd.push({ publishedAt: { $notNull: true } });

        // Category filter - include all child categories
        if (categoryIds.length > 0) {
            filterAnd.push({
                category: {
                    id: { $in: categoryIds }
                }
            });
        }

        // Brand filters
        if (brands.length > 0) {
            const brandFilters = brands.flatMap(brand => [
                { brand: { name: { $eq: brand } } },
                { brand: { slug: { $eq: brand } } }
            ]);
            filterAnd.push({ $or: brandFilters });
        }

        // Characteristics filters
        if (Object.keys(characteristics).length > 0) {
            const charFilters = [];

            Object.entries(characteristics).forEach(([charName, values]) => {
                charFilters.push({
                    prod_chars: {
                        $and: [
                            {
                                characteristic: {
                                    name: { $eq: charName }
                                }
                            },
                            {
                                value: { $in: values }
                            }
                        ]
                    }
                });
            });

            if (charFilters.length > 0) {
                filterAnd.push({ $and: charFilters });
            }
        }

        return { $and: filterAnd };
    },

    async getCategoryAvailableFilters(categoryIds, params) {
        try {
            // Βήμα 1: Πάρε ΜΟΝΟ την κύρια κατηγορία (όχι τις υποκατηγορίες)
            const mainCategory = await strapi.entityService.findMany('api::category.category', {
                filters: {
                    slug: { $eq: params.slug }, // Μόνο η κύρια κατηγορία
                    publishedAt: { $notNull: true }
                },
                populate: {
                    filters: true // Populate το filters component
                }
            });

            if (!mainCategory || mainCategory.length === 0) {
                return [];
            }

            // Βήμα 2: Πάρε τα filter names ΜΟΝΟ από την κύρια κατηγορία
            const allowedFilterNames = new Set();
            const category = mainCategory[0];

            if (category.filters && Array.isArray(category.filters)) {
                category.filters.forEach(filter => {
                    if (filter.name) {
                        allowedFilterNames.add(filter.name);
                    }
                });
            }

            // Αν δεν υπάρχουν φίλτρα στην κατηγορία, επέστρεψε άδειο array
            if (allowedFilterNames.size === 0) {
                return [];
            }

            // Βήμα 3: Πάρε όλα τα προϊόντα για αυτές τις κατηγορίες (κύρια + υποκατηγορίες)
            const products = await strapi.entityService.findMany('api::product.product', {
                filters: {
                    $and: [
                        { publishedAt: { $notNull: true } },
                        { category: { id: { $in: categoryIds } } }
                    ]
                },
                populate: {
                    brand: { fields: ['name', 'slug'] },
                    category: { fields: ['name', 'slug'] },
                    prod_chars: true // Populate τα characteristics components
                }
            });

            const availableFilters = [];

            // Βήμα 4: Brands (αν το θέλεις πάντα)
            const brands = products
                .map(product => product.brand)
                .filter(brand => brand != null);

            if (brands.length > 0) {
                const uniqueBrands = this.getDistinctValuesAndCounts(brands);
                availableFilters.push({
                    title: 'Κατασκευαστές',
                    filterBy: 'brands',
                    filterValues: uniqueBrands
                });
            }

            // Βήμα 5: Για κάθε allowed filter name, βρες τις διαθέσιμες τιμές
            Array.from(allowedFilterNames).forEach(filterName => {
                const characteristicValues = new Set();

                // Συλλέγω όλες τις τιμές για αυτό το characteristic από ΟΛΑ τα προϊόντα
                products.forEach(product => {
                    if (product.prod_chars && Array.isArray(product.prod_chars)) {
                        product.prod_chars.forEach(prodChar => {
                            if (prodChar.name === filterName && prodChar.value) {
                                characteristicValues.add(prodChar.value);
                            }
                        });
                    }
                });

                // Αν βρήκα τιμές για αυτό το filter, το προσθέτω
                if (characteristicValues.size > 0) {
                    const filterValues = Array.from(characteristicValues).map((value: string) => ({
                        name: value,
                        slug: value.toLowerCase(),
                        numberOfItems: products.filter(p =>
                            p.prod_chars?.some(pc =>
                                pc.name === filterName && pc.value === value
                            )
                        ).length
                    }));

                    // Ταξινόμηση alphabetically
                    filterValues.sort((a, b) => a.name.localeCompare(b.name));

                    availableFilters.push({
                        title: filterName,
                        filterBy: filterName,
                        filterValues: filterValues
                    });
                }
            });

            return availableFilters;

        } catch (error) {
            strapi.log.error('Error getting available filters:', error);
            return [];
        }
    },

    // Recursive function to generate breadcrumbs
    async generateCategoryBreadcrumbs(categorySlug) {
        const breadcrumbs = [
            {
                title: "Home",
                slug: "/"
            }
        ];

        try {
            // Get the current category with its parent hierarchy
            const categories = await strapi.entityService.findMany('api::category.category', {
                filters: {
                    slug: { $eq: categorySlug },
                    publishedAt: { $notNull: true }
                },
                populate: {
                    parents: {
                        populate: {
                            parents: {
                                populate: {
                                    parents: {
                                        populate: {
                                            parents: true // Deep nesting για unlimited levels
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!categories || categories.length === 0) {
                return breadcrumbs;
            }

            const currentCategory = categories[0]; // Πάρε το πρώτο element από το array

            // Build the hierarchy array from root to current
            const hierarchy = [];
            let current = currentCategory;

            // Traverse up the parent chain
            while (current) {
                hierarchy.unshift(current); // Add at the beginning
                current = current.parents[0];
            }

            // Build breadcrumbs from hierarchy
            let currentPath = '/category';

            hierarchy.forEach((cat, index) => {
                currentPath += `/${cat.slug}`;

                breadcrumbs.push({
                    title: cat.name,
                    slug: currentPath,
                    // isCurrentPage: index === hierarchy.length - 1 // Last item is current page
                });
            });

            return breadcrumbs;

        } catch (error) {
            strapi.log.error('Error generating breadcrumbs:', error);
            return breadcrumbs; // Return at least Home breadcrumb
        }
    },

    formatCategoryResponse(products, total, params, availableFilters, breadcrumbs, sideMenu) {
        const { page, pageSize } = params;

        return {
            products,
            breadcrumbs,
            availableFilters,
            sideMenu,
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

    // Στον controller - προσθήκη των helper μεθόδων
    validateSort(sort) {
        const allowedSorts = [
            'price:asc', 'price:desc',
            'name:asc', 'name:desc',
            'createdAt:asc', 'createdAt:desc',
            'updatedAt:asc', 'updatedAt:desc',
            'is_sale:desc'
        ];
        return allowedSorts.includes(sort) ? sort : 'is_sale:desc';
    },

    normalizeArray(value) {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    },

}));
