/**
 * notify-me controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::notify-me.notify-me',
    ({ strapi }) => ({
        async subscribe(ctx) {
            try {
                // Validation
                if (!ctx.request.body) {
                    return ctx.badRequest('Missing required fields');
                }

                const notifyMeService = strapi.service('api::notify-me.notify-me');
                const result = await notifyMeService.subscribe(ctx);

                return ctx.created(result);
            } catch (error) {
                return ctx.internalServerError('Σφάλμα κατά την εγγραφή');
            }
        },

        async unsubscribe(ctx) {
            try {
                const { token } = ctx.params;

                if (!token) {
                    return ctx.badRequest('Missing unsubscribe token');
                }

                const notifyMeService = strapi.service('api::notify-me.notify-me');
                const result = await notifyMeService.unsubscribe(token);

                if (!result.success) {
                    return ctx.badRequest(result.message);
                }

                return ctx.send(result);
            } catch (error) {
                return ctx.internalServerError('Σφάλμα κατά τη διαγραφή');
            }
        },

        async check(ctx) {
            try {
                const { email, productId } = ctx.query;

                if (!email || !productId) {
                    return ctx.badRequest('Missing email or productId');
                }

                const notifyMeService = strapi.service('api::notify-me.notify-me');
                const result = await notifyMeService.checkSubscription(email, productId);

                return ctx.send(result);
            } catch (error) {
                return ctx.internalServerError('Σφάλμα κατά τον έλεγχο');
            }
        }
    }));
