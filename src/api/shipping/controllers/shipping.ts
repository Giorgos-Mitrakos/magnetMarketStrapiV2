/**
 * shipping controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::shipping.shipping',
    ({ strapi }) => ({
        async findShippingCost(ctx) {
            ctx.body = await strapi.service('api::shipping.shipping').findShippingCost(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
        async findPaymentCost(ctx) {
            ctx.body = await strapi.service('api::shipping.shipping').findPaymentCost(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
        async findCartTotal(ctx) {
            ctx.body = await strapi.service('api::shipping.shipping').findCartTotal(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
        // async updateUser(ctx) {
        //   ctx.body = await strapi.service('api::shipping.shipping').updateMyAddress(ctx);


        //   return {
        //     okay: true,
        //     type: "POST",
        //   };
        // },
    }));
