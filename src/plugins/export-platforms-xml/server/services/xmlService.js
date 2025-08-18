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
                        productURL: `https://magnetmarket.gr/product/${product.slug}`,
                        imageURL: product.image ? `https://api.magnetmarket.eu/${product.image.url}` : "",
                        category_path: categoryPath,
                        price: price,
                        weight: product.weight,
                        availability,
                        brand: product.brand ? product.brand?.name : "",
                        mpn: product.mpn,
                        sku: product.sku,
                        stock: 'Y',
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
                    // Process your description
                    const cleanDescription = product.description ?
                        this.cleanHtmlForXml(this.removeControlChars(product.description)) :
                        ""

                    if (!price) { continue }
                    let newEntry = {
                        uniqueID: product.id,
                        name: product.name,
                        // link: `https://magnetmarket.gr/product/${slugify(`${product.name.replaceAll("/", "-").replaceAll("|", "")}`, { lower: true, remove: /[^A-Za-z0-9-_.~-\s]*$/g })}`,
                        link: `https://magnetmarket.gr/product/${product.slug}`,
                        image: product.image ? `https://api.magnetmarket.eu/${product.image.url}` : "",
                        category: categoryPath,
                        price: parseFloat(price).toFixed(2),
                        weight: product.weight,
                        availability,
                        manufacturer: product.brand ? product.brand?.name : "",
                        mpn: product.mpn,
                        sku: product.sku,
                        description: cleanDescription,
                        quantity: product.inventory > 0 ? product.inventory
                            : (cheaperAvailableSupplier && cheaperAvailableSupplier.name.toLowerCase() === "globalsat" ? 1 : 2),
                        barcode: product.barcode,
                    }

                    finalEntries.push({ product: newEntry })
                }
            }

            const builder = new xml2js.Builder({
                xmldec: { version: '1.0', encoding: 'UTF-8' },
                renderOpts: { pretty: true }
            });

            function getSafeLocalDate() {
                const date = new Date();
                return date.toLocaleDateString('el-GR') + ' ' +
                    date.toLocaleTimeString('el-GR', { hour12: false });
            }

            const createdAt = escapeXml(getSafeLocalDate());
            // Ensure all strings are XML-safe
            function escapeXml(unsafe) {
                if (!unsafe) return unsafe;
                return unsafe.toString()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');
            }

            // Clean the final entries before building XML
            const cleanEntries = finalEntries.map(entry => {
                const cleanEntry = {};
                Object.keys(entry).forEach(key => {
                    if (typeof entry[key] === 'string') {
                        cleanEntry[key] = escapeXml(entry[key]);
                    } else {
                        cleanEntry[key] = entry[key];
                    }
                });
                return cleanEntry;
            });

            const xmlObject = {
                webstore: {
                    created_at: createdAt,
                    products: {
                        product: cleanEntries // xml2js prefers array as named elements
                    }
                }
            };

            const xml = builder.buildObject(xmlObject);

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
                    // Process your description
                    const cleanDescription = product.description ?
                        this.cleanHtmlForXml(this.removeControlChars(product.description)) :
                        ""

                    if (!price) { continue }
                    let newEntry = {
                        SKU: product.id,
                        name: product.name,
                        EAN: product.barcode ? product.barcode : `magnetmarket-${product.id}`,
                        MPN: product.mpn,
                        manufacturer: product.brand?.name,
                        description: cleanDescription,
                        url: `https://magnetmarket.gr/product/${product.slug}`,
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

            const builder = new xml2js.Builder({
                xmldec: { version: '1.0', encoding: 'UTF-8' },
                renderOpts: { pretty: true }
            });

            function getSafeLocalDate() {
                const date = new Date();
                return date.toLocaleDateString('el-GR') + ' ' +
                    date.toLocaleTimeString('el-GR', { hour12: false });
            }

            const createdAt = escapeXml(getSafeLocalDate());
            // Ensure all strings are XML-safe
            function escapeXml(unsafe) {
                if (!unsafe) return unsafe;
                return unsafe.toString()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');
            }

            // Clean the final entries before building XML
            const cleanEntries = finalEntries.map(entry => {
                const cleanEntry = {};
                Object.keys(entry).forEach(key => {
                    if (typeof entry[key] === 'string') {
                        cleanEntry[key] = escapeXml(entry[key]);
                    } else {
                        cleanEntry[key] = entry[key];
                    }
                });
                return cleanEntry;
            });

            var xml = builder.buildObject({ MPITEMS: { created_at: createdAt, products: cleanEntries } });

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

    // Function to strip HTML tags and decode HTML entities
    cleanHtmlForXml(html) {
        if (!html) return '';

        // First decode HTML entities
        const decoded = html
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");

        // Then strip all HTML tags
        const stripped = decoded.replace(/<[^>]+>/g, ' ');

        // Collapse multiple spaces and trim
        return stripped.replace(/\s+/g, ' ').trim();
    },

    removeControlChars(str) {
        return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    },


    /**
 * Creates availability and price information for a product based on platform and supplier data
 */
    createAvailabilityAndPrice(product, suppliers, platform, category) {
        try {
            if (product.inventory > 0) {
                return this.handleInStockProduct(product, platform);
            } else {
                return this.handleOutOfStockProduct(product, suppliers, platform);
            }
        } catch (error) {
            console.error('Error in createAvailabilityAndPrice:', error);
            return { availability: null, price: null };
        }
    },

    /**
 * Handles in-stock products with platform-specific logic
 */
    handleInStockProduct(product, platform) {
        const platformPrice = this.getPlatformPrice(product, platform);
        const platformName = platform.name.toLowerCase();

        if (platformName === "skroutz") {
            const availability = product.is_in_house
                ? "Άμεσα διαθέσιμο"
                : "Διαθέσιμο από 4-10 ημέρες";
            return { availability, price: platformPrice };
        }

        if (platformName === "bestprice") {
            const finalPrice = this.calculateBestPrice(product);
            const availability = product.is_in_house
                ? "Άμεσα διαθέσιμο"
                : "Παράδοση σε 1–3 ημέρες";
            return { availability, price: finalPrice };
        }

        // Default case for other platforms
        const availability = product.is_in_house ? 0 : 2;
        return { availability, price: platformPrice };
    },

    /**
 * Handles out-of-stock products by finding the cheapest supplier
 */
    handleOutOfStockProduct(product, suppliers, platform) {
        const { cheaperAvailableSupplier } = this.findCheaperSupplier(product, suppliers);

        if (!cheaperAvailableSupplier) {
            return { availability: null, price: null };
        }

        const availability = this.createAvailability(cheaperAvailableSupplier, platform);
        const price = this.createPrice(platform, product);

        return { cheaperAvailableSupplier, availability, price };
    },

    /**
 * Gets platform-specific price if available, otherwise returns base price
 */
    getPlatformPrice(product, platform) {
        if (!product.platforms) return product.price;

        const platformInfo = product.platforms.find(
            p => p.platform.toLowerCase() === platform.name.toLowerCase()
        );

        return platformInfo ? platformInfo.price : product.price;
    },

    /**
 * Calculates the final price for BestPrice platform
 */
    calculateBestPrice(product) {
        const priceToUse = product.is_sale && product.sale_price
            ? product.sale_price
            : product.price;
        return parseFloat(priceToUse).toFixed(2);
    },

    /**
 * Finds the cheapest available supplier for a product
 */
    findCheaperSupplier(product, suppliers) {
        const availableSuppliers = product.supplierInfo
            .filter(x => x.in_stock === true)
            .map(supplier => this.enrichSupplierData(supplier, suppliers));

        if (availableSuppliers.length === 0) return { cheaperAvailableSupplier: null };
        if (availableSuppliers.length === 1) return { cheaperAvailableSupplier: availableSuppliers[0] };

        const cheaperAvailableSupplier = availableSuppliers.reduce((best, current) => {
            const bestCost = this.calculateSupplierTotalCost(best);
            const currentCost = this.calculateSupplierTotalCost(current);

            // First compare by total cost
            if (currentCost < bestCost) return current;
            if (current > bestCost) return best;

            // If costs are equal, compare by availability
            return (current.availability < best.availability) ? current : best;
        }, availableSuppliers[0]); // Start with first supplier as initial best

        return { cheaperAvailableSupplier }
    },

    /**
     * Enriches supplier data with additional information from suppliers list
     */
    enrichSupplierData(supplier, suppliers) {
        const supplierData = suppliers.find(s => s.name === supplier.name);
        if (supplierData) {
            return {
                ...supplier,
                availability: supplierData.availability,
                order_time: supplierData.order_time,
                shipping: supplierData.shipping
            };
        }
        return supplier;
    },

    /**
     * Compares two suppliers to determine which is cheaper
     */
    // compareSupplierCosts(previous, current) {
    //     try {
    //         const priceHelpers = strapi.plugin('import-products').service('priceHelpers');

    //         console.log("current:", current, "previous:", previous)

    //         const currentTotal = this.calculateTotalCost(current);
    //         const previousTotal = this.calculateTotalCost(previous);

    //         if (priceHelpers.is_a_greaterthan_b(previousTotal, currentTotal)) {
    //             if (!priceHelpers.is_not_equal(previousTotal, currentTotal)) {
    //                 return current.availability < previous.availability ? current : previous;
    //             }
    //             return current;
    //         }
    //         return previous;

    //     } catch (error) {
    //         console.log(error)
    //     }
    // },

    /**
     * Calculates total cost including wholesale, recycle tax, and shipping
     */
    calculateSupplierTotalCost(supplier) {
        try {
            const recycleTax = parseFloat(supplier.recycle_tax || 0);
            const shipping = parseFloat(supplier.shipping || 0);
            const wholesale = parseFloat(supplier.wholesale || 0);
            return wholesale + recycleTax + shipping;

        } catch (error) {
            console.log(error)
        }
    },

    /**
 * Creates availability information based on supplier and platform
 */
    createAvailability(supplier, platform) {
        const platformName = platform.name.toLowerCase();
        const currentTime = this.getMinutesOfDay(new Date());
        const orderTime = this.parseTimeString(supplier.order_time);
        const platformCutoff = this.parseTimeString(platform.order_time);

        let availability;

        if (supplier.availability < 2) {
            availability = this.getShortTermAvailability(
                currentTime, orderTime, platformCutoff, platformName, supplier
            );
        } else if (supplier.availability < 5) {
            availability = this.getMediumTermAvailability(platformName, supplier);
        } else {
            availability = this.getLongTermAvailability(platformName, supplier);
        }

        return { availability };
    },

    /**
     * Helper to parse time string into minutes of day
     */
    parseTimeString(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split('.')[0].split(':');
        return parseInt(hours) * 60 + parseInt(minutes);
    },

    /**
     * Helper to get minutes of day from Date object
     */
    getMinutesOfDay(date) {
        return date.getMinutes() + date.getHours() * 60;
    },

    /**
     * Determines short-term availability based on time constraints
     */
    getShortTermAvailability(currentTime, orderTime, platformCutoff, platformName, supplier) {
        if (orderTime > currentTime || platformCutoff < currentTime) {
            return this.getPlatformSpecificText(platformName, 'short', supplier);
        }
        return this.getPlatformSpecificText(platformName, 'medium', supplier);
    },

    /**
     * Returns medium-term availability text
     */
    getMediumTermAvailability(platformName, supplier) {
        return this.getPlatformSpecificText(platformName, 'medium', supplier);
    },

    /**
     * Returns long-term availability text
     */
    getLongTermAvailability(platformName, supplier) {
        return this.getPlatformSpecificText(platformName, 'long', supplier);
    },

    /**
     * Returns platform-specific availability text
     */
    getPlatformSpecificText(platformName, term, supplier) {
        const platformTexts = {
            skroutz: {
                short: "Διαθέσιμο από 1-3 ημέρες",
                medium: "Διαθέσιμο από 4-10 ημέρες",
                long: "Διαθέσιμο από 10 έως 30 ημέρες"
            },
            bestprice: {
                short: "Παράδοση σε 1–3 ημέρες",
                medium: "Παράδοση σε 1–3 ημέρες",
                long: "Παράδοση σε 1–3 ημέρες"
            }
        };

        return platformTexts[platformName]?.[term] || supplier.availability;
    },

    // createAvailabilityAndPrice(product, suppliers, platform, category) {

    //     try {
    //         if (product.inventory && product.inventory > 0) {
    //             let platformPrice = product.price
    //             if (product.platforms) {
    //                 let index = product.platforms.find(p => p.platform.toLowerCase() === platform.name.toLowerCase())
    //                 if (index) { platformPrice = index.price }
    //             }

    //             if (platform.name.toLowerCase() === "skroutz") {
    //                 if (product.is_in_house) {
    //                     return { availability: "Άμεσα διαθέσιμο", price: platformPrice }
    //                 }
    //                 else {
    //                     return { availability: "Διαθέσιμο από 4-10 ημέρες", price: platformPrice }
    //                 }
    //             }
    //             else if (platform.name.toLowerCase() === "bestprice") {
    //                 if (product.is_in_house) {
    //                     let finalPrice = parseFloat(product.price).toFixed(2)

    //                     if (product.is_sale && product.sale_price) {
    //                         finalPrice = parseFloat(product.sale_price).toFixed(2)
    //                     }
    //                     return { availability: "Άμεσα διαθέσιμο", price: finalPrice }
    //                 }
    //                 else {
    //                     let finalPrice = parseFloat(product.price).toFixed(2)

    //                     if (product.is_sale && product.sale_price) {
    //                         finalPrice = parseFloat(product.sale_price).toFixed(2)
    //                     }
    //                     return { availability: "Παράδοση σε 1–3 ημέρες", price: finalPrice }
    //                 }
    //             }
    //             else {
    //                 if (product.is_in_house) {
    //                     return { availability: 0, price: platformPrice }
    //                 }
    //                 else {
    //                     return { availability: 2, price: platformPrice }
    //                 }

    //             }
    //         }
    //         else {
    //             const { cheaperAvailableSupplier } = this.findCheaperSupplier(product, suppliers)

    //             let { availability } = this.createAvailability(cheaperAvailableSupplier, platform)
    //             let { price } = this.createPrice(cheaperAvailableSupplier, platform, product)

    //             return { cheaperAvailableSupplier, availability, price }
    //         }
    //     } catch (error) {
    //         console.log(error)
    //     }
    // },

    // createAvailability(cheaperAvailableSupplier, platform) {
    //     const platformName = platform.name.toLowerCase()
    //     let availability = ""

    //     var minutesOfDay = function (m) {
    //         return m.getMinutes() + m.getHours() * 60;
    //     }

    //     let date = new Date()

    //     let platformTime = new Date()
    //     let platformOrderHour = platform.order_time.split('.')[0].split(':')[0]
    //     let platformOrderMinute = platform.order_time.split('.')[0].split(':')[1]
    //     platformTime.setHours(platformOrderHour, platformOrderMinute)

    //     let orderTime = new Date()
    //     let orderHour = cheaperAvailableSupplier.order_time?.split('.')[0].split(':')[0]
    //     let orderMinute = cheaperAvailableSupplier.order_time?.split('.')[0].split(':')[1]
    //     orderTime.setHours(orderHour, orderMinute)

    //     if (cheaperAvailableSupplier.availability < 2) {
    //         if (minutesOfDay(orderTime) > minutesOfDay(date) || minutesOfDay(platformTime) < minutesOfDay(date)) {
    //             if (platformName === "skroutz") { availability = "Διαθέσιμο από 1-3 ημέρες" }
    //             else if (platformName === "bestprice") { availability = "Παράδοση σε 1–3 ημέρες" }
    //             else {
    //                 availability = cheaperAvailableSupplier.availability
    //             }
    //         }
    //         else {
    //             if (platformName === "skroutz") { availability = "Διαθέσιμο από 4-10 ημέρες" }
    //             else if (platformName === "bestprice") { availability = "Παράδοση σε 1–3 ημέρες" }
    //             else {
    //                 availability = cheaperAvailableSupplier.availability
    //             }
    //         }
    //     }
    //     else if (cheaperAvailableSupplier.availability < 5) {
    //         if (platformName === "skroutz") { availability = "Διαθέσιμο από 4-10 ημέρες" }
    //         else if (platformName === "bestprice") { availability = "Παράδοση σε 1–3 ημέρες" }
    //         else {
    //             availability = cheaperAvailableSupplier.availability
    //         }
    //     }
    //     else {
    //         if (platformName === "skroutz") { availability = "Διαθέσιμο από 10 έως 30 ημέρες" }
    //         else if (platformName === "bestprice") { availability = "Παράδοση σε 1–3 ημέρες" }

    //         else {
    //             availability = cheaperAvailableSupplier.availability
    //         }
    //     }
    //     return { availability }
    // },

    // findCheaperSupplier(product, suppliers) {
    //     const availableSuppliers = product.supplierInfo.filter(x => x.in_stock === true)

    //     if (availableSuppliers.length === 0) {
    //         return { availability: null, price: null }
    //     }

    //     availableSuppliers.forEach(x => {
    //         const supplierAvailability = suppliers.find(supplier => supplier.name === x.name)
    //         if (supplierAvailability) {
    //             x.availability = supplierAvailability.availability
    //             x.order_time = supplierAvailability.order_time
    //             x.shipping = supplierAvailability.shipping
    //         }
    //     })

    //     const cheaperAvailableSupplier = availableSuppliers.reduce((previous, current) => {
    //         let currentRecycleTax = current.recycle_tax ? parseFloat(current.recycle_tax) : parseFloat(0)
    //         let previousRecycleTax = previous.recycle_tax ? parseFloat(previous.recycle_tax) : parseFloat(0)
    //         let currentCost = parseFloat(current.wholesale) + currentRecycleTax + parseFloat(current.shipping)
    //         let previousCost = parseFloat(previous.wholesale) + previousRecycleTax + parseFloat(previous.shipping)
    //         if (strapi
    //             .plugin('import-products')
    //             .service('priceHelpers')
    //             .is_a_greaterthan_b(previousCost, currentCost)) {
    //             if (!strapi
    //                 .plugin('import-products')
    //                 .service('priceHelpers')
    //                 .is_not_equal(previousCost, currentCost)) {
    //                 if (current.availability < previous.availability) {
    //                     return current
    //                 }
    //                 return previous
    //             }
    //             return current
    //         }
    //         return previous;
    //     })

    //     return { cheaperAvailableSupplier }
    // },

    createPrice(platform, product) {
        try {
            // For BestPrice, use sale price if available
            if (platform.name.toLowerCase() === "bestprice") {
                return this.calculateBestPrice(product);
            }

            // Otherwise use the price we've already calculated
            return this.getPlatformPrice(product, platform);

        } catch (error) {
            console.log(error)
        }
    },

    // createPrice(supplierInfo, platform, product, categoryInfo) {
    //     try {
    //         if (product.platforms) {
    //             let productPlatform = product.platforms.find(x => x.platform.toLowerCase().trim() === platform.name.toLowerCase().trim())
    //             if (productPlatform && productPlatform.price) {
    //                 return { price: productPlatform.price }
    //             }
    //         }
    //         return { price: product.price }

    //     } catch (error) {
    //         console.log(error)
    //     }
    // },

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
