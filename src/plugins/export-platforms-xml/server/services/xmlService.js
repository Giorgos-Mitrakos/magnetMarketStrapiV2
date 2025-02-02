'use strict';

const xml2js = require('xml2js');
const slugify = require("slugify");
const fs = require('fs');
const Axios = require('axios');

module.exports = ({ strapi }) => ({
    async createXml(platform) {
        try {
            const suppliers = await strapi.db.query('plugin::import-products.importxml').findMany({
                select: ['name', 'availability', 'order_time', 'shipping'],
            });

            const entries = await strapi.db.query('api::platform.platform').findOne({
                select: ['name', 'order_time'],
                where: {
                    name: platform
                },
                populate: {
                    export_categories: {
                        populate: {
                            cat_percentage: {
                                populate: {
                                    brand_perc:
                                    {
                                        populate: {
                                            brand: true
                                        }
                                    }
                                }
                            },
                            products: {
                                where: {
                                    publishedAt: { $notNull: true },
                                },
                                populate: {
                                    image: true,
                                    additionalImages: true,
                                    brand: true,
                                    supplierInfo: true,
                                    platforms: true,
                                },
                            }
                        }
                    }
                },
            });

            this.checkIfThereIsSupplierInStock(entries)


            const platformAttr = {
                name: entries.name,
                order_time: entries.order_time
            }

            switch (platform.toLowerCase()) {
                case "skroutz":
                    await this.createSkroutzXML(entries, suppliers, platformAttr)
                    break;
                case "shopflix":
                    await this.createShopflixXML(entries, suppliers, platformAttr)
                    break;
                case "bestprice":
                    await this.createBestpriceXML(entries, suppliers, platformAttr)
                    break;

                default:
                    break;
            }
        } catch (error) {
            console.log(error)
        }
    },

    async createBestpriceXML(entries, suppliers, platform) {
        try {
            let finalEntries = []
            for (let category of entries.export_categories) {
                let categoryPath = await this.createCategoryPath(category)
                for (let product of category.products) {
                    if (product.mpn === "BHR4215GL")
                        continue

                    let { cheaperAvailableSupplier, availability, price } = this.createAvailabilityAndPrice(product, suppliers, platform, category)

                    if (!price) { continue }
                    let newEntry = {
                        productId: product.id,
                        title: product.name,
                        productURL: `https://magnetmarket.gr/product/${slugify(`${product.name.replaceAll("/", "-").replaceAll("|", "")}`, { lower: true, remove: /[^A-Za-z0-9-_.~-\s]*$/g })}`,
                        imageURL: product.image ? `https://api.magnetmarket.eu/${product.image.url}` : "",
                        category_path: categoryPath,
                        price: parseFloat(price).toFixed(2),
                        weight: product.weight,
                        availability,
                        brand: product.brand ? product.brand?.name : "",
                        mpn: product.mpn,
                        sku: product.sku,
                        stock: product.inventory > 0 ? product.inventory
                            : (cheaperAvailableSupplier && cheaperAvailableSupplier.name.toLowerCase() === "globalsat" ? 1 : 2),
                        Barcode: product.barcode,
                    }

                    finalEntries.push({ product: newEntry })
                }
            }

            var builder = new xml2js.Builder();
            let date = new Date()
            let createdAt = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
            var xml = builder.buildObject({ store: { date: createdAt, products: [finalEntries] } });

            fs.writeFile('./public/feeds/BestPrice.xml', xml, (err) => {
                if (err)
                    console.log(err);
            })
        } catch (error) {
            console.log(error)
        }
    },

    async createSkroutzXML(entries, suppliers, platform) {
        try {
            let finalEntries = []
            for (let category of entries.export_categories) {
                let categoryPath = await this.createCategoryPath(category)
                for (let product of category.products) {
                    if (product.mpn === "BHR4215GL")
                        continue

                    let { cheaperAvailableSupplier, availability, price } = this.createAvailabilityAndPrice(product, suppliers, platform, category)

                    if (!price) { continue }
                    let newEntry = {
                        uniqueID: product.id,
                        name: product.name,
                        link: `https://magnetmarket.gr/product/${slugify(`${product.name.replaceAll("/", "-").replaceAll("|", "")}`, { lower: true, remove: /[^A-Za-z0-9-_.~-\s]*$/g })}`,
                        image: product.image ? `https://api.magnetmarket.eu/${product.image.url}` : "",
                        category: categoryPath,
                        price: parseFloat(price).toFixed(2),
                        weight: product.weight,
                        availability,
                        manufacturer: product.brand ? product.brand?.name : "",
                        mpn: product.mpn,
                        sku: product.sku,
                        description: product.description,
                        quantity: product.inventory > 0 ? product.inventory
                            : (cheaperAvailableSupplier && cheaperAvailableSupplier.name.toLowerCase() === "globalsat" ? 1 : 2),
                        barcode: product.barcode,
                    }

                    finalEntries.push({ product: newEntry })
                }
            }

            var builder = new xml2js.Builder();
            let date = new Date()
            let createdAt = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
            var xml = builder.buildObject({ webstore: { created_at: createdAt, products: [finalEntries] } });

            fs.writeFile('./public/feeds/Skroutz.xml', xml, (err) => {
                if (err)
                    console.log(err);
            })
        } catch (error) {
            console.log(error)
        }
    },

    async createShopflixXML(entries, suppliers, platform) {
        try {
            let finalEntries = []
            for (let category of entries.export_categories) {
                for (let product of category.products) {
                    if (product.mpn === "BHR4215GL")
                        continue

                    let { cheaperAvailableSupplier, availability, price } = this.createAvailabilityAndPrice(product, suppliers, platform)

                    if (!price) { continue }
                    let newEntry = {
                        SKU: product.id,
                        name: product.name,
                        EAN: product.barcode ? product.barcode : `magnetmarket-${product.id}`,
                        MPN: product.mpn,
                        manufacturer: product.brand?.name,
                        description: product.description,
                        url: `https://magnetmarket.gr/product/${slugify(`${product.name.replaceAll("/", "-").replaceAll("|", "")}`, { lower: true, remove: /[^A-Za-z0-9-_.~-\s]*$/g })}`,
                        image: product.image ? `https://api.magnetmarket.eu/${product.image.url}` : "",
                        // additional_image: product.additionalImages ? `https://api.magnetmarket.eu/${product.additionalImages[0]}` : "",
                        category: category.name,
                        price: parseFloat(price).toFixed(2),
                        list_price: '',
                        quantity: product.inventory > 0 ? product.inventory
                            : (cheaperAvailableSupplier && cheaperAvailableSupplier.name.toLowerCase() === "globalsat" ? 1 : 2),
                        offer_from: '',
                        offer_to: '',
                        offer_price: '',
                        offer_quantity: '',
                        shipping_lead_time: availability,
                    }

                    finalEntries.push({ product: newEntry })
                }

            }

            var builder = new xml2js.Builder();
            let date = new Date()
            let createdAt = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
            var xml = builder.buildObject({ MPITEMS: { created_at: createdAt, products: [finalEntries] } });

            fs.writeFile('./public/feeds/Shopflix.xml', xml, (err) => {
                if (err)
                    console.log(err);
            })
        } catch (error) {
            console.log(error)
        }
    },

    async createCategoryPath(category) {
        try {
            const entry = await strapi.entityService.findOne('api::category.category', category.id, {
                fields: ['name'],
                populate: {
                    parents: {
                        populate: {
                            parents: {
                                populate: {
                                    parents: true
                                }
                            }
                        }
                    }
                },
            });

            let categoryPath = 'Αρχική σελίδα'
            let categoryPathArray = []

            function createPath(cat) {
                categoryPathArray.push(cat.name);
                if (cat.parents.length > 0) {
                    createPath(cat.parents[0])
                }
            }

            createPath(entry)

            for (let cat of categoryPathArray.reverse()) {
                categoryPath += `> ${cat}`;
            }

            return categoryPath
        } catch (error) {
            console.log(error)
        }
    },

    createAvailabilityAndPrice(product, suppliers, platform, category) {

        try {
            if (product.inventory && product.inventory > 0) {
                let platformPrice = product.price
                if (product.platforms) {
                    let index = product.platforms.find(p => p.platform.toLowerCase() === platform.name.toLowerCase())
                    if (index) { platformPrice = index.price }
                }

                if (platform.name.toLowerCase() === "skroutz") {
                    if (product.is_in_house) {
                        return { availability: "Άμεσα διαθέσιμο", price: platformPrice }
                    }
                    else {
                        return { availability: "Διαθέσιμο από 4-10 ημέρες", price: platformPrice }
                    }
                }
                else if (platform.name.toLowerCase() === "bestprice") {
                    if (product.is_in_house) {
                        return { availability: "Παράδοση σε 1–3 ημέρες", price: product.price }
                    }
                    else {
                        return { availability: "Παράδοση σε 1–3 ημέρες", price: product.price }
                    }
                }
                else {
                    if (product.is_in_house) {
                        return { availability: 0, price: platformPrice }
                    }
                    else {
                        return { availability: 2, price: platformPrice }
                    }

                }
            }
            else {
                const { cheaperAvailableSupplier } = this.findCheaperSupplier(product, suppliers)

                let { availability } = this.createAvailability(cheaperAvailableSupplier, platform)
                let { price } = this.createPrice(cheaperAvailableSupplier, platform, product)

                return { cheaperAvailableSupplier, availability, price }
            }
        } catch (error) {
            console.log(error)
        }
    },

    createAvailability(cheaperAvailableSupplier, platform) {
        const platformName = platform.name.toLowerCase()
        let availability = ""

        var minutesOfDay = function (m) {
            return m.getMinutes() + m.getHours() * 60;
        }

        let date = new Date()

        let platformTime = new Date()
        let platformOrderHour = platform.order_time.split('.')[0].split(':')[0]
        let platformOrderMinute = platform.order_time.split('.')[0].split(':')[1]
        platformTime.setHours(platformOrderHour, platformOrderMinute)

        let orderTime = new Date()
        let orderHour = cheaperAvailableSupplier.order_time?.split('.')[0].split(':')[0]
        let orderMinute = cheaperAvailableSupplier.order_time?.split('.')[0].split(':')[1]
        orderTime.setHours(orderHour, orderMinute)

        if (cheaperAvailableSupplier.availability < 2) {
            if (minutesOfDay(orderTime) > minutesOfDay(date) || minutesOfDay(platformTime) < minutesOfDay(date)) {
                if (platformName === "skroutz") { availability = "Διαθέσιμο από 1-3 ημέρες" }
                else if (platformName === "bestprice") { availability = "Παράδοση σε 1–3 ημέρες" }
                else {
                    availability = cheaperAvailableSupplier.availability
                }
            }
            else {
                if (platformName === "skroutz") { availability = "Διαθέσιμο από 4-10 ημέρες" }
                else if (platformName === "bestprice") { availability = "Παράδοση σε 4–7 ημέρες " }
                else {
                    availability = cheaperAvailableSupplier.availability
                }
            }
        }
        else if (cheaperAvailableSupplier.availability < 5) {
            if (platformName === "skroutz") { availability = "Διαθέσιμο από 4-10 ημέρες" }
            else if (platformName === "bestprice") { availability = "Παράδοση σε 4–10 ημέρες" }
            else {
                availability = cheaperAvailableSupplier.availability
            }
        }
        else {
            if (platformName === "skroutz") { availability = "Διαθέσιμο από 10 έως 30 ημέρες" }
            else if (platformName === "bestprice") { availability = "Παράδοση σε 15–30 ημέρες" }

            else {
                availability = cheaperAvailableSupplier.availability
            }
        }
        return { availability }
    },

    findCheaperSupplier(product, suppliers) {
        const availableSuppliers = product.supplierInfo.filter(x => x.in_stock === true)

        if (availableSuppliers.length === 0) {
            return { availability: null, price: null }
        }

        availableSuppliers.forEach(x => {
            const supplierAvailability = suppliers.find(supplier => supplier.name === x.name)
            if (supplierAvailability) {
                x.availability = supplierAvailability.availability
                x.order_time = supplierAvailability.order_time
                x.shipping = supplierAvailability.shipping
            }
        })

        const cheaperAvailableSupplier = availableSuppliers.reduce((previous, current) => {
            let currentRecycleTax = current.recycle_tax ? parseFloat(current.recycle_tax) : parseFloat(0)
            let previousRecycleTax = previous.recycle_tax ? parseFloat(previous.recycle_tax) : parseFloat(0)
            let currentCost = parseFloat(current.wholesale) + currentRecycleTax + parseFloat(current.shipping)
            let previousCost = parseFloat(previous.wholesale) + previousRecycleTax + parseFloat(previous.shipping)
            if (strapi
                .plugin('import-products')
                .service('priceHelpers')
                .is_a_greaterthan_b(previousCost, currentCost)) {
                if (!strapi
                    .plugin('import-products')
                    .service('priceHelpers')
                    .is_not_equal(previousCost, currentCost)) {
                    if (current.availability < previous.availability) {
                        return current
                    }
                    return previous
                }
                return current
            }
            return previous;
        })

        return { cheaperAvailableSupplier }
    },

    createPrice(supplierInfo, platform, product, categoryInfo) {
        try {
            if (product.platforms) {
                let productPlatform = product.platforms.find(x => x.platform.toLowerCase().trim() === platform.name.toLowerCase().trim())
                if (productPlatform && productPlatform.price) {
                    return { price: productPlatform.price }
                }
            }
            return { price: product.price }

        } catch (error) {
            console.log(error)
        }
    },

    async checkIfThereIsSupplierInStock() {

        try {

            const entries = await strapi.db.query('api::product.product').findMany({
                select: ['id', 'inventory'],
                where: {
                    publishedAt: { $notNull: true },
                },
                populate: {
                    supplierInfo: true,
                },
            });

            for (let product of entries) {
                const isAllSuppliersOutOfStock = product.supplierInfo.every(supplier => supplier.in_stock === false)
                if (isAllSuppliersOutOfStock && !product.inventory > 0) {
                    await strapi.entityService.update('api::product.product', product.id, {
                        data: {
                            publishedAt: null,
                            deletedAt: new Date()
                        },
                    });
                }
            }


        } catch (error) {
            console.log(error)
        }
    }
});
