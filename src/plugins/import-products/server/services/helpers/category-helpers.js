'use strict';

module.exports = ({ strapi }) => ({
    async getCategory(categoryMap, name, category, sub_category, sub_category2) {
        let cat = categoryMap.find(x => x.name.trim().toLowerCase() === category.trim().toLowerCase())

        let categoryMapping = "Uncategorized"

        if (cat) {
            let sub = cat.subcategory.find(x => x.name.trim().toLowerCase() === sub_category.toLowerCase().trim())
            if (sub) {
                let sub2 = sub.subcategory.find(x => x.name.trim().toLowerCase() === sub_category2?.toLowerCase().trim())
                if (sub2) {
                    if (sub2.contains.length > 0) {
                        for (let word of sub2.contains) {
                            if (name.trim().includes(word.name.trim())) {
                                categoryMapping = word.value.trim()
                                break;
                            }
                            else {
                                categoryMapping = sub2.value.trim()
                            }
                        }
                    }
                    else {
                        categoryMapping = sub2.value.trim()
                    }
                }
                else {
                    if (sub.contains.length > 0) {
                        for (let word of sub.contains) {
                            if (name.trim().toLowerCase().includes(word.name.trim().toLowerCase())) {
                                categoryMapping = word.value.trim()
                                break;
                            }
                            else {
                                categoryMapping = sub.value.trim()
                            }
                        }
                    }
                    else {
                        categoryMapping = sub.value.trim()
                    }
                }
            }
            else {
                if (cat.contains.length > 0) {
                    for (let word of cat.contains) {
                        if (name.trim().toLowerCase().includes(word.name.trim().toLowerCase())) {
                            categoryMapping = word.value.trim()
                            break;
                        }
                        else {
                            categoryMapping = cat.value.trim()
                        }
                    }

                }
                else {
                    categoryMapping = cat.value.trim()
                }
            }
        }

        let categoryID = await strapi.db.query('api::category.category').findOne({
            select: ['id', 'slug', 'average_weight'],
            where: { slug: categoryMapping },
            populate: {
                supplierInfo: true,
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
        });

        if (categoryID === null) {
            let uncategorized = await strapi.db.query('api::category.category').findOne({
                select: ['id', 'slug'],
                where: { slug: "uncategorized" },
                populate: {
                    supplierInfo: true,
                    cat_percentage: true
                }
            });
            return await uncategorized
        }
        return categoryID
    },
});
