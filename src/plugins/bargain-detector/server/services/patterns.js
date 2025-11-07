// server/services/patterns.js
// ✅ FIXED: Per-supplier pattern detection

'use strict';

module.exports = ({ strapi }) => ({
  /**
   * Main entry point - detect all patterns for a product
   * ✅ FIXED: Analyzes each supplier separately
   */
  async detectPatterns(product, metrics) {
    const patterns = [];

    try {
      const helpers = strapi.plugin('bargain-detector').service('helpers');
      const supplierInfo = product.supplierInfo || [];

      if (supplierInfo.length === 0) {
        return [];
      }

      // ✅ NEW: Analyze each supplier separately
      for (const supplier of supplierInfo) {
        const history = supplier.price_progress || [];
        
        if (history.length < 10) {
          continue; // Need minimum data per supplier
        }

        const sortedHistory = helpers.sortByDate(history, 'desc');

        // Detect patterns for THIS supplier only
        const supplierPatterns = await this.detectSupplierPatterns(
          product, 
          supplier, 
          sortedHistory
        );

        patterns.push(...supplierPatterns);
      }

      // ✅ OPTIONAL: Product-level aggregated patterns (if useful)
      // Only detect these if you have sufficient data
      const allHistory = helpers.getAllSupplierHistory(supplierInfo);
      if (allHistory.length >= 50) {
        const aggregatedPatterns = await this.detectAggregatedPatterns(
          product,
          allHistory,
          helpers
        );
        patterns.push(...aggregatedPatterns);
      }

      // Enrich patterns with historical data
      const enrichedPatterns = await Promise.all(
        patterns.map(p => this.enrichPattern(p))
      );

      return enrichedPatterns;

    } catch (error) {
      strapi.log.error(`[Patterns] Error detecting patterns: ${error.message}`);
      return [];
    }
  },

  /**
   * ✅ NEW: Detect patterns for a single supplier
   */
  async detectSupplierPatterns(product, supplier, sortedHistory) {
    const patterns = [];

    try {
      // 1. Seasonal Patterns (per supplier)
      const seasonal = await this.detectSeasonalPatterns(
        product, 
        supplier, 
        sortedHistory
      );
      if (seasonal) patterns.push(seasonal);

      // 2. Day of Week Patterns (per supplier)
      const dayOfWeek = await this.detectDayOfWeekPatterns(
        product, 
        supplier, 
        sortedHistory
      );
      if (dayOfWeek) patterns.push(dayOfWeek);

      // 3. Monthly Cycle Patterns (per supplier)
      const monthlyCycle = await this.detectMonthlyCyclePatterns(
        product, 
        supplier, 
        sortedHistory
      );
      if (monthlyCycle) patterns.push(monthlyCycle);

      // 4. Price Movement Patterns (per supplier)
      const priceMovement = await this.detectPriceMovementPatterns(
        product, 
        supplier, 
        sortedHistory
      );
      if (priceMovement) patterns.push(priceMovement);

    } catch (error) {
      strapi.log.error(
        `[Patterns] Error detecting patterns for supplier ${supplier.name}: ${error.message}`
      );
    }

    return patterns;
  },

  /**
   * ✅ NEW: Detect product-level aggregated patterns
   * (Use sparingly - only for cross-supplier insights)
   */
  async detectAggregatedPatterns(product, allHistory, helpers) {
    const patterns = [];

    try {
      const sortedHistory = helpers.sortByDate(allHistory, 'desc');

      // Market-wide seasonal pattern (all suppliers combined)
      const marketSeasonal = await this.detectMarketSeasonalPattern(
        product,
        sortedHistory
      );
      if (marketSeasonal) patterns.push(marketSeasonal);

    } catch (error) {
      strapi.log.error(`[Patterns] Error detecting aggregated patterns: ${error.message}`);
    }

    return patterns;
  },

  /**
   * 1. SEASONAL PATTERNS (per supplier)
   * ✅ UPDATED: Now supplier-specific
   */
  async detectSeasonalPatterns(product, supplier, sortedHistory) {
    const config = await strapi.plugin('bargain-detector').service('helpers').loadConfig();
    const seasonalConfig = config.pattern_settings?.seasonal || {};

    if (!seasonalConfig.enabled) return null;

    const minOccurrences = seasonalConfig.min_occurrences || 2;

    // Group by month
    const byMonth = {};
    sortedHistory.forEach(entry => {
      const date = new Date(entry.date);
      const month = date.getMonth();
      
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(entry.wholesale);
    });

    const helpers = strapi.plugin('bargain-detector').service('helpers');
    const overall = helpers.average(sortedHistory.map(h => h.wholesale));
    const seasonalMonths = [];

    Object.entries(byMonth).forEach(([month, prices]) => {
      if (prices.length >= minOccurrences) {
        const avg = helpers.average(prices);
        const dropPercent = ((overall - avg) / overall) * 100;

        if (dropPercent > 10) {
          seasonalMonths.push({
            month: parseInt(month),
            avgPrice: avg,
            dropPercent,
            occurrences: prices.length
          });
        }
      }
    });

    if (seasonalMonths.length === 0) return null;

    const currentMonth = new Date().getMonth();
    const matched = seasonalMonths.some(s => s.month === currentMonth);

    return {
      name: `Seasonal Pattern - ${supplier.name} - ${product.name}`,
      pattern_type: 'seasonal',
      scope: 'supplier',  // ✅ Changed from 'product'
      scope_target: `${product.id}-${supplier.id}`,  // ✅ Unique per supplier
      pattern_data: {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        product_id: product.id,
        seasonal_months: seasonalMonths,
        confidence_factors: {
          data_points: sortedHistory.length,
          years_observed: Math.floor(sortedHistory.length / 12)
        }
      },
      confidence: this.calculateSeasonalConfidence(seasonalMonths, sortedHistory.length),
      matched,
      next_occurrence: this.predictNextSeasonal(seasonalMonths)
    };
  },

  /**
   * 2. DAY OF WEEK PATTERNS (per supplier)
   * ✅ UPDATED: Now supplier-specific
   */
  async detectDayOfWeekPatterns(product, supplier, sortedHistory) {
    const config = await strapi.plugin('bargain-detector').service('helpers').loadConfig();
    const dowConfig = config.pattern_settings?.day_of_week || {};

    if (!dowConfig.enabled) return null;

    const minSamplesPerDay = dowConfig.min_samples_per_day || 10;

    const byDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    sortedHistory.forEach(entry => {
      const date = new Date(entry.date);
      const day = date.getDay();
      byDay[day].push(entry.wholesale);
    });

    const helpers = strapi.plugin('bargain-detector').service('helpers');
    const overall = helpers.average(sortedHistory.map(h => h.wholesale));
    const favorableDays = [];

    Object.entries(byDay).forEach(([day, prices]) => {
      if (prices.length >= minSamplesPerDay) {
        const avg = helpers.average(prices);
        const dropPercent = ((overall - avg) / overall) * 100;

        if (dropPercent > 5) {
          favorableDays.push({
            day: parseInt(day),
            dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
            avgPrice: avg,
            dropPercent,
            samples: prices.length
          });
        }
      }
    });

    if (favorableDays.length === 0) return null;

    const currentDay = new Date().getDay();
    const matched = favorableDays.some(d => d.day === currentDay);

    return {
      name: `Day-of-Week Pattern - ${supplier.name} - ${product.name}`,
      pattern_type: 'day_of_week',
      scope: 'supplier',
      scope_target: `${product.id}-${supplier.id}`,
      pattern_data: {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        product_id: product.id,
        favorable_days: favorableDays,
        sample_size: sortedHistory.length
      },
      confidence: this.calculateDayOfWeekConfidence(favorableDays, sortedHistory.length),
      matched,
      next_occurrence: this.predictNextDayOfWeek(favorableDays)
    };
  },

  /**
   * 3. MONTHLY CYCLE PATTERNS (per supplier)
   * ✅ UPDATED: Now supplier-specific
   */
  async detectMonthlyCyclePatterns(product, supplier, sortedHistory) {
    const byDayOfMonth = {};
    sortedHistory.forEach(entry => {
      const date = new Date(entry.date);
      const day = date.getDate();
      
      if (!byDayOfMonth[day]) byDayOfMonth[day] = [];
      byDayOfMonth[day].push(entry.wholesale);
    });

    const helpers = strapi.plugin('bargain-detector').service('helpers');
    const overall = helpers.average(sortedHistory.map(h => h.wholesale));

    // Check end-of-month (25-31)
    const endOfMonthPrices = [];
    for (let day = 25; day <= 31; day++) {
      if (byDayOfMonth[day]) {
        endOfMonthPrices.push(...byDayOfMonth[day]);
      }
    }

    if (endOfMonthPrices.length < 5) return null;

    const endOfMonthAvg = helpers.average(endOfMonthPrices);
    const dropPercent = ((overall - endOfMonthAvg) / overall) * 100;

    if (dropPercent < 5) return null;

    const currentDay = new Date().getDate();
    const matched = currentDay >= 25;

    return {
      name: `End-of-Month Pattern - ${supplier.name} - ${product.name}`,
      pattern_type: 'monthly_cycle',
      scope: 'supplier',
      scope_target: `${product.id}-${supplier.id}`,
      pattern_data: {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        product_id: product.id,
        cycle_type: 'end_of_month',
        favorable_days: '25-31',
        avgPrice: endOfMonthAvg,
        dropPercent,
        samples: endOfMonthPrices.length
      },
      confidence: Math.min(endOfMonthPrices.length / 20, 0.8),
      matched,
      next_occurrence: this.predictNextEndOfMonth()
    };
  },

  /**
   * 5. PRICE MOVEMENT PATTERNS (per supplier)
   * ✅ UPDATED: Now supplier-specific
   */
  async detectPriceMovementPatterns(product, supplier, sortedHistory) {
    if (sortedHistory.length < 20) return null;

    const recentHistory = sortedHistory.slice(0, 20);

    // Detect V-shape
    const vShape = this.detectVShape(recentHistory);
    if (vShape.detected) {
      return {
        name: `V-Shape - ${supplier.name} - ${product.name}`,
        pattern_type: 'price_movement',
        scope: 'supplier',
        scope_target: `${product.id}-${supplier.id}`,
        pattern_data: {
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          product_id: product.id,
          movement_type: 'v_shape',
          drop_percent: vShape.drop_percent,
          recovery_percent: vShape.recovery_percent,
          bottom_price: vShape.bottom_price,
          current_phase: vShape.current_phase
        },
        confidence: vShape.confidence,
        matched: vShape.current_phase === 'bottom',
        next_occurrence: null
      };
    }

    // Detect gradual decline
    const decline = this.detectGradualDecline(recentHistory);
    if (decline.detected) {
      return {
        name: `Gradual Decline - ${supplier.name} - ${product.name}`,
        pattern_type: 'price_movement',
        scope: 'supplier',
        scope_target: `${product.id}-${supplier.id}`,
        pattern_data: {
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          product_id: product.id,
          movement_type: 'gradual_decline',
          avg_decline_per_week: decline.avg_decline_per_week,
          projected_bottom: decline.projected_bottom,
          weeks_until_bottom: decline.weeks_until_bottom
        },
        confidence: decline.confidence,
        matched: true,
        next_occurrence: decline.projected_bottom_date
      };
    }

    return null;
  },

  /**
   * ✅ NEW: Market-wide seasonal pattern (aggregated)
   * Only use this for cross-supplier market insights
   */
  async detectMarketSeasonalPattern(product, sortedHistory) {
    const config = await strapi.plugin('bargain-detector').service('helpers').loadConfig();
    const seasonalConfig = config.pattern_settings?.seasonal || {};

    if (!seasonalConfig.enabled) return null;

    const byMonth = {};
    sortedHistory.forEach(entry => {
      const date = new Date(entry.date);
      const month = date.getMonth();
      
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(entry.wholesale);
    });

    const helpers = strapi.plugin('bargain-detector').service('helpers');
    const overall = helpers.average(sortedHistory.map(h => h.wholesale));
    const seasonalMonths = [];

    Object.entries(byMonth).forEach(([month, prices]) => {
      if (prices.length >= 10) {  // Higher threshold for market pattern
        const avg = helpers.average(prices);
        const dropPercent = ((overall - avg) / overall) * 100;

        if (dropPercent > 15) {  // Higher threshold
          seasonalMonths.push({
            month: parseInt(month),
            avgPrice: avg,
            dropPercent,
            occurrences: prices.length
          });
        }
      }
    });

    if (seasonalMonths.length === 0) return null;

    const currentMonth = new Date().getMonth();
    const matched = seasonalMonths.some(s => s.month === currentMonth);

    return {
      name: `Market Seasonal Pattern - ${product.name}`,
      pattern_type: 'seasonal',
      scope: 'product',  // This is product-level
      scope_target: String(product.id),
      pattern_data: {
        product_id: product.id,
        seasonal_months: seasonalMonths,
        note: 'Market-wide pattern (all suppliers)',
        confidence_factors: {
          data_points: sortedHistory.length,
          suppliers_included: 'all'
        }
      },
      confidence: this.calculateSeasonalConfidence(seasonalMonths, sortedHistory.length),
      matched,
      next_occurrence: this.predictNextSeasonal(seasonalMonths)
    };
  },

  // ===== HELPER FUNCTIONS (unchanged) =====

  calculateSeasonalConfidence(seasonalMonths, totalDataPoints) {
    let score = 0;
    score += Math.min(seasonalMonths.length * 0.15, 0.4);
    const avgOccurrences = seasonalMonths.reduce((sum, m) => sum + m.occurrences, 0) / seasonalMonths.length;
    score += Math.min(avgOccurrences * 0.1, 0.3);
    if (totalDataPoints > 365) score += 0.2;
    else if (totalDataPoints > 180) score += 0.1;
    return Math.min(score, 1.0);
  },

  predictNextSeasonal(seasonalMonths) {
    if (seasonalMonths.length === 0) return null;
    const now = new Date();
    const currentMonth = now.getMonth();
    const sorted = seasonalMonths.sort((a, b) => a.month - b.month);
    
    for (const season of sorted) {
      if (season.month > currentMonth) {
        const nextDate = new Date(now.getFullYear(), season.month, 1);
        return {
          expected_date: nextDate,
          expected_drop_percent: season.dropPercent,
          confidence: 'medium'
        };
      }
    }
    
    const nextDate = new Date(now.getFullYear() + 1, sorted[0].month, 1);
    return {
      expected_date: nextDate,
      expected_drop_percent: sorted[0].dropPercent,
      confidence: 'medium'
    };
  },

  calculateDayOfWeekConfidence(favorableDays, totalDataPoints) {
    let score = 0;
    score += Math.min(favorableDays.length * 0.1, 0.3);
    const avgSamples = favorableDays.reduce((sum, d) => sum + d.samples, 0) / favorableDays.length;
    score += Math.min(avgSamples / 20, 0.4);
    if (totalDataPoints > 90) score += 0.2;
    else if (totalDataPoints > 30) score += 0.1;
    return Math.min(score, 1.0);
  },

  predictNextDayOfWeek(favorableDays) {
    if (favorableDays.length === 0) return null;
    const now = new Date();
    const currentDay = now.getDay();
    const sorted = favorableDays.sort((a, b) => a.day - b.day);

    for (const fav of sorted) {
      if (fav.day > currentDay) {
        const daysUntil = fav.day - currentDay;
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + daysUntil);
        return {
          expected_date: nextDate,
          day_name: fav.dayName,
          expected_drop_percent: fav.dropPercent,
          confidence: 'low'
        };
      }
    }

    const daysUntil = (7 - currentDay) + sorted[0].day;
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysUntil);
    return {
      expected_date: nextDate,
      day_name: sorted[0].dayName,
      expected_drop_percent: sorted[0].dropPercent,
      confidence: 'low'
    };
  },

  predictNextEndOfMonth() {
    const now = new Date();
    const currentDay = now.getDate();

    if (currentDay < 25) {
      const nextDate = new Date(now.getFullYear(), now.getMonth(), 25);
      return { expected_date: nextDate, cycle: 'end_of_month', confidence: 'medium' };
    } else {
      const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 25);
      return { expected_date: nextDate, cycle: 'end_of_month', confidence: 'medium' };
    }
  },

  detectVShape(recentHistory) {
    if (recentHistory.length < 10) return { detected: false };

    const prices = recentHistory.map(h => h.wholesale);
    let minIdx = 0;
    let minPrice = prices[0];

    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < minPrice) {
        minPrice = prices[i];
        minIdx = i;
      }
    }

    if (minIdx === 0 || minIdx === prices.length - 1) return { detected: false };

    const beforeMin = prices.slice(minIdx + 1);
    const afterMin = prices.slice(0, minIdx);

    if (beforeMin.length < 3 || afterMin.length < 3) return { detected: false };

    const helpers = strapi.plugin('bargain-detector').service('helpers');
    const avgBefore = helpers.average(beforeMin);
    const avgAfter = helpers.average(afterMin);

    const dropPercent = ((avgBefore - minPrice) / avgBefore) * 100;
    const recoveryPercent = ((avgAfter - minPrice) / minPrice) * 100;

    if (dropPercent > 10 && recoveryPercent > 10) {
      const currentPrice = prices[0];
      let currentPhase = 'recovery';
      if (Math.abs(currentPrice - minPrice) < minPrice * 0.05) currentPhase = 'bottom';
      else if (currentPrice > avgBefore * 0.95) currentPhase = 'recovered';

      return {
        detected: true,
        drop_percent: dropPercent,
        recovery_percent: recoveryPercent,
        bottom_price: minPrice,
        current_phase: currentPhase,
        confidence: 0.7
      };
    }

    return { detected: false };
  },

  detectGradualDecline(recentHistory) {
    if (recentHistory.length < 15) return { detected: false };

    const prices = recentHistory.map(h => h.wholesale);
    let declines = 0;

    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] < prices[i]) declines++;
    }

    const declineRatio = declines / (prices.length - 1);
    if (declineRatio < 0.7) return { detected: false };

    const helpers = strapi.plugin('bargain-detector').service('helpers');
    const firstPrice = prices[prices.length - 1];
    const lastPrice = prices[0];
    const totalDrop = ((firstPrice - lastPrice) / firstPrice) * 100;

    const firstDate = new Date(recentHistory[recentHistory.length - 1].date);
    const lastDate = new Date(recentHistory[0].date);
    const weeks = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 7);

    const avgDeclinePerWeek = totalDrop / weeks;
    const targetPrice = lastPrice * 0.7;
    const dropNeeded = ((lastPrice - targetPrice) / lastPrice) * 100;
    const weeksUntilBottom = dropNeeded / avgDeclinePerWeek;

    const projectedBottomDate = new Date(lastDate);
    projectedBottomDate.setDate(projectedBottomDate.getDate() + weeksUntilBottom * 7);

    return {
      detected: true,
      avg_decline_per_week: avgDeclinePerWeek,
      projected_bottom: targetPrice,
      weeks_until_bottom: weeksUntilBottom,
      projected_bottom_date: { expected_date: projectedBottomDate, confidence: 'low' },
      confidence: Math.min(declineRatio, 0.75)
    };
  },

  async enrichPattern(pattern) {
    try {
      const existing = await strapi.entityService.findMany(
        'plugin::bargain-detector.pattern',
        {
          filters: {
            pattern_type: pattern.pattern_type,
            scope: pattern.scope,
            scope_target: pattern.scope_target
          },
          limit: 1
        }
      );

      if (existing && existing.length > 0) {
        const dbPattern = existing[0];
        return {
          ...pattern,
          id: dbPattern.id,
          times_observed: dbPattern.times_observed || 0,
          times_successful: dbPattern.times_successful || 0,
          detected_at: dbPattern.detected_at,
          last_validated: dbPattern.last_validated
        };
      }

      return {
        ...pattern,
        times_observed: 0,
        times_successful: 0,
        detected_at: new Date().toISOString(),
        last_validated: null
      };

    } catch (error) {
      strapi.log.error(`[Patterns] Error enriching pattern: ${error.message}`);
      return pattern;
    }
  },

  async savePattern(pattern) {
    try {
      const existing = await strapi.entityService.findMany(
        'plugin::bargain-detector.pattern',
        {
          filters: {
            pattern_type: pattern.pattern_type,
            scope: pattern.scope,
            scope_target: pattern.scope_target
          },
          limit: 1
        }
      );

      const data = {
        name: pattern.name,
        pattern_type: pattern.pattern_type,
        scope: pattern.scope,
        scope_target: pattern.scope_target,
        pattern_data: pattern.pattern_data,
        confidence: pattern.confidence,
        next_occurrence: pattern.next_occurrence,
        is_active: true,
        detected_at: pattern.detected_at || new Date()
      };

      if (existing && existing.length > 0) {
        return await strapi.entityService.update(
          'plugin::bargain-detector.pattern',
          existing[0].id,
          {
            data: {
              ...data,
              times_observed: (existing[0].times_observed || 0) + 1,
              last_validated: new Date()
            }
          }
        );
      } else {
        return await strapi.entityService.create(
          'plugin::bargain-detector.pattern',
          {
            data: {
              ...data,
              times_observed: 1,
              times_successful: 0
            }
          }
        );
      }

    } catch (error) {
      strapi.log.error(`[Patterns] Error saving pattern: ${error.message}`);
      throw error;
    }
  },

  async validatePattern(patternId, wasSuccessful) {
    try {
      const pattern = await strapi.entityService.findOne(
        'plugin::bargain-detector.pattern',
        patternId
      );

      if (!pattern) return;

      await strapi.entityService.update(
        'plugin::bargain-detector.pattern',
        patternId,
        {
          data: {
            times_successful: pattern.times_successful + (wasSuccessful ? 1 : 0),
            last_validated: new Date(),
            confidence: this.recalculateConfidence(
              pattern.times_successful + (wasSuccessful ? 1 : 0),
              pattern.times_observed
            )
          }
        }
      );

    } catch (error) {
      strapi.log.error(`[Patterns] Error validating pattern: ${error.message}`);
    }
  },

  recalculateConfidence(successful, observed) {
    if (observed === 0) return 0;
    const successRate = successful / observed;
    const priorSuccessRate = 0.5;
    const priorWeight = 2;
    const adjusted = (successful + priorWeight * priorSuccessRate) / (observed + priorWeight);
    return Math.min(adjusted, 0.95);
  }
});