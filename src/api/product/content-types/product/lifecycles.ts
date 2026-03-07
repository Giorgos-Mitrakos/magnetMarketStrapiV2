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
        event.state = event.state || {};
        // Φέρνουμε το υπάρχον προϊόν από τη βάση
        const entry = await strapi.entityService.findOne('api::product.product', where.id, {
            populate: {
                supplierInfo: true,
                platforms: true,
                notify_me: true
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

        if (!entry) {
            strapi.log.warn(`Product ${where.id} not found in beforeUpdate`);
            return;
        }

        // Αποθήκευσε τα παλιά δεδομένα στο event.state
        event.state = event.state || {};
        event.state.oldProductData = entry;
    },

    async afterUpdate(event) {
        const { result, params, state } = event;

        // ✅ Cache invalidation - τρέχει πάντα, ανεξάρτητα από τις υπόλοιπες συνθήκες
        try {
            const cacheService = strapi
                .plugin('import-products')
                .service('cacheService');

            // ✅ Αν αλλάζει από import, το cache ενημερώνεται ήδη εσωτερικά
            if (cacheService.cache.processingProducts.has(result.id)) return;

            // ✅ Χειροκίνητη αλλαγή από admin - ενημέρωσε το cache
            await cacheService.invalidateProduct(result.id);
        } catch (error) {
            // Αν το cache δεν είναι initialized (δεν τρέχει import) - δεν πειράζει
            strapi.log.debug(`Cache invalidation skipped for product ${result.id}: ${error.message}`);
        }

        if (params.data.publishedAt === null) {
            return;
        }

        // ════════════════════════════════════════════════════════════
        // 🆕 TRIGGER: Αν άλλαξε το supplierInfo ΚΑΙ το status είναι in stock
        // ════════════════════════════════════════════════════════════
        // 1. 🔄 TRIGGER: Αν άλλαξε το supplierInfo ΚΑΙ το status είναι in stock (για bargain detector)
        const supplierInfoChanged = params.data.supplierInfo !== undefined;

        // 2. 📧 NOTIFICATION: Αν το προϊόν έγινε διαθέσιμο (για πελάτες - notify_me)
        const productService = strapi.service('api::product.product');
        const oldData = state?.oldProductData;
        const productBecameAvailable = oldData && productService.checkProductAvailabilityChange(oldData, result);

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

        // 🅱️ ΛΕΙΤΟΥΡΓΙΑ 2: ΕΙΔΟΠΟΙΗΣΗ ΠΕΛΑΤΩΝ (notify_me)
        if (productBecameAvailable) {
            strapi.log.info(`[Lifecycle] Product ${result.id} became available for customers, triggering notify_me...`);

            // Προσθήκη καθυστέρησης για να εξασφαλιστεί η αποθήκευση
            setTimeout(async () => {
                try {
                    const notifyService = strapi.service('api::notify-me.notify-me');

                    if (!notifyService) {
                        strapi.log.error('[Lifecycle] Notify-me service not found');
                        return;
                    }

                    if (typeof notifyService.notifyProductAvailable !== 'function') {
                        strapi.log.error('[Lifecycle] notifyProductAvailable method not found');
                        return;
                    }

                    const notificationResult = await notifyService.notifyProductAvailable(result.id);

                    if (notificationResult?.success !== false) {
                        strapi.log.info(`[Lifecycle] ✓ Notified ${notificationResult?.notified || 0} customers for product ${result.id}`);

                    }

                } catch (error) {
                    strapi.log.error(`[Lifecycle] Failed to notify customers for product ${result.id}:`, error);
                }
            }, 3000);
        }

    },


};