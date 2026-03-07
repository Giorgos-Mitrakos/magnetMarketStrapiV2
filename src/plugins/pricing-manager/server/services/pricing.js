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
        const shipping = this.getShippingCost(product);

        return this.calculatePrice({
          wholesalePrice: wholesale,
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
  calculatePrice({ wholesalePrice, shippingCost, platformConfig }) {
    const managementCost = platformConfig.management_cost || 0;
    const packagingCost = platformConfig.packaging_cost || 0;
    const platformCommission = platformConfig.platform_commission || 0;
    const profitMargin = platformConfig.profit_margin || 0;

    // 1. Total cost
    const totalCost = wholesalePrice + shippingCost + managementCost + packagingCost;

    // 2. With profit
    const priceWithProfit = totalCost * (1 + profitMargin / 100);

    // 3. With VAT
    const priceWithVAT = priceWithProfit * (1 + VAT);

    // 4. With commission
    const calculatedPrice = priceWithVAT / (1 - platformCommission / 100);

    // 5. Round up
    const finalPrice = Math.ceil(calculatedPrice * 10) / 10;

    // Calculate actual profit
    const netReceived = finalPrice * (1 - platformCommission / 100);
    const netReceivedNoVAT = netReceived / (1 + VAT);
    const profit = netReceivedNoVAT - totalCost;
    const actualMargin = (profit / totalCost) * 100;

    return {
      finalPrice: Math.round(finalPrice * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      actualMargin: Math.round(actualMargin * 100) / 100,
      breakdown: {
        wholesalePrice,
        shippingCost,
        managementCost,
        packagingCost,
        totalCost,
        priceWithProfit: Math.round(priceWithProfit * 100) / 100,
        priceWithVAT: Math.round(priceWithVAT * 100) / 100,
        platformCommission: Math.round(finalPrice * platformCommission / 100 * 100) / 100,
        netReceived: Math.round(netReceived * 100) / 100,
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
