'use strict';

module.exports = ({ strapi }) => ({
  parseFloatSafe(value) { return parseFloat(value) || 0 },

  async setPrice(existedProduct, supplierInfo, categoryInfo, product) {
    try {
      const brandId = product.brand?.id;
      const categoryId = categoryInfo.id;
      const taxRate = Number(process.env.GENERAL_TAX_RATE);
      const recycleTax = product.recycle_tax ? parseFloat(product.recycle_tax) : 0;

      // ════════════════════════════════════════════════════════════
      // ΣΕΝΑΡΙΟ 1: ΝΕΟ ΠΡΟΪΟΝ (existedProduct = null)
      // ════════════════════════════════════════════════════════════
      if (!existedProduct) {
        // Για νέο προϊόν, χρησιμοποιούμε ΟΛΟΥΣ τους suppliers (in_stock ή όχι)
        // Λογική: Αν υπάρχει στο XML, μπορούμε να το παραγγείλουμε
        const availableSuppliers = supplierInfo;

        if (!availableSuppliers || availableSuppliers.length === 0) {
          console.warn(`No suppliers found for new product: ${product.name}`);
          return {
            generalPrice: { price: "0.00", isFixed: false },
            skroutzPrice: { platform: "Skroutz", price: "0.00", is_fixed_price: false },
            shopflixPrice: { platform: "Shopflix", price: "0.00", is_fixed_price: false }
          };
        }

        // Βρες τον φθηνότερο προμηθευτή (ακόμα και αν είναι OutOfStock)
        let minSupplierInfo = availableSuppliers.reduce((prev, current) => {
          return (prev.wholesale < current.wholesale) ? prev : current;
        });

        return await this.calculatePrices(minSupplierInfo, brandId, categoryId, recycleTax, taxRate, categoryInfo, product, null);
      }

      // ════════════════════════════════════════════════════════════
      // ΣΕΝΑΡΙΟ 2: ΥΠΑΡΧΟΝ ΠΡΟΪΟΝ (existedProduct exists)
      // ════════════════════════════════════════════════════════════

      // Βρες τους διαθέσιμους προμηθευτές (in_stock=true)
      const availableSuppliers = supplierInfo.filter(x => x.in_stock === true);

      // ────────────────────────────────────────────────────────────
      // ΣΕΝΑΡΙΟ 2Α: ΔΕΝ ΥΠΑΡΧΕΙ ΚΑΝΕΝΑΣ ΔΙΑΘΕΣΙΜΟΣ
      // ────────────────────────────────────────────────────────────
      if (availableSuppliers.length === 0) {
        // Κράτα την υπάρχουσα τιμή (δεν αλλάζει τίποτα)
        const skroutz = existedProduct.platforms.find(x => x.platform === "Skroutz");
        const shopflix = existedProduct.platforms.find(x => x.platform === "Shopflix");

        return {
          generalPrice: {
            price: parseFloat(existedProduct.price).toFixed(2),
            isFixed: existedProduct.is_fixed_price
          },
          skroutzPrice: {
            platform: "Skroutz",
            price: skroutz?.price || existedProduct.price,
            is_fixed_price: skroutz?.is_fixed_price || existedProduct.is_fixed_price
          },
          shopflixPrice: {
            platform: "Shopflix",
            price: shopflix?.price || existedProduct.price,
            is_fixed_price: shopflix?.is_fixed_price || existedProduct.is_fixed_price
          }
        };
      }

      // ────────────────────────────────────────────────────────────
      // ΣΕΝΑΡΙΟ 2Β: ΥΠΑΡΧΟΥΝ ΔΙΑΘΕΣΙΜΟΙ ΠΡΟΜΗΘΕΥΤΕΣ
      // ────────────────────────────────────────────────────────────
      // Βρες τον φθηνότερο διαθέσιμο
      let minSupplierInfo = availableSuppliers.reduce((prev, current) => {
        return (prev.wholesale < current.wholesale) ? prev : current;
      });

      // Υπολόγισε νέες τιμές με βάση τον φθηνότερο διαθέσιμο
      return await this.calculatePrices(
        minSupplierInfo,
        brandId,
        categoryId,
        recycleTax,
        taxRate,
        categoryInfo,
        product,
        existedProduct
      );

    } catch (error) {
      console.error("Error in setPrice:", product.name, error);
      throw error;
    }
  },

  // ════════════════════════════════════════════════════════════
  // HELPER: Υπολογισμός Τιμών
  // ════════════════════════════════════════════════════════════
  async calculatePrices(minSupplierInfo, brandId, categoryId, recycleTax, taxRate, categoryInfo, product, existedProduct) {
    try {
      const supplier = await strapi.db.query('plugin::import-products.importxml').findOne({
        select: ['name', 'shipping', 'useRetailPrice'],
        where: { name: minSupplierInfo.name },
        populate: {
          useRetailPriceBrands: true,
          useRetailPriceCategories: true,
          useRetailPriceContainName: true
        }
      });

      let supplierShipping = this.parseFloatSafe(supplier?.shipping);
      let percentages = this.findProductPlatformPercentage(categoryInfo, brandId);

      const calculatePlatformPrice = (platform) => {
        const basePrice = this.parseFloatSafe(minSupplierInfo.wholesale) +
          recycleTax +
          this.parseFloatSafe(percentages[platform].addToPrice) +
          supplierShipping;

        return basePrice *
          (taxRate / 100 + 1) *
          (this.parseFloatSafe(percentages[platform].platformCategoryPercentage) / 100 + 1);
      };

      const minPrices = {
        wholesale: this.parseFloatSafe(minSupplierInfo.wholesale),
        general: calculatePlatformPrice('general'),
        skroutz: calculatePlatformPrice('skroutz'),
        shopflix: calculatePlatformPrice('shopflix')
      };

      // Handle special pricing rules
      if (!existedProduct) {
        return this.handleNewProductPricing(product, minPrices, supplier, categoryId);
      }

      const isBrandIncluded = supplier.useRetailPriceBrands.some(brand => brand.id === brandId);
      const isCategoryIncluded = supplier.useRetailPriceCategories.some(category => category.id === categoryId);
      const retailPrice = this.parseFloatSafe(product.retail_price);
      const isStringContained = this.containsRetailPriceName(
        existedProduct.name.toLowerCase(),
        supplier
      );

      const skroutz = existedProduct.platforms.find(x => x.platform === "Skroutz");
      const shopflix = existedProduct.platforms.find(x => x.platform === "Shopflix");

      if ((supplier.useRetailPrice || isBrandIncluded || isCategoryIncluded || isStringContained) && retailPrice !== 0) {
        return this.createPrices(existedProduct, {}, minPrices, retailPrice, skroutz, shopflix);
      }

      return this.createPrices(existedProduct, {}, minPrices, null, skroutz, shopflix);

    } catch (error) {
      console.error("Error in calculatePrices:", error);
      throw error;
    }
  },

  // Helper function for finding if product name contains texts
  containsRetailPriceName(text, supplier) {
    if (!supplier?.useRetailPriceContainName || !Array.isArray(supplier.useRetailPriceContainName)) {
      return false;
    }

    return supplier.useRetailPriceContainName.some(entry => {
      if (!entry || !entry.text) return false;
      return text.toLowerCase().includes(entry.text.toLowerCase());
    });
  },

  // Helper function for new product pricing
  handleNewProductPricing(product, minPrices, supplier, categoryId) {
    const prices = {};
    const brandId = product.brand?.id;

    // Check if the brand exists in the useRetailPriceBrands array
    const isBrandIncluded = supplier.useRetailPriceBrands.some(brand => brand.id === brandId);
    const isCategoryIncluded = supplier.useRetailPriceCategories.some(category => category.id === categoryId);
    const retailPrice = this.parseFloatSafe(product.retail_price);
    const isStringContained = this.containsRetailPriceName(product.name.toLocaleLowerCase(), supplier)

    if ((supplier.useRetailPrice || isBrandIncluded || isCategoryIncluded || isStringContained) && retailPrice !== 0) {

      return this.createPrices(null, prices, minPrices, retailPrice, null, null);
    }


    // if (minSupplierInfo.name.toLowerCase() === "telehermes") {
    //   return this.createPrices(null, prices, minPrices, retailPrice, null, null);
    // }

    // if (minSupplierInfo.name.toLowerCase() === "dotmedia") {
    //   if (this.parseFloatSafe(minSupplierInfo.wholesale) > 0) {
    //     return this.createPrices(null, prices, minPrices, retailPrice, null, null);
    //   } else {
    //     return {
    //       generalPrice: { price: retailPrice.toFixed(2), isFixed: false },
    //       skroutzPrice: { platform: "Skroutz", price: retailPrice.toFixed(2), is_fixed_price: false },
    //       shopflixPrice: { platform: "Shopflix", price: retailPrice.toFixed(2), is_fixed_price: false }
    //     };
    //   }
    // }

    // if (minSupplierInfo.name.toLowerCase() === "novatron" && product.name.toLowerCase().includes("vigi")) {
    //   return this.createPrices(null, prices, minPrices, retailPrice, null, null);
    // }

    return this.createPrices(null, prices, minPrices, null, null, null);
  },

  findProductPlatformPercentage(categoryInfo, brandId) {
    const defaultPercentage = Number(process.env.GENERAL_CATEGORY_PERCENTAGE);
    const defaultAddToPrice = Number(process.env.GENERAL_SHIPPING_PRICE);

    // ── ΒΗΜΑ 1: Ξεκινάω με defaults ──────────────────────────────
    let percentages = {
      general: { platformCategoryPercentage: defaultPercentage, addToPrice: defaultAddToPrice },
      skroutz: { platformCategoryPercentage: defaultPercentage, addToPrice: defaultAddToPrice },
      shopflix: { platformCategoryPercentage: defaultPercentage, addToPrice: defaultAddToPrice }
    };

    // ── ΒΗΜΑ 2: Helper για να διαβάζω ένα platform ───────────────
    const getDataForPlatform = (platformKey) => {
      return categoryInfo.cat_percentage?.find(
        x => x.name?.toLowerCase().trim() === platformKey
      ) || null;
    };

    // ── ΒΗΜΑ 3: Φόρτωσε το general πρώτα ─────────────────────────
    const generalData = getDataForPlatform('general');

    if (generalData) {
      // Βάλε το ποσοστό της κατηγορίας αν υπάρχει
      if (generalData.percentage) {
        percentages.general.platformCategoryPercentage = generalData.percentage;
      }
      if (generalData.add_to_price !== undefined) {
        percentages.general.addToPrice = generalData.add_to_price || 0;
      }

      // Τσέκαρε αν υπάρχει brand-specific ποσοστό
      if (generalData.brand_perc?.length > 0) {
        const brandPerc = generalData.brand_perc.find(x => x.brand?.id === brandId);
        if (brandPerc) {
          // Brand βρέθηκε → χρησιμοποίησε το brand ποσοστό
          percentages.general.platformCategoryPercentage = brandPerc.percentage;
        }
        // Brand ΔΕΝ βρέθηκε → μένει το ποσοστό κατηγορίας του general
      }
    }
    // Αν δεν υπάρχει general → έχει ήδη τα defaults

    // ── ΒΗΜΑ 4: Φόρτωσε skroutz και shopflix ─────────────────────
    ['skroutz', 'shopflix'].forEach(platformKey => {
      const platformData = getDataForPlatform(platformKey);

      if (!platformData || !platformData.percentage) {
        // Platform δεν υπάρχει ή δεν έχει ποσοστό → πάρε τιμές από general
        percentages[platformKey].platformCategoryPercentage = percentages.general.platformCategoryPercentage;
        percentages[platformKey].addToPrice = percentages.general.addToPrice;
        return;
      }

      // Platform υπάρχει → βάλε τις δικές του τιμές
      percentages[platformKey].platformCategoryPercentage = platformData.percentage;
      if (platformData.add_to_price !== undefined) {
        percentages[platformKey].addToPrice = platformData.add_to_price || 0;
      }

      // Τσέκαρε αν υπάρχει brand-specific ποσοστό για αυτό το platform
      if (platformData.brand_perc?.length > 0) {
        const brandPerc = platformData.brand_perc.find(x => x.brand?.id === brandId);
        if (brandPerc) {
          // Brand βρέθηκε → χρησιμοποίησε το brand ποσοστό
          percentages[platformKey].platformCategoryPercentage = brandPerc.percentage;
        }
        // Brand ΔΕΝ βρέθηκε → μένει το ποσοστό κατηγορίας του platform
      }
    });

    return percentages;
  },

  createPrices(existedProduct, prices, minPrices, suggestedPrice, skroutz, shopflix) {
    try {
      const hasInventory = existedProduct?.inventory > 0;

      if (existedProduct) {
        if (hasInventory) {
          // Fixed prices when inventory exists
          prices.generalPrice = this.createPriceObject(
            parseFloat(existedProduct.price).toFixed(2),
            true
          );

          prices.skroutzPrice = this.createPlatformPrice(
            "Skroutz",
            skroutz?.price || minPrices.skroutz,
            true
          );

          prices.shopflixPrice = this.createPlatformPrice(
            "Shopflix",
            shopflix?.price || minPrices.shopflix,
            true
          );
        }
        else {
          // Dynamic pricing when no inventory
          prices.generalPrice = this.updatePrices(
            existedProduct.price,
            existedProduct.is_fixed_price,
            minPrices.general,
            suggestedPrice,
            minPrices.wholesale
          );

          prices.skroutzPrice = this.createPlatformPrice(
            "Skroutz",
            this.updatePrices(
              skroutz?.price,
              skroutz?.is_fixed_price,
              minPrices.skroutz,
              suggestedPrice,
              minPrices.wholesale
            )
          );

          prices.shopflixPrice = this.createPlatformPrice(
            "Shopflix",
            this.updatePrices(
              shopflix?.price,
              shopflix?.is_fixed_price,
              minPrices.shopflix,
              suggestedPrice,
              minPrices.wholesale
            )
          );
        }
      }
      else {

        // New product pricing
        prices.generalPrice = this.determineNewProductPrice(
          suggestedPrice,
          minPrices.general
        );

        prices.skroutzPrice = this.createPlatformPrice(
          "Skroutz",
          this.determineNewProductPrice(suggestedPrice, minPrices.skroutz)
        );

        prices.shopflixPrice = this.createPlatformPrice(
          "Shopflix",
          this.determineNewProductPrice(suggestedPrice, minPrices.shopflix)
        );

      }

      return prices


    } catch (error) {
      console.log(error)
    }
  },

  updatePrices(existed, is_fixed_price, min, suggested, wholesale) {
    try {
      const existedPrice = this.formatPrice(existed);
      const minPrice = min && this.is_a_greaterthan_b(wholesale, 0) ? this.formatPrice(min) : null
      const suggestedPrice = this.formatPrice(suggested);
      const isFixed = Boolean(is_fixed_price);

      // No suggested price available
      if (!suggestedPrice) {
        if (minPrice) {
          return this.determineMinPriceScenario(existedPrice, minPrice, isFixed);
        }
        return { price: existedPrice, isFixed: false };
      }

      // Suggested price available
      if (minPrice) {
        if (this.is_a_greaterthan_b(suggestedPrice, minPrice)) {
          return this.handleSuggestedAboveMin(existedPrice, suggestedPrice, minPrice, isFixed);
        }
        return this.handleSuggestedBelowMin(existedPrice, minPrice, isFixed);
      }

      // No min price, but suggested price exists
      return this.handleNoMinPrice(existedPrice, suggestedPrice, isFixed);

    } catch (error) {
      console.log(error)
    }
  },

  is_a_greaterthan_b(a, b) {
    const first = typeof a === 'number' ? a : parseFloat(a)
    const second = typeof b === 'number' ? b : parseFloat(b)
    return Math.round(first * 100) > Math.round(second * 100);
    // if (Math.round(first * 100) > Math.round(second * 100)) { return true }
    // else {
    //   return false
    // }


  },

  is_not_equal(a, b) {
    const first = typeof a === 'number' ? a : parseFloat(a)
    const second = typeof b === 'number' ? b : parseFloat(b)
    if (Math.round(first * 100) !== Math.round(second * 100)) { return true }
    else {
      return false
    }
  },

  /**
  * Helper to create a platform price object
  */
  createPlatformPrice(platform, priceData, isFixed = false) {
    if (typeof priceData === 'object') {
      return {
        platform,
        price: priceData.price,
        is_fixed_price: priceData.isFixed
      };
    }
    return {
      platform,
      price: parseFloat(priceData).toFixed(2),
      is_fixed_price: isFixed
    };
  },

  /**
  * Helper to create a simple price object
  */
  createPriceObject(price, isFixed) {
    return {
      price: parseFloat(price).toFixed(2),
      isFixed
    };
  },

  /**
  * Determines price for new products
  */
  determineNewProductPrice(suggestedPrice, minPrice) {
    const useSuggested = suggestedPrice && this.is_a_greaterthan_b(suggestedPrice, minPrice);
    return {
      price: parseFloat(useSuggested ? suggestedPrice : minPrice).toFixed(2),
      isFixed: false
    };
  },

  /**
  * Helper for min price scenarios
  */
  determineMinPriceScenario(existedPrice, minPrice, isFixed) {
    if (existedPrice && this.is_a_greaterthan_b(existedPrice, minPrice)) {
      return {
        price: isFixed ? existedPrice : minPrice,
        isFixed
      };
    }
    return { price: minPrice, isFixed: false };
  },

  /**
  * Helper when suggested price is above minimum
  */
  handleSuggestedAboveMin(existedPrice, suggestedPrice, minPrice, isFixed) {
    if (existedPrice && this.is_a_greaterthan_b(existedPrice, suggestedPrice)) {
      return {
        price: isFixed ? existedPrice : suggestedPrice,
        isFixed
      };
    }

    if (existedPrice && this.is_a_greaterthan_b(existedPrice, minPrice)) {
      return {
        price: isFixed ? existedPrice : suggestedPrice,
        isFixed
      };
    }

    return { price: suggestedPrice, isFixed: false };
  },

  /**
   * Helper when suggested price is below minimum
   */
  handleSuggestedBelowMin(existedPrice, minPrice, isFixed) {
    if (existedPrice && this.is_a_greaterthan_b(existedPrice, minPrice)) {
      return {
        price: isFixed ? existedPrice : minPrice,
        isFixed
      };
    }
    return { price: minPrice, isFixed: false };
  },

  /**
   * Helper when no minimum price exists
   */
  handleNoMinPrice(existedPrice, suggestedPrice, isFixed) {
    if (existedPrice && this.is_a_greaterthan_b(existedPrice, suggestedPrice)) {
      return {
        price: isFixed ? existedPrice : suggestedPrice,
        isFixed
      };
    }
    return { price: suggestedPrice, isFixed: false };
  },


  // Formats a price to 2 decimal places
  // @param {number|string} value - Price to format
  // @returns {string|null} Formatted price or null if invalid

  formatPrice(value) {
    if (value === null || value === undefined) return null;

    // Αν είναι ήδη number, επιστροφή
    if (typeof value === 'number') {
      return this.roundPrice(value);
    }

    // Αν είναι string, normalize το format
    if (typeof value === 'string') {
      let normalized = value.trim();

      // Αφαίρεση whitespace
      normalized = normalized.replace(/\s/g, '');

      // Βρες την τελευταία τελεία ή κόμμα
      const lastDotIndex = normalized.lastIndexOf('.');
      const lastCommaIndex = normalized.lastIndexOf(',');

      // Προσδιορισμός ποιο είναι το decimal separator
      if (lastDotIndex > -1 && lastCommaIndex > -1) {
        // Και τα δύο υπάρχουν - το τελευταίο είναι το decimal separator
        if (lastDotIndex > lastCommaIndex) {
          // Format: 1,274.25 (US format)
          normalized = normalized.replace(/,/g, '');
        } else {
          // Format: 1.274,25 ή 3.450,00 (European format)
          normalized = normalized.replace(/\./g, '').replace(',', '.');
        }
      } else if (lastCommaIndex > -1) {
        // Μόνο κόμμα - έλεγχος αν είναι thousands ή decimal
        const charsAfterComma = normalized.length - lastCommaIndex - 1;

        // Αν έχει 2 ψηφία μετά το κόμμα, είναι decimal separator
        // Αν έχει 3 ψηφία και δεν υπάρχει άλλο separator, είναι thousands
        if (charsAfterComma === 2 || charsAfterComma === 1) {
          // Format: 105,00 ή 105,5 (decimal separator)
          normalized = normalized.replace(',', '.');
        } else if (charsAfterComma === 3) {
          // Format: 1,000 (thousands separator)
          normalized = normalized.replace(/,/g, '');
        } else {
          // Default: treat as decimal
          normalized = normalized.replace(',', '.');
        }
      } else if (lastDotIndex > -1) {
        // Μόνο τελεία/τελείες
        const dotCount = (normalized.match(/\./g) || []).length;

        if (dotCount > 1) {
          // Format: 4.113.00 (European με τελείες παντού)
          // Αφαίρεση όλων των τελειών εκτός της τελευταίας
          const parts = normalized.split('.');
          const lastPart = parts.pop();
          normalized = parts.join('') + '.' + lastPart;
        } else {
          // Μία τελεία - έλεγχος ψηφίων μετά
          const charsAfterDot = normalized.length - lastDotIndex - 1;

          // Αν έχει 3 ψηφία μετά την τελεία, πιθανόν thousands separator
          if (charsAfterDot === 3 && lastDotIndex <= 1) {
            // Format: 1.000
            normalized = normalized.replace('.', '');
          }
          // Αλλιώς μένει ως έχει (π.χ. 6934.79)
        }
      }

      const num = parseFloat(normalized);
      return this.roundPrice(num);
    }

    return null;
  },

  // Στην αρχή του module
  roundPrice(value) {
    if (value === null || value === undefined || isNaN(value)) return null;
    return Math.round(value * 100) / 100;
  },

  /**
   * Υπολογίζει την τελική τιμή για μια συγκεκριμένη πλατφόρμα
   * 
   * @param {Object} params
   * @param {number} params.wholesalePrice - Χονδρική τιμή (χωρίς ΦΠΑ)
   * @param {number} params.shippingCost - Κόστος μεταφορικών (χωρίς ΦΠΑ)
   * @param {Object} params.platformConfig - Configuration από το category component
   * @param {number} params.platformConfig.platform_commission - Προμήθεια πλατφόρμας (0-1, π.χ. 0.04)
   * @param {number} params.platformConfig.management_cost - Κόστος διαχείρισης
   * @param {number} params.platformConfig.profit_margin - Margin κέρδους (0-1, π.χ. 0.25)
   * @returns {number} Η τελική τιμή
   */
  calculatePlatformPrice({ wholesalePrice, shippingCost, platformConfig }) {
    // Παίρνουμε τα στοιχεία από το config
    const managementCost = platformConfig.management_cost || 0;
    const platformCommission = platformConfig.platform_commission || 0;
    const profitMargin = platformConfig.profit_margin || 0;

    // 1. Συνολικό κόστος (χωρίς ΦΠΑ)
    const totalCost = wholesalePrice + shippingCost + managementCost;

    // 2. Προσθέτουμε το margin κέρδους
    const priceWithProfit = totalCost * (1 + profitMargin);

    // 3. Προσθέτουμε το ΦΠΑ
    const priceWithVAT = priceWithProfit * (1 + VAT);

    // 4. Υπολογίζουμε την τελική τιμή με την προμήθεια της πλατφόρμας
    const calculatedPrice = priceWithVAT / (1 - platformCommission);

    // 5. Στρογγυλοποιούμε στο επόμενο δεκαδικό ψηφίο
    const finalPrice = this.roundUpToFirstDecimal(calculatedPrice);

    return Math.round(finalPrice * 100) / 100; // Διασφαλίζουμε 2 δεκαδικά
  },

  /**
   * Βρίσκει το configuration για μια πλατφόρμα από μια κατηγορία
   * Υποστηρίζει brand-specific pricing
   * 
   * @param {Object} category - Το category object με populated cat_percentage
   * @param {string} platformName - Όνομα πλατφόρμας (π.χ. 'skroutz', 'shopflix', 'general')
   * @param {number} brandId - Optional brand ID για brand-specific pricing
   * @returns {Object|null} Configuration object ή null αν δεν βρεθεί
   */
  getPlatformConfig(category, platformName, brandId = null) {
    if (!category.cat_percentage || !Array.isArray(category.cat_percentage)) {
      return null;
    }

    // Βρίσκουμε το configuration για την πλατφόρμα
    const platformConfig = category.cat_percentage.find(
      config => config.name?.toLowerCase() === platformName.toLowerCase()
    );

    if (!platformConfig) {
      return null;
    }

    // Αρχικοποίηση του configuration
    let config = {
      platform_commission: platformConfig.platform_commission || 0,
      management_cost: platformConfig.management_cost || 0,
      profit_margin: platformConfig.profit_margin || 0,
      packaging_cost: platformConfig.packaging_cost || 0
    };

    // Αν ζητάμε brand-specific config
    if (brandId && platformConfig.brand_perc && Array.isArray(platformConfig.brand_perc)) {
      const brandConfig = platformConfig.brand_perc.find(
        bp => bp.brand?.id === brandId
      );

      // Αν υπάρχει brand-specific profit margin, το χρησιμοποιούμε
      if (brandConfig && brandConfig.profit_margin !== undefined) {
        config.profit_margin = brandConfig.profit_margin;
      }
    }

    return config;
  }
});
