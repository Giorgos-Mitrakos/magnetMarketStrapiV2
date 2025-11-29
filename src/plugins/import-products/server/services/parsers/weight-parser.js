'use strict';

/**
 * Weight Parser Service
 * Centralized weight extraction from various formats
 */
module.exports = ({ strapi }) => ({

    /**
     * Extract weight from product characteristics
     * @param {Array} characteristics - Array of {name, value} objects
     * @returns {number|null} Weight in grams
     */
    extractFromCharacteristics(characteristics) {
        if (!characteristics || !Array.isArray(characteristics)) return null;

        // Weight characteristic patterns (priority order)
        const weightPatterns = [
            'weight',
            'βάρος',
            'gross weight',
            'μεικτό βάρος',
            'net weight',
            'καθαρό βάρος',
            'product weight',
            'βάρος προϊόντος',
            'package weight',
            'βάρος συσκευασίας'
        ];

        // Find weight characteristic
        const weightChar = characteristics.find(char => {
            const name = char.name?.toLowerCase() || '';
            return weightPatterns.some(pattern => 
                name.includes(pattern) && 
                !name.includes('μέγιστο') && // Exclude "max weight"
                !name.includes('maximum')
            );
        });

        if (!weightChar?.value) return null;

        return this.parseWeightValue(weightChar.value);
    },

    /**
     * Extract weight from free text (descriptions)
     * @param {string} text - Text containing weight info
     * @returns {number|null} Weight in grams
     */
    extractFromText(text) {
        if (!text || typeof text !== 'string') return null;

        const weights = [];

        // Pattern 1: Weight in kg (various formats)
        const kgPatterns = [
            /(?:weight|βάρος|gross|gw)[\s:]*(\d{1,3}[.,]\d{1,3})\s*kg/gi,
            /(\d{1,3}[.,]\d{1,3})\s*kg/gi,
            /weight\s*\(kg\)[\s:]*(\d{1,3}[.,]\d{1,3})/gi
        ];

        for (const pattern of kgPatterns) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                const value = parseFloat(match[1].replace(',', '.'));
                if (!isNaN(value) && value > 0) {
                    weights.push(value * 1000); // Convert to grams
                }
            }
        }

        // Pattern 2: Weight in grams
        const gramsPatterns = [
            /(?:weight|βάρος)[\s:]*(\d{1,5})\s*(?:grams?|gr?|g\b)/gi,
            /(\d{1,5})\s*(?:grams?|gr)/gi
        ];

        for (const pattern of gramsPatterns) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                const value = parseFloat(match[1]);
                if (!isNaN(value) && value > 0) {
                    weights.push(value);
                }
            }
        }

        // Return maximum weight found (usually gross weight)
        return weights.length > 0 ? Math.max(...weights) : null;
    },

    /**
     * Extract weight from raw data fields
     * @param {Object} rawData - Raw product data from supplier
     * @param {Object} mapFields - Field mapping configuration
     * @returns {number|null} Weight in grams
     */
    extractFromRawData(rawData, mapFields) {
        if (!rawData || !mapFields?.weight) return null;

        const weightField = this.getNestedValue(rawData, mapFields.weight);
        if (!weightField) return null;

        return this.parseWeightValue(weightField);
    },

    /**
     * Parse weight value from string
     * Handles various formats: "2.5kg", "2500g", "2,5 kg", etc.
     * @param {string} value - Weight value as string
     * @returns {number|null} Weight in grams
     */
    parseWeightValue(value) {
        if (!value) return null;

        const valueStr = String(value).toLowerCase().trim();

        // Check for specific patterns
        const patterns = [
            // Gross Weight (priority)
            {
                regex: /gw[:\s]*(\d{1,3}[.,]?\d{0,3})\s*kgs?/i,
                multiplier: 1000
            },
            // Gross in text
            {
                regex: /gross[:\s]*(\d{1,3}[.,]?\d{0,3})\s*kgs?/i,
                multiplier: 1000
            },
            // Kilograms
            {
                regex: /(\d{1,3}[.,]?\d{0,3})\s*kgs?/i,
                multiplier: 1000
            },
            // Grams
            {
                regex: /(\d{1,5})\s*(?:grams?|gr?|g\b)/i,
                multiplier: 1
            },
            // Just numbers (assume grams if < 100, kg if > 100)
            {
                regex: /^(\d{1,5}[.,]?\d{0,3})$/,
                multiplier: null // Will be determined dynamically
            }
        ];

        for (const { regex, multiplier } of patterns) {
            const match = valueStr.match(regex);
            if (match) {
                const numValue = parseFloat(match[1].replace(',', '.'));
                if (isNaN(numValue) || numValue <= 0) continue;

                // Determine multiplier for plain numbers
                let finalMultiplier = multiplier;
                if (multiplier === null) {
                    finalMultiplier = numValue < 100 ? 1000 : 1; // < 100 = kg, >= 100 = grams
                }

                const weight = Math.round(numValue * finalMultiplier);
                
                // Sanity check: weight should be between 1g and 500kg
                if (weight >= 1 && weight <= 500000) {
                    return weight;
                }
            }
        }

        return null;
    },

    /**
     * Get nested value from object using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Path in dot notation (e.g., "specs.weight")
     * @returns {any} Value at path or null
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
     * Extract weight from Globalsat Attributes string
     * Format: "Brand : X| Weight : 2.5 kg| Other : value"
     * @param {string} attributesString - Pipe-separated attributes
     * @returns {number|null} Weight in grams
     */
    extractFromGlobalsatAttributes(attributesString) {
        if (!attributesString || typeof attributesString !== 'string') return null;

        // Split by pipe
        const attributes = attributesString.split('|');
        
        for (const attr of attributes) {
            const [name, value] = attr.split(':').map(s => s.trim());
            
            if (!name || !value) continue;
            
            const nameLower = name.toLowerCase();
            if (nameLower.includes('weight') || nameLower.includes('βάρος')) {
                const weight = this.parseWeightValue(value);
                if (weight) return weight;
            }
        }

        return null;
    },

    /**
     * Extract weight from DotMedia characteristics
     * Handles both kg and grams in description (can be array from XML parser)
     * @param {string|Array} description - Product description with weight info or array
     * @returns {number|null} Weight in grams
     */
    extractFromDotMediaDescription(description) {
        if (!description) return null;

        // If array from XML parser, take first element
        let text = description;
        if (Array.isArray(description)) {
            text = description[0];
        }

        if (typeof text !== 'string') return null;

        const weights = [];

        // Weight in kilos (prioritize non-gross weights)
        const weightInKilos = [];
        
        // Pattern 1: Weight: X.X kg (not Gross)
        const kgPattern1 = text.matchAll(/(?<!Gross )Weight\s*:?\s*(\d{1,3}[.,]?\d{0,3})\s*kg/gmi);
        for (const match of kgPattern1) {
            weightInKilos.push(match);
        }

        // Pattern 2: Weight (kg): X.X
        const kgPattern2 = text.matchAll(/Weight\s*\(kg\)\s*:?\s*(\d{1,3}[.,]?\d{0,3})/gmi);
        for (const match of kgPattern2) {
            weightInKilos.push(match);
        }

        if (weightInKilos.length > 0) {
            const weightsList = [];
            weightInKilos.flat().forEach(wt => {
                const result = wt.match(/\d{1,3}[.,]\d{0,3}/);
                if (result) {
                    weightsList.push(result[0]);
                }
            });

            if (weightsList.length > 0) {
                const maxWeight = weightsList.reduce((prev, current) => {
                    return (parseFloat(prev.replace(',', '.')) > parseFloat(current.replace(',', '.'))) 
                        ? prev 
                        : current;
                });
                weights.push(parseFloat(maxWeight.replace(',', '.')) * 1000);
            }
        }

        // Weight in grams
        const weightInGrams = [];
        
        // Pattern 1: Weight: X g
        const gramsPattern1 = text.matchAll(/Weight\s*:?\s*(\d{1,5})\s*g(?:\s|$)/gmi);
        for (const match of gramsPattern1) {
            weightInGrams.push(match);
        }

        // Pattern 2: Weight (gram): X or Weight (g): X
        const gramsPattern2 = text.matchAll(/Weight\s*\((gram|g)\)\s*:?\s*(\d{1,5})/gmi);
        for (const match of gramsPattern2) {
            weightInGrams.push(match);
        }

        if (weightInGrams.length > 0) {
            const weightsList = [];
            weightInGrams.flat().forEach(wt => {
                const result = wt.match(/\d{1,5}/);
                if (result) {
                    weightsList.push(result[0]);
                }
            });

            if (weightsList.length > 0) {
                const maxWeight = weightsList.reduce((prev, current) => {
                    return (parseFloat(prev) > parseFloat(current)) ? prev : current;
                });
                weights.push(parseFloat(maxWeight));
            }
        }

        // Return maximum weight found
        return weights.length > 0 ? Math.max(...weights) : null;
    },

    /**
     * Main extraction method - tries all methods in order
     * @param {Object} options - Extraction options
     * @param {Array} options.characteristics - Product characteristics
     * @param {string} options.text - Product description/text
     * @param {Object} options.rawData - Raw product data
     * @param {Object} options.mapFields - Field mapping
     * @param {string} options.supplier - Supplier name for specific handling
     * @returns {number|null} Weight in grams
     */
    extract({ characteristics, text, rawData, mapFields, supplier }) {
        let weight = null;

        // 1. Try from characteristics (most reliable)
        if (characteristics?.length > 0) {
            weight = this.extractFromCharacteristics(characteristics);
            if (weight) return weight;
        }

        // 2. Try supplier-specific extraction
        if (supplier) {
            const supplierLower = supplier.toLowerCase();
            
            if (supplierLower === 'globalsat' && rawData?.Attributes) {
                weight = this.extractFromGlobalsatAttributes(rawData.Attributes);
                if (weight) return weight;
            }
            
            if (supplierLower === 'dotmedia' && text) {
                weight = this.extractFromDotMediaDescription(text);
                if (weight) return weight;
            }
        }

        // 3. Try from text/description
        if (text) {
            weight = this.extractFromText(text);
            if (weight) return weight;
        }

        // 4. Try from raw data field
        if (rawData && mapFields) {
            weight = this.extractFromRawData(rawData, mapFields);
            if (weight) return weight;
        }

        return null;
    }
});