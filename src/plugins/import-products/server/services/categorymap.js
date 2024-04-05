'use strict';

module.exports = ({ strapi }) => ({
    async updateCategoryMap(map) {
        try {
            await strapi.entityService.update('plugin::import-products.categorymap', map.id, {
                data: {
                    name: map.name,
                    value: map.value,
                    contains: map.contains.map(x => {
                        delete x.id
                        return x
                    })
                },
            });
        } catch (error) {
            console.log(error)
        }
    },

    async createCategoryMap(id, map) {
        try {
            const cat = await strapi.entityService.create('plugin::import-products.categorymap', {
                data: {
                    related_import: id,
                    name: map.name,
                    value: map.value,
                    contains: map.contains.map(x => {
                        delete x.id
                        return x
                    })
                },
            });
            return cat
        } catch (error) {
            console.log(error)
        }
    },

    async createSubCategoryMap(id, map) {
        try {
            const subcat = await strapi.entityService.create('plugin::import-products.categorymap', {
                data: {
                    parentcategory: id,
                    name: map.name,
                    value: map.value,
                    contains: map.contains.map(x => {
                        delete x.id
                        return x
                    })
                },
            });
            return subcat
        } catch (error) {
            console.log(error)
        }
    },
    
    async deleteOldCategoryMap({ categoryMapping, oldcategoryMapping }) {
        try {
            let newArrayId = []
            for (let cat of categoryMapping.categories_map) {
                for (let sub of cat.subcategory) {
                    for (let sub2 of sub.subcategory) {
                        newArrayId.push(sub2.id)
                    }
                    newArrayId.push(sub.id)
                }
                newArrayId.push(cat.id)
            }

            for (let old of oldcategoryMapping.categories_map) {
                if (!newArrayId.includes(old.id)) {
                    for (let oldsub of old.subcategory) {
                        for (let oldsub2 of oldsub.subcategory) {
                            await strapi.entityService.delete('plugin::import-products.categorymap', oldsub2.id)
                        }
                        await strapi.entityService.delete('plugin::import-products.categorymap', oldsub.id)
                    }
                    await strapi.entityService.delete('plugin::import-products.categorymap', old.id)
                }
                else {
                    for (let oldsub of old.subcategory) {
                        if (!newArrayId.includes(oldsub.id)) {
                            for (let oldsub2 of oldsub.subcategory) {
                                await strapi.entityService.delete('plugin::import-products.categorymap', oldsub2.id)
                            }
                            await strapi.entityService.delete('plugin::import-products.categorymap', oldsub.id)
                        }
                        else {
                            for (let oldsub2 of oldsub.subcategory) {
                                if (!newArrayId.includes(oldsub2.id)) {
                                    await strapi.entityService.delete('plugin::import-products.categorymap', oldsub2.id)
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
    },

    async saveMappingCategories({ id, categoryMapping, oldcategoryMapping }) {
        try {
            await this.deleteOldCategoryMap({ categoryMapping, oldcategoryMapping })

            for (let map of categoryMapping.categories_map) {
                const category = await strapi.entityService.findOne('plugin::import-products.categorymap', map.id,
                    {
                        fields: ['name', 'value'],
                    })
                if (category) {
                    this.updateCategoryMap(map)
                    for (let submap of map.subcategory) {
                        let subcategory = await strapi.entityService.findOne('plugin::import-products.categorymap', submap.id,
                            {
                                fields: ['name', 'value'],
                                sort: 'name:asc',
                            })
                        if (subcategory) {
                            this.updateCategoryMap(submap)
                            for (let submap2 of submap.subcategory) {
                                let subcategory2 = await strapi.entityService.findOne('plugin::import-products.categorymap', submap2.id,
                                    {
                                        fields: ['name', 'value'],
                                        sort: 'name:asc',
                                    })
                                if (subcategory2) {
                                    this.updateCategoryMap(submap2)
                                }
                                else {
                                    this.createSubCategoryMap(submap.id, submap2)
                                }
                            }
                        }
                        else {
                            const newsub = await this.createSubCategoryMap(map.id, submap)
                            for (let submap2 of submap.subcategory) {
                                this.createSubCategoryMap(newsub.id, submap2)
                            }
                        }
                    }
                }
                else {
                    const newCat = await this.createCategoryMap(id, map)
                    for (let submap of map.subcategory) {
                        const newSub = await this.createSubCategoryMap(newCat.id, submap)
                        for (let submap2 of submap.subcategory) {
                            this.createSubCategoryMap(newSub.id, submap2)
                        }
                    }
                }
            }

        } catch (error) {
            console.log(error);
        }
    },
});
