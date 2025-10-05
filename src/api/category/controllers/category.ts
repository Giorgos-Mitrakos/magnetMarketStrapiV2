/**
 * category controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::category.category',
    ({ strapi }) => ({
        async getMenu(ctx) {
            ctx.body = await strapi.service('api::category.category').getMenu(ctx);
            return {
                okay: true,
                type: "GET",
            };
        },

        async getCategoriesMapping(ctx) {
            ctx.body = await strapi.service('api::category.category').getCategoriesMapping(ctx);
            return {
                okay: true,
                type: "GET",
            };
        },

        async categoryMetadata(ctx) {
            ctx.body = await strapi.service('api::category.category').getMetadata(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

        async getCategoryProducts(ctx) {
            ctx.body = await strapi.service('api::category.category').getCategoryProducts(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
    })
);
