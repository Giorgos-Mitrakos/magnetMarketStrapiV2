import { filter } from "lodash";

/**
 * brand controller
 */
const { createCoreController } = require('@strapi/strapi').factories;
const { sanitizeOutput } = require('@strapi/utils');

// Εναλλακτικά, μπορείτε να κάνετε manual sanitization:
const sanitizeEntity = (entity) => {
    // Αφαιρούμε sensitive πεδία αν υπάρχουν
    const { createdAt, updatedAt, publishedAt, ...rest } = entity;

    return {
        id: entity.id,
        ...rest,
        // Μπορείτε να προσθέσετε custom logic εδώ
    };
};

module.exports = createCoreController('api::brand.brand', ({ strapi }) => ({

    // Custom method για όλα τα brands χωρίς pagination
    async findAll(ctx) {
        try {
            const entities = await strapi.entityService.findMany('api::brand.brand', {
                filters: { logo: { $notNull: true, } },
                populate: { logo: true }, // Populate all relations
                // Μπορείτε να προσθέσετε filters, sort κλπ
                sort: { name: 'asc' },
                publicationState: 'live', // Μόνο published content
            });

            // Manual sanitization
            const sanitizedEntities = entities.map(sanitizeEntity);

            return {
                data: sanitizedEntities,
                meta: {
                    total: entities.length
                }
            };
        } catch (error) {
            ctx.throw(500, 'Error fetching all brands');
        }
    },

    async getBrandProducts(ctx) {
        ctx.body = await strapi.service('api::brand.brand').getBrandProducts(ctx);
        return {
            okay: true,
            type: "POST",
        };
    }
}))
