// CLEANED FUNCTION SIGNATURES - Only necessary parameters

module.exports = ({ strapi }) => ({

  /**
   * Main scoring function
   */
  async calculateScores(product, metrics, patterns = []) {
    const helpers = strapi.plugin('bargain-detector').service('helpers');
    const config = await helpers.loadConfig();

    // Calculate Opportunity Score
    const opportunityScore = this.calculateOpportunityScore(
      metrics,      // ✅ Removed: product
      patterns,
      config
    );

    // Calculate Risk Score
    const riskScore = this.calculateRiskScore(
      product,      // Needed for supplierInfo
      metrics,
      config
    );

    // Calculate Confidence
    const confidence = this.calculateConfidence(
      product,      // Needed for supplierInfo
      patterns,     // ✅ Removed: metrics
      config
    );

    // Determine Recommendation
    const recommendation = this.determineRecommendation(
      opportunityScore.total,
      riskScore.total,
      confidence.value,
      metrics,
      config        // Now using config.recommendation_thresholds
    );

    // Calculate Priority
    const priority = this.calculatePriority(
      opportunityScore.total,
      riskScore.total,
      metrics       // ✅ Removed: config
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
      priority,
      signals_detected: signals,
      calculation_details: {
        opportunity: opportunityScore,
        risk: riskScore,
        confidence: confidence,
        config_version: config.version || '1.0.0'
      }
    };
  },

  /**
   * Calculate Opportunity Score (0-100)
   * ✅ CLEANED: Removed unused 'product' parameter
   */
  calculateOpportunityScore(metrics, patterns, config) {
    if (!metrics) {
      throw new Error('Metrics are required for opportunity scoring');
    }
    const priceAdvantage = this.calculatePriceAdvantage(metrics, config);
    const timing = this.calculateTiming(metrics, patterns); // ✅ Removed config
    const liquidityFactor = this.calculateLiquidityFactor(metrics, config);

    const total = priceAdvantage.score + timing.score + liquidityFactor.score;

    return {
      total: Math.min(total, 100),
      breakdown: {
        price_advantage: priceAdvantage,
        timing: timing,
        liquidity_factor: liquidityFactor
      }
    };
  },

  /**
   * Timing Component (0-30)
   * ✅ CLEANED: Removed unused 'config' parameter
   */
  calculateTiming(metrics, patterns) {
    let score = 0;
    const details = [];

    // A. Pattern Match (0-15)
    const matchedPatterns = patterns.filter(p => p.matched) || [];

    if (matchedPatterns.length > 0) {
      const totalConfidence = matchedPatterns.reduce((sum, p) => sum + p.confidence, 0);
      const avgConfidence = totalConfidence / matchedPatterns.length;
      const patternScore = Math.min(
        matchedPatterns.length * matchedPatterns.length * 5 * avgConfidence,
        15
      );
      score += patternScore;
      details.push({
        factor: 'pattern_match',
        value: matchedPatterns.length,
        avg_confidence: avgConfidence.toFixed(2),
        points: patternScore.toFixed(2),
        patterns: matchedPatterns.map(p => p.name)
      });
    }

    // B. Trend Position (0-10)
    const trend = metrics.trend || {};

    if (trend.direction === 'strong_down') {
      score += 10;
      details.push({ factor: 'trend', value: 'strong_down', points: 10, strength: 'strong' });
    } else if (trend.direction === 'down') {
      score += 7;
      details.push({ factor: 'trend', value: 'down', points: 7, strength: 'good' });
    } else if (trend.direction === 'reversing') {
      score += 9;
      details.push({ factor: 'trend', value: 'reversing', points: 9, strength: 'good' });
    } else if (trend.direction === 'stable' && metrics.dropFrom30d > 10) {
      score += 8;
      details.push({ factor: 'trend', value: 'stable_after_drop', points: 8, strength: 'good' });
    }

    // C. Flash Opportunity (0-5)
    if (metrics.isFlashDeal) {
      const hoursSince = metrics.hoursSinceLastDrop || 999;
      if (hoursSince < 3) {
        score += 5;
        details.push({ factor: 'flash_deal', hours_since: hoursSince.toFixed(1), points: 5, urgency: 'critical' });
      } else if (hoursSince < 6) {
        score += 3;
        details.push({ factor: 'flash_deal', hours_since: hoursSince.toFixed(1), points: 3, urgency: 'high' });
      } else if (hoursSince < 12) {
        score += 1;
        details.push({ factor: 'flash_deal', hours_since: hoursSince.toFixed(1), points: 1, urgency: 'medium' });
      }
    }

    return {
      score: Math.min(score, 30),
      max: 30,
      percentage: ((score / 30) * 100).toFixed(1),
      details
    };
  },

  /**
   * Calculate Risk Score (0-100)
   */
  calculateRiskScore(product, metrics, config) {
    const volatility = this.calculateVolatilityRisk(metrics, config);
    const marketPosition = this.calculateMarketPositionRisk(metrics, config); // ✅ Removed product
    const supplierReliability = this.calculateSupplierReliabilityRisk(product, config); // ✅ Removed metrics

    const total = volatility.score + marketPosition.score + supplierReliability.score;

    return {
      total: Math.min(total, 100),
      breakdown: {
        volatility: volatility,
        market_position: marketPosition,
        supplier_reliability: supplierReliability
      }
    };
  },

  /**
   * Market Position Risk Component (0-35)
   * ✅ CLEANED: Removed unused 'product' parameter
   */
  calculateMarketPositionRisk(metrics, config) {
    let score = 0;
    const details = [];

    // A. Distance from Min (0-15)
    const distanceFromMin = metrics.distanceFromMin || 0;

    if (distanceFromMin > 50) {
      score += 15;
      details.push({ factor: 'distance_from_min', value: distanceFromMin.toFixed(2), threshold: 50, points: 15, level: 'very_high' });
    } else if (distanceFromMin > 30) {
      const ratio = (distanceFromMin - 30) / 20;
      const points = 10 + (ratio * 5);
      score += points;
      details.push({ factor: 'distance_from_min', value: distanceFromMin.toFixed(2), threshold: 30, points: points.toFixed(2), level: 'high' });
    } else if (distanceFromMin > 20) {
      const ratio = (distanceFromMin - 20) / 10;
      const points = 6 + (ratio * 4);
      score += points;
      details.push({ factor: 'distance_from_min', value: distanceFromMin.toFixed(2), threshold: 20, points: points.toFixed(2), level: 'medium' });
    } else if (distanceFromMin > 10) {
      const ratio = (distanceFromMin - 10) / 10;
      const points = 3 + (ratio * 3);
      score += points;
      details.push({ factor: 'distance_from_min', value: distanceFromMin.toFixed(2), threshold: 10, points: points.toFixed(2), level: 'low' });
    }

    // B. Trend Direction (0-12)
    const trend = metrics.trend || {};

    if (trend.direction === 'strong_up') {
      score += 12;
      details.push({ factor: 'trend_direction', value: 'strong_up', points: 12, level: 'very_high' });
    } else if (trend.direction === 'up') {
      score += 8;
      details.push({ factor: 'trend_direction', value: 'up', points: 8, level: 'high' });
    } else if (trend.direction === 'stable' && distanceFromMin > 20) {
      score += 5;
      details.push({ factor: 'stable_high', value: distanceFromMin.toFixed(2), points: 5, level: 'medium' });
    } else if (trend.direction === 'down' && metrics.trend.accelerating) {
      score += 4;
      details.push({ factor: 'accelerating_down', points: 4, level: 'medium' });
    }

    // C. Inventory Position (0-8)
    const lastPurchasePrice = metrics.lastPurchasePrice;
    const currentBest = metrics.currentBest;

    if (lastPurchasePrice && currentBest) {
      const underwater = ((currentBest - lastPurchasePrice) / lastPurchasePrice) * 100;
      const thresholds = config.risk_rules.inventory_underwater;

      if (underwater < thresholds.critical_threshold) {
        score += 8;
        details.push({ factor: 'deep_underwater', underwater_percent: underwater.toFixed(2), threshold: thresholds.critical_threshold, points: 8, level: 'critical' });
      } else if (underwater < thresholds.urgent_threshold) {
        score += 6;
        details.push({ factor: 'significant_underwater', underwater_percent: underwater.toFixed(2), threshold: thresholds.urgent_threshold, points: 6, level: 'high' });
      } else if (underwater < thresholds.warning_threshold) {
        score += 3;
        details.push({ factor: 'moderate_underwater', underwater_percent: underwater.toFixed(2), threshold: thresholds.warning_threshold, points: 3, level: 'medium' });
      }
    }

    return {
      score: Math.min(score, 35),
      max: 35,
      percentage: ((score / 35) * 100).toFixed(1),
      details
    };
  },

  /**
   * Supplier Reliability Risk Component (0-30)
   * ✅ CLEANED: Removed unused 'metrics' parameter
   */
  calculateSupplierReliabilityRisk(product, config) {
    let score = 0;
    const details = [];
    const helpers = strapi.plugin('bargain-detector').service('helpers');

    const bestSupplier = helpers.findCheapestSupplier(product.supplierInfo);

    if (!bestSupplier) {
      return {
        score: 30,
        max: 30,
        percentage: "100.0",
        details: [{ factor: 'unknown_supplier', points: 30, interpretation: 'Cannot assess unknown supplier' }]
      };
    }

    const history = bestSupplier.price_progress || [];
    const dataPoints = history.length;
    const minRequired = config.risk_rules.supplier_trust.min_data_points;

    // A. Data Sufficiency (0-10)
    if (dataPoints < minRequired) {
      const ratio = dataPoints / minRequired;
      const points = (1 - ratio) * 10;
      score += points;
      details.push({
        factor: 'insufficient_data',
        data_points: dataPoints,
        min_required: minRequired,
        points: points.toFixed(2),
        level: points > 7 ? 'high' : points > 4 ? 'medium' : 'low'
      });
    }

    // B. Error Rate (0-12)
    if (dataPoints >= 10) {
      const anomalies = helpers.detectPriceAnomalies(history);
      const errorRate = anomalies.length / dataPoints;
      const tolerance = config.risk_rules.supplier_trust.error_tolerance;

      if (errorRate > tolerance * 3) {
        score += 12;
        details.push({ factor: 'high_error_rate', errors: anomalies.length, total: dataPoints, error_rate: (errorRate * 100).toFixed(2) + '%', points: 12, level: 'very_high' });
      } else if (errorRate > tolerance * 2) {
        score += 8;
        details.push({ factor: 'elevated_error_rate', error_rate: (errorRate * 100).toFixed(2) + '%', points: 8, level: 'high' });
      } else if (errorRate > tolerance) {
        score += 4;
        details.push({ factor: 'moderate_error_rate', error_rate: (errorRate * 100).toFixed(2) + '%', points: 4, level: 'medium' });
      }
    } else if (dataPoints > 0) {
      score += 5;
      details.push({ factor: 'insufficient_for_error_check', points: 5 });
    }

    // C. Consistency (0-8)
    if (dataPoints >= 20) {
      const consistency = helpers.calculateConsistencyScore(history);

      if (consistency < 0.5) {
        score += 8;
        details.push({ factor: 'very_inconsistent', consistency_score: consistency.toFixed(2), points: 8, level: 'high' });
      } else if (consistency < 0.7) {
        const ratio = (0.7 - consistency) / 0.2;
        const points = 4 + (ratio * 4);
        score += points;
        details.push({ factor: 'inconsistent', consistency_score: consistency.toFixed(2), points: points.toFixed(2), level: 'medium' });
      } else if (consistency < 0.85) {
        const ratio = (0.85 - consistency) / 0.15;
        const points = ratio * 4;
        score += points;
        details.push({ factor: 'moderate_consistency', consistency_score: consistency.toFixed(2), points: points.toFixed(2), level: 'low' });
      }
    } else if (dataPoints > 0) {
      score += 4;
      details.push({ factor: 'insufficient_for_consistency', points: 4 });
    }

    return {
      score: Math.min(score, 30),
      max: 30,
      percentage: ((score / 30) * 100).toFixed(1),
      details
    };
  },

  /**
   * Calculate Confidence
   * ✅ CLEANED: Removed unused 'metrics' parameter
   */
  calculateConfidence(product, patterns, config) {
    let score = 0;
    const details = [];
    const helpers = strapi.plugin('bargain-detector').service('helpers');

    // A. Historical Data Quality (0-5)
    const allHistory = helpers.getAllSupplierHistory(product.supplierInfo);
    const dataPoints = allHistory.length;

    if (dataPoints > 500) {
      score += 5;
      details.push({ factor: 'data_points', value: dataPoints, points: 5, quality: 'excellent' });
    } else if (dataPoints > 200) {
      score += 4;
      details.push({ factor: 'data_points', value: dataPoints, points: 4, quality: 'good' });
    } else if (dataPoints > 100) {
      score += 3;
      details.push({ factor: 'data_points', value: dataPoints, points: 3, quality: 'fair' });
    } else if (dataPoints > 30) {
      score += 2;
      details.push({ factor: 'data_points', value: dataPoints, points: 2, quality: 'limited' });
    } else {
      score += 1;
      details.push({ factor: 'data_points', value: dataPoints, points: 1, quality: 'insufficient' });
    }

    // B. Pattern Validation (0-3)
    const validatedPatterns = patterns.filter(p =>
      p.matched && p.times_successful > p.times_observed * 0.7
    );

    if (validatedPatterns.length >= 2) {
      score += 3;
      details.push({ factor: 'validated_patterns', value: validatedPatterns.length, points: 3 });
    } else if (validatedPatterns.length === 1) {
      score += 2;
      details.push({ factor: 'validated_patterns', value: 1, points: 2 });
    } else if (patterns.length > 0) {
      score += 1;
      details.push({ factor: 'unvalidated_patterns', value: patterns.length, points: 1 });
    }

    // C. Supplier Reliability (0-2)
    const suppliers = product.supplierInfo || [];
    const reliableCount = suppliers.filter(s => {
      const history = s.price_progress || [];
      if (history.length < 10) return false;
      const anomalies = helpers.detectPriceAnomalies(history);
      const errorRate = anomalies.length / history.length;
      return errorRate < config.risk_rules.supplier_trust.error_tolerance;
    }).length;

    if (reliableCount === suppliers.length && suppliers.length > 0) {
      score += 2;
      details.push({ factor: 'supplier_reliability', value: 'all_reliable', points: 2 });
    } else if (reliableCount > 0) {
      score += 1;
      details.push({ factor: 'supplier_reliability', value: 'some_reliable', points: 1 });
    }

    // Convert to enum
    let confidenceEnum;
    if (score >= 8.5) confidenceEnum = 'very_high';
    else if (score >= 7) confidenceEnum = 'high';
    else if (score >= 5) confidenceEnum = 'medium';
    else confidenceEnum = 'low';

    return {
      score: Math.min(score, 10),
      max: 10,
      value: score / 10,
      enum: confidenceEnum,
      percentage: ((score / 10) * 100).toFixed(1),
      details
    };
  },

  /**
   * Determine Recommendation - JIT Model Logic
   * ✅ NOW FULLY USES: config.recommendation_thresholds
   */
  determineRecommendation(opportunityScore, riskScore, confidence, metrics, config) {
    const liquidityScore = metrics.liquidityScore || 0;
    const isFastMover = metrics.isFastMover || false;
    const currentStock = metrics.currentStock || 0;
    const daysSinceLastPurchase = metrics.daysSinceLastPurchase || 0;
    const avgDaysBetween = metrics.avgDaysBetweenPurchases || 60;

    const thresholds = config.recommendation_thresholds;

    // === CLEARANCE LOGIC (Priority #1) ===
    // Not configurable - business logic for dead stock
    if (currentStock > 0) {
      if (daysSinceLastPurchase > avgDaysBetween * 2) {
        return {
          recommendation: 'clearance_urgent',
          rationale: `Έχεις ${currentStock} units stock που δεν κινείται ${daysSinceLastPurchase} μέρες (διπλάσιο του κανονικού κύκλου ${avgDaysBetween.toFixed(0)} μέρες)`,
          action: 'Ρίξε την τιμή πώλησης για να το ξεφορτωθείς ΑΜΕΣΑ. Dead stock = χαμένα χρήματα.'
        };
      } else if (daysSinceLastPurchase > avgDaysBetween * 1.5) {
        return {
          recommendation: 'clearance_soon',
          rationale: `Stock ${currentStock} units αρχίζει να στασιμοποιείται (${daysSinceLastPurchase} μέρες vs κανονικά ${avgDaysBetween.toFixed(0)} μέρες)`,
          action: 'Παρακολούθησε προσεκτικά. Αν δεν πουλήσει σε 1-2 εβδομάδες, κάνε clearance.'
        };
      }
    }

    // === AVOID LOGIC (Priority #2) ===
    // ✅ Uses: thresholds.avoid.max_risk
    if (riskScore > thresholds.avoid.max_risk) {
      return {
        recommendation: 'avoid',
        rationale: `Υψηλό risk (${riskScore}/100) υπερβαίνει το όριο ${thresholds.avoid.max_risk}`,
        action: 'Αποφυγή αγοράς. Η αστάθεια τιμών ή τα αναξιόπιστα δεδομένα κάνουν την αγορά επικίνδυνη.'
      };
    }

    // === STRONG BUY & STOCK LOGIC ===
    // ✅ Uses: thresholds.strong_buy (min_opportunity, max_risk, min_confidence)
    // Plus additional liquidity checks for JIT model
    if (
      opportunityScore >= thresholds.strong_buy.min_opportunity &&
      riskScore <= thresholds.strong_buy.max_risk &&
      confidence >= thresholds.strong_buy.min_confidence &&
      isFastMover &&
      liquidityScore >= 70  // JIT-specific: must be fast mover
    ) {
      const suggestedDays = this.calculateStockDays(metrics, 'aggressive');

      return {
        recommendation: 'strong_buy_and_stock',
        rationale: `Εξαιρετική ευκαιρία (${opportunityScore}/${thresholds.strong_buy.min_opportunity}+) σε fast-mover με minimal risk (${riskScore}/${thresholds.strong_buy.max_risk}) και high confidence (${(confidence * 100).toFixed(0)}%/${(thresholds.strong_buy.min_confidence * 100).toFixed(0)}%+)`,
        action: `ΑΓΟΡΑΣΕ ΚΑΙ ΣΤΟΚΑΡΕ! Πάρε stock για ${suggestedDays} ημέρες. Το προϊόν κινείται γρήγορα (ξαναγοράζεις κάθε ${avgDaysBetween.toFixed(0)} μέρες) και η τιμή είναι άψογη.`,
        suggested_stock_days: suggestedDays
      };
    }

    // === OPPORTUNISTIC STOCK LOGIC ===
    // JIT-specific: Amazing price justifies stock even with medium liquidity
    // Uses slightly higher threshold than strong_buy
    if (
      opportunityScore >= 85 &&  // Exceptional price (higher than strong_buy)
      riskScore <= thresholds.cautious_buy.max_risk &&
      liquidityScore >= 40  // Medium liquidity OK for exceptional price
    ) {
      const suggestedDays = this.calculateStockDays(metrics, 'conservative');

      return {
        recommendation: 'opportunistic_stock',
        rationale: `Η τιμή είναι εξαιρετική (${opportunityScore}/100) - αξίζει μικρό stock ακόμα και με medium liquidity (${liquidityScore}/100)`,
        action: `Πάρε μικρό stock (${suggestedDays} ημέρες). Η τιμή είναι τόσο καλή που αντισταθμίζει το μέτριο ρυθμό πωλήσεων. Conservative approach.`,
        suggested_stock_days: suggestedDays
      };
    }

    // === BUY ON DEMAND LOGIC ===
    // ✅ Uses: thresholds.buy (min_opportunity, max_risk, min_confidence)
    if (
      opportunityScore >= thresholds.buy.min_opportunity &&
      riskScore <= thresholds.buy.max_risk &&
      confidence >= thresholds.buy.min_confidence
    ) {
      return {
        recommendation: 'buy_on_demand',
        rationale: `Καλή ευκαιρία (${opportunityScore}/${thresholds.buy.min_opportunity}+) με αποδεκτό risk (${riskScore}/${thresholds.buy.max_risk}) και επαρκή confidence (${(confidence * 100).toFixed(0)}%/${(thresholds.buy.min_confidence * 100).toFixed(0)}%+)`,
        action: 'Αγόρασε όταν έχεις παραγγελία. Όχι stock προς το παρόν.',
        note: isFastMover
          ? `Fast mover (${avgDaysBetween.toFixed(0)} μέρες) - παρακολούθησε για καλύτερη τιμή (${thresholds.strong_buy.min_opportunity}+) να στοκάρεις`
          : `Κανονικό ρυθμό πωλήσεων - just-in-time OK`
      };
    }

    // === CAUTIOUS BUY LOGIC ===
    // ✅ Uses: thresholds.cautious_buy (min_opportunity, max_risk, min_confidence)
    // For JIT model, this is essentially "buy_on_demand with extra caution"
    if (
      opportunityScore >= thresholds.cautious_buy.min_opportunity &&
      riskScore <= thresholds.cautious_buy.max_risk &&
      confidence >= thresholds.cautious_buy.min_confidence
    ) {
      return {
        recommendation: 'buy_on_demand',
        rationale: `Moderate opportunity (${opportunityScore}/${thresholds.cautious_buy.min_opportunity}+) αλλά με elevated risk (${riskScore}/${thresholds.cautious_buy.max_risk})`,
        action: 'Αγόρασε μόνο όταν έχεις σίγουρη παραγγελία. Προσοχή στο risk.',
        note: 'Cautious approach - verify order before purchasing'
      };
    }

    // === WATCH LOGIC ===
    // ✅ Uses: thresholds.watch (min_opportunity, max_risk)
    if (
      opportunityScore >= thresholds.watch.min_opportunity &&
      riskScore <= thresholds.watch.max_risk
    ) {
      let watchReason = '';

      if (metrics.trend?.direction === 'down' || metrics.trend?.direction === 'strong_down') {
        watchReason = 'Η τιμή πέφτει - περίμενε λίγο ακόμα για καλύτερη ευκαιρία';
      } else if (riskScore > thresholds.buy.max_risk) {
        watchReason = `Risk υψηλότερο του ιδανικού (${riskScore} vs ${thresholds.buy.max_risk}) - περίμενε σταθεροποίηση`;
      } else if (opportunityScore < thresholds.buy.min_opportunity) {
        watchReason = `Opportunity χαμηλότερο από buy threshold (${opportunityScore} vs ${thresholds.buy.min_opportunity})`;
      } else {
        watchReason = 'Moderate opportunity - μπορεί να βελτιωθεί σύντομα';
      }

      return {
        recommendation: 'watch',
        rationale: `Moderate opportunity (${opportunityScore}/${thresholds.watch.min_opportunity}+) - ${watchReason}`,
        action: 'Παρακολούθηση χωρίς action. Ελέγξε ξανά σε 2-3 μέρες για βελτίωση.',
        next_check: {
          target_opportunity: thresholds.buy.min_opportunity,
          target_risk: thresholds.buy.max_risk
        }
      };
    }

    // === WAIT FOR ORDER LOGIC (Default) ===
    // Falls through all thresholds
    return {
      recommendation: 'wait_for_order',
      rationale: `Opportunity ${opportunityScore}/100 (χρειάζεται ${thresholds.watch.min_opportunity}+ για watch), Risk ${riskScore}/100 - όχι αρκετά ελκυστικό για stock ή proactive buy`,
      action: 'Αγόρασε μόνο αν έχεις συγκεκριμένη παραγγελία. Μην πάρεις stock.',
      note: `Χρειάζεται opportunity ${thresholds.buy.min_opportunity}+ για buy recommendation`
    };
  },

  /**
   * Calculate Priority
   * ✅ CLEANED: Removed unused 'config' parameter
   */
  calculatePriority(opportunityScore, riskScore, metrics) {
    let priorityPoints = 0;

    priorityPoints += opportunityScore * 0.5;
    priorityPoints -= riskScore * 0.25;

    const liquidityScore = metrics.liquidityScore || 0;
    priorityPoints += liquidityScore * 0.25;

    // Dead stock = CRITICAL
    const currentStock = metrics.currentStock || 0;
    const daysSince = metrics.daysSinceLastPurchase || 0;
    const avgDays = metrics.avgDaysBetweenPurchases || 60;

    if (currentStock > 0 && daysSince > avgDays * 2) {
      return 'critical';
    }

    // Flash deal bonus
    if (metrics.isFlashDeal && metrics.hoursSinceLastDrop < 6) {
      priorityPoints += 15;
    }

    if (priorityPoints >= 65) return 'critical';
    else if (priorityPoints >= 50) return 'high';
    else if (priorityPoints >= 35) return 'medium';
    else return 'low';
  },

  calculateStockDays(metrics, strategy = 'conservative') {
    const avgDays = metrics.avgDaysBetweenPurchases || 30;
    const liquidityScore = metrics.liquidityScore || 50;

    let multiplier;
    if (strategy === 'aggressive') {
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

  /**
   * Price Advantage Component (0-50)
   */
  calculatePriceAdvantage(metrics, config) {
    let score = 0;
    const details = [];
    const thresholds = config.opportunity_rules.price_drop;

    // A. Drop from Average (0-25)
    const dropFrom30d = metrics.dropFrom30d || 0;

    if (dropFrom30d >= thresholds.strong) {
      score += 25;
      details.push({ factor: 'drop_from_avg', value: dropFrom30d.toFixed(2), threshold: thresholds.strong, points: 25, strength: 'strong' });
    } else if (dropFrom30d >= thresholds.medium) {
      const ratio = (dropFrom30d - thresholds.medium) / (thresholds.strong - thresholds.medium);
      const points = 18 + (ratio * 7);
      score += points;
      details.push({ factor: 'drop_from_avg', value: dropFrom30d.toFixed(2), threshold: thresholds.medium, points: points.toFixed(2), strength: 'medium' });
    } else if (dropFrom30d >= thresholds.low) {
      const ratio = (dropFrom30d - thresholds.low) / (thresholds.medium - thresholds.low);
      const points = 12 + (ratio * 6);
      score += points;
      details.push({ factor: 'drop_from_avg', value: dropFrom30d.toFixed(2), threshold: thresholds.low, points: points.toFixed(2), strength: 'low' });
    } else if (dropFrom30d >= thresholds.minimum) {
      const ratio = (dropFrom30d - thresholds.minimum) / (thresholds.low - thresholds.minimum);
      const points = ratio * 12;
      score += points;
      details.push({ factor: 'drop_from_avg', value: dropFrom30d.toFixed(2), threshold: thresholds.minimum, points: points.toFixed(2), strength: 'minimal' });
    }

    // B. Distance from Historic Min (0-20)
    const distanceFromMin = metrics.distanceFromMin || 100;

    if (distanceFromMin <= 0) {
      score += 20;
      details.push({ factor: 'historic_low', value: distanceFromMin.toFixed(2), points: 20, strength: 'new_low' });
    } else if (distanceFromMin < 5) {
      const points = 15 + ((5 - distanceFromMin) / 5 * 5);
      score += points;
      details.push({ factor: 'near_historic_low', value: distanceFromMin.toFixed(2), threshold: 5, points: points.toFixed(2), strength: 'very_close' });
    } else if (distanceFromMin < 10) {
      const points = 10 + ((10 - distanceFromMin) / 5 * 5);
      score += points;
      details.push({ factor: 'near_historic_low', value: distanceFromMin.toFixed(2), threshold: 10, points: points.toFixed(2), strength: 'close' });
    } else if (distanceFromMin < 20) {
      const points = ((20 - distanceFromMin) / 10 * 10);
      score += points;
      details.push({ factor: 'below_average', value: distanceFromMin.toFixed(2), threshold: 20, points: points.toFixed(2), strength: 'moderate' });
    }

    // C. Supplier Competition (0-5)
    const suppliersDropping = metrics.suppliersDropping || 0;

    if (suppliersDropping >= 3) {
      score += 5;
      details.push({ factor: 'multi_supplier_drop', value: suppliersDropping, points: 5, strength: 'strong' });
    } else if (suppliersDropping >= 2) {
      score += 3;
      details.push({ factor: 'multi_supplier_drop', value: suppliersDropping, points: 3, strength: 'medium' });
    } else if (metrics.bestPriceSavings > 5) {
      score += 2;
      details.push({ factor: 'best_supplier_price', value: metrics.bestPriceSavings.toFixed(2), points: 2, strength: 'good' });
    }

    return {
      score: Math.min(score, 50),
      max: 50,
      percentage: ((score / 50) * 100).toFixed(1),
      details
    };
  },

  /**
   * Liquidity Factor Component (0-20)
   */
  calculateLiquidityFactor(metrics, config) {
    let score = 0;
    const details = [];

    const liquidityScore = metrics.liquidityScore || 0;
    const isFastMover = metrics.isFastMover || false;
    const purchaseFrequency = metrics.purchaseFrequency || 'unknown';
    const avgDaysBetween = metrics.avgDaysBetweenPurchases || null;

    // A. Purchase Frequency Score (0-15)
    if (liquidityScore >= 90) {
      score += 15;
      details.push({ factor: 'liquidity_score', value: liquidityScore, frequency: purchaseFrequency, points: 15, strength: 'very_high' });
    } else if (liquidityScore >= 70) {
      score += 12;
      details.push({ factor: 'liquidity_score', value: liquidityScore, frequency: purchaseFrequency, points: 12, strength: 'high' });
    } else if (liquidityScore >= 50) {
      score += 9;
      details.push({ factor: 'liquidity_score', value: liquidityScore, frequency: purchaseFrequency, points: 9, strength: 'medium' });
    } else if (liquidityScore >= 30) {
      score += 6;
      details.push({ factor: 'liquidity_score', value: liquidityScore, frequency: purchaseFrequency, points: 6, strength: 'low' });
    } else if (liquidityScore > 0) {
      score += 3;
      details.push({ factor: 'liquidity_score', value: liquidityScore, frequency: purchaseFrequency, points: 3, strength: 'very_low' });
    }

    // B. Fast Mover Bonus (0-5)
    if (isFastMover && avgDaysBetween !== null) {
      if (avgDaysBetween < 15) {
        score += 5;
        details.push({ factor: 'fast_mover', avg_days: avgDaysBetween.toFixed(1), points: 5, note: 'Reorders every 2 weeks - excellent' });
      } else if (avgDaysBetween < 30) {
        score += 3;
        details.push({ factor: 'fast_mover', avg_days: avgDaysBetween.toFixed(1), points: 3, note: 'Monthly reorders - good' });
      }
    }

    return {
      score: Math.min(score, 20),
      max: 20,
      percentage: ((score / 20) * 100).toFixed(1),
      details
    };
  },

  /**
   * Volatility Risk Component (0-35)
   */
  calculateVolatilityRisk(metrics, config) {
    let score = 0;
    const details = [];
    const thresholds = config.risk_rules.volatility;

    // A. Price Variance (0-20)
    const cv = metrics.coefficientOfVariation || 0;

    if (cv >= thresholds.high) {
      score += 20;
      details.push({ factor: 'price_variance', value: cv.toFixed(2), threshold: thresholds.high, points: 20, level: 'high' });
    } else if (cv >= thresholds.medium) {
      const ratio = (cv - thresholds.medium) / (thresholds.high - thresholds.medium);
      const points = 12 + (ratio * 8);
      score += points;
      details.push({ factor: 'price_variance', value: cv.toFixed(2), threshold: thresholds.medium, points: points.toFixed(2), level: 'medium' });
    } else if (cv >= thresholds.low) {
      const ratio = (cv - thresholds.low) / (thresholds.medium - thresholds.low);
      const points = 5 + (ratio * 7);
      score += points;
      details.push({ factor: 'price_variance', value: cv.toFixed(2), threshold: thresholds.low, points: points.toFixed(2), level: 'low' });
    } else {
      score += cv;
      details.push({ factor: 'price_variance', value: cv.toFixed(2), points: cv.toFixed(2), level: 'very_low' });
    }

    // B. Change Frequency (0-10)
    const changesPerMonth = metrics.priceChangesLast30d || 0;

    if (changesPerMonth > 20) {
      score += 10;
      details.push({ factor: 'change_frequency', value: changesPerMonth, frequency: 'almost_daily', points: 10 });
    } else if (changesPerMonth > 10) {
      const ratio = (changesPerMonth - 10) / 10;
      const points = 6 + (ratio * 4);
      score += points;
      details.push({ factor: 'change_frequency', value: changesPerMonth, frequency: 'high', points: points.toFixed(2) });
    } else if (changesPerMonth > 5) {
      const ratio = (changesPerMonth - 5) / 5;
      const points = 3 + (ratio * 3);
      score += points;
      details.push({ factor: 'change_frequency', value: changesPerMonth, frequency: 'moderate', points: points.toFixed(2) });
    } else if (changesPerMonth > 0) {
      score += changesPerMonth * 0.5;
      details.push({ factor: 'change_frequency', value: changesPerMonth, frequency: 'low', points: (changesPerMonth * 0.5).toFixed(2) });
    }

    // C. Acceleration (0-5)
    const variance7d = metrics.variance7d || 0;
    const variance30d = metrics.variance30d || 0;

    if (variance30d > 0) {
      const accelerationRatio = variance7d / variance30d;

      if (accelerationRatio > 2.0) {
        score += 5;
        details.push({ factor: 'volatility_acceleration', ratio: accelerationRatio.toFixed(2), points: 5, level: 'rapid' });
      } else if (accelerationRatio > 1.5) {
        score += 4;
        details.push({ factor: 'volatility_acceleration', ratio: accelerationRatio.toFixed(2), points: 4, level: 'moderate' });
      } else if (accelerationRatio > 1.2) {
        score += 2;
        details.push({ factor: 'volatility_acceleration', ratio: accelerationRatio.toFixed(2), points: 2, level: 'slight' });
      }
    }

    return {
      score: Math.min(score, 35),
      max: 35,
      percentage: ((score / 35) * 100).toFixed(1),
      details
    };
  },

  /**
   * Extract signals for tracking
   */
  extractSignals(opportunityScore, riskScore) {
    const signals = [];

    // Opportunity signals
    if (opportunityScore.breakdown.price_advantage) {
      opportunityScore.breakdown.price_advantage.details.forEach(detail => {
        signals.push({
          type: detail.factor,
          category: 'opportunity',
          component: 'price_advantage',
          value: detail.value,
          threshold: detail.threshold,
          points: detail.points,
          strength: detail.strength,
          triggered: true
        });
      });
    }

    if (opportunityScore.breakdown.timing) {
      opportunityScore.breakdown.timing.details.forEach(detail => {
        signals.push({
          type: detail.factor,
          category: 'opportunity',
          component: 'timing',
          value: detail.value,
          points: detail.points,
          strength: detail.strength || detail.urgency,
          triggered: true
        });
      });
    }

    if (opportunityScore.breakdown.liquidity_factor) {
      opportunityScore.breakdown.liquidity_factor.details.forEach(detail => {
        signals.push({
          type: detail.factor,
          category: 'opportunity',
          component: 'liquidity_factor',
          value: detail.value,
          points: detail.points,
          strength: detail.strength,
          triggered: true
        });
      });
    }

    // Risk signals
    if (riskScore.breakdown.volatility) {
      riskScore.breakdown.volatility.details.forEach(detail => {
        signals.push({
          type: detail.factor,
          category: 'risk',
          component: 'volatility',
          value: detail.value,
          threshold: detail.threshold,
          points: detail.points,
          level: detail.level,
          triggered: true
        });
      });
    }

    if (riskScore.breakdown.market_position) {
      riskScore.breakdown.market_position.details.forEach(detail => {
        signals.push({
          type: detail.factor,
          category: 'risk',
          component: 'market_position',
          value: detail.value,
          points: detail.points,
          level: detail.level,
          triggered: true
        });
      });
    }

    return signals;
  }
});