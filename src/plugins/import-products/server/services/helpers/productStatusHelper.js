// helpers/productStatusHelper.js
// Helper functions για υπολογισμό product status

'use strict';

module.exports = {
    /**
     * Υπολογίζει το status βάσει inventory (δικό μας απόθεμα)
     * @param {number} inventory - Το δικό μας απόθεμα
     * @returns {string} - InStock, MediumStock, LowStock, OutOfStock
     */
    calculateStatusFromInventory(inventory) {
        if (!inventory || inventory === 0) {
            return 'OutOfStock';
        }

        if (inventory > 10) {
            return 'InStock';
        } else if (inventory > 3) {
            return 'MediumStock';
        } else {
            return 'LowStock';
        }
    },

    /**
     * Υπολογίζει το status βάσει quantity number (από supplier)
     * @param {number} quantity - Το απόθεμα του supplier
     * @returns {string} - InStock, MediumStock, LowStock
     */
    calculateStatusFromQuantity(quantity) {
        if (quantity > 10) {
            return 'InStock';
        } else if (quantity > 3) {
            return 'MediumStock';
        } else if (quantity > 0) {
            return 'LowStock';
        }
        return 'OutOfStock';
    },

    /**
     * Υπολογίζει το ΤΕΛΙΚΟ status προϊόντος
     * Συνδυάζει το δικό μας inventory με τη διαθεσιμότητα των suppliers
     * 
     * @param {number} inventory - Το δικό μας απόθεμα
     * @param {Array} supplierInfo - Array με supplier data
     * @returns {string} - InStock, MediumStock, LowStock, Backorder, OutOfStock, Discontinued
     */
    calculateProductStatus(inventory, supplierInfo, product, brandExclList = []) {
        try {
            // ✅ ΠΡΟΤΕΡΑΙΟΤΗΤΑ 1: Αν το προϊόν είναι Discontinued, μένει Discontinued
            if (product.status === "Discontinued") {
                return "Discontinued";
            }

            let finalStatus = 'OutOfStock';

            // 1. Υπολογισμός αρχικού status βάσει αποθέματος
            if (inventory > 0) {
                finalStatus = this.calculateStatusFromInventory(inventory);
            } else if (supplierInfo && supplierInfo.length > 0) {

                // ✅ ΛΟΓΙΚΗ Β: Προτεραιότητα σε in_stock, αλλά fallback σε non-in_stock

                // Πρώτη φάση: Ψάχνουμε τους in_stock suppliers
                let bestInStockStatus = 'OutOfStock';
                let foundInStock = false;

                for (const supplier of supplierInfo) {
                    if (!supplier.in_stock) continue; // Προς το παρόν αγνοούμε τους non-in_stock

                    foundInStock = true;
                    let currentSupplierStatus = 'InStock';

                    if (supplier.translated_status) {
                        currentSupplierStatus = supplier.translated_status;
                    } else if (supplier.quantity && typeof supplier.quantity === 'number') {
                        currentSupplierStatus = this.calculateStatusFromQuantity(supplier.quantity);
                    }

                    if (this.compareStatus(currentSupplierStatus, bestInStockStatus) > 0) {
                        bestInStockStatus = currentSupplierStatus;
                    }
                }

                // Δεύτερη φάση: Αν ΔΕΝ βρήκαμε in_stock suppliers, 
                // κοιτάμε τους non-in_stock για fallback status
                if (!foundInStock) {
                    let bestNonInStockStatus = 'OutOfStock';

                    for (const supplier of supplierInfo) {
                        // Τώρα ελέγχουμε μόνο τους non-in_stock
                        if (supplier.in_stock) continue;

                        let currentSupplierStatus = 'OutOfStock';

                        if (supplier.translated_status) {
                            currentSupplierStatus = supplier.translated_status;
                        } else if (supplier.quantity && typeof supplier.quantity === 'number') {
                            currentSupplierStatus = this.calculateStatusFromQuantity(supplier.quantity);
                        }

                        if (this.compareStatus(currentSupplierStatus, bestNonInStockStatus) > 0) {
                            bestNonInStockStatus = currentSupplierStatus;
                        }
                    }

                    finalStatus = bestNonInStockStatus;
                } else {
                    finalStatus = bestInStockStatus;
                }
            }

            // 2. Έλεγχος αν το brand είναι Blacklisted
            const brandFilter = brandExclList.map(b => b.brand_name.toLowerCase().trim());
            let isBlacklisted = false;

            // ✅ Προτεραιότητα στο brandName field (string)
            if (product.brandName && typeof product.brandName === 'string') {
                isBlacklisted = brandFilter.includes(product.brandName.toLowerCase().trim());
            }
            // ✅ Fallback: έλεγχος στο product.brand αν είναι string
            else if (product.brand) {
                if (typeof product.brand === 'string') {
                    isBlacklisted = brandFilter.includes(product.brand.toLowerCase().trim());
                }
                // Αν το brand είναι object με name property
                else if (typeof product.brand === 'object' && product.brand.name) {
                    isBlacklisted = brandFilter.includes(product.brand.name.toLowerCase().trim());
                }
            }
            // ✅ Τελευταία επιλογή: έλεγχος στο όνομα του προϊόντος (με word boundaries)
            else if (product.name) {
                isBlacklisted = brandFilter.some(brand => {
                    const regex = new RegExp(`\\b${brand}\\b`, 'i');
                    return regex.test(product.name);
                });
            }

            // 3. Τελική μετατροπή σε AskForPrice αν χρειάζεται
            if (isBlacklisted && finalStatus !== 'OutOfStock' && finalStatus !== 'Discontinued') {
                return 'AskForPrice';
            }

            return finalStatus;

        } catch (error) {
            console.error('Error in calculateProductStatus:', error);
            return 'OutOfStock'; // Safe fallback
        }
    },

    /**
     * Συγκρίνει δύο status και επιστρέφει ποιο είναι "καλύτερο"
     * @param {string} status1 
     * @param {string} status2 
     * @returns {number} - 1 αν status1 > status2, -1 αν status1 < status2, 0 αν ίσα
     */
    compareStatus(status1, status2) {
        const hierarchy = {
            'InStock': 7,
            'MediumStock': 6,
            'LowStock': 5,
            'Backorder': 4,
            'IsExpected': 3,
            'AskForPrice': 2,
            'OutOfStock': 1,
            'Discontinued': 0
        };

        // Ασφάλεια: αν ένα status δεν υπάρχει στην ιεραρχία, θεωρούμε βάρος 0
        const score1 = hierarchy[status1] || 0;
        const score2 = hierarchy[status2] || 0;

        return score1 - score2;
    },

    /**
     * Ελέγχει αν ένα προϊόν πρέπει να γίνει Discontinued
     * @param {Date|null} deletedAt - Η ημερομηνία που εξαφανίστηκε από XML
     * @param {number} daysThreshold - Ημέρες μετά τις οποίες γίνεται discontinued (default: 90)
     * @returns {boolean}
     */
    shouldBeDiscontinued(deletedAt, daysThreshold = 90) {
        if (!deletedAt) {
            return false;
        }

        const daysSinceDeleted = Math.floor(
            (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        return daysSinceDeleted > daysThreshold;
    },

    /**
     * Ελέγχει αν ένα προϊόν πρέπει να γίνει archived
     * @param {Date|null} deletedAt - Η ημερομηνία που εξαφανίστηκε από XML
     * @param {number} daysThreshold - Ημέρες μετά τις οποίες γίνεται archived (default: 30)
     * @returns {boolean}
     */
    shouldBeArchived(deletedAt, daysThreshold = 30) {
        if (!deletedAt) {
            return false;
        }

        const daysSinceDeleted = Math.floor(
            (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        return daysSinceDeleted > daysThreshold;
    },

    /**
     * Utility: Ημέρες που έχει περάσει από deletedAt
     * @param {Date|null} deletedAt
     * @returns {number|null}
     */
    getDaysSinceDeleted(deletedAt) {
        if (!deletedAt) {
            return null;
        }

        return Math.floor(
            (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
    },

    /**
 * Ενημερώνει τα status των προϊόντων που έχουν deletedAt
 * - 30+ ημέρες → is_archived = true
 * - 90+ ημέρες → status = Discontinued
 */

    async updateProductStatuses() {
        const ARCHIVE_AFTER_DAYS = 90;
        const DISCONTINUED_AFTER_DAYS = 180;

        try {
            strapi.log.info('[Cron] Starting product status update job...');

            // Βρες όλα τα προϊόντα με deletedAt !== null
            const products = await strapi.db.query('api::product.product').findMany({
                where: {
                    deletedAt: {
                        $notNull: true
                    }
                },
                populate: ['supplierInfo'],
                limit: 1000
            });

            if (products.length === 0) {
                strapi.log.info('[Cron] No products with deletedAt found');
                return;
            }

            strapi.log.info(`[Cron] Found ${products.length} products with deletedAt`);

            let archivedCount = 0;
            let discontinuedCount = 0;
            let errorCount = 0;

            for (const product of products) {
                try {
                    const daysSinceDeleted = this.getDaysSinceDeleted(product.deletedAt);
                    const data = {};

                    // Έλεγχος για Discontinued (90+ ημέρες)
                    if (daysSinceDeleted >= DISCONTINUED_AFTER_DAYS && product.status !== 'Discontinued') {
                        data.status = 'Discontinued';
                        discontinuedCount++;

                        strapi.log.info(`[Cron] Product ${product.id} marked as Discontinued (${daysSinceDeleted} days)`);
                    }
                    // Έλεγχος για Archive (30+ ημέρες)
                    else if (daysSinceDeleted >= ARCHIVE_AFTER_DAYS && !product.is_archived) {
                        data.is_archived = true;
                        archivedCount++;
                        strapi.log.info(`[Cron] Product ${product.id} marked as Archived (${daysSinceDeleted} days)`);
                    }

                    // Ενημέρωση αν χρειάζεται
                    if (Object.keys(data).length > 0) {
                        await strapi.entityService.update('api::product.product', product.id, {
                            data
                        });
                    }

                } catch (error) {
                    errorCount++;
                    strapi.log.error(`[Cron] Failed to update product ${product.id}: ${error.message}`);
                }
            }

            strapi.log.info(
                `[Cron] Status update complete: ${archivedCount} archived, ${discontinuedCount} discontinued, ${errorCount} errors`
            );

        } catch (error) {
            strapi.log.error(`[Cron] Status update job failed: ${error.message}`);
        }
    }
};