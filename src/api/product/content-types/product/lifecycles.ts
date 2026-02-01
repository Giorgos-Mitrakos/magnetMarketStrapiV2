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
        // Φέρνουμε το υπάρχον προϊόν από τη βάση
        const entry = await strapi.entityService.findOne('api::product.product', where.id, {
            populate: {
                supplierInfo: true,
                platforms: true
            }
        });
        
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

        // ════════════════════════════════════════════════════════════
        // 🆕 TRIGGER: Αν άλλαξε το supplierInfo ΚΑΙ το status είναι in stock
        // ════════════════════════════════════════════════════════════
        const supplierInfoChanged = params.data.supplierInfo !== undefined;

        if (supplierInfoChanged) {
            // Φέρνουμε το updated product για να ελέγξουμε το status
            const updatedProduct = await strapi.entityService.findOne(
                'api::product.product',
                result.id,
                { fields: ['status'] }
            );

            const allowedStatuses = ['InStock', 'MediumStock', 'LowStock'];
            const isInStock = allowedStatuses.includes(updatedProduct?.status);

            if (isInStock) {
                strapi.log.info(
                    `[Lifecycle] SupplierInfo updated for product ${result.id} with status: ${updatedProduct.status}`
                );

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
                                reason: 'supplier_info_update',
                                source: 'product_update_hook'
                            });

                            strapi.log.info(`[Lifecycle] ✓ Auto-analyzed product ${result.id} after supplier info update`);

                        } catch (error) {
                            strapi.log.error(
                                `[Lifecycle] Auto-analysis failed for product ${result.id}: ${error.message}`
                            );
                        }
                    });

                } catch (error) {
                    strapi.log.error(`[Lifecycle] Failed to queue analysis: ${error.message}`);
                }
            } else {
                strapi.log.debug(
                    `[Lifecycle] Skipping analysis for product ${result.id} - status is ${updatedProduct?.status}`
                );
            }
        }
    },
};