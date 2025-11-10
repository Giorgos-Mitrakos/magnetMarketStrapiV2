/**
 * product controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::product.product',
    ({ strapi }) => ({
        async searchProducts(ctx) {console.log("params:", "Helloooo")
            ctx.body = await strapi.service('api::product.product').searchProducts(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
        // async searchFilters(ctx) {
        //     ctx.body = await strapi.service('api::product.product').searchFilters(ctx);
        //     return {
        //         okay: true,
        //         type: "POST",
        //     };
        // },
        async brandFilters(ctx) {
            ctx.body = await strapi.service('api::product.product').brandFilters(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
        async getProductBySlug(ctx) {
            ctx.body = await strapi.service('api::product.product').getProductBySlug(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
        async getHotOrSale(ctx) {
            ctx.body = await strapi.service('api::product.product').getHotOrSale(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

        async getOffers(ctx) {
            ctx.body = await strapi.service('api::product.product').getOffers(ctx);
            return {
                okay: true,
                type: "POST",
            };
        }

    }));
