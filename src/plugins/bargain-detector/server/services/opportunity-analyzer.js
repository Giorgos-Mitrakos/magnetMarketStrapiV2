// server/services/opportunity-analyzer.js

'use strict';

module.exports = ({ strapi }) => ({
  /**
   * Main orchestration function - analyzes a product for bargain opportunities
   * 
   * @param {Object} product - Product with supplierInfo and history
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Complete analysis result
   */
  async analyzeProduct(product, options = {}) {
    try {
      const startTime = Date.now();
      
      // Validate input
      if (!product || !product.supplierInfo) {
        throw new Error('Product must include supplierInfo');
      }

      // Get services
      const metricsService = strapi.plugin('bargain-detector').service('metrics');
      const scoringService = strapi.plugin('bargain-detector').service('scoring');

      // Step 1: Calculate metrics from price history
      strapi.log.debug(`[Opportunity Analyzer] Calculating metrics for product ${product.id}`);
      const metrics = await metricsService.calculateMetrics(product);

      if (!metrics) {
        throw new Error('Insufficient data for analysis - need at least 3 price history points');
      }

      // Step 2: Detect patterns (Phase 2 - for now empty array)
      let patterns = [];
      try {
        const patternService = strapi.plugin('bargain-detector').service('patterns');
        if (patternService) {
          patterns = await patternService.detectPatterns(product, metrics);
        }
      } catch (error) {
        strapi.log.warn('[Opportunity Analyzer] Pattern service not available, continuing without patterns');
      }

      // Step 3: Calculate opportunity, risk, and confidence scores
      strapi.log.debug(`[Opportunity Analyzer] Calculating scores`);
      const scores = await scoringService.calculateScores(product, metrics, patterns);

      // Step 4: Build comprehensive analysis result
      const analysis = {
        // Product identification
        product_id: product.id,
        product_name: product.name,
        analyzed_at: new Date().toISOString(),
        
        // Core scores
        opportunity_score: scores.opportunity_score,
        risk_score: scores.risk_score,
        confidence: scores.confidence,
        recommendation: scores.recommendation,
        priority: scores.priority,
        
        // ✅ NEW: Recommendation details
        recommendation_rationale: scores.recommendation_rationale,
        recommendation_action: scores.recommendation_action,
        suggested_stock_days: scores.suggested_stock_days || null,
        recommendation_note: scores.recommendation_note || null,
        
        // Current state
        current_state: this.buildCurrentState(product, metrics),
        
        // Detailed breakdowns
        opportunity_breakdown: scores.opportunity_breakdown,
        risk_breakdown: scores.risk_breakdown,
        confidence_breakdown: scores.confidence_breakdown,
        
        // Insights
        key_insights: this.generateKeyInsights(product, metrics, scores, patterns),
        
        // Recommendations
        action_items: this.generateActionItems(scores, metrics, product),
        
        // Supporting data
        metrics_summary: this.buildMetricsSummary(metrics),
        patterns_matched: patterns.filter(p => p.matched).map(p => ({
          name: p.name,
          confidence: p.confidence,
          success_rate: p.times_successful / Math.max(p.times_observed, 1)
        })),
        
        // Signals detected
        signals: scores.signals_detected,
        
        // Metadata
        metadata: {
          analysis_duration_ms: Date.now() - startTime,
          data_points_analyzed: metrics.totalDataPoints || 0,
          suppliers_analyzed: product.supplierInfo?.length || 0,
          config_version: scores.calculation_details.config_version
        }
      };

      strapi.log.info(
        `[Opportunity Analyzer] Analysis complete for ${product.name}: ` +
        `Opportunity=${scores.opportunity_score}, Risk=${scores.risk_score}, ` +
        `Recommendation=${scores.recommendation}`
      );

      return analysis;

    } catch (error) {
      strapi.log.error(`[Opportunity Analyzer] Error analyzing product: ${error.message}`);
      throw error;
    }
  },

  /**
   * Build current state snapshot
   */
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
      
      // ✅ NEW: Liquidity info
      liquidity: {
        is_fast_mover: metrics.isFastMover || false,
        purchase_frequency: metrics.purchaseFrequency || 'unknown',
        avg_days_between_purchases: metrics.avgDaysBetweenPurchases || null,
        days_since_last_purchase: metrics.daysSinceLastPurchase || null
      }
    };
  },

  /**
   * Build metrics summary
   * ✅ UPDATED: Added liquidity section
   */
  buildMetricsSummary(metrics) {
    return {
      // Price metrics
      current_price: metrics.currentBest,
      avg_30d: metrics.avg30d,
      min_30d: metrics.min30d,
      max_30d: metrics.max30d,
      historic_min: metrics.historicMin,
      historic_max: metrics.historicMax,
      
      // Change metrics
      drop_from_avg: metrics.dropFrom30d,
      distance_from_min: metrics.distanceFromMin,
      distance_from_max: metrics.distanceFromMax,
      
      // Volatility
      volatility: {
        coefficient_of_variation: metrics.coefficientOfVariation,
        std_dev_30d: metrics.stdDev30d,
        price_changes_30d: metrics.priceChangesLast30d
      },
      
      // Trend
      trend: metrics.trend,
      
      // ✅ NEW: Liquidity section
      liquidity: {
        liquidity_score: metrics.liquidityScore || 0,
        is_fast_mover: metrics.isFastMover || false,
        purchase_frequency: metrics.purchaseFrequency || 'unknown',
        avg_days_between_purchases: metrics.avgDaysBetweenPurchases || null,
        days_since_last_purchase: metrics.daysSinceLastPurchase || null,
        total_purchases: metrics.totalPurchases || 0
      },
      
      // Multi-supplier
      suppliers_dropping: metrics.suppliersDropping || 0,
      best_price_savings: metrics.bestPriceSavings || 0,
      
      // Special flags
      is_historic_low: metrics.isHistoricLow || false,
      is_near_historic_low: metrics.isNearHistoricLow || false,
      is_flash_deal: metrics.isFlashDeal || false,
      hours_since_drop: metrics.hoursSinceLastDrop || null
    };
  },

  /**
   * Generate key insights from analysis
   * ✅ UPDATED: Added liquidity insights
   */
  generateKeyInsights(product, metrics, scores, patterns) {
    const insights = [];

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

    // === LIQUIDITY INSIGHTS ✅ NEW ===
    
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

    if (metrics.daysSinceLastPurchase && metrics.avgDaysBetweenPurchases) {
      const ratio = metrics.daysSinceLastPurchase / metrics.avgDaysBetweenPurchases;
      if (ratio > 2) {
        insights.push({
          type: 'stale_product',
          severity: 'warning',
          message: `Product hasn't been purchased in ${metrics.daysSinceLastPurchase} days (normal cycle: ${metrics.avgDaysBetweenPurchases?.toFixed(0)} days)`,
          details: {
            days_since: metrics.daysSinceLastPurchase,
            normal_cycle: metrics.avgDaysBetweenPurchases,
            recommendation: 'Avoid stocking - demand may have decreased'
          }
        });
      }
    }

    // === RISK INSIGHTS ===
    
    if (scores.risk_score >= 70) {
      insights.push({
        type: 'high_risk',
        severity: 'warning',
        message: `High risk level (${scores.risk_score}/100) - proceed with caution`,
        details: scores.risk_breakdown
      });
    }

    if (metrics.coefficientOfVariation > 15) {
      insights.push({
        type: 'high_volatility',
        severity: 'warning',
        message: `Price shows high volatility (CV: ${metrics.coefficientOfVariation?.toFixed(1)}%) - expect continued fluctuations`,
        details: {
          cv: metrics.coefficientOfVariation,
          interpretation: 'Unstable pricing - higher risk'
        }
      });
    }

    // === INVENTORY INSIGHTS ===
    
    if (metrics.currentStock === 0 && metrics.isFastMover) {
      insights.push({
        type: 'out_of_stock_fast_mover',
        severity: 'urgent',
        message: 'Fast-moving product is out of stock - immediate reorder recommended if price is good',
        details: {
          priority: 'critical',
          liquidity: metrics.liquidityScore
        }
      });
    } else if (metrics.currentStock === 0) {
      insights.push({
        type: 'out_of_stock',
        severity: 'info',
        message: 'Product is out of stock',
        details: {
          recommendation: 'Buy on demand when orders arrive'
        }
      });
    }

    if (metrics.currentStock > 0 && metrics.daysSinceLastPurchase > (metrics.avgDaysBetweenPurchases || 60) * 1.5) {
      insights.push({
        type: 'dead_stock_warning',
        severity: 'warning',
        message: `Stock (${metrics.currentStock} units) not moving - may need clearance soon`,
        details: {
          current_stock: metrics.currentStock,
          days_stagnant: metrics.daysSinceLastPurchase,
          action: 'Monitor closely or consider discount'
        }
      });
    }

    // === PATTERN INSIGHTS ===
    
    const successfulPatterns = patterns.filter(p => 
      p.matched && p.times_successful / p.times_observed > 0.7
    );
    
    if (successfulPatterns.length > 0) {
      insights.push({
        type: 'pattern_match',
        severity: 'positive',
        message: `${successfulPatterns.length} reliable price pattern(s) detected`,
        details: {
          patterns: successfulPatterns.map(p => ({
            name: p.name,
            success_rate: (p.times_successful / p.times_observed * 100).toFixed(0) + '%'
          }))
        }
      });
    }

    // === MARKET POSITION INSIGHTS ===
    
    if (metrics.trend?.direction === 'strong_up' && metrics.distanceFromMin > 30) {
      insights.push({
        type: 'unfavorable_timing',
        severity: 'warning',
        message: 'Price trending upward and far from historic low - consider waiting',
        details: {
          trend: metrics.trend.direction,
          distance_from_min: metrics.distanceFromMin,
          recommendation: 'Wait for better opportunity'
        }
      });
    }

    // === MULTI-SUPPLIER INSIGHTS ===
    
    if (metrics.suppliersDropping >= 2) {
      insights.push({
        type: 'market_signal',
        severity: 'positive',
        message: `${metrics.suppliersDropping} suppliers dropping prices simultaneously`,
        details: {
          interpretation: 'Strong market signal - not isolated event',
          confidence: 'high'
        }
      });
    }

    return insights;
  },

  /**
   * Generate actionable items based on analysis
   * ✅ UPDATED: Uses new recommendation structure
   */
  generateActionItems(scores, metrics, product) {
    const actions = [];
    const recommendation = scores.recommendation;

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
        action: 'buy_when_ordered',
        priority: 'medium',
        description: 'Good price - buy when you receive orders, no stocking',
        rationale: scores.recommendation_rationale,
        note: scores.recommendation_note
      });
    } else if (recommendation === 'watch') {
      actions.push({
        action: 'monitor',
        priority: 'low',
        description: 'Watch price closely for better opportunity',
        rationale: scores.recommendation_rationale,
        monitoring: {
          check_frequency: 'daily',
          alert_on: 'opportunity score > 65 or price drop > 5%'
        }
      });
    } else if (recommendation === 'avoid') {
      actions.push({
        action: 'avoid_purchase',
        priority: 'high',
        description: 'Avoid purchase - risk too high',
        rationale: scores.recommendation_rationale
      });
    } else if (recommendation === 'clearance_urgent') {
      actions.push({
        action: 'clearance_sale',
        priority: 'critical',
        description: `Urgent: ${metrics.currentStock} units dead stock - discount immediately`,
        rationale: scores.recommendation_rationale,
        suggested_action: 'Reduce price by 15-30% to move inventory'
      });
    } else if (recommendation === 'clearance_soon') {
      actions.push({
        action: 'monitor_for_clearance',
        priority: 'high',
        description: 'Stock slowing down - prepare for potential clearance',
        rationale: scores.recommendation_rationale,
        monitoring: {
          check_frequency: 'weekly',
          trigger: 'If no sales in 2 weeks, start clearance'
        }
      });
    } else {
      actions.push({
        action: 'wait_for_order',
        priority: 'low',
        description: 'Wait for customer order before purchasing',
        rationale: scores.recommendation_rationale
      });
    }

    // Additional actions based on specific conditions
    
    if (metrics.currentStock === 0 && metrics.isFastMover && recommendation !== 'avoid') {
      actions.push({
        action: 'urgent_restock',
        priority: 'critical',
        description: 'Fast-moving product out of stock - restock urgently to avoid sales loss',
        note: `Reorders every ${metrics.avgDaysBetweenPurchases?.toFixed(0)} days normally`
      });
    }

    if (metrics.isFlashDeal && metrics.hoursSinceLastDrop < 3 && recommendation !== 'avoid') {
      actions.push({
        action: 'time_sensitive',
        priority: 'critical',
        description: 'Flash deal - act fast, opportunity window is closing',
        time_constraint: {
          hours_elapsed: metrics.hoursSinceLastDrop?.toFixed(1),
          typical_window: 6,
          urgency: 'immediate'
        }
      });
    }

    if (metrics.trend?.direction === 'strong_down' && scores.risk_score < 40 && recommendation === 'buy_on_demand') {
      actions.push({
        action: 'consider_bulk',
        priority: 'medium',
        description: 'Strong downward trend with low risk - consider taking some stock',
        reasoning: 'Price likely to stabilize at current level',
        suggested_quantity: this.calculateSuggestedQuantity(product, metrics, 14)
      });
    }

    return actions;
  },

  /**
   * Calculate suggested purchase quantity
   * ✅ UPDATED: Uses suggested_stock_days parameter
   */
  calculateSuggestedQuantity(product, metrics, stockDays = null) {
    const currentStock = metrics.currentStock || 0;
    
    // If we have purchase frequency data
    if (metrics.avgDaysBetweenPurchases && metrics.totalPurchases > 2) {
      const avgQuantityPerPurchase = metrics.totalQuantityPurchased / metrics.totalPurchases;
      
      if (stockDays) {
        // Calculate based on suggested stock days
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
        // Default: 1 purchase cycle worth
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
    
    // Fallback if no purchase history
    return {
      recommended: 1,
      reasoning: 'Insufficient purchase history - start with 1 unit',
      current_stock: currentStock
    };
  }
});