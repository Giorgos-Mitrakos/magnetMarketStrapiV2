/**
 * category controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::category.category',
    ({ strapi }) => ({
        async brandFilter(ctx) {
            ctx.body = await strapi.service('api::category.category').brandFilter(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

        async categoryFilter(ctx) {
            ctx.body = await strapi.service('api::category.category').categoryFilter(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
    })
);
