// server/services/scoring.js
// ✅ UPDATED: Per-supplier aware scoring logic

"use strict";

/**
 * 🔒 Πρέπει να ταυτίζεται με το LIQUIDITY_TRACKING_ENABLED στο metrics.js
 * Όταν false: απενεργοποιεί όλη τη λογική που βασίζεται στο purchase history.
 */
const LIQUIDITY_TRACKING_ENABLED = false;

module.exports = ({ strapi }) => ({
  async calculateScores(
    product,
    metrics,
    patterns = [],
    clearanceDetection = null
  ) {
    const helpers = strapi.plugin("bargain-detector").service("helpers");
    const config = await helpers.loadConfig();

    const opportunityScore = this.calculateOpportunityScore(
      metrics,
      patterns,
      config,
      clearanceDetection
    );
    const riskScore = this.calculateRiskScore(product, metrics, config);
    const confidence = this.calculateConfidence(
      product,
      metrics,
      patterns,
      config,
      clearanceDetection
    );
    const recommendation = this.determineRecommendation(
      opportunityScore.total,
      riskScore.total,
      confidence.value,
      metrics,
      config
    );
    const priority = this.calculatePriority(
      opportunityScore.total,
      riskScore.total,
      metrics,
      clearanceDetection
    );
    const signals = this.extractSignals(opportunityScore, riskScore);

    return {
      opportunity_score: Math.round(opportunityScore.total),
      opportunity_breakdown: opportunityScore.breakdown,
      risk_score: Math.round(riskScore.total),
      risk_breakdown: riskScore.breakdown,
      confidence: confidence.enum,
      confidence_value: confidence.value,
      confidence_breakdown: confidence.breakdown,
      recommendation: recommendation.recommendation,
      recommendation_rationale: recommendation.rationale,
      recommendation_action: recommendation.action,
      suggested_stock_days: recommendation.suggested_stock_days || null,
      recommendation_note: recommendation.recommendation_note || null,
      priority,
      signals_detected: signals,
      calculation_details: {
        opportunity: opportunityScore,
        risk: riskScore,
        confidence: confidence,
        clearance_detected: clearanceDetection ? true : false,
        config_version: config.version || "1.0.0",
      },
    };
  },

  /**
   * Calculate Opportunity Score (0-100)
   * priceAdvantage (0-70) + timing (0-30) + patternBonus (0-10) + clearanceBoost (0-20)
   * Total capped at 100
   */
  calculateOpportunityScore(metrics, patterns, config, clearanceDetection) {
    if (!metrics) {
      throw new Error("Metrics are required for opportunity scoring");
    }

    const priceAdvantage = this.calculatePriceAdvantage(metrics, config);
    const timing = this.calculateTiming(metrics);
    const liquidityFactor = this.calculateLiquidityFactor(metrics, config);

    let total = priceAdvantage.score + timing.score + liquidityFactor.score;

    // Pattern Bonus (0-10) — separate από timing, on top of the 100
    const patternBonus = this.calculatePatternBonus(patterns);
    total += patternBonus.score;

    // Clearance Boost
    let clearanceBoost = 0;
    if (clearanceDetection && clearanceDetection.confidence >= 50) {
      clearanceBoost = Math.min(clearanceDetection.confidence * 0.15, 15);
      if (clearanceDetection.urgency === "critical") {
        clearanceBoost += 5;
      }
      total += clearanceBoost;
    }

    return {
      total: Math.min(total, 100),
      breakdown: {
        price_advantage: priceAdvantage,
        timing: timing,
        liquidity_factor: liquidityFactor,
        pattern_bonus: patternBonus,
        clearance_boost: clearanceDetection
          ? {
              score: clearanceBoost,
              confidence: clearanceDetection.confidence,
              urgency: clearanceDetection.urgency,
              details: [
                {
                  factor: "clearance_boost",
                  points: clearanceBoost.toFixed(1),
                  note: `+${clearanceBoost.toFixed(
                    1
                  )} points from clearance detection`,
                },
              ],
            }
          : null,
      },
    };
  },

  /**
   * Price Advantage Component (0-70)
   * A. Drop from Average    (0-22)
   * B. Distance from Min    (0-38)
   * C. Supplier Competition (0-10)
   * D. Synergy bonus        (+5)
   */
  calculatePriceAdvantage(metrics, config) {
    let score = 0;
    const details = [];
    const thresholds = config.opportunity_rules.price_drop;

    // A. Drop from Average (0-22)
    const dropFrom30d = metrics.dropFrom30d || 0;

    if (dropFrom30d >= thresholds.strong) {
      score += 22;
      details.push({
        factor: "drop_from_avg",
        value: dropFrom30d.toFixed(2),
        points: 22,
        strength: "strong",
      });
    } else if (dropFrom30d >= thresholds.medium) {
      const ratio =
        (dropFrom30d - thresholds.medium) /
        (thresholds.strong - thresholds.medium);
      const points = 16 + ratio * 6;
      score += points;
      details.push({
        factor: "drop_from_avg",
        value: dropFrom30d.toFixed(2),
        points: points.toFixed(2),
        strength: "medium",
      });
    } else if (dropFrom30d >= thresholds.low) {
      const ratio =
        (dropFrom30d - thresholds.low) / (thresholds.medium - thresholds.low);
      const points = 10 + ratio * 6;
      score += points;
      details.push({
        factor: "drop_from_avg",
        value: dropFrom30d.toFixed(2),
        points: points.toFixed(2),
        strength: "low",
      });
    } else if (dropFrom30d >= thresholds.minimum) {
      const ratio =
        (dropFrom30d - thresholds.minimum) /
        (thresholds.low - thresholds.minimum);
      const points = ratio * 10;
      score += points;
      details.push({
        factor: "drop_from_avg",
        value: dropFrom30d.toFixed(2),
        points: points.toFixed(2),
        strength: "minimal",
      });
    }

    // B. Distance from Historic Min (0-38)
    // Κύριο signal: overall historic low (aggregated από όλους τους suppliers)
    const distanceFromMin =
      metrics.distanceFromMin !== undefined && metrics.distanceFromMin !== null
        ? metrics.distanceFromMin
        : 100;

    if (distanceFromMin <= 0) {
      score += 38;
      details.push({
        factor: "historic_low",
        value: distanceFromMin.toFixed(2),
        points: 38,
        strength: "new_low",
      });
    } else if (distanceFromMin < 5) {
      const points = 30 + ((5 - distanceFromMin) / 5) * 8;
      score += points;
      details.push({
        factor: "near_historic_low",
        value: distanceFromMin.toFixed(2),
        points: points.toFixed(2),
        strength: "very_close",
      });
    } else if (distanceFromMin < 10) {
      const points = 20 + ((10 - distanceFromMin) / 5) * 10;
      score += points;
      details.push({
        factor: "near_historic_low",
        value: distanceFromMin.toFixed(2),
        points: points.toFixed(2),
        strength: "close",
      });
    } else if (distanceFromMin < 20) {
      const points = ((20 - distanceFromMin) / 10) * 20;
      score += points;
      details.push({
        factor: "below_average",
        value: distanceFromMin.toFixed(2),
        points: points.toFixed(2),
        strength: "moderate",
      });
    }

    // B2. Best supplier below own historic min (+5 bonus)
    // "Ο supplier κάνει κάτι ασυνήθιστο" — πιθανό ξεσκαρτάρισμα
    // Ισχύει ακόμα και αν η overall τιμή δεν είναι historic low
    const bestSupplierData = (metrics.supplierAnalysis || []).find(
      (s) => s.hasData && s.supplier.name === metrics.bestSupplier
    );
    if (bestSupplierData && bestSupplierData.distanceFromMin <= 0) {
      score += 5;
      details.push({
        factor: "supplier_below_own_min",
        supplier: metrics.bestSupplier,
        supplier_distance_from_min: bestSupplierData.distanceFromMin.toFixed(2),
        points: 5,
        strength: "clearance_signal",
        note: "Supplier κάτω από δικό του historic low — πιθανό ξεσκαρτάρισμα",
      });
    }

    // C. Supplier Competition (0-10)
    const suppliersDropping = metrics.suppliersDropping || 0;
    const supplierCount = metrics.supplierCount || 1;
    const droppingRatio = suppliersDropping / supplierCount;

    if (suppliersDropping === 0) {
      if (metrics.bestPriceSavings > 5) {
        score += 2;
        details.push({
          factor: "best_supplier_price",
          value: metrics.bestPriceSavings.toFixed(2),
          points: 2,
          strength: "good",
        });
      }
    } else if (droppingRatio >= 0.75) {
      score += 10;
      details.push({
        factor: "multi_supplier_drop",
        value: suppliersDropping,
        ratio: droppingRatio.toFixed(2),
        points: 10,
        strength: "very_strong",
      });
    } else if (droppingRatio >= 0.5) {
      score += 7;
      details.push({
        factor: "multi_supplier_drop",
        value: suppliersDropping,
        ratio: droppingRatio.toFixed(2),
        points: 7,
        strength: "strong",
      });
    } else if (droppingRatio >= 0.25) {
      score += 4;
      details.push({
        factor: "multi_supplier_drop",
        value: suppliersDropping,
        ratio: droppingRatio.toFixed(2),
        points: 4,
        strength: "medium",
      });
    } else {
      score += 2;
      details.push({
        factor: "multi_supplier_drop",
        value: suppliersDropping,
        ratio: droppingRatio.toFixed(2),
        points: 2,
        strength: "weak",
      });
    }

    // D. Synergy bonus (+5)
    if (distanceFromMin < 5 && dropFrom30d >= thresholds.strong) {
      score += 5;
      details.push({
        factor: "synergy_bonus",
        reason: "strong_drop + near_historic_low",
        points: 5,
      });
    }

    const finalScore = Math.min(score, 70);

    return {
      score: finalScore,
      max: 70,
      percentage: ((finalScore / 70) * 100).toFixed(1),
      details,
    };
  },

  /**
   * Timing Component (0-30)
   * A. Trend Position  (0-20) — primary signal
   * B. Flash Deal      (0-10) — context-aware
   * Patterns removed — see calculatePatternBonus()
   */
  calculateTiming(metrics) {
    let score = 0;
    const details = [];

    // A. Trend Position (0-20)
    const supplierAnalysis = metrics.supplierAnalysis || [];
    const bestSupplierAnalysis = supplierAnalysis.find(
      (s) => s.supplier.name === metrics.bestSupplier && s.hasData
    );

    const trend = metrics.trend || {};
    const bestSupplierTrend =
      bestSupplierAnalysis?.trend?.direction || trend.direction;

    if (bestSupplierTrend === "strong_down") {
      score += 20;
      details.push({
        factor: "best_supplier_trend",
        value: "strong_down",
        points: 20,
        strength: "strong",
        supplier: metrics.bestSupplier,
      });
    } else if (bestSupplierTrend === "reversing") {
      score += 18;
      details.push({
        factor: "best_supplier_trend",
        value: "reversing",
        points: 18,
        strength: "good",
        supplier: metrics.bestSupplier,
      });
    } else if (bestSupplierTrend === "down") {
      score += 14;
      details.push({
        factor: "best_supplier_trend",
        value: "down",
        points: 14,
        strength: "good",
        supplier: metrics.bestSupplier,
      });
    } else if (bestSupplierTrend === "stable" && metrics.dropFrom30d > 10) {
      score += 10;
      details.push({
        factor: "best_supplier_trend",
        value: "stable_after_drop",
        points: 10,
        strength: "moderate",
        supplier: metrics.bestSupplier,
      });
    }

    // Market-wide trend bonus (0-5) — αν πολλοί suppliers πέφτουν μαζί
    const droppingSuppliers = supplierAnalysis.filter(
      (s) => s.hasData && s.isDropping
    ).length;
    if (droppingSuppliers >= 2) {
      const bonus = Math.min(droppingSuppliers * 2, 5);
      score += bonus;
      details.push({
        factor: "market_trend",
        value: `${droppingSuppliers} suppliers dropping`,
        points: bonus,
        strength: "market_signal",
      });
    }

    // B. Flash Deal (0-10) — context-aware
    if (metrics.isFlashDeal) {
      const hoursSince = metrics.hoursSinceLastDrop || 999;
      const trendDir = metrics.trend?.direction;
      const strongContext = ["strong_down", "down", "reversing"].includes(
        trendDir
      );

      let points = 0;
      let urgency = "low";

      if (hoursSince < 3) {
        points = strongContext ? 10 : 4;
        urgency = "critical";
      } else if (hoursSince < 6) {
        points = strongContext ? 7 : 2;
        urgency = "high";
      } else if (hoursSince < 12) {
        points = strongContext ? 3 : 1;
        urgency = "medium";
      }

      if (points > 0) {
        score += points;
        details.push({
          factor: "flash_deal",
          hours_since: hoursSince.toFixed(1),
          urgency,
          context: strongContext ? "aligned_with_trend" : "weak_context",
          points: points.toFixed(2),
        });
      }
    }

    const finalScore = Math.min(score, 30);

    return {
      score: finalScore,
      max: 30,
      percentage: ((finalScore / 30) * 100).toFixed(1),
      details,
    };
  },

  /**
   * Pattern Bonus (0-10) — on top of the 70+30 base
   * Επιβραβεύει ιστορικά επιβεβαιωμένα patterns χωρίς να τιμωρεί
   * προϊόντα που δεν έχουν αρκετό ιστορικό.
   */
  calculatePatternBonus(patterns) {
    const matchedPatterns = patterns.filter((p) => p.matched) || [];

    if (matchedPatterns.length === 0) {
      return { score: 0, max: 10, details: [] };
    }

    const totalConfidence = matchedPatterns.reduce(
      (sum, p) => sum + p.confidence,
      0
    );
    const avgConfidence = totalConfidence / matchedPatterns.length;

    let score = 0;
    if (matchedPatterns.length >= 2) {
      score = Math.min(10 * avgConfidence, 10);
    } else {
      score = Math.min(5 * avgConfidence, 5);
    }

    return {
      score: parseFloat(score.toFixed(2)),
      max: 10,
      details: [
        {
          factor: "pattern_bonus",
          matched_count: matchedPatterns.length,
          avg_confidence: avgConfidence.toFixed(2),
          points: score.toFixed(2),
          patterns: matchedPatterns.map((p) => p.name),
        },
      ],
    };
  },

  /**
   * Liquidity Factor Component (0-20)
   */
  calculateLiquidityFactor(metrics, config) {
    if (!LIQUIDITY_TRACKING_ENABLED) {
      return {
        score: 0,
        max: 20,
        percentage: "0.0",
        details: [],
        disabled: true,
        note: "Liquidity tracking disabled — enable LIQUIDITY_TRACKING_ENABLED όταν ενημερώνεις sales data",
      };
    }

    let score = 0;
    const details = [];
    const liquidityScore = metrics.liquidityScore || 0;
    const isFastMover = metrics.isFastMover || false;
    const purchaseFrequency = metrics.purchaseFrequency || "unknown";
    const avgDaysBetween = metrics.avgDaysBetweenPurchases || null;

    if (liquidityScore >= 90) {
      score += 15;
      details.push({
        factor: "liquidity_score",
        value: liquidityScore,
        frequency: purchaseFrequency,
        points: 15,
        strength: "very_high",
      });
    } else if (liquidityScore >= 70) {
      score += 12;
      details.push({
        factor: "liquidity_score",
        value: liquidityScore,
        frequency: purchaseFrequency,
        points: 12,
        strength: "high",
      });
    } else if (liquidityScore >= 50) {
      score += 9;
      details.push({
        factor: "liquidity_score",
        value: liquidityScore,
        frequency: purchaseFrequency,
        points: 9,
        strength: "medium",
      });
    } else if (liquidityScore >= 30) {
      score += 6;
      details.push({
        factor: "liquidity_score",
        value: liquidityScore,
        frequency: purchaseFrequency,
        points: 6,
        strength: "low",
      });
    } else if (liquidityScore > 0) {
      score += 3;
      details.push({
        factor: "liquidity_score",
        value: liquidityScore,
        frequency: purchaseFrequency,
        points: 3,
        strength: "very_low",
      });
    }

    if (isFastMover && avgDaysBetween !== null) {
      if (avgDaysBetween < 15) {
        score += 5;
        details.push({
          factor: "fast_mover",
          avg_days: avgDaysBetween.toFixed(1),
          points: 5,
          note: "Reorders every 2 weeks - excellent",
        });
      } else if (avgDaysBetween < 30) {
        score += 3;
        details.push({
          factor: "fast_mover",
          avg_days: avgDaysBetween.toFixed(1),
          points: 3,
          note: "Monthly reorders - good",
        });
      }
    }

    return {
      score: Math.min(score, 20),
      max: 20,
      percentage: ((score / 20) * 100).toFixed(1),
      details,
    };
  },

  calculateRiskScore(product, metrics, config) {
    const volatility = this.calculateVolatilityRisk(metrics, config);
    const marketPosition = this.calculateMarketPositionRisk(metrics, config);
    const supplierReliability = this.calculateSupplierReliabilityRisk(
      product,
      metrics,
      config
    );
    const total =
      volatility.score + marketPosition.score + supplierReliability.score;

    return {
      total: Math.min(total, 100),
      breakdown: {
        volatility,
        market_position: marketPosition,
        supplier_reliability: supplierReliability,
      },
    };
  },

  calculateVolatilityRisk(metrics, config) {
    let score = 0;
    const details = [];
    const thresholds = config.risk_rules.volatility;
    const supplierAnalysis = metrics.supplierAnalysis || [];
    const bestSupplierAnalysis = supplierAnalysis.find(
      (s) => s.supplier.name === metrics.bestSupplier && s.hasData
    );
    const cv =
      bestSupplierAnalysis?.coefficientOfVariation ||
      metrics.coefficientOfVariation ||
      0;
    const source = bestSupplierAnalysis ? "best_supplier" : "aggregated";

    if (cv >= thresholds.high) {
      score += 20;
      details.push({
        factor: "price_variance",
        value: cv.toFixed(2),
        threshold: thresholds.high,
        points: 20,
        level: "high",
        source,
      });
    } else if (cv >= thresholds.medium) {
      const ratio =
        (cv - thresholds.medium) / (thresholds.high - thresholds.medium);
      const points = 12 + ratio * 8;
      score += points;
      details.push({
        factor: "price_variance",
        value: cv.toFixed(2),
        threshold: thresholds.medium,
        points: points.toFixed(2),
        level: "medium",
        source,
      });
    } else if (cv >= thresholds.low) {
      const ratio =
        (cv - thresholds.low) / (thresholds.medium - thresholds.low);
      const points = 5 + ratio * 7;
      score += points;
      details.push({
        factor: "price_variance",
        value: cv.toFixed(2),
        threshold: thresholds.low,
        points: points.toFixed(2),
        level: "low",
        source,
      });
    } else {
      score += cv;
      details.push({
        factor: "price_variance",
        value: cv.toFixed(2),
        points: cv.toFixed(2),
        level: "very_low",
        source,
      });
    }

    const volatileSuppliers = metrics.volatileSuppliers || 0;
    const stableSuppliers = metrics.stableSuppliers || 0;
    const totalSuppliers = volatileSuppliers + stableSuppliers;

    if (totalSuppliers > 0 && volatileSuppliers / totalSuppliers > 0.7) {
      score += 5;
      details.push({
        factor: "market_volatility",
        value: `${volatileSuppliers}/${totalSuppliers} volatile`,
        points: 5,
        level: "high",
        interpretation: "Widespread market volatility",
      });
    }

    const changesPerMonth = metrics.priceChangesLast30d || 0;

    if (changesPerMonth > 20) {
      score += 10;
      details.push({
        factor: "change_frequency",
        value: changesPerMonth,
        frequency: "almost_daily",
        points: 10,
      });
    } else if (changesPerMonth > 10) {
      const ratio = (changesPerMonth - 10) / 10;
      const points = 6 + ratio * 4;
      score += points;
      details.push({
        factor: "change_frequency",
        value: changesPerMonth,
        frequency: "high",
        points: points.toFixed(2),
      });
    } else if (changesPerMonth > 5) {
      const ratio = (changesPerMonth - 5) / 5;
      const points = 3 + ratio * 3;
      score += points;
      details.push({
        factor: "change_frequency",
        value: changesPerMonth,
        frequency: "moderate",
        points: points.toFixed(2),
      });
    } else if (changesPerMonth > 0) {
      score += changesPerMonth * 0.5;
      details.push({
        factor: "change_frequency",
        value: changesPerMonth,
        frequency: "low",
        points: (changesPerMonth * 0.5).toFixed(2),
      });
    }

    return {
      score: Math.min(score, 35),
      max: 35,
      percentage: ((score / 35) * 100).toFixed(1),
      details,
    };
  },

  calculateMarketPositionRisk(metrics, config) {
    let score = 0;
    const details = [];
    const distanceFromMin = metrics.distanceFromMin || 0;

    if (distanceFromMin > 50) {
      score += 15;
      details.push({
        factor: "distance_from_min",
        value: distanceFromMin.toFixed(2),
        points: 15,
        level: "very_high",
      });
    } else if (distanceFromMin > 30) {
      const ratio = (distanceFromMin - 30) / 20;
      const points = 10 + ratio * 5;
      score += points;
      details.push({
        factor: "distance_from_min",
        value: distanceFromMin.toFixed(2),
        points: points.toFixed(2),
        level: "high",
      });
    } else if (distanceFromMin > 20) {
      const ratio = (distanceFromMin - 20) / 10;
      const points = 6 + ratio * 4;
      score += points;
      details.push({
        factor: "distance_from_min",
        value: distanceFromMin.toFixed(2),
        points: points.toFixed(2),
        level: "medium",
      });
    } else if (distanceFromMin > 10) {
      const ratio = (distanceFromMin - 10) / 10;
      const points = 3 + ratio * 3;
      score += points;
      details.push({
        factor: "distance_from_min",
        value: distanceFromMin.toFixed(2),
        points: points.toFixed(2),
        level: "low",
      });
    }

    const trend = metrics.trend || {};

    if (trend.direction === "strong_up") {
      score += 12;
      details.push({
        factor: "trend_direction",
        value: "strong_up",
        points: 12,
        level: "very_high",
      });
    } else if (trend.direction === "up") {
      score += 8;
      details.push({
        factor: "trend_direction",
        value: "up",
        points: 8,
        level: "high",
      });
    } else if (trend.direction === "stable" && distanceFromMin > 20) {
      score += 5;
      details.push({
        factor: "stable_high",
        value: distanceFromMin.toFixed(2),
        points: 5,
        level: "medium",
      });
    } else if (trend.direction === "down" && metrics.trend.accelerating) {
      score += 4;
      details.push({ factor: "accelerating_down", points: 4, level: "medium" });
    }

    const lastPurchasePrice = metrics.lastPurchasePrice;
    const currentBest = metrics.currentBest;

    if (lastPurchasePrice && currentBest) {
      const underwater =
        ((currentBest - lastPurchasePrice) / lastPurchasePrice) * 100;
      const thresholds = config.risk_rules.inventory_underwater;

      if (underwater < thresholds.critical_threshold) {
        score += 8;
        details.push({
          factor: "deep_underwater",
          underwater_percent: underwater.toFixed(2),
          points: 8,
          level: "critical",
        });
      } else if (underwater < thresholds.urgent_threshold) {
        score += 6;
        details.push({
          factor: "significant_underwater",
          underwater_percent: underwater.toFixed(2),
          points: 6,
          level: "high",
        });
      } else if (underwater < thresholds.warning_threshold) {
        score += 3;
        details.push({
          factor: "moderate_underwater",
          underwater_percent: underwater.toFixed(2),
          points: 3,
          level: "medium",
        });
      }
    }

    return {
      score: Math.min(score, 35),
      max: 35,
      percentage: ((score / 35) * 100).toFixed(1),
      details,
    };
  },

  calculateSupplierReliabilityRisk(product, metrics, config) {
    let score = 0;
    const details = [];
    const supplierAnalysis = metrics.supplierAnalysis || [];
    const bestSupplierAnalysis = supplierAnalysis.find(
      (s) => s.supplier.name === metrics.bestSupplier && s.hasData
    );

    if (!bestSupplierAnalysis) {
      return {
        score: 30,
        max: 30,
        percentage: "100.0",
        details: [{ factor: "no_supplier_data", points: 30 }],
      };
    }

    const dataPoints = bestSupplierAnalysis.dataPoints || 0;
    const minRequired = config.risk_rules.supplier_trust.min_data_points;

    if (dataPoints < minRequired) {
      const ratio = dataPoints / minRequired;
      const points = (1 - ratio) * 10;
      score += points;
      details.push({
        factor: "insufficient_data",
        data_points: dataPoints,
        min_required: minRequired,
        points: points.toFixed(2),
        level: points > 7 ? "high" : points > 4 ? "medium" : "low",
        supplier: bestSupplierAnalysis.supplier.name,
      });
    }

    const anomalyCount = bestSupplierAnalysis.anomalies || 0;

    if (dataPoints >= 10) {
      const errorRate = anomalyCount / dataPoints;
      const tolerance = config.risk_rules.supplier_trust.error_tolerance;

      if (errorRate > tolerance * 3) {
        score += 12;
        details.push({
          factor: "high_error_rate",
          errors: anomalyCount,
          total: dataPoints,
          error_rate: (errorRate * 100).toFixed(2) + "%",
          points: 12,
          level: "very_high",
          supplier: bestSupplierAnalysis.supplier.name,
        });
      } else if (errorRate > tolerance * 2) {
        score += 8;
        details.push({
          factor: "elevated_error_rate",
          error_rate: (errorRate * 100).toFixed(2) + "%",
          points: 8,
          level: "high",
          supplier: bestSupplierAnalysis.supplier.name,
        });
      } else if (errorRate > tolerance) {
        score += 4;
        details.push({
          factor: "moderate_error_rate",
          error_rate: (errorRate * 100).toFixed(2) + "%",
          points: 4,
          level: "medium",
          supplier: bestSupplierAnalysis.supplier.name,
        });
      }
    } else if (dataPoints > 0) {
      score += 5;
      details.push({
        factor: "insufficient_for_error_check",
        points: 5,
        supplier: bestSupplierAnalysis.supplier.name,
      });
    }

    const consistency = bestSupplierAnalysis.consistency || 0;

    if (dataPoints >= 20) {
      if (consistency < 0.5) {
        score += 8;
        details.push({
          factor: "very_inconsistent",
          consistency_score: consistency.toFixed(2),
          points: 8,
          level: "high",
          supplier: bestSupplierAnalysis.supplier.name,
        });
      } else if (consistency < 0.7) {
        const ratio = (0.7 - consistency) / 0.2;
        const points = 4 + ratio * 4;
        score += points;
        details.push({
          factor: "inconsistent",
          consistency_score: consistency.toFixed(2),
          points: points.toFixed(2),
          level: "medium",
          supplier: bestSupplierAnalysis.supplier.name,
        });
      } else if (consistency < 0.85) {
        const ratio = (0.85 - consistency) / 0.15;
        const points = ratio * 4;
        score += points;
        details.push({
          factor: "moderate_consistency",
          consistency_score: consistency.toFixed(2),
          points: points.toFixed(2),
          level: "low",
          supplier: bestSupplierAnalysis.supplier.name,
        });
      }
    } else if (dataPoints > 0) {
      score += 4;
      details.push({
        factor: "insufficient_for_consistency",
        points: 4,
        supplier: bestSupplierAnalysis.supplier.name,
      });
    }

    return {
      score: Math.min(score, 30),
      max: 30,
      percentage: ((score / 30) * 100).toFixed(1),
      details,
    };
  },

  calculateConfidence(product, metrics, patterns, config, clearanceDetection) {
    let score = 0;
    const details = [];
    const helpers = strapi.plugin("bargain-detector").service("helpers");
    const allHistory = helpers.getAllSupplierHistory(product.supplierInfo);
    const dataPoints = allHistory.length;

    if (dataPoints > 500) {
      score += 5;
      details.push({
        factor: "data_points",
        value: dataPoints,
        points: 5,
        quality: "excellent",
      });
    } else if (dataPoints > 200) {
      score += 4;
      details.push({
        factor: "data_points",
        value: dataPoints,
        points: 4,
        quality: "good",
      });
    } else if (dataPoints > 100) {
      score += 3;
      details.push({
        factor: "data_points",
        value: dataPoints,
        points: 3,
        quality: "fair",
      });
    } else if (dataPoints > 30) {
      score += 2;
      details.push({
        factor: "data_points",
        value: dataPoints,
        points: 2,
        quality: "limited",
      });
    } else {
      score += 1;
      details.push({
        factor: "data_points",
        value: dataPoints,
        points: 1,
        quality: "insufficient",
      });
    }

    const validatedPatterns = patterns.filter(
      (p) => p.matched && p.times_successful > p.times_observed * 0.7
    );

    if (validatedPatterns.length >= 2) {
      score += 3;
      details.push({
        factor: "validated_patterns",
        value: validatedPatterns.length,
        points: 3,
      });
    } else if (validatedPatterns.length === 1) {
      score += 2;
      details.push({ factor: "validated_patterns", value: 1, points: 2 });
    } else if (patterns.length > 0) {
      score += 1;
      details.push({
        factor: "unvalidated_patterns",
        value: patterns.length,
        points: 1,
      });
    }

    const supplierAnalysis = metrics.supplierAnalysis || [];
    const reliableSuppliers = supplierAnalysis.filter(
      (s) => s.hasData && s.dataPoints >= 10 && (s.dataQuality || 0) >= 0.6
    );
    const totalSuppliersWithData = supplierAnalysis.filter(
      (s) => s.hasData
    ).length;

    if (totalSuppliersWithData > 0) {
      const reliabilityRatio =
        reliableSuppliers.length / totalSuppliersWithData;
      if (reliabilityRatio === 1.0) {
        score += 2;
        details.push({
          factor: "supplier_reliability",
          value: "all_reliable",
          count: `${reliableSuppliers.length}/${totalSuppliersWithData}`,
          points: 2,
        });
      } else if (reliabilityRatio >= 0.7) {
        score += 1.5;
        details.push({
          factor: "supplier_reliability",
          value: "mostly_reliable",
          count: `${reliableSuppliers.length}/${totalSuppliersWithData}`,
          points: 1.5,
        });
      } else if (reliabilityRatio >= 0.5) {
        score += 1;
        details.push({
          factor: "supplier_reliability",
          value: "some_reliable",
          count: `${reliableSuppliers.length}/${totalSuppliersWithData}`,
          points: 1,
        });
      } else {
        score += 0.5;
        details.push({
          factor: "supplier_reliability",
          value: "few_reliable",
          count: `${reliableSuppliers.length}/${totalSuppliersWithData}`,
          points: 0.5,
        });
      }
    }

    if (clearanceDetection) {
      const clearancePoints = (clearanceDetection.confidence / 100) * 2;
      score += clearancePoints;
      details.push({
        factor: "clearance_detection",
        value: `${clearanceDetection.confidence}% confidence`,
        points: clearancePoints.toFixed(2),
      });
    }

    let confidenceEnum;
    if (score >= 9) confidenceEnum = "very_high";
    else if (score >= 7) confidenceEnum = "high";
    else if (score >= 4)
      confidenceEnum =
        "medium"; // από 6 → 4, ρεαλιστικό για προϊόντα χωρίς patterns
    else confidenceEnum = "low";

    return {
      score: Math.min(score, 12),
      max: 12,
      value: score / 12,
      enum: confidenceEnum,
      percentage: ((score / 12) * 100).toFixed(1),
      details,
    };
  },

  determineRecommendation(
    opportunityScore,
    riskScore,
    confidence,
    metrics,
    config
  ) {
    const liquidityScore = metrics.liquidityScore || 0;
    const isFastMover = metrics.isFastMover || false;
    const currentStock = metrics.currentStock || 0;
    const daysSinceLastPurchase = metrics.daysSinceLastPurchase || 0;
    const avgDaysBetween = metrics.avgDaysBetweenPurchases || 60;
    const thresholds = config.recommendation_thresholds;

    // === CLEARANCE LOGIC (Priority #1) ===
    if (LIQUIDITY_TRACKING_ENABLED && currentStock > 0) {
      if (daysSinceLastPurchase > avgDaysBetween * 2) {
        return {
          recommendation: "clearance_urgent",
          rationale: `Έχεις ${currentStock} units stock που δεν κινείται ${daysSinceLastPurchase} μέρες (διπλάσιο του κανονικού κύκλου ${avgDaysBetween.toFixed(
            0
          )} μέρες)`,
          action:
            "Ρίξε την τιμή πώλησης για να το ξεφορτωθείς ΑΜΕΣΑ. Dead stock = χαμένα χρήματα.",
        };
      } else if (daysSinceLastPurchase > avgDaysBetween * 1.5) {
        return {
          recommendation: "clearance_soon",
          rationale: `Stock ${currentStock} units αρχίζει να στασιμοποιείται (${daysSinceLastPurchase} μέρες vs κανονικά ${avgDaysBetween.toFixed(
            0
          )} μέρες)`,
          action:
            "Παρακολούθησε προσεκτικά. Αν δεν πουλήσει σε 1-2 εβδομάδες, κάνε clearance.",
        };
      }
    }

    // === AVOID LOGIC ===
    if (riskScore > thresholds.avoid.max_risk) {
      return {
        recommendation: "avoid",
        rationale: `Υψηλό risk (${riskScore}/100) υπερβαίνει το όριο ${thresholds.avoid.max_risk}`,
        action:
          "Αποφυγή αγοράς. Η αστάθεια τιμών ή τα αναξιόπιστα δεδομένα κάνουν την αγορά επικίνδυνη.",
      };
    }

    // === STRONG BUY & STOCK LOGIC ===
    if (
      LIQUIDITY_TRACKING_ENABLED &&
      opportunityScore >= thresholds.strong_buy.min_opportunity &&
      riskScore <= thresholds.strong_buy.max_risk &&
      confidence >= thresholds.strong_buy.min_confidence &&
      isFastMover &&
      liquidityScore >= 70
    ) {
      const suggestedDays = this.calculateStockDays(metrics, "aggressive");
      return {
        recommendation: "strong_buy_and_stock",
        rationale: `Εξαιρετική ευκαιρία (${opportunityScore}/${
          thresholds.strong_buy.min_opportunity
        }+) σε fast-mover με minimal risk (${riskScore}/${
          thresholds.strong_buy.max_risk
        }) και high confidence (${(confidence * 100).toFixed(0)}%/${(
          thresholds.strong_buy.min_confidence * 100
        ).toFixed(0)}%+)`,
        action: `ΑΓΟΡΑΣΕ ΚΑΙ ΣΤΟΚΑΡΕ! Πάρε stock για ${suggestedDays} ημέρες. Το προϊόν κινείται γρήγορα (ξαναγοράζεις κάθε ${avgDaysBetween.toFixed(
          0
        )} μέρες) και η τιμή είναι άψογη.`,
        suggested_stock_days: suggestedDays,
      };
    }

    // === OPPORTUNISTIC STOCK LOGIC ===
    if (
      LIQUIDITY_TRACKING_ENABLED &&
      opportunityScore >= 85 &&
      riskScore <= thresholds.cautious_buy.max_risk &&
      liquidityScore >= 40
    ) {
      const suggestedDays = this.calculateStockDays(metrics, "conservative");
      return {
        recommendation: "opportunistic_stock",
        rationale: `Η τιμή είναι εξαιρετική (${opportunityScore}/100) - αξίζει μικρό stock ακόμα και με medium liquidity (${liquidityScore}/100)`,
        action: `Πάρε μικρό stock (${suggestedDays} ημέρες). Η τιμή είναι τόσο καλή που αντισταθμίζει το μέτριο ρυθμό πωλήσεων. Conservative approach.`,
        suggested_stock_days: suggestedDays,
      };
    }

    // === BUY ON DEMAND LOGIC ===
    if (
      opportunityScore >= thresholds.buy.min_opportunity &&
      riskScore <= thresholds.buy.max_risk &&
      confidence >= thresholds.buy.min_confidence
    ) {
      return {
        recommendation: "buy_on_demand",
        rationale: `Καλή ευκαιρία (${opportunityScore}/${
          thresholds.buy.min_opportunity
        }+) με αποδεκτό risk (${riskScore}/${
          thresholds.buy.max_risk
        }) και επαρκή confidence (${(confidence * 100).toFixed(0)}%/${(
          thresholds.buy.min_confidence * 100
        ).toFixed(0)}%+)`,
        action: "Αγόρασε όταν έχεις παραγγελία. Όχι stock προς το παρόν.",
        recommendation_note:
          LIQUIDITY_TRACKING_ENABLED && isFastMover
            ? `Fast mover (${avgDaysBetween.toFixed(
                0
              )} μέρες) - παρακολούθησε για καλύτερη τιμή (${
                thresholds.strong_buy.min_opportunity
              }+) να στοκάρεις`
            : `Αγόρασε on demand — ενεργοποίησε το liquidity tracking για stocking recommendations`,
      };
    }

    // === CAUTIOUS BUY LOGIC ===
    if (
      opportunityScore >= thresholds.cautious_buy.min_opportunity &&
      riskScore <= thresholds.cautious_buy.max_risk &&
      confidence >= thresholds.cautious_buy.min_confidence
    ) {
      return {
        recommendation: "buy_on_demand",
        rationale: `Moderate opportunity (${opportunityScore}/${thresholds.cautious_buy.min_opportunity}+) αλλά με elevated risk (${riskScore}/${thresholds.cautious_buy.max_risk})`,
        action: "Αγόρασε μόνο όταν έχεις σίγουρη παραγγελία. Προσοχή στο risk.",
        recommendation_note:
          "Cautious approach - verify order before purchasing",
      };
    }

    // === WATCH LOGIC ===
    if (
      opportunityScore >= thresholds.watch.min_opportunity &&
      riskScore <= thresholds.watch.max_risk
    ) {
      let watchReason = "";
      if (
        metrics.trend?.direction === "down" ||
        metrics.trend?.direction === "strong_down"
      ) {
        watchReason =
          "Η τιμή πέφτει - περίμενε λίγο ακόμα για καλύτερη ευκαιρία";
      } else if (riskScore > thresholds.buy.max_risk) {
        watchReason = `Risk υψηλότερο του ιδανικού (${riskScore} vs ${thresholds.buy.max_risk}) - περίμενε σταθεροποίηση`;
      } else if (opportunityScore < thresholds.buy.min_opportunity) {
        watchReason = `Opportunity χαμηλότερο από buy threshold (${opportunityScore} vs ${thresholds.buy.min_opportunity})`;
      } else {
        watchReason = "Moderate opportunity - μπορεί να βελτιωθεί σύντομα";
      }
      return {
        recommendation: "watch",
        rationale: `Moderate opportunity (${opportunityScore}/${thresholds.watch.min_opportunity}+) - ${watchReason}`,
        action:
          "Παρακολούθηση χωρίς action. Ελέγξε ξανά σε 2-3 μέρες για βελτίωση.",
        next_check: {
          target_opportunity: thresholds.buy.min_opportunity,
          target_risk: thresholds.buy.max_risk,
        },
      };
    }

    // === WAIT FOR ORDER (Default) ===
    return {
      recommendation: "wait_for_order",
      rationale: `Opportunity ${opportunityScore}/100 (χρειάζεται ${thresholds.watch.min_opportunity}+ για watch), Risk ${riskScore}/100`,
      action:
        "Αγόρασε μόνο αν έχεις συγκεκριμένη παραγγελία. Μην πάρεις stock.",
      recommendation_note: `Χρειάζεται opportunity ${thresholds.buy.min_opportunity}+ για buy recommendation`,
    };
  },

  calculatePriority(opportunityScore, riskScore, metrics, clearanceDetection) {
    // Highest priority: flash clearance
    if (
      clearanceDetection &&
      clearanceDetection.urgency === "critical" &&
      clearanceDetection.confidence >= 70
    ) {
      return "flash_clearance";
    }

    // Floor rule βάσει opportunity score — ανεξάρτητα από risk/liquidity.
    // Μεγάλη ευκαιρία = πάντα ορατό, ο χρήστης αποφασίζει.
    // Αυτό αποτρέπει το risk score να "θάβει" καλές ευκαιρίες όπως τα ξεσκαρτάρες.
    if (opportunityScore >= 85) return "critical";
    if (opportunityScore >= 70) return "high";

    // Κάτω από 70: φόρμουλα με risk
    let priorityPoints = 0;
    priorityPoints += opportunityScore * 0.67;
    priorityPoints -= riskScore * 0.33;

    const currentStock = metrics.currentStock || 0;
    const daysSince = metrics.daysSinceLastPurchase || 0;
    const avgDays = metrics.avgDaysBetweenPurchases || 60;

    if (
      LIQUIDITY_TRACKING_ENABLED &&
      currentStock === 0 &&
      daysSince > avgDays * 2
    ) {
      return "critical";
    }

    if (metrics.isFlashDeal && metrics.hoursSinceLastDrop < 6) {
      priorityPoints += 15;
    }

    if (clearanceDetection) {
      if (clearanceDetection.urgency === "critical") priorityPoints += 20;
      else if (clearanceDetection.urgency === "high") priorityPoints += 15;
      else priorityPoints += 10;
    }

    if (priorityPoints >= 65) return "critical";
    else if (priorityPoints >= 50) return "high";
    else if (priorityPoints >= 35) return "medium";
    else return "low";
  },

  calculateStockDays(metrics, strategy = "conservative") {
    const avgDays = metrics.avgDaysBetweenPurchases || 30;
    const liquidityScore = metrics.liquidityScore || 50;

    let multiplier;
    if (strategy === "aggressive") {
      if (liquidityScore >= 90) multiplier = 2.5;
      else if (liquidityScore >= 70) multiplier = 2.0;
      else multiplier = 1.5;
    } else {
      if (liquidityScore >= 70) multiplier = 1.5;
      else if (liquidityScore >= 50) multiplier = 1.0;
      else multiplier = 0.75;
    }

    const suggestedDays = Math.round(avgDays * multiplier);
    return Math.max(14, Math.min(90, suggestedDays));
  },

  extractSignals(opportunityScore, riskScore) {
    const signals = [];

    const addSignals = (breakdown, category) => {
      Object.entries(breakdown).forEach(([component, data]) => {
        if (data?.details && Array.isArray(data.details)) {
          data.details.forEach((detail) => {
            signals.push({
              type: detail.factor,
              category,
              component,
              value: detail.value,
              points: detail.points,
              strength: detail.strength || detail.level || detail.urgency,
              triggered: true,
            });
          });
        }
      });
    };

    addSignals(opportunityScore.breakdown, "opportunity");
    addSignals(riskScore.breakdown, "risk");

    return signals;
  },
});
