/**
 * notify-me service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::notify-me.notify-me', ({ strapi }) => ({

    async subscribe(ctx) {
        try {
            const { email, productId, productName } = ctx.request.body;

            // Έλεγχος για duplicate (ίδιο email + ίδιο προϊόν)
            const existing = await strapi.entityService.findMany('api::notify-me.notify-me', {
                filters: {
                    email: email,
                    product: { id: productId },
                    status: 'pending'
                }
            });

            if (existing.length > 0) {
                return {
                    success: false,
                    message: 'Είστε ήδη εγγεγραμμένοι για ειδοποίηση για αυτό το προϊόν'
                };
            }

            // Δημιούργησε την εγγραφή
            const entry = await strapi.entityService.create('api::notify-me.notify-me', {
                data: {
                    email: email,
                    product: { id: productId },
                    productName: productName,
                    status: 'pending',
                    publishedAt: new Date()
                }
            });

            // Δημιουργία unsubscribe token και URL
            const unsubscribeToken = this.generateUnsubscribeToken(entry.id, email);
            const unsubscribeUrl = `https://magnetmarket.gr/unsubscribe/${unsubscribeToken}`;

            await strapi.service('api::order.order').sendConfirmOrderEmail({
                templateReferenceId: 13,
                to: [entry.email],
                emailVariables: {
                    productName: entry.productName,
                    email: entry.email,
                    productId: productId,
                    subscriptionDate: new Date(entry.createdAt).toLocaleString('el-GR', {
                        timeZone: 'UTC',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    }),
                    currentYear: new Date().getFullYear(),
                    unsubscribeUrl: unsubscribeUrl,
                },
                subject: "Επιβεβαίωση εγγραφής για Ειδοποίηση"
            });

            return {
                success: true,
                data: entry,
                message: 'Εγγραφή επιτυχής! Θα ειδοποιηθείτε όταν το προϊόν είναι διαθέσιμο.'
            };
        } catch (error) {
            strapi.log.error('Error creating notify me subscription:', error);
            throw error;
        }
    },

    async unsubscribe(token) {
        try {
            // Decode το token
            const decoded = this.decodeUnsubscribeToken(token);
            if (!decoded) {
                return {
                    success: false,
                    message: 'Μη έγκυρο unsubscribe link'
                };
            }

            const { id, email } = decoded;

            // Βρες την εγγραφή
            const subscription = await strapi.entityService.findOne('api::notify-me.notify-me', id);

            if (!subscription) {
                return {
                    success: false,
                    message: 'Η εγγραφή δεν βρέθηκε'
                };
            }

            // Έλεγχος αν το email ταιριάζει
            if (subscription.email !== email) {
                return {
                    success: false,
                    message: 'Μη έγκυρο unsubscribe link'
                };
            }

            // Ενημέρωση της εγγραφής ως cancelled
            await strapi.entityService.update('api::notify-me.notify-me', id, {
                data: {
                    status: 'cancelled',
                    notifiedAt: null
                }
            });



            // Προαιρετικό: Στείλε email επιβεβαίωσης unsubscribe
            try {
                await strapi.service('api::order.order').sendConfirmOrderEmail({
                    templateReferenceId: 14,
                    to: [email],
                    emailVariables: {
                        productName: subscription.productName,
                        email: email,
                        productId: subscription.id,
                        subscriptionDate: new Date().toLocaleString('el-GR', {
                            timeZone: 'UTC',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        }),
                        currentYear: new Date().getFullYear(),
                    },
                    subject: "Επιτυχής Διαγραφή από Ειδοποιήσεις"
                });
            } catch (emailError) {
                strapi.log.error('Error sending unsubscribe confirmation email:', emailError);
            }

            return {
                success: true,
                message: 'Η εγγραφή σας διαγράφηκε επιτυχώς. Δεν θα λάβετε άλλες ειδοποιήσεις.'
            };
        } catch (error) {
            strapi.log.error('Error processing unsubscribe:', error);
            throw error;
        }
    },

    async notifyProductAvailable(productId) {
        try {
            // Βρες όλες τις pending εγγραφές για αυτό το προϊόν
            const subscriptions = await strapi.entityService.findMany('api::notify-me.notify-me', {
                filters: {
                    product: productId,
                    status: 'pending'
                },
                limit: 1000 // Αν έχεις πολλές, μπορείς να κάνεις pagination
            });

            if (subscriptions.length === 0) {
                return { notified: 0 };
            }

            // Βρες το προϊόν
            const product = await strapi.entityService.findOne('api::product.product', productId, {
                fields: ['name', 'slug', 'price', 'sale_price', 'is_sale']
            });

            if (!product) {
                throw new Error('Product not found');
            }

            let notifiedCount = 0;

            const hasDiscount = product.is_sale && product.sale_price
            const discountAmount = (product.price - product.sale_price)
            const discountPercent = discountAmount * 100 / product.price

            // Στείλε email σε κάθε εγγεγραμμένο
            for (const subscription of subscriptions) {
                try {
                    const productUrl = `${process.env.CANONICAL_URL || 'https://magnetmarket.gr'}/product/${product.slug}`;

                    const emailVariables = {
                        productName: product.name,
                        productId: product.id,
                        hasDiscount: hasDiscount,
                        discountAmount: discountAmount.toFixed(2),
                        salePrice: product.sale_price,
                        productPrice: product.price,
                        discountPercent: discountPercent.toFixed(2),
                        productUrl: productUrl
                    };

                    await strapi.service('api::order.order').sendConfirmOrderEmail({
                        templateReferenceId: 15,
                        to: subscription.email,
                        emailVariables,
                        subject: `Το προϊόν ${product.name} είναι πλέον διαθέσιμο!`
                    });

                    // Ενημέρωση της εγγραφής
                    await strapi.entityService.update('api::notify-me.notify-me', subscription.id, {
                        data: {
                            status: 'notified',
                            notifiedAt: new Date()
                        }
                    });

                    notifiedCount++;

                    // Μικρή καθυστέρηση για να μην στείλουμε όλα τα emails ταυτόχρονα
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (emailError) {
                    strapi.log.error(`Error sending notification to ${subscription.email}:`, emailError);
                    // Συνεχίζουμε με τα επόμενα
                }
            }

            strapi.log.info(`Notified ${notifiedCount} users for product ${productId}`);

            return {
                success: true,
                notified: notifiedCount,
                total: subscriptions.length
            };

        } catch (error) {
            strapi.log.error('Error notifying users:', error);
            throw error;
        }
    },

    // Helper function για token generation
    generateUnsubscribeToken(id, email) {
        const data = `${id}:${email}:${Date.now()}`;
        return Buffer.from(data).toString('base64url'); // Χρήση base64url για URL safety
    },

    // Helper function για token decoding
    decodeUnsubscribeToken(token) {
        try {
            const decoded = Buffer.from(token, 'base64url').toString('utf8');
            const parts = decoded.split(':');

            if (parts.length < 2) {
                return null;
            }

            const id = parseInt(parts[0]);
            const email = parts[1];

            if (!id || !email) {
                return null;
            }

            return { id, email };
        } catch (error) {
            return null;
        }
    },

    // Επιπλέον: Function για να ελέγξει αν ένα email είναι subscribed
    async checkSubscription(email, productId) {
        try {
            const subscription = await strapi.entityService.findMany('api::notify-me.notify-me', {
                filters: {
                    email: email,
                    product: productId,
                    status: 'pending'
                }
            });

            return {
                isSubscribed: subscription.length > 0,
                subscription: subscription[0] || null
            };
        } catch (error) {
            strapi.log.error('Error checking subscription:', error);
            throw error;
        }
    }

}));
