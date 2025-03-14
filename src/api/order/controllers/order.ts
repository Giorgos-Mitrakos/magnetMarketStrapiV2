/**
 * order controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::order.order',
    ({ strapi }) => ({
        async createOrder(ctx) {
            ctx.body = await strapi.service('api::order.order').createNewOrder(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

        async saveTicket(ctx) {
            ctx.body = await strapi.service('api::order.order').saveTicket(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

        async sendEmail(ctx) {
            ctx.body = await strapi.service('api::order.order').sendEmail(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },
        
    })
);
