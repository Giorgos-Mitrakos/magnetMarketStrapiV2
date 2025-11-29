'use strict';

/**
 * Oktabit Service
 * Χρησιμοποιεί το OktabitAdapter
 */
module.exports = ({ strapi }) => ({
    async parseOktabitXml({ entry }) {
        try {
            // Get the adapter
            const adapter = strapi
                .plugin('import-products')
                .service('oktabitAdapter')(entry);

            // Run import
            return await adapter.import();

        } catch (err) {
            console.error('Error in parseOktabitXml:', err);
            return { message: "Error", error: err.message };
        }
    }
});