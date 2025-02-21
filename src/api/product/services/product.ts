/**
 * product service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
import { where } from 'lodash/fp';
import category from '../../category/controllers/category';
import product from '../controllers/product';
export type IProduct = Attribute.GetValues<"api::product.product">;
export type IBrand = Attribute.GetValues<"api::brand.brand">;

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
    getDistinctValuesAndCounts(arr) {
        // const counts = {};
        // arr.forEach((value) => {
        //     if (counts[value]) {
        //         counts[value]++;
        //     }
        //     else {
        //         counts[value] = 1;
        //     }
        // });

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


        // const resultArray = Object.keys(counts).map((key) => (
        //     {
        //         name: key,
        //         numberOfItems: counts[key],
        //     }));

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
        const { sort, page, pageSize, brands, search } = ctx.request.body

        const products: IProduct[] = await strapi.entityService.findMany('api::product.product', {
            // fields: ['name', 'slug', 'weight'],
            populate: {
                brand: true,
                category: true,
                image: true,
            },
            filters: {
                $or: [
                    { name: { $containsi: search } },
                    { brand: { name: { $containsi: search } } },
                    { category: { name: { $containsi: search } } },
                    { category: { slug: { $containsi: search } } },
                ]
            },
        })

        return { products }
    },

    async searchFilters(ctx) {
        const { searchParams } = ctx.request.body
        const { search } = searchParams

        const products: IProduct[] = await strapi.entityService.findMany('api::product.product', {
            fields: ['id', 'name', 'slug'],
            where: {
                publishedAt: {
                    $notNull: true,
                },
            },
            populate: {
                brand: { fields: ['name', 'slug'] },
                category: { fields: ['name', 'slug'] },
            },
            filters: {
                $and: [
                    {
                        publishedAt: {
                            $notNull: true,
                        }
                    },
                    {
                        $or: [
                            { name: { $containsi: search } },
                            { brand: { name: { $containsi: search } } },
                            { brand: { slug: { $containsi: search } } },
                            { category: { name: { $containsi: search } } },
                            { category: { slug: { $containsi: search } } },
                        ]
                    }
                ]

            },
        })

        const notNullBrands = products.map(product => product.brand).filter(x => { if (x !== undefined) return x })


        // const brands = []
        // const categories = []

        // products.forEach(product => {
        //     if (product.brand && product.brand !== null && product.brand !== undefined)
        //         brands.push(product.brand.name)

        //     if (product.category && product.category !== null && product.category !== undefined)
        //         categories.push(product.category.name)
        // });
        const uniqueBrands = this.getDistinctValuesAndCounts(notNullBrands);

        const notNullCategories = products.map(product => product.category).filter(x => x !== undefined)

        const uniqueCategories = this.getDistinctValuesAndCounts(notNullCategories);

        const filters = [
            { title: 'Κατασκευαστές', filterValues: uniqueBrands },
            { title: 'Κατηγορίες', filterValues: uniqueCategories }
        ]

        return filters
    },

    async brandFilters(ctx) {
        const { brand, searchParams } = ctx.request.body

        let searchFilter = {}
        if (searchParams.Κατηγορίες) {
            searchFilter = {
                where: {
                    slug: searchParams.Κατηγορίες
                }
            }
        }

        const brands: IBrand = await await strapi.db.query('api::brand.brand').findOne({
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

        const categories = brands.products.map(cat => { return cat.category })



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
            { title: 'Κατηγορίες', filterValues: uniqueCategories }
        ]

        return filters
    },
}));
