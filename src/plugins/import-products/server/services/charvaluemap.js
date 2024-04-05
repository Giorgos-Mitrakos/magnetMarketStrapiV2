'use strict';

module.exports = ({ strapi }) => ({
    async deleteOldCharValues({ id, categoryMapping, oldcategoryMapping }) {
        try {
            let newArrayId = []
            for (let char of categoryMapping.char_value_map) {
                newArrayId.push(char.id)
            }
            for (let old of oldcategoryMapping.char_value_map) {
                if (!newArrayId.includes(old.id)) {
                    await strapi.entityService.delete('plugin::import-products.charvaluemap', old.id)
                }
            }
        } catch (error) {

        }

    },

    async saveCharValues({ id, categoryMapping, oldcategoryMapping }) {
        try {
            await this.deleteOldCharValues({ categoryMapping, oldcategoryMapping })

            for (let map of categoryMapping.char_value_map) {

                const charTitle = await strapi.entityService.findOne('plugin::import-products.charvaluemap', map.id,
                    {
                        fields: ['name', 'value'],
                    })

                if (charTitle) {
                    await strapi.entityService.update('plugin::import-products.charvaluemap', map.id, {
                        data: {
                            name: map.name,
                            value: map.value
                        },
                    });
                }
                else {
                    await strapi.entityService.create('plugin::import-products.charvaluemap', {
                        data: {
                            name: map.name,
                            value: map.value,
                            related_import: id,
                        },
                    });
                }

            }
        } catch (error) {

        }
    },
});
