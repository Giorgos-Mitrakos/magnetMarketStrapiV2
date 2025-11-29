'use strict';

/**
 * Characteristics Parser Service
 * Centralized characteristics extraction from various formats
 */
module.exports = ({ strapi }) => ({

    /**
     * Parse characteristics from DotMedia XML format
     * Input: <Specification><Name>X</Name><Value>Y</Value></Specification>
     * @param {string} xmlString - XML string with Specification tags
     * @returns {Array} Array of {name, value} objects
     */
    async parseFromDotMediaXml(xmlString) {
        if (!xmlString || typeof xmlString !== 'string') return [];

        try {
            // Wrap in root element if not already wrapped
            const wrapped = xmlString.startsWith('<attr>') 
                ? xmlString 
                : `<attr>${xmlString}</attr>`;

            // Parse XML
            const parsed = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .parseXml(wrapped);

            if (!parsed?.attr?.Specification) return [];

            const specs = Array.isArray(parsed.attr.Specification) 
                ? parsed.attr.Specification 
                : [parsed.attr.Specification];

            const chars = [];

            for (const spec of specs) {
                const name = Array.isArray(spec.Name) ? spec.Name[0] : spec.Name;
                const value = Array.isArray(spec.Value) ? spec.Value[0] : spec.Value;

                if (name && value) {
                    chars.push({
                        name: String(name).trim(),
                        value: String(value).trim()
                    });
                }
            }

            return chars;

        } catch (error) {
            console.error('Error parsing DotMedia XML characteristics:', error);
            return [];
        }
    },

    /**
     * Parse characteristics from Globalsat Attributes string
     * Format: "Brand : HUAWEI| Weight : 233.5 gr| RAM : 16GB"
     * @param {string} attributesString - Pipe-separated attributes
     * @returns {Array} Array of {name, value} objects
     */
    parseFromGlobalsatAttributes(attributesString) {
        if (!attributesString || typeof attributesString !== 'string') return [];

        const chars = [];
        const attributes = attributesString.split('|');

        for (const attr of attributes) {
            const [name, value] = attr.split(':').map(s => s?.trim());

            if (name && value) {
                chars.push({ name, value });
            }
        }

        return chars;
    },

    /**
     * Parse characteristics from Oktabit format
     * Input: Object with key-value pairs
     * @param {Object} productAttributes - Object with attributes
     * @returns {Array} Array of {name, value} objects
     */
    parseFromOktabitFormat(productAttributes) {
        if (!productAttributes || typeof productAttributes !== 'object') return [];

        const chars = [];

        for (const [key, value] of Object.entries(productAttributes)) {
            if (key && value) {
                chars.push({
                    name: String(key).trim(),
                    value: String(value).replaceAll('&apos;', "'").trim()
                });
            }
        }

        return chars;
    },

    /**
     * Parse characteristics from Telehermes format
     * Input: Array of {$: {key: 'X', value: 'Y'}}
     * @param {Array} specifications - Array of specification objects
     * @returns {Array} Array of {name, value} objects
     */
    parseFromTelehermesFormat(specifications) {
        if (!specifications || !Array.isArray(specifications)) return [];

        const chars = [];
        const specsArray = Array.isArray(specifications) ? specifications : [specifications];

        for (const spec of specsArray) {
            // Skip invalid entries
            if (!spec || !spec.$) continue;

            const name = spec.$.key?.trim();
            const value = spec.$.value?.trim();

            // Skip specific unwanted characteristics
            if (!name || !value) continue;
            if (name === "Κατάσταση" || name === "Διαθεσιμότητα") continue;
            if (value === "[NULL]") continue;

            chars.push({ name, value });
        }

        return chars;
    },

    /**
     * Parse characteristics from Smart4All format
     * Input: Array of {FEATURE_NAME: 'X', FEATURE_VALUE: 'Y'}
     * @param {Array} features - Array of feature objects
     * @returns {Array} Array of {name, value} objects
     */
    parseFromSmart4AllFormat(features) {
        if (!features || !Array.isArray(features)) return [];

        const chars = [];
        const featuresArray = Array.isArray(features) ? features : [features];

        for (const feature of featuresArray) {
            const name = feature.FEATURE_NAME?.trim();
            const value = feature.FEATURE_VALUE?.trim();

            if (name && value) {
                chars.push({ name, value });
            }
        }

        return chars;
    },

    /**
     * Parse characteristics from Westnet format
     * Input: Array of {name: 'X', value: 'Y'} or {Name: 'X', Value: 'Y'}
     * @param {Array} specs - Array of spec objects
     * @returns {Array} Array of {name, value} objects
     */
    parseFromWestnetFormat(specs) {
        if (!specs || !Array.isArray(specs)) return [];

        const chars = [];
        const specsArray = Array.isArray(specs) ? specs : [specs];

        for (const spec of specsArray) {
            if (!spec) continue;

            // Try lowercase first
            let name = spec.name?.trim();
            let value = spec.value?.trim();

            // Try uppercase if lowercase doesn't exist
            if (!name || !value) {
                name = spec.Name?.trim();
                value = spec.Value?.trim();
            }

            if (name && value) {
                chars.push({ name, value });
            }
        }

        return chars;
    },

    /**
     * Parse characteristics from CPI/generic array format
     * Input: Array of {Name: ['X'], Value: ['Y']} (XML parsed format)
     * @param {Array} items - Array of item objects
     * @returns {Array} Array of {name, value} objects
     */
    parseFromCpiFormat(items) {
        if (!items || !Array.isArray(items)) return [];

        const chars = [];

        for (const item of items) {
            if (!item) continue;

            const name = Array.isArray(item.Name) ? item.Name[0] : item.Name;
            const value = Array.isArray(item.Value) ? item.Value[0] : item.Value;

            if (name && value) {
                chars.push({
                    name: String(name).trim(),
                    value: String(value).trim()
                });
            }
        }

        return chars;
    },

    /**
     * Clean and normalize characteristics
     * @param {Array} characteristics - Raw characteristics array
     * @returns {Array} Cleaned characteristics
     */
    cleanCharacteristics(characteristics) {
        if (!characteristics || !Array.isArray(characteristics)) return [];

        return characteristics
            .filter(char => char && char.name && char.value) // Remove invalid
            .map(char => ({
                name: String(char.name)
                    .trim()
                    .replace(/&apos;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&gt;/g, ">")
                    .replace(/&lt;/g, "<")
                    .replace(/&nbsp;/g, " "),
                value: String(char.value)
                    .trim()
                    .replace(/&apos;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&gt;/g, ">")
                    .replace(/&lt;/g, "<")
                    .replace(/&nbsp;/g, " ")
            }))
            .filter(char => char.name && char.value); // Remove empty after cleaning
    },

    /**
     * Main extraction method - tries all methods based on supplier
     * @param {Object} options - Extraction options
     * @returns {Array} Array of {name, value} objects
     */
    async extract({ rawData, mapFields, supplier, importRef }) {
        let chars = [];

        if (!rawData || !mapFields?.attributes) return chars;

        // Get the attributes field value
        const attributesField = this.getNestedValue(rawData, mapFields.attributes);
        if (!attributesField) return chars;

        // Supplier-specific extraction
        if (supplier) {
            const supplierLower = supplier.toLowerCase();

            if (supplierLower === 'dotmedia') {
                chars = await this.parseFromDotMediaXml(attributesField);
            } else if (supplierLower === 'globalsat') {
                chars = this.parseFromGlobalsatAttributes(attributesField);
            } else if (supplierLower === 'oktabit') {
                chars = this.parseFromOktabitFormat(attributesField);
            } else if (supplierLower === 'telehermes') {
                chars = this.parseFromTelehermesFormat(attributesField);
            } else if (supplierLower === 'smart4all') {
                chars = this.parseFromSmart4AllFormat(attributesField);
            } else if (supplierLower === 'westnet') {
                chars = this.parseFromWestnetFormat(attributesField);
            } else if (supplierLower === 'cpi') {
                chars = this.parseFromCpiFormat(attributesField);
            }
        }

        // Generic extraction for arrays
        if (chars.length === 0 && Array.isArray(attributesField)) {
            // Try CPI format first
            chars = this.parseFromCpiFormat(attributesField);
            
            // Try Westnet format
            if (chars.length === 0) {
                chars = this.parseFromWestnetFormat(attributesField);
            }
        }

        // Clean characteristics
        chars = this.cleanCharacteristics(chars);

        // Apply charname mapping if importRef provided
        if (chars.length > 0 && importRef) {
            chars = strapi
                .plugin('import-products')
                .service('charnameService')
                .parseChars(chars, importRef);
        }

        return chars;
    },

    /**
     * Get nested value from object
     * @param {Object} obj - Object to search
     * @param {string} path - Path in dot notation
     * @returns {any} Value or null
     */
    getNestedValue(obj, path) {
        if (!obj || !path) return null;

        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current && typeof current === 'object') {
                current = current[key];
            } else {
                return null;
            }
        }

        return current;
    },

    /**
     * Merge characteristics from multiple sources
     * Useful when product has characteristics from both XML and description
     * @param {Array} sources - Array of characteristic arrays
     * @returns {Array} Merged unique characteristics
     */
    merge(...sources) {
        const merged = new Map();

        for (const chars of sources) {
            if (!chars || !Array.isArray(chars)) continue;

            for (const char of chars) {
                if (!char || !char.name) continue;

                const key = char.name.toLowerCase().trim();
                
                // Keep first occurrence (priority order matters)
                if (!merged.has(key)) {
                    merged.set(key, char);
                }
            }
        }

        return Array.from(merged.values());
    }
});