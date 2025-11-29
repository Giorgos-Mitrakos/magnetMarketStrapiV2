'use strict';

/**
 * CPI Service
 * Χρησιμοποιεί το CpiAdapter
 */
module.exports = ({ strapi }) => ({
    async parseCpiXml({ entry }) {
        try {
            // Get the adapter
            const adapter = strapi
                .plugin('import-products')
                .service('cpiAdapter')(entry);

            // Run import
            return await adapter.import();

        } catch (err) {
            console.error('Error in parseCpiXml:', err);
            return { message: "Error", error: err.message };
        }
    }
});