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
            fields: ['id', 'name', 'order_time', 'only_in_house_inventory'],
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
                },
                export_statuses: true
            }
        })
        return platforms;
    },

    async saveExportCategories(ctx) {
        const { platformID, categoriesID, only_in_house_inventory, export_statuses } = ctx.request.body;
        try {
            await strapi.entityService.update('api::platform.platform', platformID, {
                data: {
                    export_categories: categoriesID,
                    only_in_house_inventory: only_in_house_inventory,
                    export_statuses: export_statuses
                }
            })
            return { message: 'ok' };
        } catch (error) {
            console.log(error)
            return { message: 'Something went wrong' };
        }

    },
});
