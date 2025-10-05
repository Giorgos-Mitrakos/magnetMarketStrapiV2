export default {
    async afterCreate(event) {
        try {
            const { result } = event

            const order = await strapi.entityService.findOne('api::order.order', result.id, {
                populate: {
                    user: true,
                    shipping: true,
                    payment: true,
                    comments: true
                }
            });

            const emailVariables = await strapi.service('api::order.order').sendStatusEmail(order)

            await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId: 5, to: ['giorgos_mitrakos@yahoo.com', 'info@magnetmarket.gr', 'kkoulogiannis@gmail.com'], emailVariables, subject: `Νέα παραγγελία στο site, Αρ.παρ #${emailVariables.order.id}` })

            // const templates = await strapi.db.query('api::coupon.coupon').findMany({
            //     where: {
            //         isTemplate: true,
            //         trigger: {
            //             $and: [
            //                 { triggerType: 'order_completion' },
            //                 { autoGenerate: true }
            //             ]
            //         }
            //     }, populate: {
            //         trigger: true,
            //         restrictions: true,
            //         validation: true
            //     }
            // });
           
            // // Generate a coupon for each matching template
            // for (const template of templates) {
            //     const existingCoupon = await strapi.entityService.findMany('api::coupon.coupon', {
            //         filters: {
            //             parentCoupon: template.id,
            //             allowedEmail: order.user.email
            //         }
            //     });
            //     // if (existingCoupon.length > 0) continue; // Skip if already exists

            //     const uniqueCode = await strapi.service('api::coupon.coupon').generateUniqueCouponCode(template.code);

            //     const expiryDate = strapi.service('api::coupon.coupon').createExpireDate(template.restrictions.orderTimeframe)

            //     const newCoupon = await strapi.entityService.create('api::coupon.coupon', {
            //         data: {
            //             code: uniqueCode,
            //             isTemplate: false,
            //             allowedEmail: order.user.email, // Restrict to user's email
            //             isPersonalized: template.isPersonalized,
            //             parentCoupon: template.id,
            //             discountType: template.discountType,
            //             discountValue: template.discountValue,
            //             isActive: true,
            //             restrictions: template.restrictions,
            //             validation: {
            //                 startDate: template.validation?.startDate,
            //                 endDate: expiryDate || template.validation?.endDate || undefined,
            //                 usesPerUser: 1,
            //                 singleUse: true
            //             }
            //         }
            //     });

            //     console.log(newCoupon)

            //     const newFullCoupon = await strapi.entityService.findOne('api::coupon.coupon', newCoupon.id, {
            //         populate: { validation: true },
            //     });

            //     await strapi.service('api::coupon.coupon').recordCouponUsage(newCoupon.id, order.user.id, order.user.email, 'generated_from_template')

            //     await strapi.service('api::order.order').sendConfirmOrderEmail({
            //         templateReferenceId: 11,
            //         to: order.user.email,
            //         emailVariables: {
            //             discount: `${newFullCoupon.discountType === 'free_shipping' ? (
            //                 "Δωρεάν μεταφορικά"
            //             ) :
            //                 (
            //                     `${newFullCoupon.discountValue}${newFullCoupon.discountType === 'percentage' ? '% ΕΚΠΤΩΣΗ' : '€ ΕΚΠΤΩΣΗ'
            //                     }`
            //                 )}`,
            //             couponCode: newFullCoupon.code,
            //             expiryDate: newFullCoupon.validation?.endDate ? newFullCoupon.validation?.endDate : "Χωρίς περιορισμό χρόνου",
            //             shopUrl: "https://www.magnetmarket.gr",
            //             shopName: "Magnet Market",
            //             currentYear: new Date().getFullYear(),
            //         },
            //         subject: 'Αποκλειστικό Κουπόνι | MagnetMarket'
            //     })
            // }


        } catch (error) {
            console.log(error)
        }
    },
}