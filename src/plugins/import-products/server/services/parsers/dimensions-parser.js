'use strict';

/**
 * Dimensions Parser Service
 * Centralized dimensions extraction (length, width, height)
 */
module.exports = ({ strapi }) => ({

    /**
     * Extract dimensions from product characteristics
     * @param {Array} characteristics - Array of {name, value} objects
     * @returns {Object|null} {length, width, height} in mm or null
     */
    extractFromCharacteristics(characteristics) {
        if (!characteristics || !Array.isArray(characteristics)) return null;

        // Dimension characteristic patterns
        const dimensionPatterns = [
            'dimensions',
            'διαστάσεις',
            'product dimensions',
            'διαστάσεις προϊόντος',
            'package dimensions',
            'διαστάσεις συσκευασίας',
            'size',
            'μέγεθος'
        ];

        // Find dimension characteristic
        const dimChar = characteristics.find(char => {
            const name = char.name?.toLowerCase() || '';
            return dimensionPatterns.some(pattern => name.includes(pattern));
        });

        if (!dimChar?.value) return null;

        return this.parseDimensionsValue(dimChar.value);
    },

    /**
     * Parse dimensions value from string
     * Handles formats: "100x200x300mm", "10x20x30cm", "100 x 200 x 300", etc.
     * @param {string} value - Dimensions value as string
     * @returns {Object|null} {length, width, height} in mm or null
     */
    parseDimensionsValue(value) {
        if (!value) return null;

        const valueStr = String(value).toLowerCase().trim();

        // Check if millimeters or centimeters
        const isMillimeters = valueStr.includes('mm');
        const isCentimeters = valueStr.includes('cm') && !valueStr.includes('mm');

        // Extract numbers (handles decimals with . or ,)
        const matches = valueStr.match(/\d+(?:[.,]\d+)?/g);

        if (!matches || matches.length < 3) return null;

        // Parse the first 3 numbers (length, width, height)
        const values = matches.slice(0, 3).map(v => parseFloat(v.replace(',', '.')));

        if (values.some(v => isNaN(v) || v <= 0)) return null;

        // Convert to mm if needed
        const multiplier = isCentimeters ? 10 : (isMillimeters ? 1 : 10); // Default to cm if not specified

        return {
            length: Math.round(values[0] * multiplier),
            width: Math.round(values[1] * multiplier),
            height: Math.round(values[2] * multiplier)
        };
    },

    /**
     * Extract dimensions from Globalsat format
     * Format: "100x200x300" or "10χ20χ30" (Greek chi)
     * @param {string} dimensionsString - Dimensions string from Globalsat
     * @returns {Object|null} {length, width, height} in mm or null
     */
    extractFromGlobalsatFormat(dimensionsString) {
        if (!dimensionsString || typeof dimensionsString !== 'string') return null;

        try {
            // Replace Greek chi with x, normalize spaces
            const normalized = dimensionsString
                .replace(/χ/gi, 'x')
                .replace(/\s+/g, '')
                .replace(/,/gi, '.');

            const values = normalized.split('x');

            if (values.length !== 3) return null;

            const parsed = values.map(v => Number(v.trim()));

            if (parsed.some(v => isNaN(v) || v <= 0)) return null;

            // Globalsat sends in cm by default (or mm if large numbers)
            // If all values > 1000, assume mm, otherwise cm
            const allLarge = parsed.every(v => v > 1000);
            const multiplier = allLarge ? 1 : 10;

            return {
                length: Math.round(parsed[0] * multiplier),
                width: Math.round(parsed[1] * multiplier),
                height: Math.round(parsed[2] * multiplier)
            };
        } catch (error) {
            console.warn('Error parsing Globalsat dimensions:', error);
            return null;
        }
    },

    /**
     * Extract dimensions from Westnet characteristics
     * @param {Array} characteristics - Product characteristics array
     * @returns {Object|null} {length, width, height} in mm or null
     */
    extractFromWestnetCharacteristics(characteristics) {
        if (!characteristics || !Array.isArray(characteristics)) return null;

        const dimChar = characteristics.find(x => x.name?.includes('Dimensions'));

        if (!dimChar?.value?.trim()) return null;

        const value = dimChar.value;
        const isMillimeters = value.includes('mm');
        const multiplier = isMillimeters ? 1 : 10;

        // Extract all numbers
        const matches = value.match(/\d+(?:[.,]\d+)?/g);

        if (!matches || matches.length < 3) return null;

        const values = matches.slice(0, 3).map(v => parseFloat(v.replace(',', '.')));

        if (values.some(v => isNaN(v) || v <= 0)) return null;

        return {
            length: Math.round(values[0] * multiplier),
            width: Math.round(values[1] * multiplier),
            height: Math.round(values[2] * multiplier)
        };
    },

    /**
     * Extract dimensions from raw data fields
     * @param {Object} rawData - Raw product data
     * @param {Object} mapFields - Field mapping
     * @returns {Object|null} {length, width, height} in mm or null
     */
    extractFromRawData(rawData, mapFields) {
        if (!rawData || !mapFields) return null;

        const length = this.getNestedValue(rawData, mapFields.length);
        const width = this.getNestedValue(rawData, mapFields.width);
        const height = this.getNestedValue(rawData, mapFields.height);

        if (!length || !width || !height) return null;

        const parsedLength = this.parseNumericValue(length);
        const parsedWidth = this.parseNumericValue(width);
        const parsedHeight = this.parseNumericValue(height);

        if (!parsedLength || !parsedWidth || !parsedHeight) return null;

        return {
            length: parsedLength,
            width: parsedWidth,
            height: parsedHeight
        };
    },

    /**
     * Parse numeric value from string
     * @param {string|number} value - Value to parse
     * @returns {number|null} Parsed number or null
     */
    parseNumericValue(value) {
        if (typeof value === 'number') return value > 0 ? Math.round(value) : null;

        if (typeof value !== 'string') return null;

        const cleaned = value.replace(',', '.').trim();
        const parsed = parseFloat(cleaned);

        return !isNaN(parsed) && parsed > 0 ? Math.round(parsed) : null;
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
     * Main extraction method - tries all methods
     * @param {Object} options - Extraction options
     * @returns {Object|null} {length, width, height} in mm or null
     */
    extract({ characteristics, rawData, mapFields, supplier }) {
        let dimensions = null;

        // 1. Try from characteristics
        if (characteristics?.length > 0) {
            if (supplier?.toLowerCase() === 'westnet') {
                dimensions = this.extractFromWestnetCharacteristics(characteristics);
            } else {
                dimensions = this.extractFromCharacteristics(characteristics);
            }

            if (dimensions) return dimensions;
        }

        // 2. Try supplier-specific extraction
        if (supplier?.toLowerCase() === 'globalsat' && rawData?.DimensionsPackage) {
            dimensions = this.extractFromGlobalsatFormat(rawData.DimensionsPackage);
            if (dimensions) return dimensions;
        }

        // 3. Try from raw data fields
        if (rawData && mapFields) {
            dimensions = this.extractFromRawData(rawData, mapFields);
            if (dimensions) return dimensions;
        }

        return null;
    },

    /**
     * Validate dimensions (sanity check)
     * @param {Object} dimensions - {length, width, height}
     * @returns {boolean} True if valid
     */
    validate(dimensions) {
        if (!dimensions) return false;

        const { length, width, height } = dimensions;

        // Check all values exist and are numbers
        if (!length || !width || !height) return false;
        if (typeof length !== 'number' || typeof width !== 'number' || typeof height !== 'number') return false;

        // Sanity check: between 1mm and 5000mm (5 meters)
        const min = 1;
        const max = 5000;

        return length >= min && length <= max &&
            width >= min && width <= max &&
            height >= min && height <= max;
    }
});