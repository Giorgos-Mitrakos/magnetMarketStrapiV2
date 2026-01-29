'use strict';

const xml2js = require('xml2js');
const slugify = require("slugify");
const fs = require('fs');
const { createWriteStream } = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

module.exports = ({ strapi }) => ({
    async createXml(platform) {
        try {
            // 1. Φόρτωσε suppliers (μικρό dataset)
            const suppliers = await strapi.db.query('plugin::import-products.importxml').findMany({
                select: ['name', 'availability', 'order_time', 'shipping'],
            });

            // 2. Φόρτωσε platform με export categories (χωρίς products ακόμα)
            const platformData = await strapi.db.query('api::platform.platform').findOne({
                select: ['name', 'order_time', 'only_in_house_inventory'],
                where: { name: platform },
                populate: {
                    export_categories: {
                        select: ['id', 'name'],
                        populate: {
                            cat_percentage: {
                                populate: {
                                    brand_perc: {
                                        populate: {
                                            brand: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    export_statuses: true
                },
            });

            if (!platformData) {
                throw new Error(`Platform ${platform} not found`);
            }

            // ✅ Εξαγωγή των status values
            const allowedStatuses = platformData.export_statuses?.map(s => s.status) || [];
            console.log(`Platform ${platform} - Allowed statuses:`, allowedStatuses);

            // Αν δεν έχει επιλεγμένα statuses, δεν εξάγουμε τίποτα
            if (allowedStatuses.length === 0) {
                console.log(`No export statuses configured for platform ${platform}. Skipping XML generation.`);
                return;
            }

            // 3. Check suppliers in stock πριν ξεκινήσουμε
            await this.checkIfThereIsSupplierInStock();

            // 4. Επεξεργασία categories και δημιουργία entries
            const allEntries = [];

            for (const category of platformData.export_categories) {

                const categoryEntries = await this.processCategoryProducts(
                    category,
                    suppliers,
                    platformData,
                    platform.toLowerCase(),
                    allowedStatuses
                );

                allEntries.push(...categoryEntries);

                // Cleanup
                categoryEntries.length = 0;
            }

            // 5. Δημιουργία XML ανάλογα με την πλατφόρμα
            await this.writeXmlForPlatform(platform.toLowerCase(), allEntries, platformData);

            // Final cleanup
            allEntries.length = 0;

        } catch (error) {
            console.error('Error in createXml:', error);
            throw error;
        }
    },

    async processCategoryProducts(category, suppliers, platformData, platformName, allowedStatuses) {
        const BATCH_SIZE = 50;
        const categoryEntries = [];

        // Δημιούργησε το category path μία φορά
        const categoryPath = platformName === 'shopflix'
            ? category.name
            : await this.createCategoryPath(category);

        // ✅ Query 1: Προϊόντα με inventory >= 1 (ανεξάρτητα status)
        let offset = 0;
        while (true) {
            const inStockFilters = {
                $and: [
                    { publishedAt: { $notNull: true } },
                    { category: { id: { $eq: category.id } } },
                    { inventory: { $gte: 1 } }
                ]
            };

            if (platformData.only_in_house_inventory) {
                inStockFilters.$and.push({ is_in_house: { $eq: true } });
            }

            const inStockProducts = await strapi.entityService.findMany('api::product.product', {
                filters: inStockFilters,
                fields: [
                    'id', 'name', 'slug', 'price', 'sale_price', 'is_sale',
                    'mpn', 'sku', 'barcode', 'description', 'weight',
                    'inventory', 'is_in_house', 'status'
                ],
                populate: {
                    image: { fields: ['url'] },
                    additionalImages: { fields: ['url'] },
                    brand: { fields: ['name'] },
                    supplierInfo: { fields: ['name', 'in_stock', 'wholesale', 'recycle_tax'] },
                    platforms: { fields: ['platform', 'price'] }
                },
                start: offset,
                limit: BATCH_SIZE,
            });

            if (inStockProducts.length === 0) break;

            // Process in-stock products
            for (const product of inStockProducts) {
                const { availability, price, cheaperAvailableSupplier } = platformData.only_in_house_inventory
                    ? {
                        availability: this.getInHouseAvailability(platformName),
                        price: this.getPlatformPrice(product, platformData),
                        cheaperAvailableSupplier: null
                    }
                    : this.createAvailabilityAndPrice(product, suppliers, platformData, category);

                if (!price) continue;

                const entry = this.createProductEntry(
                    product,
                    availability,
                    price,
                    categoryPath,
                    platformData.name,
                    cheaperAvailableSupplier,
                );

                if (entry) categoryEntries.push(entry);
            }

            offset += BATCH_SIZE;
        }

        // ✅ Query 2: Προϊόντα με inventory = 0 ΚΑΙ status από τα allowedStatuses του platform
        if (!platformData.only_in_house_inventory) {
            offset = 0;
            while (true) {
                const outOfStockFilters = {
                    $and: [
                        { publishedAt: { $notNull: true } },
                        { category: { id: { $eq: category.id } } },
                        { inventory: { $lte: 0 } },
                        { status: { $in: allowedStatuses } }  // ✅ Από το platform configuration
                    ]
                };

                const outOfStockProducts = await strapi.entityService.findMany('api::product.product', {
                    filters: outOfStockFilters,
                    fields: [
                        'id', 'name', 'slug', 'price', 'sale_price', 'is_sale',
                        'mpn', 'sku', 'barcode', 'description', 'weight',
                        'inventory', 'is_in_house', 'status'
                    ],
                    populate: {
                        image: { fields: ['url'] },
                        additionalImages: { fields: ['url'] },
                        brand: { fields: ['name'] },
                        supplierInfo: { fields: ['name', 'in_stock', 'wholesale', 'recycle_tax'] },
                        platforms: { fields: ['platform', 'price'] }
                    },
                    start: offset,
                    limit: BATCH_SIZE,
                });

                if (outOfStockProducts.length === 0) break;

                // Process out-of-stock products
                for (const product of outOfStockProducts) {
                    const { availability, price, cheaperAvailableSupplier } =
                        this.createAvailabilityAndPrice(product, suppliers, platformData, category);

                    if (!price) continue;

                    const entry = this.createProductEntry(
                        product,
                        availability,
                        price,
                        categoryPath,
                        platformData.name,
                        cheaperAvailableSupplier,
                    );

                    if (entry) categoryEntries.push(entry);
                }

                offset += BATCH_SIZE;
            }
        }

        return categoryEntries;
    },

    createProductEntry(product, availability, price, categoryPath, platformName, cheaperAvailableSupplier) {
        const cleanDescription = product.description
            ? this.cleanHtmlForXml(this.removeControlChars(product.description))
            : "";

        const imageUrl = product.image ? `https://api.magnetmarket.eu${product.image.url}` : "";
        const productLink = `https://magnetmarket.gr/product/${product.slug}`;

        // Calculate quantity
        const quantity = product.inventory > 0
            ? product.inventory
            : (cheaperAvailableSupplier?.name?.toLowerCase() === "globalsat" ? 1 : 2);

        const allowedStatuses = ["InStock", "MediumStock", "LowStock"];
        const stock = allowedStatuses.includes(product.status) ? "Y" : "N";

        switch (platformName.toLowerCase()) {
            case "skroutz":
                return {
                    product: {
                        uniqueID: product.id,
                        name: product.name,
                        link: productLink,
                        image: imageUrl,
                        category: categoryPath,
                        price: parseFloat(price).toFixed(2),
                        weight: product.weight,
                        availability: availability,
                        manufacturer: product.brand?.name || "",
                        mpn: product.mpn,
                        sku: product.sku,
                        description: cleanDescription,
                        quantity: quantity,
                        barcode: product.barcode,
                    }
                };

            case "bestprice":
                return {
                    product: {
                        productId: product.id,
                        title: product.name,
                        productURL: productLink,
                        imageURL: imageUrl,
                        category_path: categoryPath,
                        price: parseFloat(price).toFixed(2),
                        weight: product.weight,
                        availability: availability,
                        brand: product.brand?.name || "",
                        mpn: product.mpn,
                        sku: product.sku,
                        stock: stock,
                        Barcode: product.barcode,
                    }
                };

            case "shopflix":
                return {
                    product: {
                        SKU: product.id,
                        name: product.name,
                        EAN: product.barcode || `magnetmarket-${product.id}`,
                        MPN: product.mpn,
                        manufacturer: product.brand?.name || "",
                        description: cleanDescription,
                        url: productLink,
                        image: imageUrl,
                        category: categoryPath,
                        price: parseFloat(price).toFixed(2),
                        list_price: '',
                        quantity: quantity,
                        offer_from: '',
                        offer_to: '',
                        offer_price: '',
                        offer_quantity: '',
                        shipping_lead_time: availability,
                    }
                };

            default:
                return null;
        }
    },

    async writeXmlForPlatform(platform, entries, platformData) {
        const builder = new xml2js.Builder({
            xmldec: { version: '1.0', encoding: 'UTF-8' },
            renderOpts: { pretty: true },
            cdata: true  // Χρησιμοποιούμε CDATA για να μην κάνει escape το >
        });

        const createdAt = this.getSafeLocalDate();

        let xmlObject, fileName;

        switch (platform) {
            case "skroutz":
                // Για Skroutz δεν κάνουμε escape το category path
                const cleanSkroutzEntries = entries.map(entry => {
                    const cleanEntry = { product: {} };
                    Object.keys(entry.product).forEach(key => {
                        // Κάνε escape όλα εκτός από το category
                        if (key === 'category') {
                            cleanEntry.product[key] = entry.product[key]; // Όχι escape
                        } else if (typeof entry.product[key] === 'string') {
                            cleanEntry.product[key] = this.escapeXml(entry.product[key]);
                        } else {
                            cleanEntry.product[key] = entry.product[key];
                        }
                    });
                    return cleanEntry;
                });

                xmlObject = {
                    webstore: {
                        created_at: this.escapeXml(createdAt),
                        products: cleanSkroutzEntries
                    }
                };
                fileName = './public/feeds/Skroutz.xml';
                break;

            case "bestprice":
                // Για BestPrice δεν κάνουμε escape το category_path
                const cleanBestPriceEntries = entries.map(entry => {
                    const cleanEntry = { product: {} };
                    Object.keys(entry.product).forEach(key => {
                        // Κάνε escape όλα εκτός από το category_path
                        if (key === 'category_path') {
                            cleanEntry.product[key] = entry.product[key]; // Όχι escape
                        } else if (typeof entry.product[key] === 'string') {
                            cleanEntry.product[key] = this.escapeXml(entry.product[key]);
                        } else {
                            cleanEntry.product[key] = entry.product[key];
                        }
                    });
                    return cleanEntry;
                });

                xmlObject = {
                    store: {
                        date: createdAt,
                        products: [cleanBestPriceEntries]
                    }
                };
                fileName = './public/feeds/BestPrice.xml';
                break;

            case "shopflix":
                // Για Shopflix κάνουμε escape κανονικά (έχει μόνο το όνομα, όχι path)
                const cleanShopflixEntries = entries.map(entry => {
                    const cleanEntry = { product: {} };
                    Object.keys(entry.product).forEach(key => {
                        if (typeof entry.product[key] === 'string') {
                            cleanEntry.product[key] = this.escapeXml(entry.product[key]);
                        } else {
                            cleanEntry.product[key] = entry.product[key];
                        }
                    });
                    return cleanEntry;
                });

                xmlObject = {
                    MPITEMS: {
                        created_at: this.escapeXml(createdAt),
                        products: cleanShopflixEntries
                    }
                };
                fileName = './public/feeds/Shopflix.xml';
                break;

            default:
                throw new Error(`Unknown platform: ${platform}`);
        }

        const xml = builder.buildObject(xmlObject);

        await writeFileAsync(fileName, xml, 'utf8');
    },

    async createCategoryPath(category) {
        try {
            const path = ['Αρχική σελίδα'];
            let currentId = category.id;
            const MAX_DEPTH = 10;
            let depth = 0;

            // Traverse up the category tree
            while (currentId && depth < MAX_DEPTH) {
                const cat = await strapi.entityService.findOne('api::category.category', currentId, {
                    fields: ['name'],
                    populate: {
                        parents: {
                            fields: ['id']
                        }
                    }
                });

                if (!cat) break;

                path.push(cat.name);

                // Move to parent
                if (cat.parents && cat.parents.length > 0) {
                    currentId = cat.parents[0].id;
                } else {
                    break;
                }

                depth++;
            }

            return path.join(' > ');
        } catch (error) {
            console.error('Error in createCategoryPath:', error);
            return 'Αρχική σελίδα';
        }
    },

    cleanHtmlForXml(html) {
        if (!html) return '';

        // Decode HTML entities
        const decoded = html
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");

        // Strip HTML tags
        const stripped = decoded.replace(/<[^>]+>/g, ' ');

        // Collapse multiple spaces
        return stripped.replace(/\s+/g, ' ').trim();
    },

    removeControlChars(str) {
        if (!str) return '';
        return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    },

    escapeXml(unsafe) {
        if (!unsafe) return unsafe;
        return unsafe.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    },

    getSafeLocalDate() {
        const date = new Date();
        return date.toLocaleDateString('el-GR') + ' ' +
            date.toLocaleTimeString('el-GR', { hour12: false });
    },

    /**
     * Creates availability and price information for a product
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
            return {
                availability: null,
                price: null,
                cheaperAvailableSupplier: null  // ✅ ΠΡΟΣΘΗΚΗ
            };
        }
    },

    /**
     * Handles in-stock products
     */
    handleInStockProduct(product, platform) {
        const platformPrice = this.getPlatformPrice(product, platform);
        const platformName = platform.name.toLowerCase();

        if (platformName === "skroutz") {
            const availability = product.is_in_house
                ? "Άμεσα διαθέσιμο"
                : "Διαθέσιμο από 4-6 ημέρες";
            return {
                availability,
                price: platformPrice,
                cheaperAvailableSupplier: null
            };
        }

        if (platformName === "bestprice") {
            const finalPrice = this.calculateBestPrice(product);
            const availability = this.getBestPriceAvailability(product);
            return {
                availability,
                price: finalPrice,
                cheaperAvailableSupplier: null
            };
        }

        // Default for other platforms
        const availability = product.is_in_house ? 0 : 2;
        return {
            availability,
            price: platformPrice,
            cheaperAvailableSupplier: null
        };
    },

    /**
     * Handles out-of-stock products
     */
    handleOutOfStockProduct(product, suppliers, platform) {
        const { cheaperAvailableSupplier } = this.findCheaperSupplier(product, suppliers);

        if (!cheaperAvailableSupplier) {
            return { availability: null, price: null, cheaperAvailableSupplier: null };
        }

        const platformName = platform.name.toLowerCase();

        // ✅ Για BestPrice χρησιμοποιούμε τη νέα λογική
        if (platformName === "bestprice") {
            const availability = this.getBestPriceAvailability(product, cheaperAvailableSupplier);
            const price = this.createPrice(platform, product);
            return { cheaperAvailableSupplier, availability, price };
        }

        // Για άλλες πλατφόρμες (Skroutz, Shopflix)
        const availability = this.createAvailability(cheaperAvailableSupplier, platform);
        const price = this.createPrice(platform, product);

        return { cheaperAvailableSupplier, availability: availability.availability, price };
    },

    /**
     * Gets platform-specific price
     */
    getPlatformPrice(product, platform) {
        if (!product.platforms) return product.price;

        const platformInfo = product.platforms.find(
            p => p.platform.toLowerCase() === platform.name.toLowerCase()
        );

        return platformInfo ? platformInfo.price : product.price;
    },

    /**
     * Calculates BestPrice platform price
     */
    calculateBestPrice(product) {
        const priceToUse = product.is_sale && product.sale_price
            ? product.sale_price
            : product.price;
        return parseFloat(priceToUse).toFixed(2);
    },

    /**
     * Finds the cheapest available supplier
     */
    findCheaperSupplier(product, suppliers) {
        try {
            const availableSuppliers = product.supplierInfo
                .filter(x => x.in_stock === true)
                .map(supplier => this.enrichSupplierData(supplier, suppliers));

            if (availableSuppliers.length === 0) return { cheaperAvailableSupplier: null };
            if (availableSuppliers.length === 1) return { cheaperAvailableSupplier: availableSuppliers[0] };

            const cheaperAvailableSupplier = availableSuppliers.reduce((best, current) => {
                const bestCost = this.calculateSupplierTotalCost(best);
                const currentCost = this.calculateSupplierTotalCost(current);

                // Compare by total cost first
                if (currentCost < bestCost) return current;
                if (currentCost > bestCost) return best;

                // If equal, compare by availability
                return (current.availability < best.availability) ? current : best;
            }, availableSuppliers[0]);

            return { cheaperAvailableSupplier };
        } catch (error) {
            console.error("Error in findCheaperSupplier:", error);
            return { cheaperAvailableSupplier: null };
        }
    },

    /**
     * Enriches supplier with additional data
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
     * Calculates total supplier cost
     */
    calculateSupplierTotalCost(supplier) {
        try {
            const recycleTax = parseFloat(supplier.recycle_tax || 0);
            const shipping = parseFloat(supplier.shipping || 0);
            const wholesale = parseFloat(supplier.wholesale || 0);
            return wholesale + recycleTax + shipping;
        } catch (error) {
            console.error('Error calculating supplier cost:', error);
            return 0;
        }
    },

    /**
     * Creates availability information
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

    parseTimeString(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split('.')[0].split(':');
        return parseInt(hours) * 60 + parseInt(minutes);
    },

    getMinutesOfDay(date) {
        return date.getMinutes() + date.getHours() * 60;
    },

    getShortTermAvailability(currentTime, orderTime, platformCutoff, platformName, supplier) {
        if (orderTime > currentTime || platformCutoff < currentTime) {
            return this.getPlatformSpecificText(platformName, 'short', supplier);
        }
        return this.getPlatformSpecificText(platformName, 'medium', supplier);
    },

    getMediumTermAvailability(platformName, supplier) {
        return this.getPlatformSpecificText(platformName, 'medium', supplier);
    },

    getLongTermAvailability(platformName, supplier) {
        return this.getPlatformSpecificText(platformName, 'long', supplier);
    },

    getPlatformSpecificText(platformName, term, supplier) {
        const platformTexts = {
            skroutz: {
                short: "Διαθέσιμο από 1-3 ημέρες",
                medium: "Διαθέσιμο από 4-6 ημέρες",
                long: "Διαθέσιμο από 7-12 ημέρες"
            },
            bestprice: {
                short: "Παράδοση σε 1–3 ημέρες",
                medium: "Παράδοση σε 1–3 ημέρες",
                long: "Παράδοση σε 1–3 ημέρες"
            }
        };

        return platformTexts[platformName]?.[term] || supplier.availability;
    },

    createPrice(platform, product) {
        try {
            // For BestPrice, use sale price if available
            if (platform.name.toLowerCase() === "bestprice") {
                return this.calculateBestPrice(product);
            }

            // Otherwise use platform-specific price
            return this.getPlatformPrice(product, platform);
        } catch (error) {
            console.error('Error in createPrice:', error);
            return null;
        }
    },

    getInHouseAvailability(platformName) {
        switch (platformName) {
            case 'skroutz':
                return 'Άμεσα διαθέσιμο';
            case 'bestprice':
                return 'Σε απόθεμα';
            case 'shopflix':
                return 0;
            default:
                return 'Άμεσα διαθέσιμο';
        }
    },

    /**
     * ✅ Υπολογίζει το availability για BestPrice με βάση το status και supplier
     */
    getBestPriceAvailability(product, cheaperAvailableSupplier = null) {
        const status = product.status;
        const inventory = product.inventory || 0;

        // 1. InStock με inventory > 0
        if (product.is_in_house && inventory > 0) {
            return 'Σε απόθεμα';
        }

        // 2. InStock χωρίς inventory - έλεγξε supplier
        if ((status === 'InStock' || status === 'MediumStock' || status === 'LowStock') && inventory <= 0 && cheaperAvailableSupplier) {
            const supplierAvailability = cheaperAvailableSupplier.availability || 0;

            if (supplierAvailability < 2) {
                return 'Παράδοση σε 1–3 ημέρες';
            } else if (supplierAvailability < 5) {
                return 'Παράδοση σε 4–7 ημέρες';
            } else if (supplierAvailability < 8) {
                return 'Παράδοση σε 4–10 ημέρες';
            } else if (supplierAvailability < 12) {
                return 'Παράδοση σε 8–14 ημέρες';
            } else if (supplierAvailability < 25) {
                return 'Παράδοση σε 15–30 ημέρες';
            }
        }

        // 5. Backorder
        if (status === 'Backorder') {
            return 'Προπαραγγελία';
        }

        // 6. IsExpected
        if (status === 'IsExpected') {
            return 'Παράδοση σε 15–30 ημέρες';
        }

        // 7. OutOfStock ή Discontinued
        if (status === 'OutOfStock' || status === 'Discontinued') {
            return 'Εξαντλήθηκε';
        }

        // 8. AskForPrice
        if (status === 'AskForPrice') {
            return 'Εξαντλήθηκε';
        }

        // Default fallback
        return 'Παράδοση σε 1–3 ημέρες';
    },

    /**
     * Checks and unpublishes products without supplier stock
     */
    async checkIfThereIsSupplierInStock() {
        try {
            console.log('🔍 Checking supplier stock status...');

            const BATCH_SIZE = 100;
            let offset = 0;
            let totalUpdated = 0;

            const suppliers = await strapi.db.query('plugin::import-products.importxml').findMany({
                where: { isActive: true },
                populate: {
                    brand_excl_map: { select: ['brand_name'] }
                }
            });

            const brandExclList = [];
            for (const supplier of suppliers) {
                if (supplier.brand_excl_map && supplier.brand_excl_map.length > 0) {
                    brandExclList.push(...supplier.brand_excl_map);
                }
            }

            while (true) {
                // Φόρτωσε products χωρίς inventory
                const products = await strapi.db.query('api::product.product').findMany({
                    select: ['id', 'inventory', 'status'],
                    where: {
                        $and: [
                            { publishedAt: { $notNull: true } },
                            { inventory: { $lte: 0 } }
                        ]
                    },
                    populate: {
                        supplierInfo: true,
                        brand: {
                            select: ['name']
                        }
                    },
                    offset,
                    limit: BATCH_SIZE,
                });

                if (products.length === 0) break;

                // Επεξεργασία κάθε product
                for (const product of products) {
                    try {
                        // ✅ Χρήση της calculateProductStatus λογικής
                        const productForStatus = {
                            ...product,
                            brandName: product.brand?.name || product.brand,
                            status: product.status // Για να διατηρηθεί το Discontinued
                        };

                        const calculatedStatus = strapi
                            .plugin('import-products')
                            .service('productStatusHelper')
                            .calculateProductStatus(
                                product.inventory || 0,
                                product.supplierInfo,
                                productForStatus,
                                brandExclList
                            );

                        // Αν το status άλλαξε, κάνε update
                        if (calculatedStatus !== product.status) {
                            const updateData = {
                                status: calculatedStatus
                            };

                            // ✅ Χειρισμός deletedAt
                            if (calculatedStatus === 'OutOfStock' || calculatedStatus === 'Discontinued') {
                                // Αν δεν έχει deletedAt, βάλε ημερομηνία
                                updateData.deletedAt = new Date();
                            } else {
                                // Αν το status δεν είναι OutOfStock/Discontinued, καθάρισε το deletedAt
                                updateData.deletedAt = null;
                            }

                            await strapi.db.query('api::product.product').update({
                                where: { id: product.id },
                                data: updateData
                            });

                            totalUpdated++;

                            if (totalUpdated % 50 === 0) {
                                console.log(`✅ Progress: ${totalUpdated} products updated...`);
                            }
                        }

                    } catch (productError) {
                        console.error(`❌ Error updating product ${product.id}:`, productError);
                    }
                }

                offset += BATCH_SIZE;
                console.log(`📦 Processed ${offset} products...`);
            }

            console.log(`✅ Supplier stock check complete! Updated ${totalUpdated} products.`);

        } catch (error) {
            console.error('❌ Error in checkIfThereIsSupplierInStock:', error);
            throw error;
        }
    },
});