'use strict';

module.exports = ({ strapi }) => ({
    async deleteOldStockValues({ id, categoryMapping, oldcategoryMapping }) {
        try {
            let newArrayId = []
            for (let stock of categoryMapping.stock_map) {
                newArrayId.push(stock.id)
            }
            for (let old of oldcategoryMapping.stock_map) {
                if (!newArrayId.includes(old.id)) {
                    await strapi.entityService.delete('plugin::import-products.stockmap', old.id)
                }
            }
        } catch (error) {
            console.log(error)
        }

    },

    async saveStockValues({ id, categoryMapping, oldcategoryMapping }) {
        try {
            await this.deleteOldStockValues({ categoryMapping, oldcategoryMapping })

            for (let map of categoryMapping.stock_map) {

                const stockValue = await strapi.entityService.findOne('plugin::import-products.stockmap', map.id,
                    {
                        fields: ['name_in_xml', 'translate_to', 'allow_import'],
                    })

                if (stockValue) {
                    await strapi.entityService.update('plugin::import-products.stockmap', map.id, {
                        data: {
                            name_in_xml: map.name_in_xml,
                            translate_to: map.translate_to,
                            allow_import: map.allow_import,
                        },
                    });
                }
                else {
                    await strapi.entityService.create('plugin::import-products.stockmap', {
                        data: {
                            name_in_xml: map.name_in_xml,
                            translate_to: map.translate_to,
                            allow_import: map.allow_import,
                            related_import: id,
                        },
                    });
                }

            }
        } catch (error) {
            console.log(error)
        }
    },
});
