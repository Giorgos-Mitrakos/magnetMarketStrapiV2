'use strict';

/**
 * Images Parser Service
 * Centralized image URL extraction and normalization
 */
module.exports = ({ strapi }) => ({

    /**
     * Extract images from raw data using field mapping
     * @param {Object} rawData - Raw product data
     * @param {Object} mapFields - Field mapping configuration
     * @returns {Array} Array of {url: string} objects
     */
    extractFromRawData(rawData, mapFields) {
        const images = [];

        if (!rawData || !mapFields) return images;

        // Main image
        if (mapFields.image) {
            const mainImage = this.getNestedValue(rawData, mapFields.image);
            if (mainImage && this.isValidImageUrl(mainImage)) {
                images.push({ url: mainImage.trim() });
            }
        }

        // Additional images (single field that might be array or single URL)
        if (mapFields.additional_images) {
            const additionalImages = this.getNestedValue(rawData, mapFields.additional_images);

            if (additionalImages) {
                if (Array.isArray(additionalImages)) {
                    // Array of images
                    additionalImages.forEach(img => {
                        const url = typeof img === 'string' ? img : img?.url;
                        if (url && this.isValidImageUrl(url)) {
                            images.push({ url: url.trim() });
                        }
                    });
                } else if (typeof additionalImages === 'string') {
                    // Single image URL
                    if (this.isValidImageUrl(additionalImages)) {
                        images.push({ url: additionalImages.trim() });
                    }
                }
            }
        }

        return images;
    },

    /**
     * Extract images from Globalsat format (Image1Link, Image2Link, etc.)
     * @param {Object} rawData - Raw Globalsat product data
     * @param {number} maxImages - Maximum number of images to extract (default: 5)
     * @returns {Array} Array of {url: string} objects
     */
    extractFromGlobalsatFormat(rawData, maxImages = 5) {
        const images = [];

        if (!rawData) return images;

        // Globalsat sends images as Image1Link, Image2Link, Image3Link, etc.
        for (let i = 1; i <= maxImages; i++) {
            const fieldName = `Image${i}Link`;
            const imageUrl = rawData[fieldName];

            if (Array.isArray(imageUrl)) {
                // Array of images
                imageUrl.forEach(img => {
                    const url = typeof img === 'string' ? img : img?.url;
                    if (url && this.isValidImageUrl(url)) {
                        images.push({ url: url.trim() });
                    }
                });
            } else if (typeof imageUrl === 'string') {
                // Single image URL
                if (this.isValidImageUrl(additionalImages)) {
                    images.push({ url: additionalImages.trim() });
                }
            }
        }

        return images;
    },

    /**
     * Extract images from DotMedia format (ImageLink, ImageLink2, ImageLink3)
     * @param {Object} rawData - Raw DotMedia product data
     * @returns {Array} Array of {url: string} objects
     */
    extractFromDotMediaFormat(rawData) {
        const images = [];

        if (!rawData) return images;

        // Helper to extract URL from array or string
        const extractUrl = (value) => {
            if (!value) return null;
            // If array, take first element
            if (Array.isArray(value)) {
                return value[0]?.trim() || null;
            }
            // If string, use directly
            return String(value).trim();
        };

        // DotMedia main image
        const mainImage = extractUrl(rawData.ImageLink);
        if (mainImage && this.isValidImageUrl(mainImage)) {
            images.push({ url: mainImage });
        }

        // Additional images (ImageLink2, ImageLink3)
        for (let i = 2; i <= 3; i++) {
            const fieldName = `ImageLink${i}`;
            const imageUrl = extractUrl(rawData[fieldName]);

            if (imageUrl && this.isValidImageUrl(imageUrl)) {
                images.push({ url: imageUrl });
            }
        }

        return images;
    },

    /**
     * Extract images from Novatron scraped data
     * @param {Object} scrapedProduct - Scraped product with imagesSrc array
     * @returns {Array} Array of {url: string} objects
     */
    extractFromNovatronFormat(scrapedProduct) {
        if (!scrapedProduct?.imagesSrc || !Array.isArray(scrapedProduct.imagesSrc)) {
            return [];
        }

        return scrapedProduct.imagesSrc
            .filter(img => img?.url && this.isValidImageUrl(img.url))
            .map(img => ({ url: img.url.trim() }));
    },

    /**
     * Validate image URL
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid image URL
     */
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;

        const trimmed = url.trim();

        // Check if empty
        if (!trimmed) return false;

        // Check if it's a valid URL format
        try {
            // If it's a relative path, it's valid
            if (trimmed.startsWith('/')) return true;

            // If it's an absolute URL
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                // Check if it has a valid image extension
                const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(trimmed);

                // Or if it doesn't end with .aspx or other non-image extensions
                const hasInvalidExtension = /\.(aspx|asp|php|html|htm)$/i.test(trimmed);

                return hasImageExtension || !hasInvalidExtension;
            }

            return true; // Other formats might be valid
        } catch (error) {
            return false;
        }
    },

    /**
     * Normalize image URL (add protocol, domain, etc.)
     * @param {string} url - Image URL to normalize
     * @param {string} baseUrl - Base URL to use for relative paths
     * @returns {string} Normalized URL
     */
    normalizeImageUrl(url, baseUrl) {
        if (!url) return '';

        const trimmed = url.trim();

        // Already absolute URL
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }

        // Relative path
        if (trimmed.startsWith('/')) {
            if (!baseUrl) return trimmed;

            // Remove trailing slash from baseUrl
            const cleanBase = baseUrl.replace(/\/$/, '');
            return `${cleanBase}${trimmed}`;
        }

        // Protocol-relative URL
        if (trimmed.startsWith('//')) {
            return `https:${trimmed}`;
        }

        return trimmed;
    },

    /**
     * Add query parameters to image URL (e.g., resize params)
     * @param {string} url - Image URL
     * @param {Object} params - Query parameters to add
     * @returns {string} URL with parameters
     */
    addQueryParams(url, params = {}) {
        if (!url || !params || Object.keys(params).length === 0) return url;

        try {
            const urlObj = new URL(url);
            Object.entries(params).forEach(([key, value]) => {
                urlObj.searchParams.set(key, value);
            });
            return urlObj.toString();
        } catch (error) {
            // If URL parsing fails, append manually
            const separator = url.includes('?') ? '&' : '?';
            const queryString = Object.entries(params)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');
            return `${url}${separator}${queryString}`;
        }
    },

    /**
     * Limit number of images
     * @param {Array} images - Array of image objects
     * @param {number} max - Maximum number of images
     * @returns {Array} Limited array
     */
    limitImages(images, max = 6) {
        if (!images || !Array.isArray(images)) return [];
        return images.slice(0, max);
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
     * Main extraction method - tries all methods based on supplier
     * @param {Object} options - Extraction options
     * @returns {Array} Array of {url: string} objects
     */
    extract({ rawData, mapFields, supplier, scrapedProduct }) {
        let images = [];

        // Supplier-specific extraction
        if (supplier) {
            const supplierLower = supplier.toLowerCase();

            if (supplierLower === 'globalsat') {
                images = this.extractFromGlobalsatFormat(rawData, 5);
                if (images.length > 0) return images;
            }

            if (supplierLower === 'dotmedia') {
                images = this.extractFromDotMediaFormat(rawData);
                if (images.length > 0) return images;
            }

            if (supplierLower === 'novatron' && scrapedProduct) {
                images = this.extractFromNovatronFormat(scrapedProduct);
                if (images.length > 0) return images;
            }
        }

        // Generic extraction from mapFields
        if (rawData && mapFields) {
            images = this.extractFromRawData(rawData, mapFields);
        }

        // Limit to 6 images max
        return this.limitImages(images, 6);
    },

    /**
     * Prepare images for product creation
     * Splits into main image and additional images
     * @param {Array} images - Array of {url: string} objects
     * @returns {Object} {mainImage: url, additionalImages: [urls]}
     */
    prepareForProduct(images) {
        if (!images || !Array.isArray(images) || images.length === 0) {
            return { mainImage: null, additionalImages: [] };
        }

        const [first, ...rest] = images;

        return {
            mainImage: first.url,
            additionalImages: rest.map(img => img.url)
        };
    }
});