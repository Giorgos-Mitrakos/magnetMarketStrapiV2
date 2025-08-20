/**
 * newsletter controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::newsletter.newsletter', ({ strapi }) => ({
    async unsubscribe(ctx) {
        try {
            const { email, token } = ctx.request.body as { email: string, token: string };

            // Verify token
            const tokenUtils = strapi.service('api::order.order');
            const isValid = tokenUtils.verifyUnsubscribeToken(email, token);

            if (!isValid) {
                // return { message: "Invalid or expired token" }
                return ctx.badRequest('Invalid or expired token');
            }

            await strapi.db.query('api::newsletter.newsletter').update({
                where: { email: email },
                data: {
                    subscribed: false,
                    unsubscribedAt: new Date()
                },
            })

            return { message: "suceess unsubscribe" }


        } catch (error) {
            console.log(error)
        }
    },

    async subscribe(ctx) {
        try {
            const { email } = ctx.request.body as { email: string };

            const subscriber = await strapi.db.query('api::newsletter.newsletter').findOne({
                where: { email: email },
            })

            if (!subscriber) {
                await strapi.entityService.create('api::newsletter.newsletter', {
                    data: {
                        email: email,
                        subscribed: true,
                        subscribedAt: new Date()
                    }
                })

                return { message: "suceess subscribe" }
            }
            else if (subscriber && !subscriber.subscribed) {
                await strapi.entityService.update('api::newsletter.newsletter', subscriber.id, {
                    data: {
                        subscribed: true,
                        subscribedAt: new Date()
                    }
                })
                return { message: "suceess activate" }
            }

            return { message: "This attribute must be unique" }


        } catch (error) {
            return { message: error?.message }
        }

    }
}));
