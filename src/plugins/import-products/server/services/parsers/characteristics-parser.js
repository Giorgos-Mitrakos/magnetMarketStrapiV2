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
    /**
 * Parse characteristics from DotMedia XML format
 * Input: Array with XML string containing multiple <Specification> tags
 * @param {Array|string} xmlData - Array with XML string or plain string
 * @returns {Array} Array of {name, value} objects
 */
    async parseFromDotMediaXml(xmlData) {
        if (!xmlData) return [];

        try {
            // Get the string from array or use as-is
            const xmlString = Array.isArray(xmlData) ? xmlData[0] : xmlData;

            if (!xmlString || typeof xmlString !== 'string') return [];

            // Wrap in root element to make valid XML
            const wrapped = `<root>${xmlString}</root>`;

            // Parse XML
            const parsed = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .parseXml(wrapped);

            if (!parsed?.root?.Specification) return [];

            const specs = Array.isArray(parsed.root.Specification)
                ? parsed.root.Specification
                : [parsed.root.Specification];

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
 * Extract characteristics from HTML description (Zegetron/multiple formats)
 * @param {Array|string} htmlData - HTML description
 * @returns {Array} Array of {name, value} objects
 */
    parseFromHtmlZegetronDescription(htmlData) {
        if (!htmlData) return [];

        try {
            const htmlDescription = Array.isArray(htmlData) ? htmlData[0] : htmlData;
            if (!htmlDescription || typeof htmlDescription !== 'string') return [];

            const chars = [];

            // Format 1: Table με spec-lvl-1 (HAVN products)
            const tableRegex = /<tr[^>]*class="spec-lvl-1"[^>]*>.*?<td[^>]*>.*?<div[^>]*class="small"[^>]*>(.*?)<\/div>.*?<\/td>.*?<td[^>]*>.*?<div[^>]*class="small"[^>]*>(.*?)<\/div>.*?<\/td>.*?<\/tr>/gs;
            let match;
            while ((match = tableRegex.exec(htmlDescription)) !== null) {
                const name = this.cleanHtml(match[1]);
                const value = this.cleanHtml(match[2]);
                if (name && value) chars.push({ name, value });
            }

            // Format 2: UL με product-tech-spec (Razer HyperFlux style)
            const techSpecRegex = /<li[^>]*class="row[^"]*mx-0[^"]*"[^>]*>.*?<div[^>]*class="[^"]*feature[^"]*"[^>]*>(.*?)<\/div>(?:.*?<div[^>]*class="col-12[^"]*"[^>]*>(.*?)<\/div>)?.*?<\/li>/gs;
            while ((match = techSpecRegex.exec(htmlDescription)) !== null) {
                let name = this.cleanHtml(match[1]);
                let value = match[2] ? this.cleanHtml(match[2]) : null;

                // Extract nested <li> items
                if (!value && match[0].includes('<li>')) {
                    const nestedItems = [];
                    const nestedRegex = /<li>(.*?)<\/li>/gs;
                    let nestedMatch;
                    while ((nestedMatch = nestedRegex.exec(match[0])) !== null) {
                        nestedItems.push(this.cleanHtml(nestedMatch[1]));
                    }
                    value = nestedItems.join(', ');
                }

                // Handle "Name: Value" inside feature div
                if (!value && name.includes(':')) {
                    [name, value] = name.split(':').map(s => s.trim());
                }

                if (name && value) chars.push({ name, value });
            }

            // Format 3: Simple <li>Name: Value</li>
            const simpleListRegex = /<li[^>]*>(.*?)<\/li>/gs;
            while ((match = simpleListRegex.exec(htmlDescription)) !== null) {
                const content = this.cleanHtml(match[1]);
                if (content.includes(':')) {
                    const [name, ...valueParts] = content.split(':');
                    const value = valueParts.join(':').trim();
                    if (name && value && !chars.some(c => c.name === name.trim())) {
                        chars.push({ name: name.trim(), value });
                    }
                }
            }

            // Format 4: <div><strong>Name:</strong> Value</div>
            const divStrongRegex = /<div[^>]*><strong>(.*?):?<\/strong>\s*(.*?)<\/div>/gs;
            while ((match = divStrongRegex.exec(htmlDescription)) !== null) {
                const name = this.cleanHtml(match[1]);
                const value = this.cleanHtml(match[2]);
                if (name && value && !chars.some(c => c.name === name)) {
                    chars.push({ name, value });
                }
            }

            // Format 5: Olympus style - <p>● Text</p> followed by structured data
            const olympusRegex = /<p[^>]*class="header5[^"]*"[^>]*><strong>(.*?):?<\/strong>\s*(.*?)<\/p>/gs;
            while ((match = olympusRegex.exec(htmlDescription)) !== null) {
                const name = this.cleanHtml(match[1]);
                const value = this.cleanHtml(match[2]);
                if (name && value && !chars.some(c => c.name === name)) {
                    chars.push({ name, value });
                }
            }

            // Format 6: Right-aligned dimensions <p style="text-align: right">Text</p>
            const dimensionRegex = /<p[^>]*style="text-align:\s*right"[^>]*>(.*?)<\/p>/gs;
            while ((match = dimensionRegex.exec(htmlDescription)) !== null) {
                const content = this.cleanHtml(match[1]);
                if (content.includes(':')) {
                    const [name, ...valueParts] = content.split(':');
                    const value = valueParts.join(':').trim();
                    if (name && value && !chars.some(c => c.name === name.trim())) {
                        chars.push({ name: name.trim(), value });
                    }
                }
            }

            return chars;

        } catch (error) {
            console.error('Error parsing Zegetron HTML characteristics:', error);
            return [];
        }
    },

    /**
 * Clean Stefinet description for website display
 * Removes data-start, data-end, data:start, data:end etc attributes
 * @param {Array|string} cdataContent - Raw CDATA content
 * @returns {string} Clean HTML ready for display
 */
    cleanStefinetDescription(cdataContent) {
        if (!cdataContent) return '';

        try {
            // Get string from array
            let htmlString = Array.isArray(cdataContent) ? cdataContent[0] : cdataContent;
            if (!htmlString || typeof htmlString !== 'string') return '';

            // Unescape HTML entities (&lt; -> <, &gt; -> >, etc)
            htmlString = htmlString
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&nbsp;/g, ' ');

            // ✅ FIXED: Remove all data attributes (with dash OR colon)
            // Matches: data-start, data-end, data:start, data:end, data-is-last-node, etc
            htmlString = htmlString
                .replace(/\s+data[-:][a-z0-9_:-]+="[^"]*"/gi, '')
                .replace(/\s+data[-:][a-z0-9_:-]+='[^']*'/gi, '')

                // Remove empty attributes
                .replace(/\s+class=""\s*/gi, ' ')
                .replace(/\s+class=''\s*/gi, ' ')

                // Clean multiple spaces
                .replace(/\s{2,}/g, ' ')

                // Clean spaces around tags
                .replace(/\s+>/g, '>')
                .replace(/>\s+</g, '><')

                .trim();

            return htmlString;

        } catch (error) {
            console.error('Error cleaning Stefinet description:', error);
            return '';
        }
    },

    /**
     * Clean HTML tags and decode entities
     */
    cleanHtml(text) {
        if (!text) return '';

        return text
            .replace(/<[^>]+>/g, '') // Remove HTML tags
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/●/g, '') // Remove bullets
            .trim();
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