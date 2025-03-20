/**
 * order controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::order.order',
    ({ strapi }) => ({
        async createOrder(ctx) {
            const apiToken = ctx.request.headers.authorization?.replace('Bearer', '').trim()
            
            if (apiToken !== process.env.ADMIN_JWT_SECRET) {
                return ctx.unauthorized('Invalid api token')
            }

            ctx.body = await strapi.service('api::order.order').createNewOrder(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

        async saveTicket(ctx) {
            const apiToken = ctx.request.headers.authorization?.replace('Bearer', '').trim()
            if (apiToken !== process.env.ADMIN_JWT_SECRET) {
                return ctx.unauthorized('Invalid api token')
            }

            ctx.body = await strapi.service('api::order.order').saveTicket(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

        async saveBankResponse(ctx) {
            const apiToken = ctx.request.headers.authorization?.replace('Bearer', '').trim()
            if (apiToken !== process.env.ADMIN_JWT_SECRET) {
                return ctx.unauthorized('Invalid api token')
            }

            ctx.body = await strapi.service('api::order.order').saveBankResponse(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

        async getTicket(ctx) {

            const apiToken = ctx.request.headers.authorization?.replace('Bearer', '').trim()
            
            if (apiToken !== process.env.ADMIN_JWT_SECRET) {
                return ctx.unauthorized('Invalid api token')
            }

            ctx.body = await strapi.service('api::order.order').getTicket(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

        async sendEmail(ctx) {

            const apiToken = ctx.request.headers.authorization?.replace('Bearer', '').trim()

            if (apiToken !== process.env.ADMIN_JWT_SECRET) {
                return ctx.unauthorized('Invalid api token')
            }

            ctx.body = await strapi.service('api::order.order').sendEmail(ctx);
            return {
                okay: true,
                type: "POST",
            };
        },

    })
);
