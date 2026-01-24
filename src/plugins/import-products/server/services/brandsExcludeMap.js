'use strict';

module.exports = ({ strapi }) => ({

    async deleteOldBrandsToExclude({ categoryMapping, oldcategoryMapping }) {
        try {
            let newArrayId = []
            for (let brand of categoryMapping.brand_excl_map) {
                newArrayId.push(brand.id)
            }
            for (let old of oldcategoryMapping.brand_excl_map) {
                if (!newArrayId.includes(old.id)) {
                    await strapi.entityService.delete('plugin::import-products.brandexclmap', old.id)
                }
            }
        } catch (error) {

        }

    },

    async saveBrandsToExclude({ id, categoryMapping, oldcategoryMapping }) {
        try {
            await this.deleteOldBrandsToExclude({ categoryMapping, oldcategoryMapping })

            for (let map of categoryMapping.brand_excl_map) {

                const brandName = await strapi.entityService.findOne('plugin::import-products.brandexclmap', map.id,
                    {
                        fields: ['brand_name'],
                        sort: 'brand_name:asc',
                    })

                if (brandName) {
                    await strapi.entityService.update('plugin::import-products.brandexclmap', map.id, {
                        data: {
                            brand_name: map.brand_name,
                        },
                    });
                }
                else {
                    await strapi.entityService.create('plugin::import-products.brandexclmap', {
                        data: {
                            brand_name: map.brand_name,
                            related_import: id,
                        },
                    });
                }

            }
        } catch (error) {

        }
    },
});