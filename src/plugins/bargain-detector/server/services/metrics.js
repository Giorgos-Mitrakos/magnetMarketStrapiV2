'use strict';

module.exports = ({ strapi }) => ({
  /**
   * Calculate all metrics for a product
   */
  async calculateMetrics(product) {
    const helpers = strapi.plugin('bargain-detector').service('helpers');
    
    const supplierInfo = product.supplierInfo || [];
    
    if (supplierInfo.length === 0) {
      return null;
    }
    
    // Get all price history
    const allHistory = helpers.getAllSupplierHistory(supplierInfo);
    
    if (allHistory.length < 3) {
      return null;
    }
    
    // Sort by date
    const sortedHistory = helpers.sortByDate(allHistory, 'desc');
    
    // Find best current price
    const bestSupplier = helpers.findCheapestSupplier(supplierInfo);
    const currentBest = bestSupplier?.wholesale || 0;
    
    // Calculate time-based metrics
    const last7d = helpers.filterByDays(sortedHistory, 7);
    const last30d = helpers.filterByDays(sortedHistory, 30);
    const last60d = helpers.filterByDays(sortedHistory, 60);
    const last90d = helpers.filterByDays(sortedHistory, 90);
    
    // Averages
    const avg7d = helpers.average(last7d.map(h => h.wholesale));
    const avg30d = helpers.average(last30d.map(h => h.wholesale));
    const avg60d = helpers.average(last60d.map(h => h.wholesale));
    const avg90d = helpers.average(last90d.map(h => h.wholesale));
    
    // Historic extremes
    const allPrices = sortedHistory.map(h => h.wholesale);
    const historicMin = Math.min(...allPrices);
    const historicMax = Math.max(...allPrices);
    const historicAvg = helpers.average(allPrices);
    
    // Min/Max for periods
    const prices7d = last7d.map(h => h.wholesale);
    const prices30d = last30d.map(h => h.wholesale);
    const prices60d = last60d.map(h => h.wholesale);
    const prices90d = last90d.map(h => h.wholesale);
    
    const min7d = prices7d.length > 0 ? Math.min(...prices7d) : currentBest;
    const max7d = prices7d.length > 0 ? Math.max(...prices7d) : currentBest;
    const min30d = prices30d.length > 0 ? Math.min(...prices30d) : currentBest;
    const max30d = prices30d.length > 0 ? Math.max(...prices30d) : currentBest;
    const min60d = prices60d.length > 0 ? Math.min(...prices60d) : currentBest;
    const max60d = prices60d.length > 0 ? Math.max(...prices60d) : currentBest;
    const min90d = prices90d.length > 0 ? Math.min(...prices90d) : currentBest;
    const max90d = prices90d.length > 0 ? Math.max(...prices90d) : currentBest;
    
    // Price drops
    const dropFrom7d = avg7d > 0 ? ((avg7d - currentBest) / avg7d) * 100 : 0;
    const dropFrom30d = avg30d > 0 ? ((avg30d - currentBest) / avg30d) * 100 : 0;
    const dropFrom60d = avg60d > 0 ? ((avg60d - currentBest) / avg60d) * 100 : 0;
    const dropFrom90d = avg90d > 0 ? ((avg90d - currentBest) / avg90d) * 100 : 0;
    const dropFromAvg = historicAvg > 0 ? ((historicAvg - currentBest) / historicAvg) * 100 : 0;
    
    // Distance from extremes
    const distanceFromMin = historicMin > 0 ? ((currentBest - historicMin) / historicMin) * 100 : 0;
    const distanceFromMax = historicMax > 0 ? ((historicMax - currentBest) / historicMax) * 100 : 0;
    
    // Is historic low?
    const isHistoricLow = distanceFromMin <= 2; // Within 2% of historic low
    const isNearHistoricLow = distanceFromMin <= 5; // Within 5%
    
    // Volatility
    const stdDev7d = helpers.standardDeviation(prices7d);
    const stdDev30d = helpers.standardDeviation(prices30d);
    const stdDev60d = helpers.standardDeviation(prices60d);
    const stdDev90d = helpers.standardDeviation(prices90d);
    
    const coefficientOfVariation = avg30d > 0 ? (stdDev30d / avg30d) * 100 : 0;
    
    const variance7d = Math.pow(stdDev7d, 2);
    const variance30d = Math.pow(stdDev30d, 2);
    
    // Price changes
    const priceChangesLast30d = helpers.countPriceChanges(last30d);
    
    // Trend analysis
    const trend = this.analyzeTrend(sortedHistory.slice(0, 14));
    
    // Multi-supplier metrics
    const suppliersDropping = this.countSuppliersDropping(supplierInfo);
    const supplierPrices = supplierInfo.filter(s => s.in_stock).map(s => s.wholesale);
    const avgSupplierPrice = helpers.average(supplierPrices);
    const bestPriceSavings = avgSupplierPrice > 0 
      ? ((avgSupplierPrice - currentBest) / avgSupplierPrice) * 100 
      : 0;
    
    // Flash deal detection
    const flashDeal = this.detectFlashDeal(sortedHistory);
    
    // ✅ NEW: Liquidity metrics from purchase history
    const liquidityMetrics = this.calculateLiquidityMetrics(product);
    
    // Last purchase price (from liquidity metrics)
    const lastPurchasePrice = liquidityMetrics.lastPurchaseDate 
      ? (product.purchace_history?.find(p => p.date === liquidityMetrics.lastPurchaseDate)?.price || null)
      : null;
    
    return {
      // Current state
      currentBest,
      currentStock: product.inventory || 0,
      bestSupplier: bestSupplier?.name || 'Unknown',
      bestSupplierCode: bestSupplier?.supplierProductId || null,
      
      // Averages
      avg7d,
      avg30d,
      avg60d,
      avg90d,
      historicAvg,
      
      // Extremes
      historicMin,
      historicMax,
      min7d,
      max7d,
      min30d,
      max30d,
      min60d,
      max60d,
      min90d,
      max90d,
      
      // Drops
      dropFrom7d,
      dropFrom30d,
      dropFrom60d,
      dropFrom90d,
      dropFromAvg,
      
      // Distances
      distanceFromMin,
      distanceFromMax,
      
      // Historic low flags
      isHistoricLow,
      isNearHistoricLow,
      
      // Volatility
      coefficientOfVariation,
      stdDev7d,
      stdDev30d,
      stdDev60d,
      stdDev90d,
      variance7d,
      variance30d,
      priceChangesLast30d,
      
      // Trend
      trend,
      
      // Multi-supplier
      suppliersDropping,
      supplierCount: supplierInfo.length,
      avgSupplierPrice,
      bestPriceSavings,
      
      // Flash deal
      isFlashDeal: flashDeal.isFlash,
      hoursSinceLastDrop: flashDeal.hoursSince,
      flashDropPercent: flashDeal.dropPercent,
      
      // ✅ NEW: Liquidity metrics (replaces avgDailySales)
      ...liquidityMetrics,
      
      // Last purchase price
      lastPurchasePrice,
      
      // Data quality
      totalDataPoints: sortedHistory.length,
      dataPoints7d: last7d.length,
      dataPoints30d: last30d.length,
      dataPoints60d: last60d.length,
      dataPoints90d: last90d.length,
      oldestDate: sortedHistory[sortedHistory.length - 1]?.date || null,
      newestDate: sortedHistory[0]?.date || null
    };
  },

  /**
   * ✅ NEW: Calculate liquidity metrics from purchase history
   * (Better than sales data for multi-channel business)
   */
  calculateLiquidityMetrics(product) {
    const purchaseHistory = product.purchace_history || [];
    
    if (purchaseHistory.length === 0) {
      return {
        purchaseFrequency: 'unknown',
        avgDaysBetweenPurchases: null,
        totalPurchases: 0,
        totalQuantityPurchased: 0,
        lastPurchaseDate: null,
        daysSinceLastPurchase: null,
        isFastMover: false,
        liquidityScore: 0
      };
    }
    
    // Sort by date (newest first)
    const sortedPurchases = purchaseHistory.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    const lastPurchase = sortedPurchases[0];
    const lastPurchaseDate = new Date(lastPurchase.date);
    const daysSinceLastPurchase = this.daysBetween(new Date(), lastPurchaseDate);
    
    // Calculate average days between purchases
    let totalDays = 0;
    let intervals = 0;
    
    for (let i = 0; i < sortedPurchases.length - 1; i++) {
      const current = new Date(sortedPurchases[i].date);
      const next = new Date(sortedPurchases[i + 1].date);
      const days = this.daysBetween(current, next);
      
      if (days > 0) {
        totalDays += days;
        intervals++;
      }
    }
    
    const avgDaysBetweenPurchases = intervals > 0 ? totalDays / intervals : null;
    
    // Determine frequency category
    let purchaseFrequency = 'unknown';
    let isFastMover = false;
    
    if (avgDaysBetweenPurchases !== null) {
      if (avgDaysBetweenPurchases < 15) {
        purchaseFrequency = 'very_high'; // Reorder every 2 weeks
        isFastMover = true;
      } else if (avgDaysBetweenPurchases < 30) {
        purchaseFrequency = 'high'; // Monthly reorder
        isFastMover = true;
      } else if (avgDaysBetweenPurchases < 60) {
        purchaseFrequency = 'medium'; // Every 1-2 months
        isFastMover = false;
      } else if (avgDaysBetweenPurchases < 90) {
        purchaseFrequency = 'low'; // Quarterly
        isFastMover = false;
      } else {
        purchaseFrequency = 'very_low'; // Rarely purchased
        isFastMover = false;
      }
    }
    
    // Calculate total quantity
    const totalQuantityPurchased = sortedPurchases.reduce(
      (sum, p) => sum + (p.quantity || 0), 0
    );
    
    // Liquidity score (0-100)
    let liquidityScore = 0;
    
    if (avgDaysBetweenPurchases !== null) {
      // Fast reorder = high liquidity
      if (avgDaysBetweenPurchases < 15) {
        liquidityScore = 100;
      } else if (avgDaysBetweenPurchases < 30) {
        liquidityScore = 80;
      } else if (avgDaysBetweenPurchases < 60) {
        liquidityScore = 60;
      } else if (avgDaysBetweenPurchases < 90) {
        liquidityScore = 40;
      } else {
        liquidityScore = 20;
      }
      
      // Penalty if not purchased recently
      if (daysSinceLastPurchase > avgDaysBetweenPurchases * 2) {
        liquidityScore *= 0.5; // 50% penalty for stale products
      }
    }
    
    return {
      purchaseFrequency,
      avgDaysBetweenPurchases,
      totalPurchases: sortedPurchases.length,
      totalQuantityPurchased,
      lastPurchaseDate: lastPurchase.date,
      daysSinceLastPurchase,
      isFastMover,
      liquidityScore: Math.round(liquidityScore)
    };
  },

  /**
   * Days between dates helper
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Analyze price trend
   */
  analyzeTrend(recentHistory) {
    if (!recentHistory || recentHistory.length < 3) {
      return { direction: 'insufficient_data', strength: 0 };
    }
    
    let downs = 0, ups = 0, stable = 0;
    let totalChange = 0;
    
    for (let i = 1; i < Math.min(recentHistory.length, 10); i++) {
      const change = recentHistory[i - 1].wholesale - recentHistory[i].wholesale;
      totalChange += change;
      
      const changePercent = Math.abs(change / recentHistory[i].wholesale);
      
      if (changePercent < 0.005) {
        stable++;
      } else if (change > 0) {
        downs++;
      } else {
        ups++;
      }
    }
    
    const total = downs + ups + stable;
    const avgChange = totalChange / (recentHistory.length - 1);
    
    // Determine direction
    let direction;
    if (downs >= total * 0.7) {
      direction = 'strong_down';
    } else if (downs > ups) {
      direction = 'down';
    } else if (ups >= total * 0.7) {
      direction = 'strong_up';
    } else if (ups > downs) {
      direction = 'up';
    } else {
      direction = 'stable';
    }
    
    // Check for reversal
    if (recentHistory.length >= 6) {
      const recent3 = recentHistory.slice(0, 3);
      const previous3 = recentHistory.slice(3, 6);
      
      const recentTrend = recent3[0].wholesale < recent3[2].wholesale ? 'down' : 'up';
      const previousTrend = previous3[0].wholesale < previous3[2].wholesale ? 'down' : 'up';
      
      if (recentTrend !== previousTrend) {
        direction = 'reversing';
      }
    }
    
    // Check for acceleration
    const accelerating = recentHistory.length >= 4 ? 
      this.isAccelerating(recentHistory.slice(0, 4)) : false;
    
    return {
      direction,
      strength: Math.max(downs, ups),
      avgChange,
      downs,
      ups,
      stable,
      accelerating
    };
  },

  /**
   * Check if trend is accelerating
   */
  isAccelerating(last4) {
    if (last4.length < 4) return false;
    
    const change1 = Math.abs(last4[0].wholesale - last4[1].wholesale);
    const change2 = Math.abs(last4[1].wholesale - last4[2].wholesale);
    const change3 = Math.abs(last4[2].wholesale - last4[3].wholesale);
    
    return change1 > change2 && change2 > change3;
  },

  /**
   * Count suppliers dropping prices
   */
  countSuppliersDropping(supplierInfo) {
    if (!supplierInfo || supplierInfo.length === 0) return 0;
    
    const helpers = strapi.plugin('bargain-detector').service('helpers');
    let dropping = 0;
    
    supplierInfo.forEach(supplier => {
      const history = supplier.price_progress || [];
      if (history.length < 2) return;
      
      const sorted = helpers.sortByDate(history, 'desc');
      const current = sorted[0].wholesale;
      const last30dPrices = helpers.filterByDays(sorted, 30).map(h => h.wholesale);
      const avg30d = helpers.average(last30dPrices);
      
      if (avg30d > 0 && ((avg30d - current) / avg30d) * 100 > 5) {
        dropping++;
      }
    });
    
    return dropping;
  },

  /**
   * Detect flash deal
   */
  detectFlashDeal(sortedHistory) {
    if (!sortedHistory || sortedHistory.length < 2) {
      return { isFlash: false, hoursSince: null, dropPercent: 0 };
    }
    
    const current = sortedHistory[0];
    const previous = sortedHistory[1];
    
    const hoursSince = (new Date(current.date) - new Date(previous.date)) / (1000 * 60 * 60);
    
    if (hoursSince > 12) {
      return { isFlash: false, hoursSince, dropPercent: 0 };
    }
    
    const dropPercent = ((previous.wholesale - current.wholesale) / previous.wholesale) * 100;
    
    const isFlash = dropPercent > 10 && hoursSince < 6;
    
    return {
      isFlash,
      hoursSince,
      dropPercent
    };
  }
});