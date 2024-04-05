'use strict';

const { object } = require("prop-types");

module.exports = ({ strapi }) => ({

    filterData(data, categoryMap, importParams) {

        const unique_product = []
        const not_unique_product = []

        const newData = data
            .filter(filterStock)
            .filter(filterPriceRange)
            .filter(filterCategories)
            .filter(filterImage)
            .filter(filterUnique)
            .filter(filterRemoveDup)

        function filterUnique(unique) {
            let mpn = strapi
                .plugin('import-products')
                .service('productHelpers')
                .createFields(importParams.mpn, unique)

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

            if (not_unique_product.includes(mpn)) {
                return false
            }
            else {
                return true
            }
        }

        function filterImage(imageUrl) {
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

        function filterStock(stockName) {
            let availability = strapi
                .plugin('import-products')
                .service('productHelpers')
                .createFields(importParams.stock_level, stockName)

            if (!availability)
                return false

            if (importParams.isGreater) {

                if (categoryMap.stock_map.length > 0) {
                    // let catIndex = categoryMap.stock_map[0].findIndex(x => x.name.trim() === stockName.stock[0].trim())
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
            // let category = null
            // let subcategory = null
            // let sub2category = null
            // if (splitter) {
            //     const tempCategory = strapi
            //         .plugin('import-products')
            //         .service('productHelpers')
            //         .createFields(importParams.category, cat)

            //     category = tempCategory.split(splitter)[0].trim()
            //     subcategory = tempCategory.split(splitter)[1] ? cat.CATEGORY[0].split(splitter)[1].trim() : null
            //     sub2category = tempCategory.split(splitter)[2] ? cat.CATEGORY[0].split(splitter)[2].trim() : null

            // }
            // else {
            //     category = strapi
            //         .plugin('import-products')
            //         .service('productHelpers')
            //         .createFields(importParams.category, cat)
            //     subcategory = strapi
            //         .plugin('import-products')
            //         .service('productHelpers')
            //         .createFields(importParams.subcategory, cat)
            //     sub2category = strapi
            //         .plugin('import-products')
            //         .service('productHelpers')
            //         .createFields(importParams.sub2category, cat)
            // }

            const { category, subcategory, sub2category } = strapi
                .plugin('import-products')
                .service('productHelpers')
                .createCategories(cat, importParams)

            if (categoryMap.isWhitelistSelected) {
                if (categoryMap.whitelist_map.length > 0) {
                    let catIndex = categoryMap.whitelist_map.findIndex(x => x.name.trim() === category)
                    if (catIndex !== -1) {
                        // return true
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
                        // return false
                        if (categoryMap.blacklist_map[catIndex].subcategory.length > 0) {
                            let subIndex = categoryMap.blacklist_map[catIndex].subcategory.findIndex(x => x.name.trim() === subcategory)
                            if (subIndex !== -1) {
                                if (categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.length > 0) {
                                    let sub2Index = categoryMap.whitelist_map[catIndex].subcategory[subIndex].subcategory.findIndex(x => x.name.trim() === sub2category)
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

    },

    createFields(s, o) {

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
                if (o.length === 1)
                    o = o[0]
            } else {
                return;
            }
        }
        return o;
    },

    createCategories(cat, importParams) {
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
            subcategory = tempCategory.split(splitter)[1] ? cat.CATEGORY[0].split(splitter)[1].trim() : null
            sub2category = tempCategory.split(splitter)[2] ? cat.CATEGORY[0].split(splitter)[2].trim() : null

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
    },

    async createProductFields(entry, dt, importRef) {

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
            description: this.createFields(mapFields.description, dt),
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
            recycleTax: this.createFields(mapFields.recycle_tax, dt),
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
                additional_images.forEach(x => {
                    product.imagesSrc.push({ url: x.trim() })
                })
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
    },

    createAttributes(attributes, product, entry, importRef) {

        const chars = []
        if (entry.name.toLowerCase() === 'oktabit') {
            for (const [key, value] of Object.entries(attributes)) {
                const char = {}
                char.name = key.trim()
                char.value = value.trim()
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
        else {
            try {
                if (Array.isArray(attributes)) {
                    for (let productChar of attributes) {
                        if (productChar.name && productChar.value) {
                            const char = {}
                            char.name = this.createFields('name', productChar)
                            char.value = this.createFields('value', productChar)
                            chars.push(char)
                        }
                        else if (productChar.Name && productChar.Value) {
                            const char = {}
                            char.name = this.createFields('Name', productChar)
                            char.value = this.createFields('Value', productChar)
                            chars.push(char)
                        }
                    }
                }
                else {
                    if (attributes.name && attributes.value) {
                        const char = {}
                        char.name = this.createFields('name', attributes)
                        char.value = this.createFields('value', attributes)
                        chars.push(char)
                    }
                    else if (attributes.Name && attributes.Value) {
                        const char = {}
                        char.name = this.createFields('Name', attributes)
                        char.value = this.createFields('value', attributes)
                        chars.push(char)
                    }
                }

            } catch (error) {
                console.log(error, attributes)
            }
        }

        const parsedChars = strapi
            .plugin('import-products')
            .service('charnameService')
            .parseChars(chars, importRef)

        product.prod_chars = parsedChars

    },


    createProductWeight(product, categoryInfo) {
        try {
            let weight = 0
            if (!product.weight) {
                if (product.length && product.width && product.height) {
                    let calcWweight = parseInt(product.length) * parseInt(product.width) * parseInt(product.height) / 5
                    weight = parseInt(calcWweight)
                }
                else if (product.recycleTax) {
                    let tax = parseFloat(product.recycleTax)
                    if (categoryInfo) {
                        if (categoryInfo.slug === "othones-ypologisti"
                            || categoryInfo.slug === "othones-surveilance-cctv"
                            || categoryInfo.slug === "tileoraseis") {
                            weight = parseInt(tax * 1000 / 0.25424)
                        }
                        else {
                            weight = parseInt(tax * 1000 / 0.16)
                        }
                    }
                }
                else if (categoryInfo.average_weight > 0) {
                    weight = parseInt(categoryInfo.average_weight)
                }
                else {
                    weight = parseInt(1000)
                }
            }
            else {
                weight = parseInt(product.weight)
            }
            return weight
        } catch (error) {
            console.log(error)
        }
    },

    async checkProductAndBrand(mpn, name, barcode, brand, model) {
        const { entryCheck } = await this.checkIfProductExists(mpn, barcode, name, model);

        const { brandId } = await this.brandIdCheck(brand, name);

        return { entryCheck, brandId }

    },

    async brandIdCheck(brand, name) {
        try {
            let brandId;
            if (!brand) {
                const brandEntries = await strapi.entityService.findMany('api::brand.brand', {
                    fields: ['name'],
                });

                let sortedBrandArray = brandEntries.sort(function (a, b) {
                    return b.name.length - a.name.length;
                });

                const brandFound = sortedBrandArray.find(x => name?.toLowerCase().includes(x.name.toLowerCase()))

                if (brandFound) {
                    brandId = brandFound.id
                    return { brandId }
                }
            }

            const brandCheck = await strapi.db.query('api::brand.brand').findOne({
                where: { name: brand },
            });

            brandId = brandCheck?.id

            if (!brandCheck && brand) {
                let newbrand = await strapi.entityService.create('api::brand.brand', {
                    data: {
                        name: brand,
                        slug: '',
                        publishedAt: new Date()
                    },
                })

                brandId = await newbrand.id
            }

            return { brandId };
        } catch (error) {
            console.log(brand, error)
        }
    },

    async checkIfProductExists(mpn, barcode, name, model) {
        try {
            const entryCheck = await strapi.db.query('api::product.product').findOne({
                where: {
                    $or: [
                        {
                            $and: [
                                { mpn: mpn },
                                { barcode: barcode }
                            ]
                        },
                        {
                            $and: [
                                { mpn: mpn },
                                // { mpn: { $notNull: true, } },
                                // { barcode: { $null: true, } }
                            ]
                        },
                        {
                            $and: [
                                { mpn: model },
                                { mpn: { $notNull: true, } },
                                // { barcode: { $null: true, } }
                            ]
                        },
                        {
                            $and: [
                                { model: mpn },
                                { mpn: { $notNull: true, } },
                                // { barcode: { $null: true, } }
                            ]
                        },
                        {
                            $and: [
                                { barcode: barcode },
                                { mpn: { $null: true, } }
                            ]
                        },
                        {
                            $and: [
                                { name: name },
                                { mpn: { $null: true, } },
                                { barcode: { $null: true, } }
                            ]
                        },
                    ]
                },
                populate: {
                    supplierInfo: {
                        populate: {
                            price_progress: true,
                        }
                    },
                    related_import: true,
                    brand: true,
                    category: {
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
                    platforms: true
                },
            });

            return { entryCheck }
        } catch (error) {
            console.log(error)
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

    updateSupplierInfo(entryCheck, product, data, dbChange) {
        let supplierInfo = entryCheck.supplierInfo;

        dbChange = 'skipped'

        // Αναζητώ τον προμηθευτή
        let supplierInfoUpdate = supplierInfo.findIndex(o => o.name === product.entry.name)

        // αν υπάρχει ο προμηθευτής
        // αλλίως δημιουργώ τον προμηθευτή για το προϊόν και κρατάω ιστορικό
        if (supplierInfoUpdate !== -1) {
            // ελέγχω αν η αποθηκευμένη τιμή χονδρικής είναι μηδενική
            if (parseFloat(supplierInfo[supplierInfoUpdate].wholesale) <= 0) {
                // Αν η τιμή χονδρικής είναι μεγαλύτερη από μηδεν, την αποθηκεύω στον προμηθευτή
                // αλλιώς βάζω το προϊόν μη διαθέσιμο από τον προμηθευτή
                if (parseFloat(product.wholesale) > 0) {
                    supplierInfo[supplierInfoUpdate].wholesale = parseFloat(product.wholesale)
                    supplierInfo[supplierInfoUpdate].in_stock = true
                    data.supplierInfo = supplierInfo
                    dbChange = 'updated'
                }
                else {
                    if (product.entry.name.toLowerCase() !== 'dotmedia')
                        if (supplierInfo[supplierInfoUpdate].in_stock === true) {
                            supplierInfo[supplierInfoUpdate].in_stock = false
                            data.supplierInfo = supplierInfo
                            dbChange = 'updated'
                        }
                }
            }
            else {
                // Αν υπάρχει τιμή χονδρικής και είναι διαφορετική από την τιμή που έχω
                // αποθηκευμένη στη βάση τότε κρατάω ιστορικό και ενημερώνω με τη νέα τιμη
                // αλλιώς αν
                if (strapi
                    .plugin('import-products')
                    .service('priceHelpers')
                    .is_not_equal(supplierInfo[supplierInfoUpdate].wholesale, product.wholesale)) {

                    const price_progress = supplierInfo[supplierInfoUpdate].price_progress;

                    const price_progress_data = this.createPriceProgress(product)

                    price_progress.push(price_progress_data)

                    supplierInfo[supplierInfoUpdate] = this.createSupplierInfoData(product, price_progress)
                    data.supplierInfo = supplierInfo
                    dbChange = 'updated'
                }
                else {
                    if (supplierInfo[supplierInfoUpdate].in_stock === false) {
                        supplierInfo[supplierInfoUpdate].in_stock = true
                        data.supplierInfo = supplierInfo
                        dbChange = 'republished'
                    }
                }
            }
        }
        else {
            const price_progress_data = this.createPriceProgress(product)

            supplierInfo.push(this.createSupplierInfoData(product, price_progress_data))

            dbChange = 'created'
            data.supplierInfo = supplierInfo
        }

    },

    createPriceProgress(product) {

        let price_progress = {
            date: new Date(),
        }

        if (product.in_offer) {
            price_progress.in_offer = product.in_offer
        }

        if (product.discount) {
            price_progress.discount = product.discount
        }

        if (product.initial_wholesale) {
            price_progress.initial_wholesale = parseFloat(product.initial_wholesale).toFixed(2)
        }

        if (product.wholesale) {
            price_progress.wholesale = parseFloat(product.wholesale).toFixed(2)
        }

        return price_progress

    },

    createSupplierInfoData(product, price_progress) {

        const supplierInfo = {
            name: product.entry.name,
            in_stock: true,
            wholesale: parseFloat(product.wholesale).toFixed(2),
            supplierProductId: product.supplierCode,
            supplierProductURL: product.link,
        }

        if (Array.isArray(price_progress)) {
            supplierInfo.price_progress = price_progress
        }
        else {
            supplierInfo.price_progress = [price_progress]
        }

        if (product.in_offer) {
            supplierInfo.in_offer = product.in_offer
        }

        if (product.initial_retail_price) {
            supplierInfo.initial_retail_price = parseFloat(product.initial_retail_price).toFixed(2)
        }

        if (product.retail_price) {
            supplierInfo.retail_price = parseFloat(product.retail_price).toFixed(2)
        }

        if (product.recycleTax) {
            supplierInfo.recycle_tax = parseFloat(product.recycleTax).toFixed(2)
        }

        if (product.quantity) {
            supplierInfo.quantity = parseInt(product.quantity)
        }

        return supplierInfo
    },

});
