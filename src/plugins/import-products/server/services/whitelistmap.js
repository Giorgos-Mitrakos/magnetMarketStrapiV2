'use strict';

module.exports = ({ strapi }) => ({
    async updateWhitelistMap(map) {
        try {
            await strapi.entityService.update('plugin::import-products.whitelistmap', map.id, {
                data: {
                    name: map.name,
                },
            });
        } catch (error) {
            console.log(error)
        }
    },

    async createWhitelistCategory(id, map) {
        try {
            const cat = await strapi.entityService.create('plugin::import-products.whitelistmap', {
                data: {
                    related_import: id,
                    name: map.name,
                },
            });
            return cat
        } catch (error) {
            console.log(error)
        }
    },

    async createWhitelistSubCategoryMap(id, map) {
        try {
            const subcat = await strapi.entityService.create('plugin::import-products.whitelistmap', {
                data: {
                    parentcategory: id,
                    name: map.name,
                },
            });
            return subcat
        } catch (error) {
            console.log(error)
        }
    },

    async deleteOldWhitelistMap({ categoryMapping, oldcategoryMapping }) {
        try {
            let newArrayId = []
            for (let cat of categoryMapping.whitelist_map) {
                for (let sub of cat.subcategory) {
                    for (let sub2 of sub.subcategory) {
                        newArrayId.push(sub2.id)
                    }
                    newArrayId.push(sub.id)
                }
                newArrayId.push(cat.id)
            }
            for (let old of oldcategoryMapping.whitelist_map) {
                if (!newArrayId.includes(old.id)) {
                    for (let oldsub of old.subcategory) {
                        for (let oldsub2 of oldsub.subcategory) {
                            await strapi.entityService.delete('plugin::import-products.whitelistmap', oldsub2.id)
                        }
                        await strapi.entityService.delete('plugin::import-products.whitelistmap', oldsub.id)
                    }
                    await strapi.entityService.delete('plugin::import-products.whitelistmap', old.id)
                }
                else {
                    for (let oldsub of old.subcategory) {
                        if (!newArrayId.includes(oldsub.id)) {
                            for (let oldsub2 of oldsub.subcategory) {
                                await strapi.entityService.delete('plugin::import-products.whitelistmap', oldsub2.id)
                            }
                            await strapi.entityService.delete('plugin::import-products.whitelistmap', oldsub.id)
                        }
                        else {
                            for (let oldsub2 of oldsub.subcategory) {
                                if (!newArrayId.includes(oldsub2.id))
                                    await strapi.entityService.delete('plugin::import-products.whitelistmap', oldsub2.id)
                            }
                        }

                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
    },

    async saveWhitelist({ id, categoryMapping, oldcategoryMapping }) {
        try {
            await this.deleteOldWhitelistMap({ categoryMapping, oldcategoryMapping })

            for (let map of categoryMapping.whitelist_map) {
                const category = await strapi.entityService.findOne('plugin::import-products.whitelistmap', map.id,
                    {
                        fields: ['name'],
                    })
                if (category) {
                    this.updateWhitelistMap(map)
                    for (let submap of map.subcategory) {
                        let subcategory = await strapi.entityService.findOne('plugin::import-products.whitelistmap', submap.id,
                            {
                                fields: ['name'],
                            })
                        if (subcategory) {
                            this.updateWhitelistMap(submap)
                            for (let submap2 of submap.subcategory) {
                                let subcategory2 = await strapi.entityService.findOne('plugin::import-products.whitelistmap', submap2.id,
                                    {
                                        fields: ['name'],
                                    })
                                if (subcategory2) {
                                    this.updateWhitelistMap(submap2)
                                }
                                else {
                                    this.createWhitelistSubCategoryMap(submap.id, submap2)
                                }
                            }
                        }
                        else {
                            const newsub = await this.createWhitelistSubCategoryMap(map.id, submap)
                            for (let submap2 of submap.subcategory) {
                                this.createWhitelistSubCategoryMap(newsub.id, submap2)
                            }
                        }
                    }
                }
                else {
                    const newCat = await this.createWhitelistCategory(id, map)
                    for (let submap of map.subcategory) {
                        const newSub = await this.createWhitelistSubCategoryMap(newCat.id, submap)
                        for (let submap2 of submap.subcategory) {
                            this.createWhitelistSubCategoryMap(newSub.id, submap2)
                        }
                    }
                }
            }

        } catch (error) {
            console.log(error);
        }
    },

    async updateIsWhitelistSelected_minPrice_maxPrice({ id, categoryMapping }) {
        try {
            await strapi.entityService.update('plugin::import-products.importxml', id, {
                data: {
                    isWhitelistSelected: categoryMapping.isWhitelistSelected,
                    minimumPrice: categoryMapping.minimumPrice,
                    maximumPrice: categoryMapping.maximumPrice,
                },
            })
        } catch (error) {

        }
    },
});

