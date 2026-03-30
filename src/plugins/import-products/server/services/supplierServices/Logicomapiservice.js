'use strict';

/**
 * Logicom API Service
 */
module.exports = ({ strapi }) => ({
    async parseLogicomApi({ entry }) {
        try {
            const adapter = strapi
                .plugin('import-products')
                .service('logicomApiAdapter')(entry);

            return await adapter.import();

        } catch (err) {
            console.error('Error in parseLogicomApi:', err);
            return { message: 'Error', error: err.message };
        }
    }
});