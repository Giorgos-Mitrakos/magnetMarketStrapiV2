/**
 * coupon controller
 */

import { factories } from '@strapi/strapi'

import type { Attribute } from "@strapi/strapi";
type IUser = Attribute.GetValues<"plugin::users-permissions.user">;
type ICoupon = Attribute.GetValues<"api::coupon.coupon">;

export default factories.createCoreController('api::coupon.coupon', ({ strapi }) => ({
    async validate(ctx) {
        try {
            const { code, userEmail, cartItems = [], cartTotal }: any = ctx.request.body;

            const userDb: IUser = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { email: userEmail },
                select: ['id', 'email']
            })

            const user = userDb ? { id: userDb.id, email: userDb.email } : null;
            const result = await strapi.service('api::coupon.coupon').validateCoupon(code, {
                user,
                cartItems,
                cartTotal
            });

            return result;
        } catch (error) {
            return ctx.badRequest(error.message);
        }
    },

    async apply(ctx) {
        try {
            const { code, userEmail, cartItems = [], cartTotal }: any = ctx.request.body;

            const userDb: IUser = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { email: userEmail },
                select: ['id', 'email']
            })

            // First validate
            const user = userDb ? { id: userDb.id, email: userDb.email } : null;

            const { coupon } = await strapi.service('api::coupon.coupon').validateCoupon(code, {
                user,
                cartItems,
                cartTotal
            });

            // Record usage
            const usage = await strapi.service('api::coupon.coupon').recordCouponUsage(
                coupon.id,
                user.id,
                userEmail,
                'manual_application'
            );

            // Update status to applied
            await strapi.service('api::coupon.coupon').updateCouponUsageStatus(usage.id, 'applied');

            return {
                success: true,
                coupon,
                usageId: usage.id,
                message: "Το κουπόνι καταχωρήθηκε επιτυχώς!"
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            }
        }
    },

    async generateFromTemplate(ctx) {
        try {
            const { templateCode, userEmail }: any = ctx.request.body;

            const userDb: IUser = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { email: userEmail },
                select: ['id']
            })

            const user = userDb ? { id: userDb.id } : null;

            const couponService = strapi.service('api::coupon.coupon');
            const { coupon: template } = await couponService.validateCoupon(templateCode, { user });

            if (!template.isTemplate) {
                throw new Error('Not a coupon template');
            }

            const newCode = await couponService.generateUniqueCouponCode(template.code);

            const newCoupon: ICoupon = await strapi.entityService.create('api::coupon.coupon', {
                data: {
                    code: newCode,
                    discountType: template.discountType,
                    discountValue: template.discountValue,
                    isActive: true,
                    parentCoupon: template.id,
                    validation: {
                        startDate: template.validation?.startDate,
                        endDate: template.validation?.endDate,
                        usesPerUser: 1,
                        singleUse: true
                    }
                }
            });

            await couponService.recordCouponUsage(newCoupon.id, user.id, userEmail, 'generated_from_template');

            return { coupon: newCoupon };
        } catch (error) {
            return ctx.badRequest(error.message);
        }
    }
}));
