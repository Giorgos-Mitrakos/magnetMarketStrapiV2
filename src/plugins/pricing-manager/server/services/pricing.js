'use strict';

module.exports = ({ strapi }) => ({
  async calculatePricingScenarios({ categoryId, platformConfig, sampleProducts }) {
    const category = await strapi.entityService.findOne('api::category.category', categoryId, {
      populate: {
        products: {
          populate: {
            brand: true,
            supplierInfo: true,
          },
          limit: 10,
        },
      },
    });

    const products = sampleProducts || category.products || [];

    // Calculate για διάφορα margin scenarios
    const scenarios = [];

    for (let margin = 0; margin <= 15; margin += 0.5) {
      const config = {
        ...platformConfig,
        profit_margin: margin,
      };

      const productPrices = products.map(product => {
        const wholesale = this.getMinSupplierPrice(product);
        const recycleTax = this.getRecycleTax(product);
        const shipping = this.getShippingCost(product);

        return this.calculatePrice({
          wholesalePrice: wholesale,
          recycleTax: recycleTax,
          shippingCost: shipping,
          platformConfig: config,
        });
      });

      const avgPrice = productPrices.reduce((sum, p) => sum + p.finalPrice, 0) / productPrices.length;
      const avgProfit = productPrices.reduce((sum, p) => sum + p.profit, 0) / productPrices.length;

      scenarios.push({
        margin,
        avgPrice,
        avgProfit,
        actualMargin: avgProfit / (avgPrice / (1 + VAT) / (1 - config.platform_commission / 100) - avgProfit) * 100,
        products: productPrices,
      });
    }

    return scenarios;
  },

  /**
   * Υπολογίζει τιμή με breakdown
   */
  calculatePrice({ wholesalePrice, recycleTax = 0, shippingCost, platformConfig }) {
    const vat = Number(process.env.GENERAL_TAX_RATE) / 100 || 0.24;
    const managementCost = platformConfig.management_cost ?? Number(process.env.GENERAL_CATEGORY_MANAGMENT) ?? 2;
    const packagingCost = platformConfig.packaging_cost ?? Number(process.env.GENERAL_CATEGORY_PACKAGING) ?? 1;
    const platformCommission = platformConfig.platform_commission ?? Number(process.env.GENERAL_CATEGORY_PERCENTAGE) ?? 20;
    const profitMargin = platformConfig.profit_margin ?? Number(process.env.GENERAL_CATEGORY_PROFIT) ?? 10;
    const guaranteedProfit = platformConfig.guaranteed_minimum_income ?? Number(process.env.GUARANTEED_MINMIMUM_INCOME) ?? 3;

    const ws = parseFloat(wholesalePrice) || 0;
    const rt = parseFloat(recycleTax) || 0;
    const sc = parseFloat(shippingCost) || 0;
    const mc = parseFloat(managementCost) || 0;
    const pc = parseFloat(packagingCost) || 0;
    const gp = parseFloat(guaranteedProfit) || 0;

    // ✅ ΑΛΛΑΓΗ 1: baseCost χωρίς profit
    const baseCost = ws + rt + sc + mc + pc;

    // ✅ ΑΛΛΑΓΗ 2: profit μόνο πάνω στο wholesale + guaranteed ξεχωριστά
    const profit = baseCost * (profitMargin / 100) + gp;
    const priceWithProfit = baseCost + profit;

    // ✅ ΑΛΛΑΓΗ 3: διορθωμένο VAT (1 + vat, όχι 100 + vat)
    const priceWithVAT = priceWithProfit * (1 + vat);

    // ✅ ΑΛΛΑΓΗ 4: νέος τύπος gross-up για commission
    const commission = platformCommission / 100;
    const calculatedPrice = priceWithVAT / (1 - (1 + vat) * commission);

    // 5. Round up
    const finalPrice = Math.round((Math.ceil(calculatedPrice * 10) / 10) * 100) / 100;

    // Κέρδος breakdown
    const netReceived = finalPrice * (1 - commission);
    const netReceivedNoVAT = netReceived / (1 + vat);
    const actualProfit = Math.round((netReceivedNoVAT - baseCost) * 100) / 100;
    const profitPct = baseCost > 0 ? Math.round(actualProfit / baseCost * 10000) / 100 : 0;


    return {
      finalPrice,
      baseCost: Math.round(baseCost * 100) / 100,
      profit: actualProfit,
      profitPct,
      breakdown: {
        wholesalePrice: ws,
        recycleTax: rt,
        shippingCost: sc,
        managementCost: mc,
        packagingCost: pc,
        guaranteedProfit: gp,
        baseCost: Math.round(baseCost * 100) / 100,
        profitAmount: Math.round(profit * 100) / 100,
        priceWithProfit: Math.round(priceWithProfit * 100) / 100,
        vatAmount: Math.round((priceWithVAT - priceWithProfit) * 100) / 100,
        priceWithVAT: Math.round(priceWithVAT * 100) / 100,
        commissionAmount: Math.round(finalPrice * commission * 100) / 100,
        netReceived: Math.round(netReceived * 100) / 100,
        netReceivedNoVAT: Math.round(netReceivedNoVAT * 100) / 100,
      },
    };
  },

  /**
   * Helper: Βρίσκει τη χαμηλότερη χονδρική από suppliers
   */
  getMinSupplierPrice(product) {
    if (!product.supplierInfo || product.supplierInfo.length === 0) {
      return 0;
    }

    const availableSuppliers = product.supplierInfo.filter(s => s.in_stock);

    if (availableSuppliers.length === 0) {
      return product.supplierInfo[0].wholesale || 0;
    }

    return Math.min(...availableSuppliers.map(s => s.wholesale || 0));
  },

  getRecycleTax(product) {
    if (!product.supplierInfo || product.supplierInfo.length === 0) {
      return 0;
    }

    const availableSuppliers = product.supplierInfo.filter(s => s.in_stock);

    if (availableSuppliers.length === 0) {
      return product.supplierInfo[0].recycle_tax || 0;
    }

    return Math.max(...availableSuppliers.map(s => s.recycle_tax || 0));
  },

  /**
   * Helper: Υπολογίζει shipping cost
   */
  getShippingCost(product) {
    // TODO: Implement your shipping logic
    return parseFloat(process.env.GENERAL_SHIPPING_PRICE) || 3;
  },

  /**
   * Compare pricing: BestPrice vs Skroutz
   */
  comparePlatformPricing({ totalCost, bestpriceMargin, skroutzMargin }) {
    const bestpriceConfig = {
      platform_commission: 1,
      profit_margin: bestpriceMargin,
      management_cost: 0,
      packaging_cost: 2,
    };

    const skroutzConfig = {
      platform_commission: 10,
      profit_margin: skroutzMargin,
      management_cost: 2,
      packaging_cost: 2,
    };

    const bestprice = this.calculatePrice({
      wholesalePrice: totalCost - 5, // Approximate
      shippingCost: 3,
      platformConfig: bestpriceConfig,
    });

    const skroutz = this.calculatePrice({
      wholesalePrice: totalCost - 5,
      shippingCost: 3,
      platformConfig: skroutzConfig,
    });

    return {
      bestprice,
      skroutz,
      priceDifference: skroutz.finalPrice - bestprice.finalPrice,
      profitDifference: bestprice.profit - skroutz.profit,
      percentCheaper: ((skroutz.finalPrice - bestprice.finalPrice) / skroutz.finalPrice * 100).toFixed(2),
    };
  },
});
