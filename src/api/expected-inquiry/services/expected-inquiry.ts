/**
 * expected-inquiry service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::expected-inquiry.expected-inquiry', ({ strapi }) => ({

    async createAskForDate(ctx) {
        try {
            const { name, productName, productId, email, phone, message } = ctx.request.body;

            // Δημιουργία στο Strapi
            const entry = await strapi.entityService.create('api::expected-inquiry.expected-inquiry', {
                data: {
                    name: name,
                    email: email,
                    product: { id: productId },
                    phone: phone,
                    message: message,
                    productName: productName,
                    status: 'pending',
                    publishedAt: new Date()
                }
            });

            await strapi.service('api::order.order').sendConfirmOrderEmail({
                templateReferenceId: 16,
                to: ['giorgos_mitrakos@yahoo.com', 'info@magnetmarket.gr', 'kkoulogiannis@gmail.com'],
                emailVariables: {
                    name: name,
                    productName: entry.productName,
                    email: entry.email,
                    productId: productId,
                    phone: phone,
                    message: message,
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
                    currentYear: new Date().getFullYear(),
                },
                subject: "Νέο ερώτημα για ημερομηνία παραλαβής"
            });

            await strapi.service('api::order.order').sendConfirmOrderEmail({
                templateReferenceId: 17,
                to: [entry.email],
                emailVariables: {
                    name: name,
                    productName: entry.productName,
                    email: entry.email,
                    productId: productId,
                    phone:phone,
                    message:message,
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
                    currentYear: new Date().getFullYear(),
                },
                subject: "Επιβεβαίωση Ερωτήματος"
            });

            return ({
                success: true,
                data: entry,
                message: 'Το ερώτημά σας υποβλήθηκε επιτυχώς'
            });

        } catch (error) {
            strapi.log.error('Error creating expected inquiry:', error);
            throw error
        }
    }
}));
