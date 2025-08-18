/**
 * coupon-usage service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::coupon-usage.coupon-usage', ({ strapi }) => ({
    async getUsageStatistics(couponId) {
        const usages = await strapi.entityService.findMany('api::coupon-usage.coupon-usage', {
            filters: { coupon: couponId },
            populate: ['user', 'order']
        });

        const statistics = {
            total: usages.length,
            issued: usages.filter(u => u.status === 'issued').length,
            applied: usages.filter(u => u.status === 'applied').length,
            redeemed: usages.filter(u => u.status === 'redeemed').length,
            expired: usages.filter(u => u.status === 'expired').length,
            conversionRate: usages.length > 0
                ? (usages.filter(u => u.status === 'redeemed').length / usages.length) * 100
                : 0
        };

        return statistics;
    },

    async expireOldCoupons() {
        const expiredCoupons = await strapi.entityService.findMany('api::coupon.coupon', {
            filters: {
                'validation.endDate': { $lt: new Date() },
                isActive: true
            }
        });

        for (const coupon of expiredCoupons) {
            // Update coupon
            await strapi.entityService.update('api::coupon.coupon', coupon.id, {
                data: { isActive: false }
            });

            // Update usages
            await strapi.db.query('api::coupon-usage.coupon-usage').updateMany({
                where: {
                    coupon: coupon.id,
                    status: { $in: ['issued', 'applied'] }
                },
                data: { status: 'expired' }
            });
        }

        return { expired: expiredCoupons.length };
    }
}));
