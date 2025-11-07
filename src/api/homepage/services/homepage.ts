/**
 * homepage service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::homepage.homepage', ({ strapi }) => ({
    async find() {
        return strapi.entityService.findMany('api::homepage.homepage', {
            populate: {
                body: {
                    on: {
                        'homepage.banner-list-products': {
                            populate: {
                                products: {
                                    fields: ['name',
                                        'slug',
                                        'mpn',
                                        'barcode',
                                        'price',
                                        'sale_price',
                                        'is_sale',
                                        'is_hot',
                                        'inventory',
                                        'is_in_house',
                                        'weight',
                                        'status'],
                                    filters: { publishedAt: { $notNull: true } },
                                    populate: {
                                        category: {
                                            fields: ['name', 'slug'],
                                            populate: {
                                                parents: {
                                                    fields: ['name', 'slug'],
                                                    populate: {
                                                        parents: {
                                                            fields: ['name', 'slug']
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        brand: {
                                            fields: ['name', 'slug'],
                                            populate: {
                                                logo: {
                                                    fields: ['name', 'url', 'alternativeText', 'formats']
                                                }
                                            }
                                        },
                                        image: { fields: ['name', 'url', 'alternativeText', 'formats'] }
                                    }
                                }
                            }
                        },
                        'homepage.categories-banner': {
                            populate: {
                                categories: {
                                    fields: ['name', 'slug'],
                                    filters: { publishedAt: { $notNull: true } },
                                    populate: {
                                        image: {
                                            fields: ['name', 'alternativeText', 'url', 'width', 'height'],
                                        },
                                        parents: {
                                            fields: ['slug'],
                                            populate: {
                                                parents: {
                                                    fields: ['slug']
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        'homepage.single-banner': {
                            fields: ['href', 'target'],
                            populate: {
                                singleBanner: {
                                    fields: ['height', 'width', 'alternativeText', 'url']
                                }
                            }
                        },
                        'homepage.double-banner': {
                            fields: ['rightHref', 'rightTarget', 'leftHref', 'leftTarget'],
                            populate: {
                                rightBanner: {
                                    fields: ['height', 'width', 'alternativeText', 'url']
                                },
                                leftBanner: {
                                    fields: ['height', 'width', 'alternativeText', 'url']
                                }
                            }
                        },
                        'homepage.triple-banner': {
                            fields: ['rightTripleHref', 'rightTripleTarget', 'middleTripleHref', 'middleTripleTarget', 'leftTripleHref', 'leftTripleTarget'],
                            populate: {
                                rightTripleBanner: {
                                    fields: ['height', 'width', 'alternativeText', 'url']
                                },
                                middleTripleBanner: {
                                    fields: ['height', 'width', 'alternativeText', 'url']
                                },
                                leftTripleBanner: {
                                    fields: ['height', 'width', 'alternativeText', 'url']
                                },
                            }
                        },
                        'homepage.hot-or-sale': {
                            fields: ['title', 'type']
                        },
                        'homepage.brands-banner': {
                            populate: {
                                brands: {
                                    fields: ['name', 'slug'],
                                    filters: { publishedAt: { $notNull: true } },
                                    populate: {
                                        logo: {
                                            fields: ['name', 'alternativeText', 'url', 'formats'],
                                        }
                                    }
                                }
                            }
                        },
                        'global.site-features': {
                            fields: ['visible']
                        },
                        'global.carousel': {
                            fields:['layout'],
                            populate: {
                                Banner: {
                                    populate: {
                                        image: {
                                            fields: ['name', 'alternativeText', 'url', 'formats', 'width', 'height', 'caption'],
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }
}));
