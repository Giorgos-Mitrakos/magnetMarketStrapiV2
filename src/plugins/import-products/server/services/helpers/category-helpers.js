'use strict';

module.exports = ({ strapi }) => ({
    async getCategory(categoryMap, name, category, sub_category, sub_category2) {
        const normalizeString = (str) => str?.trim().toLowerCase() || '';

        const findMatchingMapping = (items, name) => {
            if (!items?.length) return null;

            for (const word of items) {
                if (!word || !word.name) continue;
                if (normalizeString(name).includes(normalizeString(word.name))) {
                    return word.value.trim();
                }
            }
            return null;
        };

        const normalizedCategory = normalizeString(category);
        const cat = categoryMap.find(x => normalizeString(x.name) === normalizedCategory);

        if (!cat) {
            return this.getUncategorizedCategory();
        }

        let categoryMapping = cat.value.trim();
        const normalizedSubCategory = normalizeString(sub_category);
        const sub = cat.subcategory?.find(x => normalizeString(x.name) === normalizedSubCategory);

        if (sub) {
            const normalizedSubCategory2 = normalizeString(sub_category2);
            const sub2 = sub.subcategory?.find(x => normalizeString(x.name) === normalizedSubCategory2);

            if (sub2) {
                const matchedMapping = findMatchingMapping(sub2.contains, name);
                categoryMapping = matchedMapping || sub2.value.trim();
            } else {
                const matchedMapping = findMatchingMapping(sub.contains, name);
                categoryMapping = matchedMapping || sub.value.trim();
            }
        } else {
            const matchedMapping = findMatchingMapping(cat.contains, name);
            categoryMapping = matchedMapping || cat.value.trim();
        }

        // ✅ Use cache instead of DB query
        return strapi
            .plugin('import-products')
            .service('cacheService')
            .getCategoryBySlug(categoryMapping);
    },

    getUncategorizedCategory() {
        return strapi
            .plugin('import-products')
            .service('cacheService')
            .getCategoryBySlug('uncategorized');
    }
});
