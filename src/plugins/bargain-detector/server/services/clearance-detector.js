// server/services/clearance-detector.js
// Detects supplier clearance sales (stock liquidation)

'use strict';

module.exports = ({ strapi }) => ({

  /**
   * Main entry point - detect clearance across all suppliers
   * 
   * @param {Object} product - Product with supplierInfo
   * @param {Object} metrics - Calculated metrics with supplierAnalysis
   * @returns {Object|null} Clearance detection result or null
   */
  detectClearance(product, metrics) {
    const supplierAnalysis = metrics.supplierAnalysis || [];
    
    if (supplierAnalysis.length === 0) {
      return null;
    }

    // Check each supplier for clearance signals
    const clearanceSuppliers = [];

    for (const supplier of supplierAnalysis) {
      if (!supplier.hasData || !supplier.supplier.in_stock) {
        continue;
      }

      const clearance = this.detectSupplierClearance(supplier, metrics);
      
      if (clearance.isClearance) {
        clearanceSuppliers.push({
          supplier: supplier.supplier,
          ...clearance
        });
      }
    }

    if (clearanceSuppliers.length === 0) {
      return null;
    }

    // Find highest confidence clearance
    clearanceSuppliers.sort((a, b) => b.confidence - a.confidence);
    const bestClearance = clearanceSuppliers[0];

    return {
      detected: true,
      supplier: bestClearance.supplier,
      confidence: bestClearance.confidence,
      signals: bestClearance.signals,
      urgency: bestClearance.urgency,
      recommendation: this.generateClearanceRecommendation(
        bestClearance,
        metrics,
        product
      ),
      allClearanceSuppliers: clearanceSuppliers,
      detectedAt: new Date().toISOString()
    };
  },

  /**
   * Detect clearance for a single supplier
   */
  detectSupplierClearance(supplierAnalysis, metrics) {
    const signals = [];
    let confidenceScore = 0;

    // Signal 1: Aggressive Drop (>20% in <7 days)
    const aggressiveDrop = this.checkAggressiveDrop(supplierAnalysis);
    if (aggressiveDrop.detected) {
      signals.push(aggressiveDrop);
      confidenceScore += 30;
    }

    // Signal 2: Below Historic Min
    const belowMin = this.checkBelowHistoricMin(supplierAnalysis);
    if (belowMin.detected) {
      signals.push(belowMin);
      confidenceScore += 25;
    }

    // Signal 3: Stable Supplier Suddenly Drops
    const stableSupplierDrop = this.checkStableSupplierDrop(supplierAnalysis);
    if (stableSupplierDrop.detected) {
      signals.push(stableSupplierDrop);
      confidenceScore += 20;
    }

    // Signal 4: Multiple Consecutive Drops
    const consecutiveDrops = this.checkConsecutiveDrops(supplierAnalysis);
    if (consecutiveDrops.detected) {
      signals.push(consecutiveDrops);
      confidenceScore += 15;
    }

    // Signal 5: Far Below Recent Average (>25%)
    const farBelowAverage = this.checkFarBelowAverage(supplierAnalysis);
    if (farBelowAverage.detected) {
      signals.push(farBelowAverage);
      confidenceScore += 10;
    }

    const isClearance = signals.length >= 2 && confidenceScore >= 40;

    return {
      isClearance,
      confidence: Math.min(confidenceScore, 100),
      signals,
      urgency: this.calculateUrgency(signals, confidenceScore)
    };
  },

  /**
   * Signal 1: Aggressive Drop (>20% in <7 days)
   */
  checkAggressiveDrop(supplierAnalysis) {
    const currentPrice = supplierAnalysis.currentPrice;
    const avg7d = supplierAnalysis.avg7d;

    if (!avg7d || avg7d === 0) {
      return { detected: false };
    }

    const dropPercent = ((avg7d - currentPrice) / avg7d) * 100;

    if (dropPercent > 20) {
      return {
        detected: true,
        type: 'aggressive_drop',
        severity: dropPercent > 30 ? 'critical' : 'high',
        message: `Aggressive ${dropPercent.toFixed(1)}% drop in last 7 days`,
        details: {
          drop_percent: dropPercent.toFixed(1),
          previous_avg: avg7d.toFixed(2),
          current_price: currentPrice.toFixed(2),
          interpretation: 'Supplier may be clearing inventory'
        }
      };
    }

    return { detected: false };
  },

  /**
   * Signal 2: Below Historic Min
   */
  checkBelowHistoricMin(supplierAnalysis) {
    const currentPrice = supplierAnalysis.currentPrice;
    const historicMin = supplierAnalysis.historicMin;

    if (!historicMin) {
      return { detected: false };
    }

    if (currentPrice < historicMin) {
      const belowPercent = ((historicMin - currentPrice) / historicMin) * 100;

      return {
        detected: true,
        type: 'below_historic_min',
        severity: belowPercent > 10 ? 'critical' : 'high',
        message: `Price ${belowPercent.toFixed(1)}% below historic minimum`,
        details: {
          current_price: currentPrice.toFixed(2),
          historic_min: historicMin.toFixed(2),
          below_percent: belowPercent.toFixed(1),
          interpretation: 'Unprecedented low price - likely clearance'
        }
      };
    }

    return { detected: false };
  },

  /**
   * Signal 3: Stable Supplier Suddenly Drops
   */
  checkStableSupplierDrop(supplierAnalysis) {
    const priceStability = supplierAnalysis.priceStability;
    const dropFrom30d = supplierAnalysis.dropFrom30d || 0;
    const consistency = supplierAnalysis.consistency || 0;

    if (priceStability === 'stable' && consistency > 0.75 && dropFrom30d > 15) {
      return {
        detected: true,
        type: 'stable_supplier_drop',
        severity: 'high',
        message: `Stable supplier (consistency: ${(consistency * 100).toFixed(0)}%) dropping prices ${dropFrom30d.toFixed(1)}%`,
        details: {
          consistency: (consistency * 100).toFixed(0),
          drop_from_30d: dropFrom30d.toFixed(1),
          volatility: supplierAnalysis.coefficientOfVariation?.toFixed(1),
          interpretation: 'Unusual behavior from reliable supplier - strong clearance signal'
        }
      };
    }

    return { detected: false };
  },

  /**
   * Signal 4: Multiple Consecutive Drops
   */
  checkConsecutiveDrops(supplierAnalysis) {
    // Note: This requires access to recent price history
    // For now, we'll use trend data as a proxy
    const trend = supplierAnalysis.trend;
    const trendStrength = trend?.strength || 0;

    if (trend?.direction === 'strong_down' && trendStrength >= 7) {
      return {
        detected: true,
        type: 'consecutive_drops',
        severity: 'medium',
        message: `Strong downward trend with ${trendStrength} consecutive price reductions`,
        details: {
          trend_direction: trend.direction,
          strength: trendStrength,
          interpretation: 'Systematic price reduction pattern - possible clearance'
        }
      };
    }

    return { detected: false };
  },

  /**
   * Signal 5: Far Below Recent Average (>25%)
   */
  checkFarBelowAverage(supplierAnalysis) {
    const dropFrom30d = supplierAnalysis.dropFrom30d || 0;

    if (dropFrom30d > 25) {
      return {
        detected: true,
        type: 'far_below_average',
        severity: dropFrom30d > 35 ? 'high' : 'medium',
        message: `Price ${dropFrom30d.toFixed(1)}% below 30-day average`,
        details: {
          drop_percent: dropFrom30d.toFixed(1),
          avg_30d: supplierAnalysis.avg30d?.toFixed(2),
          current_price: supplierAnalysis.currentPrice?.toFixed(2),
          interpretation: 'Significantly below normal pricing range'
        }
      };
    }

    return { detected: false };
  },

  /**
   * Calculate urgency level
   */
  calculateUrgency(signals, confidenceScore) {
    // Critical signals
    const hasCriticalSignal = signals.some(s => s.severity === 'critical');
    const hasAggressiveDrop = signals.some(s => s.type === 'aggressive_drop');
    const hasBelowMin = signals.some(s => s.type === 'below_historic_min');

    if (hasCriticalSignal && confidenceScore >= 70) {
      return 'critical';
    }

    if ((hasAggressiveDrop || hasBelowMin) && confidenceScore >= 50) {
      return 'high';
    }

    if (signals.length >= 3) {
      return 'high';
    }

    return 'medium';
  },

  /**
   * Generate clearance-specific recommendation
   */
  generateClearanceRecommendation(clearance, metrics, product) {
    const isFastMover = metrics.isFastMover || false;
    const liquidityScore = metrics.liquidityScore || 0;
    const currentStock = metrics.currentStock || 0;

    let action, stockDays, rationale;

    // Fast mover + high confidence = aggressive buy
    if (isFastMover && clearance.confidence >= 70) {
      action = 'stock_heavily';
      stockDays = this.calculateClearanceStockDays(metrics, 'aggressive');
      rationale = `Clearance από ${clearance.supplier.name} (confidence: ${clearance.confidence}%) + fast-moving product. ΣΤΟΚΑΡΕ ΤΩΡΑ!`;
    }
    // Medium liquidity + high confidence = moderate buy
    else if (liquidityScore >= 40 && clearance.confidence >= 60) {
      action = 'stock_moderately';
      stockDays = this.calculateClearanceStockDays(metrics, 'moderate');
      rationale = `Clearance detected (confidence: ${clearance.confidence}%). Moderate liquidity - πάρε conservative stock.`;
    }
    // Slow mover or low confidence = cautious buy
    else {
      action = 'buy_opportunistic';
      stockDays = 7; // Just 1 week
      rationale = `Possible clearance (confidence: ${clearance.confidence}%). Slow mover - πάρε μικρή ποσότητα για test.`;
    }

    return {
      action,
      stock_days: stockDays,
      rationale,
      priority: 'flash_clearance', // NEW priority level
      urgency: clearance.urgency,
      estimated_window: '5-10 days', // Typical clearance window
      note: currentStock > 0 
        ? `Έχεις ήδη ${currentStock} units stock - άνοιξε χώρο αν χρειαστεί`
        : 'Καμία υπάρχουσα inventory - ελεύθερος να στοκάρεις'
    };
  },

  /**
   * Calculate stock days for clearance opportunities
   */
  calculateClearanceStockDays(metrics, strategy) {
    const avgDays = metrics.avgDaysBetweenPurchases || 30;
    const liquidityScore = metrics.liquidityScore || 50;

    let multiplier;
    
    if (strategy === 'aggressive') {
      // More aggressive than normal strong_buy
      if (liquidityScore >= 90) multiplier = 3.0;
      else if (liquidityScore >= 70) multiplier = 2.5;
      else multiplier = 2.0;
    } else if (strategy === 'moderate') {
      if (liquidityScore >= 70) multiplier = 2.0;
      else if (liquidityScore >= 50) multiplier = 1.5;
      else multiplier = 1.0;
    } else {
      // Conservative
      multiplier = 0.5;
    }

    const suggestedDays = Math.round(avgDays * multiplier);
    return Math.max(7, Math.min(90, suggestedDays));
  },

  /**
   * Check if opportunity was dismissed as false positive
   */
  async wasDismissedAsFalsePositive(productId, supplierId) {
    try {
      const dismissed = await strapi.entityService.findMany(
        'plugin::bargain-detector.clearancedismissal',
        {
          filters: {
            product: productId,
            supplier: supplierId,
            dismissed_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          },
          limit: 1
        }
      );

      return dismissed && dismissed.length > 0;
    } catch (error) {
      strapi.log.error('[Clearance Detector] Error checking dismissals:', error.message);
      return false;
    }
  },

  /**
   * Dismiss clearance as false positive
   */
  async dismissAsFalsePositive(opportunityId, userId, reason = '') {
    try {
      // Get opportunity details
      const opportunity = await strapi.entityService.findOne(
        'plugin::bargain-detector.bargainopportunity',
        opportunityId,
        { populate: ['product'] }
      );

      if (!opportunity) {
        throw new Error('Opportunity not found');
      }

      const clearanceData = opportunity.analysis_data?.clearance_detection;
      if (!clearanceData) {
        throw new Error('No clearance data found');
      }

      // Record dismissal
      await strapi.entityService.create(
        'plugin::bargain-detector.clearancedismissal',
        {
          data: {
            product: opportunity.product.id,
            supplier: clearanceData.supplier.id,
            opportunity: opportunityId,
            dismissed_by: userId,
            dismissed_at: new Date(),
            reason,
            signals_at_dismissal: clearanceData.signals,
            confidence_at_dismissal: clearanceData.confidence
          }
        }
      );

      // Update opportunity status
      await strapi.entityService.update(
        'plugin::bargain-detector.bargainopportunity',
        opportunityId,
        {
          data: {
            status: 'dismissed',
            dismissed_as_false_positive: true,
            dismissed_at: new Date()
          }
        }
      );

      strapi.log.info(
        `[Clearance Detector] Opportunity ${opportunityId} dismissed as false positive by user ${userId}`
      );

      return { success: true };

    } catch (error) {
      strapi.log.error('[Clearance Detector] Error dismissing:', error.message);
      throw error;
    }
  }
});