'use strict';

/**
 * Westnet Service
 * Χρησιμοποιεί το CpiWestnet
 */
module.exports = ({ strapi }) => ({
    async parseWestnetXml({ entry }) {
        try {
            // Get the adapter
            const adapter = strapi
                .plugin('import-products')
                .service('westnetAdapter')(entry);

            // Run import
            return await adapter.import();

        } catch (err) {
            console.error('Error in parseStefinetXml:', err);
            return { message: "Error", error: err.message };
        }
    }
});