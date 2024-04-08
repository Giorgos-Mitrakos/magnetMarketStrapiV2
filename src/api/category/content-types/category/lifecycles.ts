

export default {
    async afterUpdate(event) {
        try {
            const taxRate = Number(process.env.GENERAL_TAX_RATE)
            let percentage = Number(process.env.GENERAL_CATEGORY_PERCENTAGE)
            let addToPrice = Number(process.env.GENERAL_SHIPPING_PRICE)

            const { result, params } = event;

            let percentages = {
                general: {
                    platformCategoryPercentage: percentage,
                    addToPrice: addToPrice,
                    brandPercentage: new Map()
                },
                skroutz: {
                    platformCategoryPercentage: percentage,
                    addToPrice: addToPrice,
                    brandPercentage: new Map()
                },
                shopflix: {
                    platformCategoryPercentage: percentage,
                    addToPrice: addToPrice,
                    brandPercentage: new Map()
                }
            }

            const generalCategoryPercentage = result.cat_percentage.find(x => x.name.toLowerCase().trim() === "general")
            const skroutzCategoryPercentage = result.cat_percentage.find(x => x.name.toLowerCase().trim() === "skroutz")
            const shopflixCategoryPercentage = result.cat_percentage.find(x => x.name.toLowerCase().trim() === "shopflix")

            if (generalCategoryPercentage) {
                if (generalCategoryPercentage.percentage) {
                    percentages.general.platformCategoryPercentage = generalCategoryPercentage.percentage
                }

                percentages.general.addToPrice = generalCategoryPercentage.add_to_price ? generalCategoryPercentage.add_to_price : 0

                if (generalCategoryPercentage.brand_perc && generalCategoryPercentage.brand_perc.length > 0) {
                    generalCategoryPercentage.brand_perc.forEach(x => {
                        percentages.general.brandPercentage.set(x.brand.name, x.percentage);
                    });
                }
            }

            if (skroutzCategoryPercentage) {
                if (skroutzCategoryPercentage.percentage) {
                    percentages.skroutz.platformCategoryPercentage = skroutzCategoryPercentage.percentage
                }
                else {
                    percentages.skroutz.platformCategoryPercentage = percentages.general.platformCategoryPercentage
                }

                percentages.skroutz.addToPrice = skroutzCategoryPercentage.add_to_price ? skroutzCategoryPercentage.add_to_price : 0

                if (skroutzCategoryPercentage.brand_perc && skroutzCategoryPercentage.brand_perc.length > 0) {
                    skroutzCategoryPercentage.brand_perc.forEach(x => {
                        percentages.skroutz.brandPercentage.set(x.brand.name, x.percentage);
                    });
                }
            }
            else {
                percentages.skroutz.platformCategoryPercentage = percentages.general.platformCategoryPercentage
                percentages.skroutz.addToPrice = percentages.general.addToPrice
            }

            if (shopflixCategoryPercentage) {
                if (shopflixCategoryPercentage.percentage) {
                    percentages.shopflix.platformCategoryPercentage = shopflixCategoryPercentage.percentage
                }
                else {
                    percentages.shopflix.platformCategoryPercentage = percentages.general.platformCategoryPercentage
                }

                percentages.shopflix.addToPrice = shopflixCategoryPercentage.add_to_price ? shopflixCategoryPercentage.add_to_price : 0

                if (shopflixCategoryPercentage.brand_perc && shopflixCategoryPercentage.brand_perc.length > 0) {
                    shopflixCategoryPercentage.brand_perc.forEach(x => {
                        percentages.shopflix.brandPercentage.set(x.brand.name, x.percentage);
                    });
                }
            }
            else {
                percentages.shopflix.platformCategoryPercentage = percentages.general.platformCategoryPercentage
                percentages.shopflix.addToPrice = percentages.general.addToPrice
            }

            const products = await strapi.entityService.findMany('api::product.product', {
                filters: {
                    $and: [
                        { category: result.id },
                        { publishedAt: { $notNull: true, } }
                    ],
                },
                populate: {
                    supplierInfo: true,
                    brand: true,
                    platforms: true,
                },
            });

            for (let product of products) {
                let brandPercentage: { general: number, skroutz: number, shopflix: number } = {
                    general: percentages.general.brandPercentage.get(product.brand?.name),
                    skroutz: percentages.skroutz.brandPercentage.get(product.brand?.name),
                    shopflix: percentages.shopflix.brandPercentage.get(product.brand?.name)
                }
                
                const filteredSupplierInfo = product.supplierInfo.filter(x => x.in_stock === true)

                let minSupplierPrice = filteredSupplierInfo?.reduce((prev, current) => {
                    return (prev.wholesale < current.wholesale) ? prev : current
                })

                const supplier = await strapi.db.query('plugin::import-products.importxml').findOne({
                    select: ['name', 'shipping'],
                    where: { name: minSupplierPrice.name },
                });

                let supplierShipping: number = supplier.shipping ? supplier.shipping : 0



                let generalPerc = brandPercentage.general ? brandPercentage.general : percentages.general.platformCategoryPercentage
                let skroutzPerc = brandPercentage.skroutz ? brandPercentage.skroutz :
                    (brandPercentage.general ? brandPercentage.general : percentages.skroutz.platformCategoryPercentage)
                let shopflixPerc = brandPercentage.shopflix ? brandPercentage.shopflix :
                    (brandPercentage.general ? brandPercentage.general : percentages.shopflix.platformCategoryPercentage)

                let minPrices = {
                    general: (minSupplierPrice.wholesale + minSupplierPrice.recycle_tax + percentages.general.addToPrice + supplierShipping) * (taxRate / 100 + 1) * (generalPerc / 100 + 1),
                    skroutz: (minSupplierPrice.wholesale + minSupplierPrice.recycle_tax + percentages.skroutz.addToPrice + supplierShipping) * (taxRate / 100 + 1) * (skroutzPerc / 100 + 1),
                    shopflix: (minSupplierPrice.wholesale + minSupplierPrice.recycle_tax + percentages.shopflix.addToPrice + supplierShipping) * (taxRate / 100 + 1) * (shopflixPerc / 100 + 1),
                }
                const data: any = {}

                if (product.price !== minPrices.general) {
                    if (!product.is_fixed_price) { data.price = minPrices.general }
                    else if (product.price < minPrices.general) {
                        if (!product.inventory || product.inventory === 0) {
                            data.price = minPrices.general
                            data.is_fixed_price = false
                        }
                    }
                }

                if (product.platforms) {
                    const skroutz = product.platforms.find(x => x.platform === "Skroutz")
                    const shopflix = product.platforms.find(x => x.platform === "Shopflix")

                    if (skroutz && shopflix) {
                        let isSkroutzPriceChanged = false
                        let isSkroutzPriceFixedChanges = false
                        let isShopflixPriceChanged = false
                        let isShopflixPriceFixedChanges = false

                        if (strapi
                            .plugin('import-products')
                            .service('priceHelpers')
                            .is_not_equal(skroutz.price, minPrices.skroutz)) {
                            if (!skroutz.is_fixed_price) { isSkroutzPriceChanged = true }
                            else if (skroutz.price < minPrices.skroutz) {
                                if (!product.inventory || product.inventory === 0) {
                                    isSkroutzPriceChanged = true
                                    isSkroutzPriceFixedChanges = true
                                }
                            }
                        }

                        if (strapi
                            .plugin('import-products')
                            .service('priceHelpers')
                            .is_not_equal(shopflix.price, minPrices.shopflix)) {
                            if (!shopflix.is_fixed_price) { isShopflixPriceChanged = true }
                            else if (skroutz.price < minPrices.skroutz) {
                                if (!product.inventory || product.inventory === 0) {
                                    isShopflixPriceChanged = true
                                    isShopflixPriceFixedChanges = true
                                }
                            }
                        }

                        if (isSkroutzPriceChanged || isShopflixPriceChanged) {
                            data.platforms = []
                            if (isSkroutzPriceChanged) {
                                if (isSkroutzPriceFixedChanges) {
                                    skroutz.price = minPrices.skroutz
                                    skroutz.is_fixed_price = false
                                    data.platforms.push(skroutz)
                                }
                                else {
                                    skroutz.price = minPrices.skroutz
                                    data.platforms.push(skroutz)
                                }
                            }
                            else {
                                data.platforms.push(skroutz)
                            }

                            if (isShopflixPriceChanged) {
                                if (isShopflixPriceFixedChanges) {
                                    shopflix.price = minPrices.shopflix
                                    shopflix.is_fixed_price = false
                                    data.platforms.push(shopflix)
                                }
                                else {
                                    shopflix.price = minPrices.shopflix
                                    data.platforms.push(shopflix)
                                }
                            }
                            else {
                                data.platforms.push(shopflix)
                            }

                        }
                    }
                    else if (!skroutz && !shopflix) {
                        data.platforms = [{
                            platform: "Skroutz",
                            price: minPrices.general,
                            is_fixed_price: false,
                        },
                        {
                            platform: "Shopflix",
                            price: minPrices.general,
                            is_fixed_price: false,
                        }]
                    }
                    else {
                        if (!skroutz) {
                            data.platforms = [{
                                platform: "Skroutz",
                                price: minPrices.general,
                                is_fixed_price: false,
                            }]
                            if (shopflix.price !== minPrices.shopflix) {
                                if (!shopflix.is_fixed_price) {
                                    shopflix.price = minPrices.shopflix
                                }
                                else if (shopflix.price < minPrices.shopflix) {
                                    if (!product.inventory || product.inventory === 0) {
                                        shopflix.price = minPrices.shopflix
                                        shopflix.is_fixed_price = false
                                    }
                                }
                                data.platforms = [shopflix]
                            }
                        }

                        if (!shopflix) {
                            if (skroutz.price !== minPrices.skroutz) {
                                if (!skroutz.is_fixed_price) {
                                    skroutz.price = minPrices.skroutz
                                }
                                else if (skroutz.price < minPrices.skroutz) {
                                    if (!product.inventory || product.inventory === 0) {
                                        skroutz.price = minPrices.skroutz
                                        skroutz.is_fixed_price = false
                                    }
                                }
                                data.platforms = [skroutz]
                            }
                            data.platforms.push({
                                platform: "Shopflix",
                                price: minPrices.general,
                                is_fixed_price: false,
                            })
                        }
                    }
                }
                else {
                    data.platforms = [{
                        platform: "Skroutz",
                        price: minPrices.general,
                        is_fixed_price: false,
                    },
                    {
                        platform: "Shopflix",
                        price: minPrices.general,
                        is_fixed_price: false,
                    }]
                }

                if (Object.keys(data).length !== 0) {
                    await strapi.entityService.update('api::product.product', product.id, {
                        data
                    });
                }

            }
        } catch (error) {
            console.log(error)
        }
    },
}