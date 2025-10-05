/**
 * footer controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::footer.footer', ({ strapi }) => ({

    async getFooter(ctx) {
        const footer = await strapi.entityService.findMany('api::footer.footer', {
            populate: {
                sections: {
                    populate: { links: true }
                }
            }
        })

        return footer
    }

}));
