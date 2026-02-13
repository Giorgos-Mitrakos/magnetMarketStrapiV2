/**
 * ask-for-price service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::ask-for-price.ask-for-price', ({ strapi }) => ({

    async createAskForPrice(ctx) {
        try {
            const { name, email, phone, productName, productId, message } = ctx.request.body

            // Validation
            if (!name || !email || !phone || !productName) {
                return ctx.badRequest('Missing required fields');
            }

            // Βρες το προϊόν για να πάρεις επιπλέον πληροφορίες
            let productPrice = null;
            if (productId) {
                const product = await strapi.entityService.findOne(
                    'api::product.product',
                    productId,
                    { fields: ['price'] }
                );
                if (product) {
                    productPrice = product.price;
                }
            }

            // Δημιούργησε το αίτημα
            const entry = await strapi.entityService.create('api::ask-for-price.ask-for-price', {
                data: {
                    name,
                    email,
                    phone,
                    productName,
                    product: { id: productId },
                    message,
                    productPrice,
                    status: 'pending',
                    publishedAt: new Date()
                }
            });

            const emailVariables = {
                productName: entry.productName,
                productId:productId,
                name: entry.name,
                email: entry.email,
                phone: entry.phone,
                message: entry.message,
                date: new Date(entry.createdAt).toLocaleString('el-GR', {
                    timeZone: 'UTC',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }),
            };

            await strapi.service('api::order.order').sendConfirmOrderEmail({
                templateReferenceId: 11,
                to: ['giorgos_mitrakos@yahoo.com', 'info@magnetmarket.gr', 'kkoulogiannis@gmail.com'],
                emailVariables,
                subject: "Νέα Αίτηση Προσφοράς"
            });

            await strapi.service('api::order.order').sendConfirmOrderEmail({
                templateReferenceId: 12,
                to: [entry.email],
                emailVariables: {
                    productName: entry.productName,
                    productId:productId,
                    requestId: entry.id,
                    name: entry.name,
                    email: entry.email,
                    phone: entry.phone,
                    message: entry.message,
                    submissionDate: new Date(entry.createdAt).toLocaleString('el-GR', {
                        timeZone: 'UTC',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    }),
                    currentYear: new Date().getFullYear()
                },
                subject: "Επιβεβαίωση Αίτησης Προσφοράς"
            });

            return entry;
        } catch (error) {
            strapi.log.error('Error creating ask for price:', error);
            throw error;
        }
    }

}));
