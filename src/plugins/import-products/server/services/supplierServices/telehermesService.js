'use strict';

/**
 * Telehermes Service
 * Χρησιμοποιεί το TelehermesAdapter
 */
module.exports = ({ strapi }) => ({
    async parseTelehermesXml({ entry }) {
        try {
            // Get the adapter
            const adapter = strapi
                .plugin('import-products')
                .service('telehermesAdapter')(entry);

            // Run import
            return await adapter.import();

        } catch (err) {
            console.error('Error in parseTelehermesXml:', err);
            return { message: "Error", error: err.message };
        }
    }
});