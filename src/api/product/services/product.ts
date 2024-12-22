/**
 * product service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
export type IProduct = Attribute.GetValues<"api::product.product">;

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
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

    async searchProducts(ctx) {
        const { sort, page, pageSize, brands, search } = ctx.request.body

        console.log(sort, page, pageSize, brands, search)

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

        console.log("products:", products)
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

        const brands = []
        const categories = []

        products.forEach(product => {
            if (product.brand && product.brand !== null && product.brand !== undefined)
                brands.push(product.brand.name)

            if (product.category && product.category !== null && product.category !== undefined)
                categories.push(product.category.name)
        });

        const notNullBrands = brands.filter(x => x !== undefined)

        const uniqueBrands = this.getDistinctValuesAndCounts(notNullBrands);

        const notNullCategories = categories.filter(x => x !== undefined)

        const uniqueCategories = this.getDistinctValuesAndCounts(notNullCategories);

        const filters = [
            { title: 'Κατασκευαστές', filterValues: uniqueBrands },
            { title: 'Κατηγορίες', filterValues: uniqueCategories }
        ]

        return filters
    }
}));
