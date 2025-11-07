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

        // Skip if product is unpublished
        if (params.data.publishedAt === null) {
            return;
        }

        // Check if price-related fields were updated
        const priceFieldsUpdated =
            params.data.supplierInfo ||
            params.data.price ||
            params.data.sale_price ||
            params.data.inventory; // Also trigger on inventory changes

        if (!priceFieldsUpdated) {
            return; // No relevant changes
        }

        try {
            // Queue analysis (non-blocking)
            setImmediate(async () => {
                try {
                    // Get the analyzer service
                    const analyzer = strapi.plugin('bargain-detector')?.service('analyzer');

                    if (!analyzer) {
                        strapi.log.error('[Lifecycle] Bargain detector analyzer service not found');
                        return;
                    }

                    strapi.log.debug(`[Lifecycle] Queuing auto-analysis for product ${result.id}`);

                    // Run analysis
                    await analyzer.analyzeAndStore(result.id, {
                        trigger: 'lifecycle',
                        reason: 'price_or_inventory_update',
                        source: 'product_update_hook'
                    });

                    strapi.log.info(`[Lifecycle] ✓ Auto-analyzed product ${result.id} after update`);

                } catch (error) {
                    // Log but don't throw - analysis failure shouldn't break product updates
                    strapi.log.error(
                        `[Lifecycle] Auto-analysis failed for product ${result.id}: ${error.message}`
                    );
                }
            });

        } catch (error) {
            strapi.log.error(`[Lifecycle] Failed to queue analysis: ${error.message}`);
        }
    },
};