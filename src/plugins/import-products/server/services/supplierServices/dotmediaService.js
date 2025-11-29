'use strict';

/**
 * DotMedia Service
 * Χρησιμοποιεί το DotMediaAdapter
 */
module.exports = ({ strapi }) => ({
    async parseDotMediaXml({ entry }) {
        try {
            // Get the adapter
            const adapter = strapi
                .plugin('import-products')
                .service('dotmediaAdapter')(entry);

            // Run import
            return await adapter.import();

        } catch (err) {
            console.error('Error in parseDotMediaXml:', err);
            return { message: "Error", error: err.message };
        }
    }
});