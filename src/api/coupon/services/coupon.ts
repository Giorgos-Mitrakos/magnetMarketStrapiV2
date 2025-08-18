/**
 * coupon service
 */

import { factories } from '@strapi/strapi';

import type { Attribute } from "@strapi/strapi";
export type ICoupon = Attribute.GetValues<"api::coupon.coupon">;
type IUser = Attribute.GetValues<"plugin::users-permissions.user">;

type CouponUsageStatus = 'issued' | 'applied' | 'redeemed' | 'expired';

interface UpdateData {
    status: CouponUsageStatus;
    appliedAt?: Date;
    redeemedAt?: Date;
}

export default factories.createCoreService('api::coupon.coupon', ({ strapi }) => ({
    async validateCoupon(code, context) {
        try {
            const { user, cartItems, cartTotal } = context;

            // Get coupon with all relations
            const coupon: ICoupon = await strapi.db.query('api::coupon.coupon').findOne({
                where: { code },
                populate: [
                    'applicableProducts',
                    'excludedProducts',
                    'applicableCategories',
                    'excludedCategories',
                    'validation',
                    'restrictions'
                ]
            });

            if (!coupon || !coupon.isActive) {
                throw new Error('Το κουπόνι δεν είναι έγκυρο!');
            }

            // If coupon is personalized, verify email
            if (coupon.isPersonalized && coupon.allowedEmail !== user.email) {
                throw new Error('Το κουπόνι δεν αντιστοιχεί στο email που έχει εκδοθεί!');
            }

            // Validate basic rules
            await this.validateBasicRules(coupon, user);

            // Validate restriction rules (including all the new fields)
            await this.validateRestrictionRules(coupon, user, cartItems, cartTotal);

            // Validate product restrictions
            await this.validateProductRestrictions(coupon, cartItems);

            // Validate category restrictions
            await this.validateCategoryRestrictions(coupon, cartItems);

            return {
                valid: true,
                coupon: {
                    id: coupon.id,
                    code: coupon.code,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    isTemplate: coupon.isTemplate,
                    restrictions: coupon.restrictions
                }
            };

        } catch (error) {
            return {
                valid: false,
                message: error.message // This will contain the specific validation error
            };
        }
    },

    async validateBasicRules(coupon, user) {
        try {
            if (!coupon) {
                throw new Error('Δεν βρέθηκε κουπόνι');
            }

            const now = new Date();

            // Date validation
            if (coupon.validation?.startDate && new Date(coupon.validation.startDate) > now) {
                const startDate = new Date(coupon.validation.startDate)
                const date = startDate.toLocaleDateString('el-GR')
                const time = startDate.toLocaleTimeString('el-GR');
                throw new Error(`Το κουπόνι θα ενεργοποιήθεί μετά τις ${date}-${time}`);
            }
            if (coupon.validation?.endDate && new Date(coupon.validation.endDate) < now) {
                throw new Error('Το κουπόνι έχει λήξει');
            }

            // 2. Global usage limits (maxUses)
            if (coupon.validation?.maxUses) {
                const usageCount = await strapi.entityService.count('api::coupon-usage.coupon-usage', {
                    filters: {
                        coupon: coupon.id,
                        status: 'redeemed' // Only count successful redemptions
                    }
                });

                if (usageCount >= coupon.validation.maxUses) {
                    throw new Error('Το κουπόνι έφτασε το ανώτατο όριο χρήσης του');
                }
            }

            // 3. User-specific limits (usesPerUser)
            if (user?.id && coupon.validation?.usesPerUser) {
                const userUsageCount = await strapi.entityService.count('api::coupon-usage.coupon-usage', {
                    filters: {
                        coupon: coupon.id,
                        user: user.id,
                        status: 'redeemed'
                    }
                });

                if (userUsageCount >= coupon.validation.usesPerUser && coupon.validation.usesPerUser > 0) {
                    throw new Error('Φτάσατε το όριο χρήσης αυτού του κουπονιού');
                }
            }

            // 4. Single use validation
            await this.validateSingleUseCoupon(coupon, user?.id)


        } catch (error) {
            // console.error('Coupon validation error:', error);
            // Re-throw the error to be handled by the caller
            throw new Error(error.message); // Or throw new Error(error.message) to ensure it's an Error instance
        }
    },

    async validateSingleUseCoupon(coupon, userId) {
        try {
            if (!coupon.validation?.singleUse || !userId) return;

            // Check for existing redemption
            const redeemed = await strapi.entityService.count('api::coupon-usage.coupon-usage', {
                filters: {
                    coupon: coupon.id,
                    user: userId,
                    status: 'redeemed'
                }
            });

            if (redeemed > 0) {
                throw new Error('Αυτό το κουπόνι έχει ήδη χρησιμοποιηθεί!');
            }

            // Optional: Check for too many pending applications
            const recentApplications = await strapi.entityService.count('api::coupon-usage.coupon-usage', {
                filters: {
                    coupon: coupon.id,
                    user: userId,
                    status: 'applied',
                    appliedAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last 24 hours
                }
            });

            if (recentApplications > 2) {
                throw new Error('Πολλές προσπάθειες για να χρησιμοποιηθεί αυτό το κουπόνι, δοκιμάστε ξανά αργότερα!');
            }

        } catch (error) {
            console.error('Coupon validateSingleUseCoupon error:', error);
            // Re-throw the error to be handled by the caller
            throw new Error(error.message); // Or throw new Error(error.message) to ensure it's an Error instance
        }
    },

    async validateRestrictionRules(coupon, user, cartItems, cartTotal) {
        try {
            const { restrictions } = coupon;
            if (!restrictions) return;

            // 1. Cart value restrictions
            if (restrictions.minCartValue && cartTotal < restrictions.minCartValue) {
                throw new Error(`Το κουπόνι ισχύει για ελάχιστο ποσό στο καλάθι ${restrictions.minCartValue} €`);
            }
            if (restrictions.maxCartValue && cartTotal > restrictions.maxCartValue) {
                throw new Error(`Το κουπόνι ισχύει για μέγιστο ποσό στο καλάθι ${restrictions.maxCartValue} €`);
            }

            // 2. Customer type restrictions
            if (user?.id) {
                if (restrictions.newCustomersOnly) {
                    const hasOrders = await this.userHasOrders(user.id);
                    if (hasOrders) {
                        throw new Error('Το κουπόνι είναι έγκυρο μόνο για νέους χρήστες');
                    }
                }

                if (restrictions.recurrentCustomersOnly) {

                    const isValid = await this.validateOrderHistory(user.id, restrictions);
                    if (!isValid) {
                        throw this.createOrderHistoryError(restrictions);
                    }
                }

            } else {
                throw new Error('*Δεν υπάρχει ενεργός χρήστης!');
            }


            // 3. Coupon Policy restrictions
            const hasDiscountedItem = cartItems.some(item => item.is_sale && item.sale_price !== null)
            if (restrictions.discountedProductsPolicy === "exclude_discounted" && hasDiscountedItem) {
                throw new Error('Το κουπόνι δεν ισχύει όταν στο καλάθι υπάρχουν προϊόντα που είναι ήδη σε έκπτωση!');
            }

        } catch (error) {
            // console.error('Coupon validateRestrictionRules error:', error);
            // Re-throw the error to be handled by the caller
            throw new Error(error.message); // Or throw new Error(error.message) to ensure it's an Error instance
        }
    },

    async validateProductRestrictions(coupon, cartItems) {
        try {
            if (coupon.applicableProducts?.length > 0) {
                const validProductInCart = cartItems.some(item =>
                    coupon.applicableProducts.some(p => p.id === item.productId)
                );
                if (!validProductInCart) {
                    throw new Error('Το κουπόνι έχει ισχύ για συγκεκριμένα προϊόντα!');
                }
            }

            if (coupon.excludedProducts?.length > 0) {
                const hasExcludedProduct = cartItems.some(item =>
                    coupon.excludedProducts.some(p => p.id === item.productId)
                );
                if (hasExcludedProduct) {
                    throw new Error('Το κουπόνι δεν ισχύει για συγκεκριμένα προϊόντα!');
                }
            }
        } catch (error) {
            console.error('Coupon validateProductRestrictions error:', error);
            // Re-throw the error to be handled by the caller
            throw new Error(error.message); // Or throw new Error(error.message) to ensure it's an Error instance
        }
    },

    async validateCategoryRestrictions(coupon, cartItems) {
        try {
            if (coupon.applicableCategories?.length > 0) {
                const products = await strapi.entityService.findMany('api::product.product', {
                    select: ['id'],
                    filters: { id: { $in: cartItems.map(i => i.productId) } },
                    populate: ['category']
                });

                const hasValidCategory = products.some(product =>
                    coupon.applicableCategories.some(c => c.id === product.category.id)
                );

                if (!hasValidCategory) {
                    throw new Error('Το κουπόνι ισχύει για συγκεκριμένες κατηγορίες!');
                }
            }

            if (coupon.excludedCategories?.length > 0) {
                const products = await strapi.entityService.findMany('api::product.product', {
                    filters: { id: { $in: cartItems.map(i => i.productId) } },
                    populate: ['category']
                });

                const hasExcludedCategory = products.some(product =>
                    coupon.excludedCategories.some(c => c.id === product.category.id)
                );

                if (hasExcludedCategory) {
                    throw new Error('Το καλάθι σας περιέχει προϊόντα από κατηγορίες που δεν ισχύει το κουπόνι!');
                }
            }

        } catch (error) {
            console.error('Coupon validateProductRestrictions error:', error);
            // Re-throw the error to be handled by the caller
            throw new Error(error.message); // Or throw new Error(error.message) to ensure it's an Error instance
        }
    },

    async userHasOrders(userId) {
        return await strapi.db.query('api::order.order').count({
            where: {
                user: userId,
                status: 'Ολοκληρωμένη'
            },
            limit: 1
        }) > 0;
    },

    createOrderHistoryError(restrictions) {
        const timeframeMap = {
            'last_30_days': 'τις τελευταίες 30 μέρες',
            'last_90_days': 'τις τελευταίες 90 μέρες',
            'last_180_days': 'τους τελευταίους 6 μήνες',
            'last_365_days': 'τον τελευταίο χρόνο',
            'over_365_days': 'παλαιότερες του ενός χρόνου!',
            'all_time': ''
        };

        const timeframeText = timeframeMap[restrictions.orderTimeframe] || '';
        const minOrders = restrictions.minPreviousOrders;

        if (restrictions.recurrentCustomersOnly) {
            return new Error(`Απαιτούνται ${minOrders} προηγούμενες παραγγελίες ${timeframeText ? `${timeframeText}` : ''}`);
        }

        return new Error(`Απαιτούνται ${minOrders} παραγγελίες ${timeframeText ? `${timeframeText}` : ''}`);
    },

    async validateOrderHistory(userId, restrictions) {
        // No timeframe restriction = check all time orders
        if (restrictions.orderTimeframe === 'all_time') {
            return this.validateMinOrders(userId, restrictions.minPreviousOrders);
        }

        // Special case for "over_365_days"
        if (restrictions.orderTimeframe === 'over_365_days') {
            return this.validateOldCustomers(userId, restrictions.minPreviousOrders);
        }

        // For specific timeframes
        return this.validateTimeframeOrders(
            userId,
            restrictions.orderTimeframe,
            restrictions.minPreviousOrders
        );
    },

    async validateTimeframeOrders(userId, timeframe, minOrders) {
        const dateFilter = this.getTimeframeFilter(timeframe);
        const orderCount = await strapi.entityService.count('api::order.order', {
            filters: {
                user: userId,
                status: 'Ολοκληρωμένη',
                createdAt: dateFilter
            }
        });

        return orderCount >= minOrders;
    },

    async validateMinOrders(userId, minOrders) {
        if (minOrders < 1) return true;

        const orderCount = await strapi.entityService.count('api::order.order', {
            filters: {
                user: userId,
                status: 'Ολοκληρωμένη'
            }
        });

        return orderCount >= minOrders;
    },

    async validateOldCustomers(userId, minOrders) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const orderCount = await strapi.entityService.count('api::order.order', {
            filters: {
                user: userId,
                status: 'Ολοκληρωμένη',
                createdAt: { $lt: oneYearAgo }
            }
        });

        return orderCount >= minOrders;
    },

    getTimeframeFilter(timeframe) {
        const now = new Date();
        switch (timeframe) {
            case 'last_30_days':
                return { $gt: new Date(now.setDate(now.getDate() - 30)) };
            case 'last_90_days':
                return { $gt: new Date(now.setDate(now.getDate() - 90)) };
            case 'last_180_days':
                return { $gt: new Date(now.setDate(now.getDate() - 180)) };
            case 'last_365_days':
                return { $gt: new Date(now.setDate(now.getDate() - 365)) };
            default:
                return null;
        }
    },

    // createExpireDate(timeframe) {
    //     const now = new Date();
    //     switch (timeframe) {
    //         case 'last_30_days':
    //             return new Date(now.setDate(now.getDate() + 30)) ;
    //         case 'last_90_days':
    //             return new Date(now.setDate(now.getDate() + 90)) ;
    //         case 'last_180_days':
    //             return new Date(now.setDate(now.getDate() + 180)) ;
    //         case 'last_365_days':
    //             return new Date(now.setDate(now.getDate() + 365)) ;
    //         default:
    //             return null;
    //     }
    // },

    async getUserOrderCount(userId) {
        return strapi.db.query('api::order.order').count({
            where: {
                user: userId,
                status: 'Ολοκληρωμένη'
            }
        });
    },

    async recordCouponUsage(couponId, userId, email, source) {
        return strapi.entityService.create('api::coupon-usage.coupon-usage', {
            data: {
                coupon: couponId,
                user: userId,
                email,
                source,
                status: 'issued'
            }
        });
    },

    async updateCouponUsageStatus(
        usageId: number | string,
        status: CouponUsageStatus
    ): Promise<any> {
        const updateData: UpdateData = { status };

        if (status === 'applied') {
            updateData.appliedAt = new Date();
        } else if (status === 'redeemed') {
            updateData.redeemedAt = new Date();
        }

        return strapi.entityService.update('api::coupon-usage.coupon-usage', usageId, {
            data: updateData
        });
    },

    async generateUniqueCouponCode(baseCode) {
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newCode = `${baseCode}-${randomSuffix}`;

        // Verify uniqueness
        const existing = await strapi.entityService.count('api::coupon.coupon', {
            filters: { code: newCode }
        });

        return existing > 0 ? this.generateUniqueCouponCode(baseCode) : newCode;
    },

    async redeemCoupon({ code, userEmail, cartItems, cartTotal, order }) {
        try {
            // const {  } = ctx.request.body;

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

            const usage = await strapi.entityService.create('api::coupon-usage.coupon-usage', {
                data: {
                    coupon: coupon.id,
                    user: user.id,
                    email: userEmail,
                    source: 'manual_application',
                    status: 'redeemed'
                }
            });

            return { success: true, usageId: usage.id };
        } catch (error) {
            console.log(error)
            throw new Error(error.message);
        }
    },

}));
