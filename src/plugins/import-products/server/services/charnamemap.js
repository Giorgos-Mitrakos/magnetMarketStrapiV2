'use strict';

module.exports = ({ strapi }) => ({

    parseCharsToMap(charName, charValue) {
        try {
            const mapCharNames = new Map()
            const mapCharValues = new Map()
            for (let char of charName) {
                mapCharNames.set(char.name, char.value)
            }

            for (let char of charValue) {
                mapCharValues.set(char.name, char.value)
            }

            return { mapCharNames, mapCharValues }
        } catch (error) {
            console.log(error)
        }
    },

    // κάνω mapping ta χαρακτηριστικά 
    parseChars(chars, importRef) {
        const { mapCharNames, mapCharValues } = importRef.charMaps
        try {
            let newChars = chars.map(char => {
                char = JSON.parse(JSON.stringify(char))

                if (!char.name)
                    return

                if (mapCharNames.get(char.name) !== undefined) {
                    let name = mapCharNames.get(char.name)
                    char.name = name
                }
                if (char.value) {
                    if (mapCharValues.get(char.value) !== undefined) {
                        let value = mapCharValues.get(char.value)
                        char.value = value
                    }
                }
                return char
            })

            return newChars
        } catch (error) {
            console.log(error)
        }
    },

    async updatespecs({ id }) {
        try {
            const entries = await strapi.entityService.findOne('plugin::import-products.importxml', id, {
                fields: ['name'],
                populate: {
                    related_products: {
                        fields: ['name'],
                        populate: {
                            prod_chars: {
                                fields: ['name', 'value'],
                            }
                        }
                    }
                },
            });

            const categoryMap = await strapi.entityService.findOne('plugin::import-products.importxml', id, {
                populate: {
                    char_name_map: {
                        fields: ['name', 'value'],
                    },
                    char_value_map: {
                        fields: ['name', 'value'],
                    }
                },
            })

            const { char_name_map, char_value_map } = await categoryMap

            const charMaps = await this.parseCharsToMap(char_name_map, char_value_map)

            const { mapCharNames, mapCharValues } = charMaps

            for (let entry of entries.related_products) {
                if (entry.prod_chars && entry.prod_chars.length > 0) {
                    const parsedChars = this.parseChars(entry.prod_chars, mapCharNames, mapCharValues)

                    const updateProduct = await strapi.entityService.update('api::product.product', entry.id, {
                        data: {
                            prod_chars: parsedChars,
                        },
                    });
                }
            }

            return { "message": 'ok' }
        } catch (error) {
            console.log(error)
        }
    },

    async deleteOldCharNames({ categoryMapping, oldcategoryMapping }) {
        try {
            let newArrayId = []
            for (let char of categoryMapping.char_name_map) {
                newArrayId.push(char.id)
            }
            for (let old of oldcategoryMapping.char_name_map) {
                if (!newArrayId.includes(old.id)) {
                    await strapi.entityService.delete('plugin::import-products.charnamemap', old.id)
                }
            }
        } catch (error) {

        }

    },

    async saveCharNames({ id, categoryMapping, oldcategoryMapping }) {
        try {
            await this.deleteOldCharNames({ categoryMapping, oldcategoryMapping })

            for (let map of categoryMapping.char_name_map) {

                const charTitle = await strapi.entityService.findOne('plugin::import-products.charnamemap', map.id,
                    {
                        fields: ['name', 'value'],
                        sort: 'name:asc',
                    })

                if (charTitle) {
                    await strapi.entityService.update('plugin::import-products.charnamemap', map.id, {
                        data: {
                            name: map.name,
                            value: map.value,
                        },
                    });
                }
                else {
                    await strapi.entityService.create('plugin::import-products.charnamemap', {
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
