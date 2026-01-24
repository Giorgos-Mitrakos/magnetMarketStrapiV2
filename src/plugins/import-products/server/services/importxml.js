'use strict';

module.exports = ({ strapi }) => ({
    async getFile() {
        try {
            return await strapi.entityService.findMany('plugin::import-products.importxml', {
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name_in_xml', 'translate_to', 'allow_import'],
                        sort: 'name_in_xml:asc',
                    },
                },
            })
        }
        catch (err) {
            console.log(err);
        }
    },

    async saveImportedURL({ id, url }) {
        try {
            return await strapi.entityService.update('plugin::import-products.importxml', id,
                {
                    data: {
                        importedURL: url,
                    },
                })
        }
        catch (err) {
            console.log(err);
        }
    },

    async fileImportSuccess({ id }) {
        try {
            return await strapi.entityService.update('plugin::import-products.importxml', id,
                {
                    data: {
                        lastRun: new Date(),
                    },
                })
        }
        catch (err) {
            console.log(err);
        }
    },

    async getMapping({ id }) {
        try {
            const entry = await strapi.entityService.findOne('plugin::import-products.importxml', id,
                {
                    fields: ['name', 'isWhitelistSelected', 'minimumPrice', 'maximumPrice', 'has_quantity', 'min_quantity'],
                    sort: 'name:asc',
                    populate: {
                        categories_map:
                        {
                            fields: ['name', 'value'],
                            sort: 'name:asc',
                            populate: {
                                contains: true,
                                subcategory: {
                                    fields: ['name', 'value'],
                                    sort: 'name:asc',
                                    populate: {
                                        contains: true,
                                        subcategory: {
                                            fields: ['name', 'value'],
                                            populate: {
                                                contains: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        char_name_map: {
                            fields: ['name', 'value'],
                            sort: 'name:asc',
                        },
                        char_value_map: {
                            fields: ['name', 'value'],
                            sort: 'name:asc',
                        },
                        stock_map: {
                            fields: ['name_in_xml', 'translate_to', 'allow_import'],
                            sort: 'name_in_xml:asc',
                        },
                        brand_excl_map: {
                            fields: ['brand_name'],
                            sort: 'brand_name:asc',
                        },
                        whitelist_map: {
                            fields: ['name'],
                            sort: 'name:asc',
                            populate: {
                                subcategory: {
                                    fields: ['name'],
                                    sort: 'name:asc',
                                    populate: {
                                        subcategory: {
                                            fields: ['name'],
                                            sort: 'name:asc',
                                        }
                                    }
                                }
                            }
                        },
                        blacklist_map: {
                            fields: ['name'],
                            sort: 'name:asc',
                            populate: {
                                subcategory: {
                                    fields: ['name'],
                                    sort: 'name:asc',
                                    populate: {
                                        subcategory: {
                                            fields: ['name'],
                                            sort: 'name:asc',
                                        }
                                    }
                                }
                            }
                        }
                    },
                })

            return entry
        }
        catch (err) {
            console.log(err);
        }
    },

    async saveMapping({ id, categoryMapping }) {
        let oldcategoryMapping = await this.getMapping({ id })
        await strapi.plugin('import-products')
            .service('categoryService')
            .saveMappingCategories({ id, categoryMapping, oldcategoryMapping })
        await strapi.plugin('import-products')
            .service('charnameService')
            .saveCharNames({ id, categoryMapping, oldcategoryMapping })
        await strapi.plugin('import-products')
            .service('charvalueService')
            .saveCharValues({ id, categoryMapping, oldcategoryMapping })
        await strapi.plugin('import-products')
            .service('stockmapService')
            .saveStockValues({ id, categoryMapping, oldcategoryMapping })
        await strapi.plugin('import-products')
            .service('whitelistService')
            .updateIsWhitelistSelected_minPrice_maxPrice({ id, categoryMapping })
        await strapi.plugin('import-products')
            .service('whitelistService')
            .saveWhitelist({ id, categoryMapping, oldcategoryMapping })
        await strapi.plugin('import-products')
            .service('blacklistService')
            .saveBlacklist({ id, categoryMapping, oldcategoryMapping })
        await strapi.plugin('import-products')
            .service('brandsToExclude')
            .saveBrandsToExclude({ id, categoryMapping, oldcategoryMapping })

        await strapi.entityService.update('plugin::import-products.importxml', id, {
            data: {
                has_quantity: categoryMapping.has_quantity,
                min_quantity: categoryMapping.min_quantity,
            },
        });
    },

    async getImportMapping(entry) {
        try {
            const categoryMap = await strapi.entityService.findOne('plugin::import-products.importxml', entry.id, {
                fields: ['isWhitelistSelected', 'minimumPrice', 'maximumPrice', 'has_quantity', 'min_quantity'],
                populate: {
                    char_name_map: {
                        fields: ['name', 'value'],
                    },
                    char_value_map: {
                        fields: ['name', 'value'],
                    },
                    categories_map: {
                        populate: {
                            contains: true,
                            subcategory: {
                                populate: {
                                    contains: true,
                                    subcategory: {
                                        populate: {
                                            contains: true,
                                        }
                                    }

                                }
                            }
                        },
                    },
                    stock_map: {
                        fields: ['name_in_xml', 'translate_to', 'allow_import'],
                    },
                    whitelist_map: {
                        fields: ['name'],
                        populate: {
                            subcategory: {
                                fields: ['name'],
                                populate: {
                                    subcategory: {
                                        fields: ['name'],
                                    }
                                }
                            }
                        }
                    },
                    blacklist_map: {
                        fields: ['name'],
                        populate: {
                            subcategory: {
                                fields: ['name'],
                                populate: {
                                    subcategory: {
                                        fields: ['name'],
                                    }
                                }
                            }
                        }
                    }
                },
            })

            return categoryMap
        } catch (error) {
            console.log(error)
        }
    },


});
