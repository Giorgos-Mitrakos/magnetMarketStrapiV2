import { update } from "lodash";

export default {
    async beforeDelete(event) {
        const { where } = event.params;

        const entry = await strapi.entityService.findOne('api::product.product', where.id, {
            populate: { image: true, additionalImages: true, additionalFiles: true }
        });

        try {
            if (entry.image) {
                const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                    where: { id: entry.image.id },
                });
                // This will delete corresponding image files under the *upload* folder.
                strapi.plugins.upload.services.upload.remove(imageEntry);
            }

            if (entry.additionalImages) {
                for (let addImg of entry.additionalImages) {
                    const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                        where: { id: addImg.id },
                    });
                    // This will delete corresponding image files under the *upload* folder.
                    strapi.plugins.upload.services.upload.remove(imageEntry);
                }
            }

            if (entry.additionalFiles) {
                const fileEntry = await strapi.db.query('plugin::upload.file').delete({
                    where: { id: entry.additionalFiles.id },
                });
                // This will delete corresponding image files under the *upload* folder.
                strapi.plugins.upload.services.upload.remove(fileEntry);
            }

        } catch (error) {
            console.error(error)
        }
    },
    async beforeDeleteMany(event) {
        for (let id of event.params.where.$and[0].id.$in) {
            const entry = await strapi.entityService.findOne('api::product.product', id, {
                populate: { image: true, additionalImages: true, additionalFiles: true }
            });

            try {
                if (entry.image) {
                    const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                        where: { id: entry.image.id },
                    });
                    // This will delete corresponding image files under the *upload* folder.
                    strapi.plugins.upload.services.upload.remove(imageEntry);
                }

                if (entry.additionalImages) {
                    for (let addImg of entry.additionalImages) {
                        const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                            where: { id: addImg.id },
                        });
                        // This will delete corresponding image files under the *upload* folder.
                        strapi.plugins.upload.services.upload.remove(imageEntry);
                    }
                }

                if (entry.additionalFiles) {
                    const fileEntry = await strapi.db.query('plugin::upload.file').delete({
                        where: { id: entry.additionalFiles.id },
                    });
                    // This will delete corresponding image files under the *upload* folder.
                    strapi.plugins.upload.services.upload.remove(fileEntry);
                }
            } catch (error) {
                console.error(error)
            }

        }

    },
    async beforeUpdate(event) {
        const { data, where, select, populate } = event.params;

        const entry = await strapi.entityService.findOne('api::product.product', where.id, {
            // populate: { supplierInfo: true }
        });

        if (data.publishedAt) {
            data.need_verify = false
        }
        else if (entry.publishedAt) {
            data.need_verify = false
        }
    },

    async afterUpdate(event) {
        const { result, params } = event;

        // Check if price-related fields were updated
        const priceFieldsUpdated = params.data.supplierInfo ||
            params.data.price ||
            params.data.sale_price;

        if (params.data.publishedAt === null)
            return

        if (!priceFieldsUpdated) {
            return; // No price changes, skip analysis
        }


        try {
            // Queue analysis (don't block the update)
            setImmediate(async () => {
                try {
                    const analyzer = strapi.plugin('bargain-detector').service('analyzer');

                    await analyzer.analyzeAndStore(result.id, {
                        trigger: 'webhook',
                        reason: 'price_update'
                    });

                    strapi.log.debug(`[Bargain Detector] Auto-analyzed product ${result.id} after price update`);
                } catch (error) {
                    strapi.log.error(`[Bargain Detector] Auto-analysis failed for product ${result.id}: ${error.message}`);
                }
            });

        } catch (error) {
            // Don't block the update if analysis fails
            strapi.log.error(`[Bargain Detector] Failed to queue analysis: ${error.message}`);
        }
    }
};