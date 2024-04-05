'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('plugin::import-products.blacklistmap', ({ strapi }) => ({
    async updateBlacklistMap(map) {
        try {
            await strapi.entityService.update('plugin::import-products.blacklistmap', map.id, {
                data: {
                    name: map.name,
                },
            });
        } catch (error) {
            console.log(error)
        }
    },

    async createBlacklistCategory(id, map) {
        try {
            const cat = await strapi.entityService.create('plugin::import-products.blacklistmap', {
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

    async createBlacklistSubCategoryMap(id, map) {
        try {
            const subcat = await strapi.entityService.create('plugin::import-products.blacklistmap', {
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

    async deleteOldBlacklistMap({ categoryMapping, oldcategoryMapping }) {
        try {
            let newArrayId = []
            for (let cat of categoryMapping.blacklist_map) {
                for (let sub of cat.subcategory) {
                    for (let sub2 of sub.subcategory) {
                        newArrayId.push(sub2.id)
                    }
                    newArrayId.push(sub.id)
                }
                newArrayId.push(cat.id)
            }

            for (let old of oldcategoryMapping.blacklist_map) {
                if (!newArrayId.includes(old.id)) {
                    for (let oldsub of old.subcategory) {
                        for (let oldsub2 of oldsub.subcategory) {
                            await strapi.entityService.delete('plugin::import-products.blacklistmap', oldsub2.id)
                        }
                        await strapi.entityService.delete('plugin::import-products.blacklistmap', oldsub.id)
                    }
                    await strapi.entityService.delete('plugin::import-products.blacklistmap', old.id)
                }
                else {
                    for (let oldsub of old.subcategory) {
                        if (!newArrayId.includes(oldsub.id)) {
                            for (let oldsub2 of oldsub.subcategory) {
                                await strapi.entityService.delete('plugin::import-products.blacklistmap', oldsub2.id)
                            }
                            await strapi.entityService.delete('plugin::import-products.blacklistmap', oldsub.id)
                        }
                        else {
                            for (let oldsub2 of oldsub.subcategory) {
                                if (!newArrayId.includes(oldsub2.id))
                                    await strapi.entityService.delete('plugin::import-products.blacklistmap', oldsub2.id)
                            }
                        }

                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
    },

    async saveBlacklist({ id, categoryMapping, oldcategoryMapping }) {
        try {
            await this.deleteOldBlacklistMap({ categoryMapping, oldcategoryMapping })

            for (let map of categoryMapping.blacklist_map) {
                const category = await strapi.entityService.findOne('plugin::import-products.blacklistmap', map.id,
                    {
                        fields: ['name'],
                    })
                if (category) {
                    this.updateBlacklistMap(map)
                    for (let submap of map.subcategory) {

                        let subcategory = await strapi.entityService.findOne('plugin::import-products.blacklistmap', submap.id,
                            {
                                fields: ['name'],
                            })
                        if (subcategory) {
                            this.updateBlacklistMap(submap)
                            for (let submap2 of submap.subcategory) {
                                let subcategory2 = await strapi.entityService.findOne('plugin::import-products.blacklistmap', submap2.id,
                                    {
                                        fields: ['name'],
                                    })
                                if (subcategory2) {
                                    this.updateBlacklistMap(submap2)
                                }
                                else {
                                    this.createBlacklistSubCategoryMap(submap.id, submap2)
                                }
                            }
                        }
                        else {
                            const newsub = await this.createBlacklistSubCategoryMap(map.id, submap)
                            for (let submap2 of submap.subcategory) {
                                this.createBlacklistSubCategoryMap(newsub.id, submap2)
                            }
                        }
                    }
                }
                else {
                    const newCat = await this.createBlacklistCategory(id, map)
                    for (let submap of map.subcategory) {
                        const newSub = await this.createBlacklistSubCategoryMap(newCat.id, submap)
                        for (let submap2 of submap.subcategory) {
                            this.createBlacklistSubCategoryMap(newSub.id, submap2)
                        }
                    }
                }
            }

        } catch (error) {
            console.log(error);
        }
    },
}))
