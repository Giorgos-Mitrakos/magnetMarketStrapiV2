/**
 * expected-inquiry controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::expected-inquiry.expected-inquiry',
    ({ strapi }) => ({
        async createAskForDate(ctx) {
            try {
                // Validation
                if (!ctx.request.body) {
                    return ctx.badRequest('Missing required fields');
                }

                const expectedInquiryService = strapi.service('api::expected-inquiry.expected-inquiry');
                const result = await expectedInquiryService.createAskForDate(ctx);

                return ctx.created(result);
            } catch (error) {
                return ctx.internalServerError('Σφάλμα κατά την εγγραφή');
            }
        }
    }));
