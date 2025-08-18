/**
 * newsletter controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::newsletter.newsletter', ({ strapi }) => ({
    async unsubscribe(ctx) {
        const { email } = ctx.params

        await strapi.db.query('api::newsletter.newsletter').update({
            where: { email: email },
            data: {
                isActive: false,
            },
        })

        return { message: "suceess unsubscribe" }
    },

    async subscribe(ctx) {
        const { email } = ctx.request.body as { email: string };

        const subscriber = await strapi.db.query('api::newsletter.newsletter').findOne({
            where: { email: email },
        })

        if (!subscriber) {
            await strapi.entityService.create('api::newsletter.newsletter', {
                data: {
                    email: email,
                    isActive: true
                }
            })
        }
        else if (subscriber && !subscriber.isActive) {
            await strapi.entityService.update('api::newsletter.newsletter', subscriber.id, {
                data: {
                    isActive: true
                }
            })
        }

        return { message: "suceess unsubscribe" }
    }
}));
