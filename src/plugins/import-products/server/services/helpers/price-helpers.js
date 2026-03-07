'use strict';

module.exports = ({ strapi }) => ({
  parseFloatSafe(value) {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
  },

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
        const availableSuppliers = supplierInfo;

        if (!availableSuppliers || availableSuppliers.length === 0) {
          console.warn(`No suppliers found for new product: ${product.name}`);
          return {
            generalPrice: { price: "0.00", isFixed: false },
            skroutzPrice: { platform: "Skroutz", price: "0.00", is_fixed_price: false },
            shopflixPrice: { platform: "Shopflix", price: "0.00", is_fixed_price: false }
          };
        }

        let minSupplierInfo = availableSuppliers.reduce((prev, current) => {
          return (prev.wholesale < current.wholesale) ? prev : current;
        });

        return await this.calculatePrices(minSupplierInfo, brandId, categoryId, taxRate, categoryInfo, product, null);
      }

      // ════════════════════════════════════════════════════════════
      // ΣΕΝΑΡΙΟ 2: ΥΠΑΡΧΟΝ ΠΡΟΪΟΝ (existedProduct exists)
      // ════════════════════════════════════════════════════════════
      const availableSuppliers = supplierInfo.filter(x => x.in_stock === true);

      // ────────────────────────────────────────────────────────────
      // ΣΕΝΑΡΙΟ 2Α: ΔΕΝ ΥΠΑΡΧΕΙ ΚΑΝΕΝΑΣ ΔΙΑΘΕΣΙΜΟΣ
      // ────────────────────────────────────────────────────────────
      if (availableSuppliers.length === 0) {
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
      let minSupplierInfo = availableSuppliers.reduce((prev, current) => {
        return (prev.wholesale < current.wholesale) ? prev : current;
      });

      return await this.calculatePrices(
        minSupplierInfo,
        brandId,
        categoryId,
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
  async calculatePrices(minSupplierInfo, brandId, categoryId, taxRate, categoryInfo, product, existedProduct) {
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

      let supplierShipping = this.parseFloatSafe(supplier?.shipping) || Number(process.env.GENERAL_SHIPPING_PRICE);

      // ── Platform configs από category ────────────────────────────────
      const skroutzConfig = this.getPlatformConfig(categoryInfo, 'skroutz', brandId);
      const shopflixConfig = this.getPlatformConfig(categoryInfo, 'shopflix', brandId);
      const generalConfig = this.getPlatformConfig(categoryInfo, 'general', brandId);

      // ── customer_share_pct: πόσο % των savings πάει στον πελάτη ─────
      const customerSharePct = categoryInfo.customer_share_pct
        || Number(process.env.SITE_CUSTOMER_SHARE_PCT)
        || 60;

      // ── 1. Skroutz: υπολογισμός από wholesale ────────────────────────
      const skroutzPrice = this.calculatePlatformPrice({
        wholesalePrice: minSupplierInfo.wholesale,
        recycleTax: minSupplierInfo.recycle_tax,
        shippingCost: supplierShipping,
        platformConfig: skroutzConfig
      });

      // ── 2. Shopflix: υπολογισμός από wholesale (δικό commission) ─────
      const shopflixPrice = this.calculatePlatformPrice({
        wholesalePrice: minSupplierInfo.wholesale,
        recycleTax: minSupplierInfo.recycle_tax,
        shippingCost: supplierShipping,
        platformConfig: shopflixConfig
      });

      // ── 3. Site: υπολογισμός από skroutzPrice ────────────────────────
      //
      // Η "εξοικονόμηση" που μοιράζεται στον πελάτη είναι η διαφορά στο
      // πραγματικό κόστος πωλητή μεταξύ skroutz και site:
      //   saving = skroutzCommission×S + skroutzMgmt - siteCommission×P - siteMgmt
      //
      // Αλγεβρική λύση:
      //   P = [S(1 - cs×share) + D×share] / (1 - cp×share)
      //   όπου D = siteMgmt - skroutzMgmt (διαφορά management+packaging costs)
      //
      // Safety floor: κόστος + ΦΠΑ (μηδενικό κέρδος)
      const minSitePrice = (
        this.parseFloatSafe(minSupplierInfo.wholesale) +
        this.parseFloatSafe(minSupplierInfo.recycle_tax) +
        this.parseFloatSafe(supplierShipping) +
        (generalConfig.management_cost || 0) +
        (generalConfig.packaging_cost || 0) +
        (generalConfig.add_to_price || 0)
      ) * (1 + taxRate / 100);

      const sitePrice = this.calculateOptimalSitePrice(
        skroutzPrice,
        skroutzConfig.platform_commission,
        generalConfig.platform_commission,
        minSitePrice,
        customerSharePct,
        // Διαφορά management costs — site vs skroutz
        (generalConfig.management_cost + generalConfig.packaging_cost) -
        (skroutzConfig.management_cost + skroutzConfig.packaging_cost)
      );

      const minPrices = {
        wholesale: this.parseFloatSafe(minSupplierInfo.wholesale),
        general: sitePrice,
        skroutz: skroutzPrice,
        shopflix: shopflixPrice
      };

      // ── Retail price logic (αναλλοίωτη) ──────────────────────────────
      if (!existedProduct) {
        return this.handleNewProductPricing(product, minPrices, supplier, categoryId);
      }

      const isBrandIncluded = supplier.useRetailPriceBrands.some(brand => brand.id === brandId);
      const isCategoryIncluded = supplier.useRetailPriceCategories.some(cat => cat.id === categoryId);
      const retailPrice = this.parseFloatSafe(product.retail_price);
      const isStringContained = this.containsRetailPriceName(existedProduct.name.toLowerCase(), supplier);

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

  // ════════════════════════════════════════════════════════════
  // ΝΕΟΣ ΥΠΟΛΟΓΙΣΜΟΣ SITE PRICE από Skroutz price
  // Λύνει το circular reference αλγεβρικά:
  // P = S - (skroutzCost - P × siteCostPct) × customerShare
  // P × (1 - siteCostPct × customerShare) = S - skroutzCost × customerShare
  // ════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════
  // Μοιρασμός ΠΡΑΓΜΑΤΙΚΗΣ εξοικονόμησης μεταξύ πελάτη/πωλητή:
  //
  //   saving = (cs×S + skroutzMgmt) - (cp×P + siteMgmt)
  //          = cs×S - cp×P - D    (D = siteMgmt - skroutzMgmt)
  //
  //   P = S - saving × share
  //   P(1 - cp×share) = S(1 - cs×share) + D×share
  //   P = [S(1 - cs×share) + D×share] / (1 - cp×share)
  //
  //   D = 0  → ταυτίζεται με παλιά φόρμουλα
  //   D < 0  → site φθηνότερο (site κοστίζει λιγότερο, περισσότερο να μοιραστεί)
  //   D > 0  → site ακριβότερο (site κοστίζει περισσότερο, λιγότερο να μοιραστεί)
  // ════════════════════════════════════════════════════════════
  calculateOptimalSitePrice(skroutzPrice, skroutzCommission, siteCommission, minSitePrice, customerSharePct, mgmtCostDiff = 0) {
    const siteCostPct = siteCommission / 100;
    const skroutzCostPct = skroutzCommission / 100;
    const customerShare = customerSharePct / 100;

    // D = siteMgmt - skroutzMgmt
    const D = mgmtCostDiff;

    const numerator = skroutzPrice * (1 - skroutzCostPct * customerShare) + D * customerShare;
    const denominator = 1 - (siteCostPct * customerShare);
    const rawSitePrice = numerator / denominator;

    const sitePrice = this.roundUpToFirstDecimal(rawSitePrice);

    if (sitePrice < minSitePrice) {
      console.warn(`Site price ${sitePrice} below min cost ${minSitePrice} - using floor`);
      return this.roundUpToFirstDecimal(minSitePrice);
    }

    return Math.round(sitePrice * 100) / 100;
  },

  applyPsychologicalEnding(price) {
    // π.χ. 1580.78 → 1579.90
    return Math.floor(price) + 0.90;
  },

  // ════════════════════════════════════════════════════════════
  // Helper function for finding if product name contains texts
  // ════════════════════════════════════════════════════════════
  containsRetailPriceName(text, supplier) {
    if (!supplier?.useRetailPriceContainName || !Array.isArray(supplier.useRetailPriceContainName)) {
      return false;
    }
    return supplier.useRetailPriceContainName.some(entry => {
      if (!entry || !entry.text) return false;
      return text.toLowerCase().includes(entry.text.toLowerCase());
    });
  },

  // ════════════════════════════════════════════════════════════
  // Helper function for new product pricing
  // ════════════════════════════════════════════════════════════
  handleNewProductPricing(product, minPrices, supplier, categoryId) {
    const prices = {};
    const brandId = product.brand?.id;

    const isBrandIncluded = supplier.useRetailPriceBrands.some(brand => brand.id === brandId);
    const isCategoryIncluded = supplier.useRetailPriceCategories.some(cat => cat.id === categoryId);
    const retailPrice = this.parseFloatSafe(product.retail_price);
    const isStringContained = this.containsRetailPriceName(product.name.toLocaleLowerCase(), supplier);

    if ((supplier.useRetailPrice || isBrandIncluded || isCategoryIncluded || isStringContained) && retailPrice !== 0) {
      return this.createPrices(null, prices, minPrices, retailPrice, null, null);
    }

    return this.createPrices(null, prices, minPrices, null, null, null);
  },

  // ════════════════════════════════════════════════════════════
  // createPrices — αναλλοίωτη λογική
  // ════════════════════════════════════════════════════════════
  createPrices(existedProduct, prices, minPrices, suggestedPrice, skroutz, shopflix) {
    try {
      const hasInventory = existedProduct?.inventory > 0;

      if (existedProduct) {
        if (hasInventory) {
          // Fixed prices when inventory exists — αναλλοίωτο
          prices.generalPrice = this.createPriceObject(
            parseFloat(existedProduct.price).toFixed(2),
            true
          );
          prices.skroutzPrice = this.createPlatformPrice("Skroutz", skroutz?.price || minPrices.skroutz, true);
          prices.shopflixPrice = this.createPlatformPrice("Shopflix", shopflix?.price || minPrices.shopflix, true);
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
        prices.generalPrice = this.determineNewProductPrice(suggestedPrice, minPrices.general);
        prices.skroutzPrice = this.createPlatformPrice("Skroutz", this.determineNewProductPrice(suggestedPrice, minPrices.skroutz));
        prices.shopflixPrice = this.createPlatformPrice("Shopflix", this.determineNewProductPrice(suggestedPrice, minPrices.shopflix));
      }

      return prices;

    } catch (error) {
      console.log(error);
    }
  },

  updatePrices(existed, is_fixed_price, min, suggested, wholesale) {
    try {
      const existedPrice = this.formatPrice(existed);
      const minPrice = min && this.is_a_greaterthan_b(wholesale, 0) ? this.formatPrice(min) : null;
      const suggestedPrice = this.formatPrice(suggested);
      const isFixed = Boolean(is_fixed_price);

      if (!suggestedPrice) {
        if (minPrice) {
          return this.determineMinPriceScenario(existedPrice, minPrice, isFixed);
        }
        return { price: existedPrice, isFixed: false };
      }

      if (minPrice) {
        if (this.is_a_greaterthan_b(suggestedPrice, minPrice)) {
          return this.handleSuggestedAboveMin(existedPrice, suggestedPrice, minPrice, isFixed);
        }
        return this.handleSuggestedBelowMin(existedPrice, minPrice, isFixed);
      }

      return this.handleNoMinPrice(existedPrice, suggestedPrice, isFixed);

    } catch (error) {
      console.log(error);
    }
  },

  is_a_greaterthan_b(a, b) {
    const first = typeof a === 'number' ? a : parseFloat(a);
    const second = typeof b === 'number' ? b : parseFloat(b);
    return Math.round(first * 100) > Math.round(second * 100);
  },

  is_not_equal(a, b) {
    const first = typeof a === 'number' ? a : parseFloat(a);
    const second = typeof b === 'number' ? b : parseFloat(b);
    return Math.round(first * 100) !== Math.round(second * 100);
  },

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

  createPriceObject(price, isFixed) {
    return {
      price: parseFloat(price).toFixed(2),
      isFixed
    };
  },

  determineNewProductPrice(suggestedPrice, minPrice) {
    const useSuggested = suggestedPrice && this.is_a_greaterthan_b(suggestedPrice, minPrice);
    return {
      price: parseFloat(useSuggested ? suggestedPrice : minPrice).toFixed(2),
      isFixed: false
    };
  },

  determineMinPriceScenario(existedPrice, minPrice, isFixed) {
    if (existedPrice && this.is_a_greaterthan_b(existedPrice, minPrice)) {
      return { price: isFixed ? existedPrice : minPrice, isFixed };
    }
    return { price: minPrice, isFixed: false };
  },

  handleSuggestedAboveMin(existedPrice, suggestedPrice, minPrice, isFixed) {
    if (existedPrice && this.is_a_greaterthan_b(existedPrice, suggestedPrice)) {
      return { price: isFixed ? existedPrice : suggestedPrice, isFixed };
    }
    if (existedPrice && this.is_a_greaterthan_b(existedPrice, minPrice)) {
      return { price: isFixed ? existedPrice : suggestedPrice, isFixed };
    }
    return { price: suggestedPrice, isFixed: false };
  },

  handleSuggestedBelowMin(existedPrice, minPrice, isFixed) {
    if (existedPrice && this.is_a_greaterthan_b(existedPrice, minPrice)) {
      return { price: isFixed ? existedPrice : minPrice, isFixed };
    }
    return { price: minPrice, isFixed: false };
  },

  handleNoMinPrice(existedPrice, suggestedPrice, isFixed) {
    if (existedPrice && this.is_a_greaterthan_b(existedPrice, suggestedPrice)) {
      return { price: isFixed ? existedPrice : suggestedPrice, isFixed };
    }
    return { price: suggestedPrice, isFixed: false };
  },

  formatPrice(value) {
    if (value === null || value === undefined) return null;

    if (typeof value === 'number') {
      return this.roundPrice(value);
    }

    if (typeof value === 'string') {
      let normalized = value.trim().replace(/\s/g, '');

      const lastDotIndex = normalized.lastIndexOf('.');
      const lastCommaIndex = normalized.lastIndexOf(',');

      if (lastDotIndex > -1 && lastCommaIndex > -1) {
        if (lastDotIndex > lastCommaIndex) {
          normalized = normalized.replace(/,/g, '');
        } else {
          normalized = normalized.replace(/\./g, '').replace(',', '.');
        }
      } else if (lastCommaIndex > -1) {
        const charsAfterComma = normalized.length - lastCommaIndex - 1;
        if (charsAfterComma === 2 || charsAfterComma === 1) {
          normalized = normalized.replace(',', '.');
        } else if (charsAfterComma === 3) {
          normalized = normalized.replace(/,/g, '');
        } else {
          normalized = normalized.replace(',', '.');
        }
      } else if (lastDotIndex > -1) {
        const dotCount = (normalized.match(/\./g) || []).length;
        if (dotCount > 1) {
          const parts = normalized.split('.');
          const lastPart = parts.pop();
          normalized = parts.join('') + '.' + lastPart;
        } else {
          const charsAfterDot = normalized.length - lastDotIndex - 1;
          if (charsAfterDot === 3 && lastDotIndex <= 1) {
            normalized = normalized.replace('.', '');
          }
        }
      }

      const num = parseFloat(normalized);
      return this.roundPrice(num);
    }

    return null;
  },

  roundPrice(value) {
    if (value === null || value === undefined || isNaN(value)) return null;
    return Math.round(value * 100) / 100;
  },

  // ════════════════════════════════════════════════════════════
  // calculatePlatformPrice — αναλλοίωτος (Skroutz & Shopflix)
  // ════════════════════════════════════════════════════════════
  calculatePlatformPrice({ wholesalePrice, recycleTax, shippingCost, platformConfig }) {
    const managementCost = platformConfig.management_cost ?? Number(process.env.GENERAL_CATEGORY_MANAGMENT) ?? 2;
    const packagingCost = platformConfig.packaging_cost ?? Number(process.env.GENERAL_CATEGORY_PACKAGING) ?? 1;
    const platformCommission = platformConfig.platform_commission ?? Number(process.env.GENERAL_CATEGORY_PERCENTAGE) ?? 20;
    const profitMargin = platformConfig.profit_margin ?? Number(process.env.GENERAL_CATEGORY_PROFIT) ?? 10;
    const guaranteedProfit = platformConfig.guaranteed_minimum_income ?? Number(process.env.GUARANTEED_MINMIMUM_INCOME) ?? 3;

    const totalCost = this.parseFloatSafe(wholesalePrice) +
      this.parseFloatSafe(recycleTax) +
      this.parseFloatSafe(shippingCost) +
      this.parseFloatSafe(managementCost) +
      this.parseFloatSafe(packagingCost) +
      this.parseFloatSafe(guaranteedProfit);
    const priceWithProfit = totalCost * ((100 + profitMargin) / 100);
    const priceWithVAT = priceWithProfit * ((100 + Number(process.env.GENERAL_TAX_RATE)) / 100);
    const calculatedPrice = priceWithVAT / ((100 - platformCommission) / 100);
    const finalPrice = this.roundUpToFirstDecimal(calculatedPrice);

    return Math.round(finalPrice * 100) / 100;
  },

  // ════════════════════════════════════════════════════════════
  // getPlatformConfig — αναλλοίωτη
  // ════════════════════════════════════════════════════════════
  getPlatformConfig(category, platformName, brandId = null) {
    if (!category.cat_percentage || !Array.isArray(category.cat_percentage)) {
      return {
        platform_commission: Number(process.env.GENERAL_CATEGORY_PERCENTAGE) || 20,
        management_cost: Number(process.env.GENERAL_CATEGORY_MANAGMENT) || 2,
        profit_margin: Number(process.env.GENERAL_CATEGORY_PROFIT) || 10,
        packaging_cost: Number(process.env.GENERAL_CATEGORY_PACKAGING) || 1,
        guaranteed_minimum_income: Number(process.env.GUARANTEED_MINMIMUM_INCOME) || 3
      };
    }

    const platformConfig = category.cat_percentage.find(
      config => config.name?.toLowerCase() === platformName.toLowerCase()
    );

    if (!platformConfig) {
      return {
        platform_commission: Number(process.env.GENERAL_CATEGORY_PERCENTAGE) || 20,
        management_cost: Number(process.env.GENERAL_CATEGORY_MANAGMENT) || 2,
        profit_margin: Number(process.env.GENERAL_CATEGORY_PROFIT) || 10,
        packaging_cost: Number(process.env.GENERAL_CATEGORY_PACKAGING) || 1,
        guaranteed_minimum_income: Number(process.env.GUARANTEED_MINMIMUM_INCOME) || 3
      };
    }

    let config = {
      platform_commission: platformConfig.platform_commission ?? Number(process.env.GENERAL_CATEGORY_PERCENTAGE) ?? 20,
      management_cost: platformConfig.platform_man_cost ?? Number(process.env.GENERAL_CATEGORY_MANAGMENT) ?? 2,
      profit_margin: platformConfig.profit_margin ?? Number(process.env.GENERAL_CATEGORY_PROFIT) ?? 10,
      packaging_cost: platformConfig.packaging_cost ?? Number(process.env.GENERAL_CATEGORY_PACKAGING) ?? 1,
      guaranteed_minimum_income: platformConfig.add_to_price ?? Number(process.env.GUARANTEED_MINMIMUM_INCOME) ?? 3,
    };

    if (brandId && platformConfig.brand_perc && Array.isArray(platformConfig.brand_perc)) {
      const brandConfig = platformConfig.brand_perc.find(bp => bp.brand?.id === brandId);
      if (brandConfig && brandConfig.profit_margin !== undefined) {
        config.profit_margin = brandConfig.profit_margin;
      }
    }

    return config;
  },

  roundUpToFirstDecimal(price) {
    return Math.ceil(price * 10) / 10;
  }
});