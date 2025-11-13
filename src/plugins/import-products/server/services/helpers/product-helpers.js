'use strict';

module.exports = ({ strapi }) => ({

    filterData(data, categoryMap, importParams) {
        try {

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
                        let catIndex = categoryMap.whitelist_map.findIndex(x => x.name.trim() === category.trim())
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
            console.log(error)
        }
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
                    console.log(char)

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
                        console.log(error)
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
            console.log(error)
        }

    },

    createProductWeight(product, categoryInfo) {
        try {
            let weight = 0
            if (!product.weight) {
                if (product.length && product.width && product.height) {
                    let calcWweight = Number(product.length) * Number(product.width) * Number(product.height) / 5
                    weight = parseInt(calcWweight)
                }
                else if (product.recycle_tax) {
                    let tax = parseFloat(product.recycle_tax)
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
        try {
            const { entryCheck } = await this.checkIfProductExists(mpn, barcode, name, model);

            const { brandId } = await this.brandIdCheck(brand, name);

            return { entryCheck, brandId }


        } catch (error) {
            console.log(error)
        }

    },

    async brandIdCheck(brand, name) {
        try {
            let brandId;
            if (!brand || brand === 'undefined') {
                const brandEntries = await strapi.entityService.findMany('api::brand.brand', {
                    fields: ['name'],
                });

                let sortedBrandArray = brandEntries.sort(function (a, b) {
                    return b.name.length - a.name.length;
                });

                const first3words = name?.trim().split(' ').slice(0, 3).join(' ')
                const brandFoundInFirst3Words = sortedBrandArray.find(x => first3words?.toLowerCase().includes(x.name.toLowerCase()));

                if (brandFoundInFirst3Words) {
                    brandId = brandFoundInFirst3Words.id
                    return { brandId }
                }
                else {
                    const brandFound = sortedBrandArray.find(x => name?.toLowerCase().includes(x.name.toLowerCase()))
                    if (brandFound) {
                        brandId = brandFound.id
                        return { brandId }
                    }
                }

                return { brandId: null }
            }

            const brandSlug = strapi
                .plugin('import-products')
                .service('importHelpers')
                .createSlug(brand, null)

            const brandCheck = await strapi.db.query('api::brand.brand').findOne({
                where: {
                    $or: [
                        { name: brand.trim() },
                        { slug: brandSlug }
                    ]
                },
            });

            brandId = brandCheck?.id

            if (!brandCheck && brand) {
                let newbrand = await strapi.entityService.create('api::brand.brand', {
                    data: {
                        name: brand.trim(),
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
                                { mpn: mpn?.trim() },
                                { barcode: barcode?.trim() }
                            ]
                        },
                        {
                            $and: [
                                { mpn: mpn?.trim() },
                                // { mpn: { $notNull: true, } },
                                // { barcode: { $null: true, } }
                            ]
                        },
                        {
                            $and: [
                                { mpn: model?.trim() },
                                { mpn: { $notNull: true, } },
                                // { barcode: { $null: true, } }
                            ]
                        },
                        {
                            $and: [
                                { model: mpn?.trim() },
                                { mpn: { $notNull: true, } },
                                // { barcode: { $null: true, } }
                            ]
                        },
                        {
                            $and: [
                                { barcode: barcode?.trim() },
                                { mpn: { $null: true, } }
                            ]
                        },
                        {
                            $and: [
                                { name: name?.trim() },
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
                    platforms: true,
                    prod_chars: true
                },
            });

            return { entryCheck }
        } catch (error) {
            console.log(error, "mpn:", mpn)
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
        if (!product.weight) {
            product.weight = this.createProductWeight(product, categoryInfo);
        }

        const productWeight = product.weight > 0 ? parseInt(product.weight) : 0;
        const avgWeight = categoryInfo.average_weight ? parseInt(categoryInfo.average_weight) : 0;
        const currentWeight = entryCheck.weight ? parseInt(entryCheck.weight) : 0;

        // Προτεραιότητα: product weight > average weight
        const newWeight = productWeight || avgWeight;

        // Update μόνο αν υπάρχει νέο βάρος ΚΑΙ είναι διαφορετικό από το τρέχον
        if (newWeight > 0 && currentWeight !== newWeight) {
            data.weight = newWeight;
            dbChange.typeOfChange = 'updated';
        }
    }

});
