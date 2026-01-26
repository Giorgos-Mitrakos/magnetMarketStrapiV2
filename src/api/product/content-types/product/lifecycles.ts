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
                strapi.plugins.upload.services.upload.remove(imageEntry);
            }

            if (entry.additionalImages) {
                for (let addImg of entry.additionalImages) {
                    const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                        where: { id: addImg.id },
                    });
                    strapi.plugins.upload.services.upload.remove(imageEntry);
                }
            }

            if (entry.additionalFiles) {
                const fileEntry = await strapi.db.query('plugin::upload.file').delete({
                    where: { id: entry.additionalFiles.id },
                });
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
                    strapi.plugins.upload.services.upload.remove(imageEntry);
                }

                if (entry.additionalImages) {
                    for (let addImg of entry.additionalImages) {
                        const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                            where: { id: addImg.id },
                        });
                        strapi.plugins.upload.services.upload.remove(imageEntry);
                    }
                }

                if (entry.additionalFiles) {
                    const fileEntry = await strapi.db.query('plugin::upload.file').delete({
                        where: { id: entry.additionalFiles.id },
                    });
                    strapi.plugins.upload.services.upload.remove(fileEntry);
                }
            } catch (error) {
                console.error(error)
            }
        }
    },

    async beforeUpdate(event) {
        const { data, where } = event.params;
        const entry = await strapi.entityService.findOne('api::product.product', where.id);
        // ════════════════════════════════════════════════════════════
        // ✅ ΥΠΑΡΧΟΥΣΑ ΛΟΓΙΚΗ: need_verify flag
        // ════════════════════════════════════════════════════════════
        if (data.publishedAt) {
            data.need_verify = false;
        } else if (entry.publishedAt) {
            data.need_verify = false;
        }
        
        // ════════════════════════════════════════════════════════════
        // 🆕 ΛΟΓΙΚΗ: CLEAR deletedAt & archived WHEN BACK
        // ════════════════════════════════════════════════════════════
        // Αν το προϊόν republish (deletedAt καθαρίζεται)
        // καθαρίζουμε και το is_archived
        //
        // ΣΗΜΕΙΩΣΗ: Το deletedAt καθαρίζεται στο XML sync όταν το προϊόν
        // επιστρέφει, οπότε εδώ απλά παρακολουθούμε για το is_archived flag

        if (entry.is_archived && entry.deletedAt === null) {
            data.is_archived = false;
            strapi.log.info(`[Lifecycle] Product ${entry.id} back in stock - cleared is_archived`);
        }
    },

    async afterUpdate(event) {
        const { result, params } = event;
        if (params.data.publishedAt === null) {
            return;
        }

        const priceFieldsUpdated =
            params.data.supplierInfo ||
            params.data.price ||
            params.data.sale_price ||
            params.data.inventory;

        if (priceFieldsUpdated) {
            try {
                setImmediate(async () => {
                    try {
                        const analyzer = strapi.plugin('bargain-detector')?.service('analyzer');

                        if (!analyzer) {
                            strapi.log.error('[Lifecycle] Bargain detector analyzer service not found');
                            return;
                        }

                        strapi.log.debug(`[Lifecycle] Queuing auto-analysis for product ${result.id}`);

                        await analyzer.analyzeAndStore(result.id, {
                            trigger: 'lifecycle',
                            reason: 'price_or_inventory_update',
                            source: 'product_update_hook'
                        });

                        strapi.log.info(`[Lifecycle] ✓ Auto-analyzed product ${result.id} after update`);

                    } catch (error) {
                        strapi.log.error(
                            `[Lifecycle] Auto-analysis failed for product ${result.id}: ${error.message}`
                        );
                    }
                });

            } catch (error) {
                strapi.log.error(`[Lifecycle] Failed to queue analysis: ${error.message}`);
            }
        }
    },
};