'use strict';

/**
 * Globalsat Service
 * Χρησιμοποιεί το GlobalsatAdapter
 */
module.exports = ({ strapi }) => ({
    async parseGlobalsat({ entry }) {
        try {
            // Get the adapter
            const adapter = strapi
                .plugin('import-products')
                .service('globalsatAdapter')(entry);

            // Run import
            return await adapter.import();

        } catch (err) {
            console.error('Error in parseGlobalsat:', err);
            return { message: "Error", error: err.message };
        }
    }
});