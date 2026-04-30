// server/services/opportunity-analyzer.js
// ✅ INTEGRATED: Clearance detection

'use strict';

module.exports = ({ strapi }) => ({
  
  async analyzeProduct(product, options = {}) {
    try {
      const startTime = Date.now();

      if (!product || !product.supplierInfo) {
        throw new Error('Product must include supplierInfo');
      }

      const metricsService = strapi.plugin('bargain-detector').service('metrics');
      const scoringService = strapi.plugin('bargain-detector').service('scoring');
      const clearanceService = strapi.plugin('bargain-detector').service('clearance-detector');

      strapi.log.debug(`[Opportunity Analyzer] Calculating metrics for product ${product.id}`);
      const metrics = await metricsService.calculateMetrics(product);

      if (!metrics) {
        throw new Error('Insufficient data for analysis - need at least 3 price history points');
      }

      // ✅ NEW: Check for clearance FIRST (highest priority)
      strapi.log.debug(`[Opportunity Analyzer] Checking for clearance sales`);
      const clearanceDetection = clearanceService.detectClearance(product, metrics);

      // Check if this was previously dismissed
      let isDismissed = false;
      if (clearanceDetection) {
        isDismissed = await clearanceService.wasDismissedAsFalsePositive(
          product.id,
          clearanceDetection.supplier.id
        );
      }

      let patterns = [];
      try {
        const patternService = strapi.plugin('bargain-detector').service('patterns');
        if (patternService) {
          patterns = await patternService.detectPatterns(product, metrics);
        }
      } catch (error) {
        strapi.log.warn('[Opportunity Analyzer] Pattern service not available, continuing without patterns');
      }

      strapi.log.debug(`[Opportunity Analyzer] Calculating scores`);
      const scores = await scoringService.calculateScores(product, metrics, patterns, clearanceDetection);

      // ✅ OVERRIDE: If clearance detected and not dismissed, use clearance recommendation
      let finalRecommendation = scores.recommendation;
      let finalRationale = scores.recommendation_rationale;
      let finalAction = scores.recommendation_action;
      let finalStockDays = scores.suggested_stock_days;
      let finalPriority = scores.priority;
      let finalNote = scores.recommendation_note;

      if (clearanceDetection && !isDismissed) {
        const clearanceRec = clearanceDetection.recommendation;
        
        finalRecommendation = 'clearance_urgent';
        finalRationale = clearanceRec.rationale;
        finalAction = clearanceRec.action;
        finalStockDays = clearanceRec.stock_days;
        finalPriority = 'flash_clearance'; // ✅ NEW priority level
        finalNote = `${clearanceRec.note} | Typical clearance window: ${clearanceRec.estimated_window}`;

        strapi.log.info(
          `[Opportunity Analyzer] 🔥 CLEARANCE DETECTED: ${clearanceDetection.supplier.name} ` +
          `(confidence: ${clearanceDetection.confidence}%, urgency: ${clearanceDetection.urgency})`
        );
      }

      const analysis = {
        product_id: product.id,
        product_name: product.name,
        analyzed_at: new Date().toISOString(),

        opportunity_score: scores.opportunity_score,
        risk_score: scores.risk_score,
        confidence: scores.confidence,
        recommendation: finalRecommendation,
        priority: finalPriority,

        recommendation_rationale: finalRationale,
        recommendation_action: finalAction,
        suggested_stock_days: finalStockDays,
        recommendation_note: finalNote,

        // ✅ NEW: Clearance detection data
        clearance_detection: clearanceDetection && !isDismissed ? {
          detected: true,
          supplier: clearanceDetection.supplier,
          confidence: clearanceDetection.confidence,
          signals: clearanceDetection.signals,
          urgency: clearanceDetection.urgency,
          all_clearance_suppliers: clearanceDetection.allClearanceSuppliers,
          detected_at: clearanceDetection.detectedAt
        } : null,

        current_state: this.buildCurrentState(product, metrics),

        opportunity_breakdown: scores.opportunity_breakdown,
        risk_breakdown: scores.risk_breakdown,
        confidence_breakdown: scores.confidence_breakdown,

        key_insights: this.generateKeyInsights(product, metrics, scores, patterns, clearanceDetection, isDismissed),

        action_items: this.generateActionItems(scores, metrics, product, clearanceDetection, isDismissed),

        metrics_summary: this.buildMetricsSummary(metrics),
        patterns_matched: patterns.filter(p => p.matched).map(p => ({
          name: p.name,
          confidence: p.confidence,
          success_rate: p.times_successful / Math.max(p.times_observed, 1)
        })),

        signals: scores.signals_detected,

        metadata: {
          analysis_duration_ms: Date.now() - startTime,
          data_points_analyzed: metrics.totalDataPoints || 0,
          suppliers_analyzed: product.supplierInfo?.length || 0,
          clearance_checked: true,
          clearance_detected: clearanceDetection ? true : false,
          config_version: scores.calculation_details.config_version
        }
      };

      strapi.log.info(
        `[Opportunity Analyzer] Analysis complete for ${product.name}: ` +
        `Opportunity=${scores.opportunity_score}, Risk=${scores.risk_score}, ` +
        `Recommendation=${finalRecommendation}` +
        (clearanceDetection && !isDismissed ? ' 🔥 CLEARANCE!' : '')
      );

      return analysis;

    } catch (error) {
      strapi.log.error(`[Opportunity Analyzer] Error analyzing product: ${error.message}`);
      throw error;
    }
  },

  buildCurrentState(product, metrics) {
    return {
      current_price: metrics.currentBest || 0,
      current_stock: metrics.currentStock || 0,
      cheapest_supplier: {
        name: metrics.bestSupplier || 'Unknown',
        price: metrics.currentBest || 0
      },
      total_suppliers: product.supplierInfo?.length || 0,
      suppliers_in_stock: product.supplierInfo?.filter(s => s.in_stock).length || 0,

      liquidity: {
        is_fast_mover: metrics.isFastMover || false,
        purchase_frequency: metrics.purchaseFrequency || 'unknown',
        avg_days_between_purchases: metrics.avgDaysBetweenPurchases || null,
        days_since_last_purchase: metrics.daysSinceLastPurchase || null
      }
    };
  },

  buildMetricsSummary(metrics) {
    return {
      current_price: metrics.currentBest,
      avg_30d: metrics.avg30d,
      min_30d: metrics.min30d,
      max_30d: metrics.max30d,
      historic_min: metrics.historicMin,
      historic_max: metrics.historicMax,

      drop_from_avg: metrics.dropFrom30d,
      distance_from_min: metrics.distanceFromMin,
      distance_from_max: metrics.distanceFromMax,

      volatility: {
        coefficient_of_variation: metrics.coefficientOfVariation,
        std_dev_30d: metrics.stdDev30d,
        price_changes_30d: metrics.priceChangesLast30d
      },

      trend: metrics.trend,

      supplierAnalysis: metrics.supplierAnalysis || [],

      suppliers_dropping: metrics.suppliersDropping || 0,
      best_price_savings: metrics.bestPriceSavings || 0,
      supplier_count: metrics.supplierCount || 0,
      avg_supplier_price: metrics.avgSupplierPrice || 0,

      supplierPriceSpread: metrics.supplierPriceSpread || 0,
      supplierAgreement: metrics.supplierAgreement || 0,
      stableSuppliers: metrics.stableSuppliers || 0,
      volatileSuppliers: metrics.volatileSuppliers || 0,

      liquidity: {
        liquidity_score: metrics.liquidityScore || 0,
        is_fast_mover: metrics.isFastMover || false,
        purchase_frequency: metrics.purchaseFrequency || 'unknown',
        avg_days_between_purchases: metrics.avgDaysBetweenPurchases || null,
        days_since_last_purchase: metrics.daysSinceLastPurchase || null,
        total_purchases: metrics.totalPurchases || 0
      },

      is_historic_low: metrics.isHistoricLow || false,
      is_near_historic_low: metrics.isNearHistoricLow || false,
      is_flash_deal: metrics.isFlashDeal || false,
      hours_since_drop: metrics.hoursSinceLastDrop || null
    };
  },

  /**
   * ✅ ENHANCED: Includes clearance insights
   */
  generateKeyInsights(product, metrics, scores, patterns, clearanceDetection, isDismissed) {
    const insights = [];
    const supplierAnalysis = metrics.supplierAnalysis || [];

    // ✅ CLEARANCE INSIGHTS (HIGHEST PRIORITY)
    if (clearanceDetection && !isDismissed) {
      insights.push({
        type: 'clearance_sale_detected',
        severity: 'urgent',
        message: `🔥 CLEARANCE SALE from ${clearanceDetection.supplier.name} (${clearanceDetection.confidence}% confidence)`,
        details: {
          supplier: clearanceDetection.supplier.name,
          confidence: clearanceDetection.confidence,
          urgency: clearanceDetection.urgency,
          signals: clearanceDetection.signals.map(s => s.message),
          interpretation: 'Supplier likely clearing inventory - act fast!',
          estimated_window: '5-10 days'
        }
      });

      // Individual signals as separate insights
      clearanceDetection.signals.forEach(signal => {
        if (signal.severity === 'critical' || signal.severity === 'high') {
          insights.push({
            type: `clearance_signal_${signal.type}`,
            severity: signal.severity === 'critical' ? 'urgent' : 'positive',
            message: signal.message,
            details: signal.details
          });
        }
      });
    }

    // === OPPORTUNITY INSIGHTS ===

    if (scores.opportunity_score >= 80) {
      insights.push({
        type: 'exceptional_opportunity',
        severity: 'positive',
        message: `Exceptional buying opportunity detected with ${scores.opportunity_score}/100 opportunity score`,
        details: {
          drop_from_avg: metrics.dropFrom30d?.toFixed(2),
          current_price: metrics.currentBest
        }
      });
    }

    if (metrics.isHistoricLow) {
      insights.push({
        type: 'historic_low',
        severity: 'positive',
        message: 'Price is at or near historic low',
        details: {
          distance_from_min: metrics.distanceFromMin?.toFixed(2),
          historic_min: metrics.historicMin
        }
      });
    }

    if (metrics.isFlashDeal && metrics.hoursSinceLastDrop < 6) {
      insights.push({
        type: 'flash_opportunity',
        severity: 'urgent',
        message: `Flash deal detected - price dropped ${metrics.flashDropPercent?.toFixed(1)}% just ${metrics.hoursSinceLastDrop?.toFixed(1)} hours ago`,
        details: {
          urgency: 'high',
          window_remaining: 'limited',
          drop_percent: metrics.flashDropPercent
        }
      });
    }

    // === LIQUIDITY INSIGHTS ===

    if (metrics.isFastMover) {
      insights.push({
        type: 'fast_mover',
        severity: 'positive',
        message: `Fast-moving product - reorders every ${metrics.avgDaysBetweenPurchases?.toFixed(0)} days (liquidity score: ${metrics.liquidityScore}/100)`,
        details: {
          liquidity_score: metrics.liquidityScore,
          frequency: metrics.purchaseFrequency,
          avg_days: metrics.avgDaysBetweenPurchases,
          interpretation: 'Excellent for stocking if price is good'
        }
      });
    } else if (metrics.liquidityScore < 30 && metrics.liquidityScore > 0) {
      insights.push({
        type: 'slow_mover',
        severity: 'warning',
        message: `Slow-moving product - careful with stocking (liquidity score: ${metrics.liquidityScore}/100)`,
        details: {
          liquidity_score: metrics.liquidityScore,
          avg_days: metrics.avgDaysBetweenPurchases,
          recommendation: 'Buy on demand only, avoid stocking'
        }
      });
    }

    // === RISK INSIGHTS ===

    if (scores.risk_score >= 70) {
      insights.push({
        type: 'high_risk',
        severity: 'warning',
        message: `High risk score (${scores.risk_score}/100) — αγορά με προσοχή`,
        details: {
          risk_score: scores.risk_score,
          interpretation: 'Υψηλή αστάθεια τιμών ή αναξιόπιστα δεδομένα supplier'
        }
      });
    }

    if (metrics.coefficientOfVariation > 15) {
      insights.push({
        type: 'high_volatility',
        severity: 'warning',
        message: `Volatile pricing (CV: ${metrics.coefficientOfVariation?.toFixed(1)}%) — η τιμή αλλάζει συχνά και απρόβλεπτα`,
        details: {
          cv: metrics.coefficientOfVariation,
          std_dev_30d: metrics.stdDev30d,
          interpretation: 'Δύσκολο να προβλέψεις αν η τιμή θα συνεχίσει να πέφτει ή θα ανακάμψει'
        }
      });
    }

    // === TREND INSIGHTS ===

    const trendDir = metrics.trend?.direction;
    if (trendDir === 'strong_down' || trendDir === 'down') {
      insights.push({
        type: 'downward_trend',
        severity: 'positive',
        message: `Downward price trend (${trendDir}) — καλή στιγμή αγοράς`,
        details: {
          direction: trendDir,
          strength: metrics.trend?.strength,
          interpretation: trendDir === 'strong_down' ? 'Ισχυρή καθοδική τάση — πιθανή ευκαιρία τώρα' : 'Σταδιακή πτώση — παρακολούθησε'
        }
      });
    } else if (trendDir === 'reversing') {
      insights.push({
        type: 'trend_reversing',
        severity: 'urgent',
        message: 'Trend reversing — η τιμή μόλις σταμάτησε να πέφτει, ίσως είναι το bottom',
        details: {
          interpretation: 'Καλή στιγμή να αγοράσεις πριν ανεβεί ξανά'
        }
      });
    } else if (trendDir === 'strong_up' || trendDir === 'up') {
      insights.push({
        type: 'upward_trend',
        severity: 'warning',
        message: `Upward price trend (${trendDir}) — η τιμή ανεβαίνει`,
        details: {
          direction: trendDir,
          interpretation: 'Προσοχή — αγόρασε μόνο αν έχεις άμεση ανάγκη'
        }
      });
    }

    // === SUPPLIER COMPETITION INSIGHTS ===

    if (metrics.suppliersDropping >= 2) {
      insights.push({
        type: 'multi_supplier_drop',
        severity: 'positive',
        message: `${metrics.suppliersDropping} suppliers πέφτουν ταυτόχρονα — market-wide signal`,
        details: {
          suppliers_dropping: metrics.suppliersDropping,
          supplier_count: metrics.supplierCount,
          interpretation: 'Όταν πολλοί suppliers κατεβαίνουν μαζί, η πτώση είναι πιο αξιόπιστη'
        }
      });
    }

    // Best supplier below own historic min
    const bestSupplierData = supplierAnalysis.find(
      s => s.hasData && s.supplier.name === metrics.bestSupplier
    );
    if (bestSupplierData && bestSupplierData.distanceFromMin <= 0) {
      insights.push({
        type: 'supplier_below_own_min',
        severity: 'urgent',
        message: `${metrics.bestSupplier} είναι κάτω από το δικό του historic low — ασυνήθιστη συμπεριφορά`,
        details: {
          supplier: metrics.bestSupplier,
          current_price: bestSupplierData.currentPrice,
          historic_min: bestSupplierData.historicMin,
          interpretation: 'Πιθανό ξεσκαρτάρισμα — έλεγξε χειροκίνητα'
        }
      });
    }

    // === PATTERN INSIGHTS ===

    const matchedPatterns = patterns.filter(p => p.matched);
    if (matchedPatterns.length > 0) {
      insights.push({
        type: 'pattern_match',
        severity: 'positive',
        message: `${matchedPatterns.length} historical pattern(s) matched — αυτή η κατάσταση έχει ξαναγίνει`,
        details: {
          patterns: matchedPatterns.map(p => ({
            name: p.name,
            confidence: p.confidence,
            success_rate: p.times_observed > 0
              ? (p.times_successful / p.times_observed * 100).toFixed(0) + '%'
              : 'new'
          }))
        }
      });
    }

    return insights;
  },

  /**
   * ✅ ENHANCED: Includes clearance actions
   */
  generateActionItems(scores, metrics, product, clearanceDetection, isDismissed) {
    const actions = [];
    const recommendation = scores.recommendation;

    // ✅ CLEARANCE ACTIONS (HIGHEST PRIORITY)
    if (clearanceDetection && !isDismissed) {
      const clearanceRec = clearanceDetection.recommendation;

      actions.push({
        action: 'clearance_opportunity',
        priority: 'flash_clearance',
        description: `🔥 CLEARANCE: ${clearanceRec.action.toUpperCase()} - ${clearanceRec.stock_days} days stock`,
        rationale: clearanceRec.rationale,
        urgency: clearanceDetection.urgency,
        time_window: clearanceRec.estimated_window,
        note: clearanceRec.note,
        suggested_quantity: this.calculateSuggestedQuantity(product, metrics, clearanceRec.stock_days)
      });

      actions.push({
        action: 'verify_clearance',
        priority: 'high',
        description: 'Verify with supplier - confirm it\'s clearance and not pricing error',
        rationale: `Confidence: ${clearanceDetection.confidence}% - always verify before large orders`,
        note: 'Quick phone call can save you from false positives'
      });
    }

    // Primary action based on recommendation
    if (recommendation === 'strong_buy_and_stock') {
      actions.push({
        action: 'immediate_stock_purchase',
        priority: 'critical',
        description: `Strong buy signal - purchase for ${scores.suggested_stock_days} days stock immediately`,
        rationale: scores.recommendation_rationale,
        suggested_quantity: this.calculateSuggestedQuantity(product, metrics, scores.suggested_stock_days)
      });
    } else if (recommendation === 'opportunistic_stock') {
      actions.push({
        action: 'opportunistic_purchase',
        priority: 'high',
        description: `Exceptional price - take ${scores.suggested_stock_days} days stock (conservative)`,
        rationale: scores.recommendation_rationale,
        suggested_quantity: this.calculateSuggestedQuantity(product, metrics, scores.suggested_stock_days)
      });
    } else if (recommendation === 'buy_on_demand') {
      actions.push({
        action: 'buy_on_demand',
        priority: scores.priority === 'high' || scores.priority === 'critical' ? 'high' : 'medium',
        description: 'Αγόρασε όταν έχεις παραγγελία — μην πάρεις stock προς το παρόν',
        rationale: scores.recommendation_rationale,
        note: scores.recommendation_note || null
      });
    } else if (recommendation === 'watch') {
      actions.push({
        action: 'monitor_price',
        priority: 'medium',
        description: 'Παρακολούθησε — ελέγξε ξανά σε 2-3 μέρες',
        rationale: scores.recommendation_rationale,
        next_check: {
          target_opportunity: 65,
          target_risk: 40
        }
      });
    } else if (recommendation === 'avoid') {
      actions.push({
        action: 'avoid_purchase',
        priority: 'low',
        description: 'Αποφυγή αγοράς — υψηλό risk',
        rationale: scores.recommendation_rationale
      });
    } else {
      // wait_for_order
      actions.push({
        action: 'wait_for_order',
        priority: 'low',
        description: 'Αγόρασε μόνο αν έχεις συγκεκριμένη παραγγελία',
        rationale: scores.recommendation_rationale
      });
    }

    // Secondary action: monitor supplier αν είναι κοντά στο historic low
    if (!clearanceDetection && metrics.distanceFromMin < 10 && metrics.distanceFromMin > 0) {
      actions.push({
        action: 'monitor_supplier',
        priority: 'medium',
        description: `Τιμή ${metrics.distanceFromMin?.toFixed(1)}% πάνω από historic low — παρακολούθησε για περαιτέρω πτώση`,
        rationale: 'Κοντά στο historic low αλλά δεν το έχει φτάσει ακόμα'
      });
    }

    // Risk warning αν risk score υψηλό
    if (scores.risk_score >= 60 && recommendation !== 'avoid') {
      actions.push({
        action: 'risk_warning',
        priority: 'medium',
        description: `Προσοχή: risk score ${scores.risk_score}/100 — αγόρασε μόνο την ποσότητα που χρειάζεσαι`,
        rationale: 'Υψηλή αστάθεια τιμών — μην overstockάρεις'
      });
    }

    return actions;
  },

  calculateSuggestedQuantity(product, metrics, stockDays = null) {
    const currentStock = metrics.currentStock || 0;

    if (metrics.avgDaysBetweenPurchases && metrics.totalPurchases > 2) {
      const avgQuantityPerPurchase = metrics.totalQuantityPurchased / metrics.totalPurchases;

      if (stockDays) {
        const purchaseCycles = stockDays / metrics.avgDaysBetweenPurchases;
        const quantity = Math.ceil(purchaseCycles * avgQuantityPerPurchase);

        return {
          recommended: Math.max(1, quantity),
          reasoning: `${stockDays} days stock at current purchase rate`,
          details: {
            stock_days: stockDays,
            avg_quantity_per_purchase: avgQuantityPerPurchase.toFixed(1),
            purchase_cycles: purchaseCycles.toFixed(1)
          },
          current_stock: currentStock
        };
      } else {
        const quantity = Math.ceil(avgQuantityPerPurchase);

        return {
          recommended: Math.max(1, quantity),
          reasoning: 'One normal purchase cycle',
          details: {
            avg_quantity_per_purchase: avgQuantityPerPurchase.toFixed(1)
          },
          current_stock: currentStock
        };
      }
    }

    return {
      recommended: 1,
      reasoning: 'Insufficient purchase history - start with 1 unit',
      current_stock: currentStock
    };
  }
});