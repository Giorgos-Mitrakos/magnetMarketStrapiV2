'use strict';

/**
 * CPI Service
 * Χρησιμοποιεί το CpiAdapter
 */
module.exports = ({ strapi }) => ({
    async parseStefinetXml({ entry }) {
        try {
            // Get the adapter
            const adapter = strapi
                .plugin('import-products')
                .service('stefinetAdapter')(entry);

            // Run import
            return await adapter.import();

        } catch (err) {
            console.error('Error in parseStefinetXml:', err);
            return { message: "Error", error: err.message };
        }
    }
});