'use strict';

/**
 * Zegetron Service
 * Χρησιμοποιεί το ZegetronAdapter
 */
module.exports = ({ strapi }) => ({
    async parseZegetronXml({ entry }) {
        try {
            // Get the adapter
            const adapter = strapi
                .plugin('import-products')
                .service('zegetronAdapter')(entry);

            // Run import
            return await adapter.import();

        } catch (err) {
            console.error('Error in parseZegetronXml:', err);
            return { message: "Error", error: err.message };
        }
    }
});