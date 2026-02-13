/**
 * ask-for-price controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::ask-for-price.ask-for-price',
    ({ strapi }) => ({
        async create(ctx) {
            try {


                const askForPriceService = strapi.service('api::ask-for-price.ask-for-price');
                const result = await askForPriceService.createAskForPrice(ctx);

                return ctx.created({
                    success: true,
                    data: result,
                    message: 'Η αίτηση σας υποβλήθηκε επιτυχώς. Θα επικοινωνήσουμε μαζί σας σύντομα.'
                });
            } catch (error) {
                return ctx.internalServerError('Σφάλμα κατά την υποβολή της αίτησης');
            }
        }
    })
);
