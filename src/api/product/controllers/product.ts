/**
 * product controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::product.product',
    ({ strapi }) => ({
        async searchProducts(ctx) {
            ctx.body = await strapi.service('api::product.product').searchProducts(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
        async searchFilters(ctx) {
            ctx.body = await strapi.service('api::product.product').searchFilters(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
        async brandFilters(ctx) {
            ctx.body = await strapi.service('api::product.product').brandFilters(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

    }));
