/**
 * category service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
import brand from '../../brand/controllers/brand';
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
        const { name, searchParams } = ctx.request.body

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

        let filters: ICategory

        if (values.length > 0) {
            filters = await strapi.db.query("api::category.category").findOne({
                select: ['id',],
                where: { slug: name },
                populate: {
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
                },
            });
        }
        else {
            filters = await strapi.db.query("api::category.category").findOne({
                select: ['id',],
                where: { slug: name },
                populate: {
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
                },
            });
        }

        const brands = filters.products.map(product => {
            if (product.brand && product.brand !== null && product.brand !== undefined)
                return product.brand.name
        });

        const notNullBrands = brands.filter(x => x !== undefined)

        const unique = this.getDistinctValuesAndCounts(notNullBrands);

        return unique
    },

    async categoryFilter(ctx) {
        const { name, searchParams } = ctx.request.body

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
                    console.log("Hello")
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

            let products: IProduct[]

            if (filterCharString.length > 0) {
                if (values.length > 0) {
                    
                    products = await strapi.db.query("api::product.product").findMany({
                        select: ['id',],
                        where: {
                            $and: [
                                { category: { slug: name } },
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
                    });
                }
                else {
                    products = await strapi.db.query("api::product.product").findMany({
                        select: ['id',],
                        where: {
                            $and: [
                                { category: { slug: name } },
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
                    });
                }
            }
            else {
                if (values.length > 0) {
                    products = await strapi.db.query("api::product.product").findMany({
                        select: ['id',],
                        where: {
                            $and: [
                                { category: { slug: name } },
                                { publishedAt: { $notNull: true, } },
                                { prod_chars: { name: `${filter.name}` } },
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
                    });
                }
                else {
                    products = await strapi.db.query("api::product.product").findMany({
                        select: ['id',],
                        where: {
                            $and: [
                                { category: { slug: name } },
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
                    });
                }
            }

            const chars = products.map(product => {
                for (let char of product.prod_chars) {
                    if (char.name === filter.name) {
                        return char.value
                    }
                }
            });

            const notNullchars = chars.filter(x => x !== undefined)

            const unique = this.getDistinctValuesAndCounts(notNullchars);

            unique.forEach(x => filtered.filterValues = unique)

            filters.push(filtered)
        }

        return filters
    }
}));
