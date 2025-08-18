/**
 * coupon-usage controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::coupon-usage.coupon-usage', ({ strapi }) => ({
    async statistics(ctx) {
        try {
            const { couponId } = ctx.params;
            const stats = await strapi.service('api::coupon-usage.coupon-usage').getUsageStatistics(couponId);
            return stats;
        } catch (error) {
            return ctx.badRequest(error.message);
        }
    },

    async expireOld(ctx) {
        try {
            const result = await strapi.service('api::coupon-usage.coupon-usage').expireOldCoupons();
            return result;
        } catch (error) {
            return ctx.badRequest(error.message);
        }
    }
}));
