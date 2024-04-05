'use strict';

module.exports = ({ strapi }) => ({
    async getCategories() {
        const categories = await strapi.entityService.findMany('api::category.category', {
            sort: { name: 'asc' },
            populate: {
                products: {
                    filters: {
                        publishedAt: {
                            $not: null,
                        },
                    },
                    count: true
                },
            }
        })
        return categories;
    },

    async getPlatforms() {
        const platforms = await strapi.entityService.findMany('api::platform.platform', {
            sort: { name: 'asc' },
            populate: {
                export_categories: {
                    populate: {
                        products: {
                            filters: {
                                publishedAt: {
                                    $not: null,
                                },
                            },
                            count: true
                        },
                    }
                }
            }
        })
        return platforms;
    },

    async saveExportCategories({ platformID, categoriesID }) {
        try {
            await strapi.entityService.update('api::platform.platform', platformID, {
                data: {
                    export_categories: categoriesID
                }
            })
            return { message: 'ok' };
        } catch (error) {
            console.log(error)
            return { message: 'Something went wrong' };
        }

    },
});
