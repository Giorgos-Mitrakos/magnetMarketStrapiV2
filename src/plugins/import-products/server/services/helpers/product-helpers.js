'use strict';

module.exports = ({ strapi }) => ({

    filterData(data, categoryMap, importParams, supplier = null) {
        try {
            const unique_product = []
            const not_unique_product = []

            const newData = data
                .filter(filterStock)
                .filter(filterPriceRange)
                .filter(filterCategories)
                .filter(filterImage) // Now conditional based on supplier
                .filter(filterUnique)
                .filter(filterRemoveDup)

            function filterImage(imageUrl) {
                // ✅ Skip image validation for suppliers with custom image formats
                const suppliersWithCustomImages = [
                    'globalsat',  // Uses Image1Link-Image5Link
                    'dotmedia',   // Uses ImageLink, ImageLink2, ImageLink3
                    'novatron',   // Scraped images
                    'quest'       // Scraped images
                ];

                if (supplier && suppliersWithCustomImages.includes(supplier.toLowerCase())) {
                    // For these suppliers, check if at least ONE image field exists
                    return hasCustomImageFields(imageUrl);
                }

                // Default behavior: check standard image fields
                let image = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.image, imageUrl)

                let additional_images = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.additional_images, imageUrl)

                if (!image && !additional_images)
                    return false

                return true
            }

            function hasCustomImageFields(product) {
                if (!product) return false;

                const supplierLower = supplier?.toLowerCase();

                // Helper to extract value from array or string
                const extractValue = (value) => {
                    if (!value) return null;
                    if (Array.isArray(value)) return value[0];
                    return value;
                };

                // Globalsat: Check Image1Link-Image5Link
                if (supplierLower === 'globalsat') {
                    for (let i = 1; i <= 5; i++) {
                        const value = extractValue(product[`Image${i}Link`]);
                        if (value) return true;
                    }
                    return false;
                }

                // DotMedia: Check ImageLink, ImageLink2, ImageLink3
                if (supplierLower === 'dotmedia') {
                    const img1 = extractValue(product.ImageLink);
                    const img2 = extractValue(product.ImageLink2);
                    const img3 = extractValue(product.ImageLink3);
                    return !!(img1 || img2 || img3);
                }

                // For scraped suppliers (Novatron, Quest), always return true
                // Images will be validated during scraping
                if (supplierLower === 'novatron' || supplierLower === 'quest') {
                    return true;
                }

                return false;
            }

            function filterUnique(unique) {
                let mpn = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.mpn, unique)
                if (!mpn)
                    return false

                if (unique_product.includes(mpn)) {
                    not_unique_product.push(mpn)
                    return false
                }
                else {
                    unique_product.push(mpn)
                    return true
                }
            }

            function filterRemoveDup(unique) {
                let mpn = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.mpn, unique)

                if (!mpn)
                    return false

                if (not_unique_product.includes(mpn)) {
                    return false
                }
                else {
                    return true
                }
            }

            function filterStock(stockName) {
                let availability = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.stock_level, stockName)

                if (!availability)
                    return false

                if (importParams.isGreater) {
                    if (categoryMap.stock_map.length > 0) {
                        if (parseInt(categoryMap.stock_map[0].name) <= parseInt(availability)) {
                            return true
                        }
                        else {
                            return false
                        }
                    }
                    else {
                        return true
                    }
                }
                else {
                    if (categoryMap.stock_map.length > 0) {
                        let catIndex = categoryMap.stock_map.findIndex(x => x.name.trim() === availability.trim())
                        if (catIndex !== -1) {
                            return true
                        }
                        else {
                            return false
                        }
                    }
                    else {
                        return true
                    }
                }
            }

            function filterCategories(cat) {
                const { category, subcategory, sub2category } = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createCategories(cat, importParams)

                if (categoryMap.isWhitelistSelected) {
                    if (categoryMap.whitelist_map.length > 0) {
                        let catIndex = categoryMap.whitelist_map.findIndex(x => x.name.trim() === category.trim())
                        if (catIndex !== -1) {
                            if (categoryMap.whitelist_map[catIndex].subcategory.length > 0) {
                                let subIndex = categoryMap.whitelist_map[catIndex].subcategory.findIndex(x => x.name.trim() === subcategory)
                                if (subIndex !== -1) {
                                    if (categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.length > 0) {
                                        let sub2Index = categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.findIndex(x => x.name.trim() === sub2category)
                                        if (sub2Index !== -1) {
                                            return true
                                        }
                                        else {
                                            return false
                                        }
                                    }
                                }
                                else {
                                    return false
                                }
                            }
                            else {
                                return true
                            }
                        }
                        else {
                            return false
                        }
                    }
                    return true
                }
                else {
                    if (categoryMap.blacklist_map.length > 0) {
                        let catIndex = categoryMap.blacklist_map.findIndex(x => x.name.trim() === category)
                        if (catIndex !== -1) {
                            if (categoryMap.blacklist_map[catIndex].subcategory.length > 0) {
                                let subIndex = categoryMap.blacklist_map[catIndex].subcategory.findIndex(x => x.name.trim() === subcategory)
                                if (subIndex !== -1) {
                                    if (categoryMap.blacklist_map[catIndex].subcategory[subIndex].subcategory.length > 0) {
                                        let sub2Index = categoryMap.blacklist_map[catIndex].subcategory[subIndex].subcategory.findIndex(x => x.name.trim() === sub2category)
                                        if (sub2Index !== -1) {
                                            return false
                                        }
                                        else {
                                            return true
                                        }
                                    }
                                }
                                else {
                                    return true
                                }
                            }
                            else {
                                return false
                            }
                        }
                        else {
                            return true
                        }
                    }
                    return true
                }
            }

            function filterPriceRange(priceRange) {
                let minPrice = categoryMap.minimumPrice ? parseFloat(categoryMap.minimumPrice) : 0;
                let maxPrice;
                if (categoryMap.maximumPrice && categoryMap.maximumPrice > 0) {
                    maxPrice = parseFloat(categoryMap.maximumPrice);
                }
                else {
                    maxPrice = 100000;
                }

                const productPrice = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.wholesale, priceRange)

                let suggested = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.retail_price, priceRange)

                if (!productPrice && !suggested) { return false }

                if (parseFloat(productPrice).toFixed(2) >= minPrice && parseFloat(productPrice).toFixed(2) <= maxPrice) {
                    return true
                }
                else {
                    return false
                }
            }

            return newData

        } catch (error) {
            console.log(error)
            return []
        }
    },

    createFields(s, o) {
        try {

            if (!s)
                return null
            // s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
            // s = s.replace(/^\./, '');           // strip a leading dot
            var a = s.split('.');
            for (var i = 0, n = a.length; i < n; ++i) {
                var k = a[i];
                if (typeof o === 'string')
                    return
                if (k in o) {
                    o = o[k];
                    if (o === null)
                        return

                    if (o.length === 1)
                        o = o[0]
                } else {
                    return;
                }
            }
            return o;

        } catch (error) {
            console.log(error)
            return null
        }
    },

    createCategories(cat, importParams) {
        try {
            const splitter = importParams.splitter
            let category = null
            let subcategory = null
            let sub2category = null
            if (splitter) {
                const tempCategory = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.category, cat)

                category = tempCategory.split(splitter)[0].trim()
                subcategory = tempCategory.split(splitter)[1] ? tempCategory.split(splitter)[1].trim() : null
                sub2category = tempCategory.split(splitter)[2] ? tempCategory.split(splitter)[2].trim() : null
            }
            else {
                category = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.category, cat)
                subcategory = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.subcategory, cat)
                sub2category = strapi
                    .plugin('import-products')
                    .service('productHelpers')
                    .createFields(importParams.sub2category, cat)
            }
            return { category, subcategory, sub2category }
        } catch (error) {
            console.log(error)
        }
    },

    async createProductFields(entry, dt, importRef) {
        try {
            const mapFields = importRef.mapFields

            const { category, subcategory, sub2category } = strapi
                .plugin('import-products')
                .service('productHelpers')
                .createCategories(dt, mapFields)

            const product = {
                entry,
                related_import: entry.id,
                name: this.createFields(mapFields.name, dt),
                supplierCode: this.createFields(mapFields.supplierCode, dt),
                description: this.createFields(mapFields.description, dt)
                    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, ''),
                short_description: this.createFields(mapFields.short_description, dt),
                category: {
                    title: category
                },
                subcategory: {
                    title: subcategory
                },
                sub2category: {
                    title: sub2category
                },
                mpn: this.createFields(mapFields.mpn, dt),
                barcode: this.createFields(mapFields.barcode, dt),
                stockLevel: this.createFields(mapFields.stock_level, dt),
                wholesale: this.createFields(mapFields.wholesale, dt),
                retail_price: this.createFields(mapFields.retail_price, dt),
                recycle_tax: this.createFields(mapFields.recycle_tax, dt),
                weight: this.createFields(mapFields.weight, dt),
                width: this.createFields(mapFields.width, dt),
                length: this.createFields(mapFields.length, dt),
                height: this.createFields(mapFields.height, dt),
                imagesSrc: [],
                additional_files: { url: this.createFields(mapFields.additional_files, dt) },
                link: this.createFields(mapFields.supplierProductURL, dt),
                in_offer: this.createFields(mapFields.in_offer, dt),
                skoutz_url: this.createFields(mapFields.skoutz_url, dt)
            }

            const image = this.createFields(mapFields.image, dt)
            const additional_images = this.createFields(mapFields.additional_images, dt)

            if (image) {
                product.imagesSrc.push({ url: image.trim() })
            }

            if (additional_images) {
                if (Array.isArray(additional_images)) {
                    for (let index = 0; index < additional_images.length; index++) {
                        if (index > 5)
                            break;
                        const element = additional_images[index];
                        product.imagesSrc.push({ url: element.trim() })
                    }
                    // additional_images.forEach(x => {
                    //     product.imagesSrc.push({ url: x.trim() })
                    // })
                }
                else {
                    product.imagesSrc.push({ url: additional_images.trim() })
                }
            }

            const brand = this.createFields(mapFields.brand, dt)
            if (brand) {
                const { brandId } = await this.brandIdCheck(brand, product.name);
                product.brand = { id: await brandId }
            }
            const attributes = this.createFields(mapFields.attributes, dt)

            if (attributes) {
                this.createAttributes(attributes, product, entry, importRef)
            }

            return product

        } catch (error) {
            console.error(error)
        }
    },

    async createScrapedProductFields(entry, scrapedProduct, importRef) {
        try {
            const { mpn, barcode, weight } = this.findIdentifiersFromChars(scrapedProduct.prod_chars)


            const product = {
                entry,
                related_import: entry.id,
                name: scrapedProduct.name?.trim() || '',
                supplierCode: scrapedProduct.supplierCode?.trim() || '',
                description: scrapedProduct.description
                    ? scrapedProduct.description
                        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
                        .trim()
                    : '',
                short_description: scrapedProduct.short_description?.trim() || '',

                // ✅ Categories already set from scraping
                category: scrapedProduct.category,
                subcategory: scrapedProduct.subcategory,
                sub2category: scrapedProduct.sub2category,

                // Identifiers                
                mpn: scrapedProduct.mpn ? scrapedProduct.mpn : mpn?.trim() || null,
                barcode: scrapedProduct.barcode ? scrapedProduct.barcode : barcode?.trim() || null,
                model: scrapedProduct.model?.trim() || null,

                // Stock & pricing
                stockLevel: scrapedProduct.stockLevel?.trim() || '',
                wholesale: scrapedProduct.wholesale ? String(scrapedProduct.wholesale).trim() : null,
                retail_price: scrapedProduct.retail_price ? String(scrapedProduct.retail_price).trim() : null,
                initial_wholesale: scrapedProduct.initial_wholesale ? String(scrapedProduct.initial_wholesale).trim() : null,
                recycle_tax: scrapedProduct.recycle_tax ? String(scrapedProduct.recycle_tax).trim() : null,
                in_offer: scrapedProduct.in_offer || false,
                discount: scrapedProduct.discount || 0,

                // Dimensions & weight
                weight: scrapedProduct.weight ? scrapedProduct.weight : weight || null,
                width: scrapedProduct.width || null,
                length: scrapedProduct.length || null,
                height: scrapedProduct.height || null,

                // Images & files
                imagesSrc: scrapedProduct.imagesSrc || [],
                additional_files: scrapedProduct.additional_files || null,

                // Links & metadata
                link: scrapedProduct.link?.trim() || null,
                skoutz_url: scrapedProduct.skoutz_url?.trim() || null,

                // Characteristics
                prod_chars: scrapedProduct.prod_chars || [],

                // Status
                status: scrapedProduct.status || 'InStock',
                relativeProducts: scrapedProduct.relativeProducts || []
            };

            // ✅ Handle brand
            if (scrapedProduct.brand) {
                const brandValue = typeof scrapedProduct.brand === 'string'
                    ? scrapedProduct.brand
                    : scrapedProduct.brand.name;

                if (brandValue) {
                    const { brandId } = await strapi
                        .plugin('import-products')
                        .service('productHelpers')
                        .brandIdCheck(brandValue, product.name);

                    if (brandId) {
                        product.brand = { id: brandId };
                    }
                }
            }

            return product;

        } catch (error) {
            console.error('Error in createScrapedProductFields:', error.message);
            throw error;
        }
    },

    findIdentifiersFromChars(prod_chars) {

        let mpn = prod_chars.find(({ name }) => name === "Part Number")?.value;
        let barcode = prod_chars.find(({ name }) => name === "EAN Number")?.value;
        let weightChar = prod_chars.find(({ name }) => name === "Μεικτό βάρος");

        let weight = null;

        if (weightChar) {
            let scrappedWeight = weightChar?.value;
            let weightName = weightChar?.name.toLowerCase();
            let combinedText = `${scrappedWeight} ${weightName}`.toLowerCase();

            // Εξάγουμε μόνο τον αριθμό από το value
            const numericValue = scrappedWeight.replace(/[^\d.,]/g, '').replace(',', '.').trim();
            const parsedValue = parseFloat(numericValue);

            if (!isNaN(parsedValue)) {
                if (combinedText.includes('kg')) {
                    weight = Math.round(parsedValue * 1000);
                } else if (combinedText.includes('gr') || combinedText.includes('γρ')) {
                    weight = Math.round(parsedValue);
                }
            }
        }

        return { mpn, barcode, weight }
    },

    createAttributes(attributes, product, entry, importRef) {
        try {

            const chars = []
            if (entry.name.toLowerCase() === 'oktabit') {
                for (const [key, value] of Object.entries(attributes)) {
                    const char = {}
                    char.name = key.trim()
                    char.value = value.replaceAll('&apos;', "'").trim()
                    chars.push(char)
                }
            }
            else if (entry.name.toLowerCase() === 'telehermes') {
                if (Array.isArray(attributes)) {
                    for (let productChar of attributes) {
                        if (productChar.$.key.trim() === "Κατάσταση" ||
                            productChar.$.key.trim() === "Διαθεσιμότητα" ||
                            productChar.$.value.trim() === "[NULL]")
                            continue
                        {
                            const char = {}
                            char.name = this.createFields('$.key', productChar)
                            char.value = this.createFields('$.value', productChar)
                            chars.push(char)
                        }
                    }
                }
                else {
                    if (attributes.$.key.trim() === "Κατάσταση" ||
                        attributes.$.key.trim() === "Διαθεσιμότητα" ||
                        attributes.$.value.trim() === "[NULL]")
                        return

                    const char = {}
                    char.name = this.createFields('$.key', attributes)
                    char.value = this.createFields('$.value', attributes)
                    chars.push(char)

                }
            }
            else if (entry.name.toLowerCase() === 'smart4all') {
                if (Array.isArray(attributes)) {
                    for (let productChar of attributes) {
                        const char = {}
                        char.name = this.createFields('FEATURE_NAME', productChar)
                        char.value = this.createFields('FEATURE_VALUE', productChar)
                        chars.push(char)
                    }
                }
                else {
                    const char = {}
                    char.name = this.createFields('FEATURE_NAME', attributes)
                    char.value = this.createFields('FEATURE_VALUE', attributes)
                    chars.push(char)
                }
            }
            else if (entry.name.toLowerCase() === 'westnet') {
                if (Array.isArray(attributes)) {
                    for (let productChar of attributes) {
                        {
                            if (productChar.name && productChar.value) {
                                const char = {}
                                char.name = this.createFields('name', productChar)
                                char.value = this.createFields('value', productChar)
                                chars.push(char)
                            }
                        }
                    }
                }
                else {
                    try {
                        if (Array.isArray(attributes)) {
                            for (let productChar of attributes) {

                                if (productChar.name && productChar.value) {
                                    const char = {}
                                    char.name = this.createFields('name', productChar.trim())
                                    char.value = this.createFields('value', productChar.trim())
                                    chars.push(char)
                                }
                                else if (productChar.Name && productChar.Value) {
                                    const char = {}
                                    char.name = this.createFields('Name', productChar.trim())
                                    char.value = this.createFields('Value', productChar.trim())
                                    chars.push(char)
                                }
                            }
                        }
                        else {
                            if (attributes.name && attributes.value) {
                                const char = {}
                                char.name = this.createFields('name', attributes.trim())
                                char.value = this.createFields('value', attributes.trim())
                                chars.push(char)
                            }
                            else if (attributes.Name && attributes.Value) {
                                const char = {}
                                char.name = this.createFields('Name', attributes.trim())
                                char.value = this.createFields('value', attributes.trim())
                                chars.push(char)
                            }
                        }

                    } catch (error) {
                        console.error(error)
                    }
                }
            }
            else if (entry.name.toLowerCase() === 'globalsat') {
                const charStings = attributes.split("|")

                for (let charSting of charStings) {

                    const charSplit = charSting.split(":")
                    if (charSplit[0].trim() !== "") {
                        const char = {}
                        char.name = charSplit[0]?.trim()
                        char.value = charSplit[1]?.trim()
                        chars.push(char)
                    }
                }
            }
            // else if (entry.name.toLowerCase() === 'dotmedia') {

            //     for (let productChar of attributes.attr.Specification) {
            //         const char = {}
            //         char.name = productChar.Name[0]
            //         char.value = productChar.Value[0]
            //         chars.push(char)
            //     }
            // }

            const parsedChars = strapi
                .plugin('import-products')
                .service('charnameService')
                .parseChars(chars, importRef)

            product.prod_chars = parsedChars

        } catch (error) {
            console.error(error)
        }

    },

    createProductWeight(product, categoryInfo) {
        try {
            // Αν υπάρχει ήδη βάρος, επιστροφή
            if (product.weight && product.weight > 0) {
                return parseInt(product.weight);
            }

            let weight = 0;

            // 1η προτεραιότητα: Υπολογισμός από διαστάσεις
            if (product.length && product.width && product.height) {
                const length = Number(product.length);
                const width = Number(product.width);
                const height = Number(product.height);

                if (!isNaN(length) && !isNaN(width) && !isNaN(height) &&
                    length > 0 && width > 0 && height > 0) {
                    const calcWeight = (length * width * height) / 5;
                    weight = Math.ceil(calcWeight);
                    return weight;
                }
            }

            // 2η προτεραιότητα: Υπολογισμός από φόρο ανακύκλωσης
            if (product.recycle_tax) {
                const tax = parseFloat(product.recycle_tax);

                if (!isNaN(tax) && tax > 0 && categoryInfo) {
                    if (categoryInfo.slug === "othones-ypologisti" ||
                        categoryInfo.slug === "othones-surveilance-cctv" ||
                        categoryInfo.slug === "tileoraseis") {
                        weight = Math.ceil(tax * 1000 / 0.25424);
                    } else {
                        weight = Math.ceil(tax * 1000 / 0.16);
                    }
                    return weight;
                }
            }

            // 3η προτεραιότητα: Μέσος όρος κατηγορίας
            if (categoryInfo?.average_weight && categoryInfo.average_weight > 0) {
                weight = parseInt(categoryInfo.average_weight);
                return weight;
            }

            // 4η προτεραιότητα: Default τιμή
            return 1000;

        } catch (error) {
            console.error('Error calculating product weight:', error, 'Product:', product.mpn || product.id);
            return 1000; // Fallback σε περίπτωση σφάλματος
        }
    },

    async checkProductAndBrand(mpn, name, barcode, brand, model) {
        try {
            const { entryCheck } = await this.checkIfProductExists(mpn, barcode, name, model);

            const { brandId } = await this.brandIdCheck(brand, name);

            return { entryCheck, brandId }


        } catch (error) {
            console.error(error)
        }

    },

    /**
 * Safe brandIdCheck - improved version
 * Should replace the existing one in productHelpers.js
 */
    async brandIdCheck(brand, name) {
        try {
            if (!brand || brand === 'undefined' || brand.trim() === '') {
                // Try to find brand from product name
                const cacheService = strapi.plugin('import-products').service('cacheService');
                const foundBrand = cacheService.findBrandInProductName(name);
                return { brandId: foundBrand?.id || null };
            }

            const brandTrimmed = brand.trim();

            // ✅ 1. Check cache first (ALWAYS!)
            const cacheService = strapi.plugin('import-products').service('cacheService');
            let brandFromCache = cacheService.getBrandByName(brandTrimmed);

            if (brandFromCache) {
                return { brandId: brandFromCache.id };
            }

            // ✅ 2. Query database to check if brand exists
            // This handles cases where brand wasn't in initial cache
            const existingBrand = await strapi.db.query('api::brand.brand').findOne({
                where: {
                    $or: [
                        { name: { $eqi: brandTrimmed } },
                        { slug: { $eq: this.createSlug(brandTrimmed, null) } }
                    ]
                },
                select: ['id', 'name', 'slug']
            }).catch(err => {
                console.warn(`Error querying brand ${brandTrimmed}:`, err.message);
                return null;
            });

            if (existingBrand) {
                // ✅ Add to cache for future use
                cacheService.cache.brands.set(brandTrimmed.toLowerCase(), existingBrand);
                cacheService.cache.brands.set(existingBrand.slug, existingBrand);
                return { brandId: existingBrand.id };
            }

            // ✅ 3. Create new brand only if it doesn't exist
            const brandSlug = this.createSlug(brandTrimmed, null);

            try {
                const newBrand = await strapi.entityService.create('api::brand.brand', {
                    data: {
                        name: brandTrimmed,
                        slug: brandSlug,
                        publishedAt: new Date()
                    },
                });

                // ✅ Add to cache
                cacheService.cache.brands.set(brandTrimmed.toLowerCase(), newBrand);
                cacheService.cache.brands.set(brandSlug, newBrand);

                // console.log(`✅ Created new brand: ${brandTrimmed}`);
                return { brandId: newBrand.id };

            } catch (createError) {
                // ✅ Handle "already exists" error from race condition
                if (createError.message?.includes('unique') || createError.details?.errors?.[0]?.message?.includes('unique')) {
                    console.warn(`Brand ${brandTrimmed} was created by another process, querying again...`);

                    // Query again
                    const retryBrand = await strapi.db.query('api::brand.brand').findOne({
                        where: { name: { $eqi: brandTrimmed } },
                        select: ['id', 'name', 'slug']
                    }).catch(err => {
                        console.error(`Final retry failed for brand ${brandTrimmed}:`, err.message);
                        return null;
                    });

                    if (retryBrand) {
                        cacheService.cache.brands.set(brandTrimmed.toLowerCase(), retryBrand);
                        cacheService.cache.brands.set(retryBrand.slug, retryBrand);
                        return { brandId: retryBrand.id };
                    }
                }

                console.error(`Error creating brand ${brandTrimmed}:`, createError.message);
                return { brandId: null };
            }

        } catch (error) {
            console.error('Error in brandIdCheck:', error.message);
            return { brandId: null };
        }
    },

    async saveSEO(imgid, product) {
        try {
            let brand
            if (product.brand)
                brand = await strapi.entityService.findOne('api::brand.brand', parseInt(product.brand.id), {
                    fields: ['name'],
                })

            let productName = product.name.replace(/\//g, "_");
            // const slug = slugify(`${productName}-${product.mpn}`, { lower: true, remove: /[*+~=#.,°;_()/'"!:@]/g })
            // const canonicalURL = `http://localhost:3000/product/${slug}`

            let metaDescription = `${productName}${product.short_description}`.length > 160 ?
                `${productName}${product.short_description}`.substring(0, 159) :
                `${productName}${product.short_description}`.length > 50 ?
                    `${productName}${product.short_description}` :
                    `${productName}${product.short_description}${productName}${product.short_description}
            ${productName}${product.short_description}`.substring(0, 50)

            let keywords = `${brand?.name},${product.mpn},${product.barcode}`

            return [{
                metaTitle: productName.substring(0, 59),
                metaDescription: metaDescription,
                metaImage: {
                    id: imgid
                },
                keywords: `${keywords}`,
                // canonicalURL: canonicalURL,
                metaViewport: "width=device-width, initial-scale=1",
                metaSocial: [
                    {
                        socialNetwork: "Facebook",
                        title: productName.substring(0, 59),
                        description: `${productName}`.substring(0, 64),
                        image: {
                            id: imgid
                        },
                    },
                    {
                        socialNetwork: "Twitter",
                        title: productName.substring(0, 59),
                        description: `${productName}`.substring(0, 64),
                        image: {
                            id: imgid
                        },
                    }
                ]
            }]

        } catch (error) {
            console.error(error)
        }
    },

    updateProductWeight(entryCheck, product, categoryInfo, data, dbChange) {
    try {
        const productWeight = product.weight && product.weight > 0 ? parseInt(product.weight) : null;
        const avgWeight = categoryInfo?.average_weight ? parseInt(categoryInfo.average_weight) : null;
        const currentWeight = entryCheck.weight ? parseInt(entryCheck.weight) : 0;
        
        // Αν έχουμε νέο βάρος από το scraping
        if (productWeight !== null) {
            // Προτεραιότητα: product weight > average weight
            const newWeight = productWeight || avgWeight;
            
            // Update μόνο αν το νέο βάρος είναι διαφορετικό από το τρέχον
            if (newWeight > 0 && currentWeight !== newWeight) {
                data.weight = newWeight;
                dbChange.typeOfChange = 'updated';
            }
        } 
        // Αν ΔΕΝ έχουμε βάρος από scraping αλλά δεν υπάρχει καθόλου βάρος στη βάση
        else if (currentWeight === 0 && avgWeight !== null) {
            // Χρησιμοποίησε το average weight μόνο σαν fallback
            data.weight = avgWeight;
            dbChange.typeOfChange = 'updated';
        }
        // Αλλιώς κρατάμε το υπάρχον βάρος (δεν κάνουμε τίποτα)
        
    } catch (error) {
        console.error('Error updating product weight:', error, 'Product:', entryCheck.id);
        // Fallback: Βάλε default βάρος ΜΟΝΟ αν δεν υπάρχει καθόλου
        if (!entryCheck.weight || entryCheck.weight === 0) {
            data.weight = 1000;
            dbChange.typeOfChange = 'updated';
        }
    }
}

});
