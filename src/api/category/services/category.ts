/**
 * category service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
export type IProduct = Attribute.GetValues<"api::product.product">;
export type ICategory = Attribute.GetValues<"api::category.category">;

export default factories.createCoreService('api::category.category', ({ strapi }) => ({

    getDistinctValuesAndCounts(arr) {
        const counts = {};
        arr.forEach((value) => {
            if (counts[value]) {
                counts[value]++;
            }
            else {
                counts[value] = 1;
            }
        });

        const resultArray = Object.keys(counts).map((key) => (
            {
                name: key,
                numberOfItems: counts[key],
            }));

        resultArray.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        return resultArray
    },

    async brandFilter(ctx) {
        const { name, level, searchParams } = ctx.request.body

        // let filterBrandString = {}
        const filterCharString = []
        const values = []

        for (let searchParam of searchParams) {

            if (searchParam.name === "sort" || searchParam.name === "page" || searchParam.name === "pageSize")
                continue

            if (searchParam.name === "brands") {

                if (typeof searchParam.value === "string") {
                    values.push(searchParam.value)
                }
                else {

                    for (let search of searchParam.value) {
                        values.push(search)
                    }
                }
            }
            else {
                const filter = { name: { $eq: `${searchParam.name}` } }
                const values = []
                if (typeof searchParam.value === "string") {
                    values.push(searchParam.value)
                }
                else {

                    for (let search of searchParam.value) {
                        values.push(search)
                    }
                }

                filterCharString.push({
                    prod_chars: {
                        $and: [filter, { value: { $in: values } }]
                    }
                })
            }
        }

        const filterBrandString = {
            name: { $in: values }
        }

        let filters: ICategory
        let populate = {}

        if (values.length > 0) {
            let populateProducts = {
                products: {
                    select: ['id'],
                    where: {
                        brand: filterBrandString,
                        publishedAt: {
                            $notNull: true,
                        },
                        $and: filterCharString
                    },
                    populate: {
                        brand: true
                    }
                }
            }

            switch (level) {
                case 1:
                    populate = {
                        categories: {
                            populate: {
                                categories: {
                                    populate: populateProducts
                                }
                            }
                        }
                    }

                    break;
                case 2:
                    populate = {
                        categories: {
                            populate: populateProducts
                        }
                    }

                    break;
                case 3:
                    populate = populateProducts
                    break;

                default:
                    populate = {
                        products: {
                            select: ['id'],
                            where: {
                                brand: filterBrandString,
                                publishedAt: {
                                    $notNull: true,
                                },
                                $and: filterCharString
                            },
                            populate: {
                                brand: true
                            }
                        }
                    }
                    break;
            }
            filters = await strapi.db.query("api::category.category").findOne({
                select: ['id',],
                where: { slug: name },
                populate: populate
            });
        }
        else {
            let populateProducts = {
                products: {
                    select: ['id'],
                    where: {
                        publishedAt: {
                            $notNull: true,
                        },
                        $and: filterCharString
                    },
                    populate: {
                        brand: true
                    }
                }
            }

            switch (level) {
                case 1:
                    populate = {
                        categories: {
                            populate: {
                                categories: {
                                    populate: populateProducts
                                }
                            }
                        }
                    }
                    break;
                case 2:
                    populate = {
                        categories: {
                            populate: populateProducts
                        }
                    }

                    break;
                case 3:
                    populate = populateProducts
                    break;

                default:
                    populate = populateProducts
                    break;
            }

            filters = await strapi.db.query("api::category.category").findOne({
                select: ['id',],
                where: { slug: name },
                populate: populate,
            });
        }

        let brands = []

        switch (level) {
            case 1:
                brands = filters.categories.flatMap(cat => {
                    return cat.categories.flatMap(cat2 => {
                        return cat2.products.map(product => {
                            if (product.brand && product.brand !== null && product.brand !== undefined) {
                                return product.brand.name
                            }
                        })
                    })
                })
                break;
            case 2:
                brands = filters.categories.flatMap(cat => {
                    return cat.products.map(product => {
                        if (product.brand && product.brand !== null && product.brand !== undefined) {
                            return product.brand.name
                        }
                    })
                })
                break;
            case 3:
                brands = filters.products.map(product => {
                    if (product.brand && product.brand !== null && product.brand !== undefined)
                        return product.brand.name
                });
                break;

            default:
                brands = filters.products.map(product => {
                    if (product.brand && product.brand !== null && product.brand !== undefined)
                        return product.brand.name
                });
                break;
        }

        const notNullBrands = brands.filter(x => x !== undefined)

        const unique = this.getDistinctValuesAndCounts(notNullBrands);

        return unique
    },

    async categoryFilter(ctx) {
        const { name, level, searchParams } = ctx.request.body

        const categoryFilters: ICategory = await strapi.db.query("api::category.category").findOne({
            select: ['id',],
            where: { slug: name },
            populate: {
                filters: {
                    select: ['name'],
                }
            },
        });

        const filters = []

        for await (let filter of categoryFilters.filters) {
            let filtered: { title: string, filterValues: { name: string, numberOfItems: number }[] } = { title: filter.name, filterValues: [] }

            let filterBrandString = {}
            const filterCharString = []
            const values = []

            for (let searchParam of searchParams) {

                if (searchParam.name === "sort" || searchParam.name === "page" || searchParam.name === "pageSize")
                    continue

                if (searchParam.name === "brands") {

                    if (typeof searchParam.value === "string") {
                        values.push(searchParam.value)
                    }
                    else {

                        for (let search of searchParam.value) {
                            values.push(search)
                        }
                    }
                }
                else {
                    const filter = { name: { $eq: `${searchParam.name}` } }
                    const values = []
                    if (typeof searchParam.value === "string") {
                        values.push(searchParam.value)
                    }
                    else {

                        for (let search of searchParam.value) {
                            values.push(search)
                        }
                    }

                    filterCharString.push({
                        prod_chars: {
                            $and: [filter, { value: { $in: values } }]
                        }
                    })
                }
            }

            filterBrandString = {
                name: { $in: values }
            }

            let products: []

            let populateProducts: any = {
                products: {
                    select: ['id'],
                    where: {
                        $and: [
                            { publishedAt: { $notNull: true, } },
                            { prod_chars: { name: `${filter.name}` } }
                        ]
                    },
                    populate: {
                        prod_chars: {
                            select: ['name', 'value'],
                            where: {
                                name: `${filter.name}`,
                            },
                        }
                    },
                }
            }

            if (filterCharString.length > 0) {
                if (values.length > 0) {
                    populateProducts = {
                        products: {
                            select: ['id'],
                            where: {
                                $and: [
                                    { publishedAt: { $notNull: true, } },
                                    { $and: filterCharString },
                                    { brand: filterBrandString }
                                ]
                            },
                            populate: {
                                prod_chars: {
                                    select: ['name', 'value'],
                                    where: {
                                        name: `${filter.name}`,
                                    },
                                }
                            },
                        }
                    }
                }
                else {
                    populateProducts = {
                        products: {
                            select: ['id'],
                            where: {
                                $and: [
                                    { publishedAt: { $notNull: true, } },
                                    { $and: filterCharString }
                                ]
                            },
                            populate: {
                                prod_chars: {
                                    select: ['name', 'value'],
                                    where: {
                                        name: `${filter.name}`,
                                    },
                                }
                            },
                        }
                    }
                }
            }
            else {
                if (values.length > 0) {
                    populateProducts = {
                        products: {
                            select: ['id'],
                            where: {
                                $and: [
                                    { publishedAt: { $notNull: true, } },
                                    { brand: filterBrandString },
                                    { prod_chars: { name: `${filter.name}` } }
                                ]
                            },
                            populate: {
                                prod_chars: {
                                    select: ['name', 'value'],
                                    where: {
                                        name: `${filter.name}`,
                                    },
                                }
                            },
                        }
                    }
                }
                else {
                    populateProducts = {
                        products: {
                            select: ['id'],
                            where: {
                                $and: [
                                    { publishedAt: { $notNull: true, } },
                                    { prod_chars: { name: `${filter.name}` } }
                                ]
                            },
                            populate: {
                                prod_chars: {
                                    select: ['name', 'value'],
                                    where: {
                                        name: `${filter.name}`,
                                    },
                                }
                            },
                        }
                    }
                }
            }

            let populateString: any = {}

            switch (level) {
                case 1:
                    populateString = {
                        categories: {
                            populate: {
                                categories: {
                                    populate: populateProducts
                                }
                            }
                        }
                    }
                    break;
                case 2:
                    populateString = {
                        categories: {
                            populate: populateProducts
                        }
                    }
                    break;
                case 3:
                    populateString = populateProducts
                    break;
                default:
                    populateString = populateProducts
                    break;
            }

            const category = await strapi.db.query("api::category.category").findOne({
                where: { slug: name },
                populate: populateString
            })

            switch (level) {
                case 1:
                    products = category.categories.flatMap(cat => {
                        return cat.categories.flatMap(cat1 => {
                            return cat1.products.map(product => {
                                for (let char of product.prod_chars) {
                                    if (char.name === filter.name) {
                                        return char.value.trim()
                                    }
                                }
                            })
                        })
                    })
                    break;

                case 2:
                    products = category.categories.flatMap(cat => {
                        return cat.products.map(product => {
                            for (let char of product.prod_chars) {
                                if (char.name === filter.name) {
                                    return char.value.trim()
                                }
                            }
                        })
                    })
                    break;

                case 3:
                    products = category.products.map(product => {
                        for (let char of product.prod_chars) {
                            if (char.name === filter.name) {
                                return char.value.trim()
                            }
                        }
                    })
                    break;
                default:
                    products = category.products.map(product => {
                        for (let char of product.prod_chars) {
                            if (char.name === filter.name) {
                                return char.value.trim()
                            }
                        }
                    })
                    break;
            }

            const notNullchars = products.filter(x => x !== undefined)

            const unique = this.getDistinctValuesAndCounts(notNullchars);

            unique.forEach(x => filtered.filterValues = unique)

            filters.push(filtered)
        }

        return filters
    }
}));
