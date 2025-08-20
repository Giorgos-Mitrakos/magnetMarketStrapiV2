
export default {
    async afterCreate(event) {
        try {
            const { result } = event

            const getOrCreateUser = async () => {

                let existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
                    where: { email: result.email },
                });

                if (!existingUser) {
                    const newUser = await strapi.entityService.create('plugin::users-permissions.user', {
                        data: {
                            email: result.email,
                            username: result.email,
                        }
                    });
                    return newUser;
                }
                return existingUser;
            };

            const currentUser = await getOrCreateUser();

            const templates = await strapi.db.query('api::coupon.coupon').findMany({
                where: {
                    isTemplate: true,
                    trigger: {
                        $and: [
                            { triggerType: 'newsletter_signup' },
                            { autoGenerate: true }
                        ]
                    }
                }, populate: {
                    trigger: true,
                    restrictions: true,
                    validation: true
                }
            });

            // Generate a coupon for each matching template
            for (const template of templates) {
                const existingCoupon = await strapi.entityService.findMany('api::coupon.coupon', {
                    filters: {
                        parentCoupon: template.id,
                        allowedEmail: result.email
                    }
                });
                if (existingCoupon.length > 0) continue; // Skip if already exists

                const uniqueCode = await strapi.service('api::coupon.coupon').generateUniqueCouponCode(template.code);
                const newCoupon = await strapi.entityService.create('api::coupon.coupon', {
                    data: {
                        code: uniqueCode,
                        isTemplate: false,
                        allowedEmail: result.email, // Restrict to user's email
                        isPersonalized: template.isPersonalized,
                        parentCoupon: template.id,
                        discountType: template.discountType,
                        discountValue: template.discountValue,
                        isActive: true,
                        restrictions: template.restrictions,
                        validation: {
                            startDate: template.validation?.startDate,
                            endDate: template.validation?.endDate,
                            usesPerUser: 1,
                            singleUse: true
                        }
                    }
                });


                // Στο controller ή service όπου στέλνεται το email
                const tokenUtils = strapi.service('api::order.order');

                // Generate token for unsubscribe link
                const unsubscribeToken = tokenUtils.generateUnsubscribeToken(result.email);
                const unsubscribeLink = `${process.env.CANONICAL_URL}/newsletter/unsubscribe/?email=${encodeURIComponent(result.email)}&token=${encodeURIComponent(unsubscribeToken)}`;


                await strapi.service('api::coupon.coupon').recordCouponUsage(newCoupon.id, currentUser.id, currentUser.email, 'generated_from_template')

                await strapi.service('api::order.order').sendConfirmOrderEmail({
                    templateReferenceId: 3,
                    to: result.email,
                    emailVariables: {
                        discount: `${newCoupon.discountType === 'free_shipping' ? (
                            "Δωρεάν μεταφορικά"
                        ) :
                            (
                                `${newCoupon.discountValue}${newCoupon.discountType === 'percentage' ? '% ΕΚΠΤΩΣΗ' : '€ ΕΚΠΤΩΣΗ'
                                }`
                            )}`,
                        couponCode: newCoupon.code,
                        expiryDate: template.validation?.endDate ? template.validation?.endDate : "Χωρίς χρονικό περιορισμό",
                        shopUrl: "https://www.magnetmarket.gr",
                        shopName: "Magnet Market",
                        currentYear: new Date().getFullYear(),
                        unsubscribeLink: unsubscribeLink
                    },
                    subject: 'Αποκλειστικό Κουπόνι | MagnetMarket'
                })
            }


        } catch (error) {
            console.log(error)
        }
    },
}