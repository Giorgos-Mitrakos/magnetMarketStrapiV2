'use strict';

let configCache = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

module.exports = ({ strapi }) => ({
  /**
   * Calculate average
   */
  average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },

  /**
   * Calculate standard deviation
   */
  standardDeviation(arr) {
    if (!arr || arr.length === 0) return 0;
    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  },

  /**
   * Get last N days of history
   */
  filterByDays(history, days) {
    if (!history || history.length === 0) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return history.filter(h => {
      const date = new Date(h.date);
      return date > cutoff;
    });
  },

  /**
   * Sort history by date (newest first)
   */
  sortByDate(history, direction = 'desc') {
    if (!history || history.length === 0) return [];

    return [...history].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return direction === 'desc' ? dateB - dateA : dateA - dateB;
    });
  },

  /**
   * Get all supplier history combined
   */
  getAllSupplierHistory(supplierInfo) {
    if (!supplierInfo || !Array.isArray(supplierInfo)) return [];

    return supplierInfo.reduce((all, supplier) => {
      const history = supplier.price_progress || [];
      return [...all, ...history];
    }, []);
  },

  /**
   * Find cheapest supplier
   */
  findCheapestSupplier(supplierInfo) {
    if (!supplierInfo || supplierInfo.length === 0) return null;

    const activeSuppliers = supplierInfo.filter(s => s.in_stock);
    if (activeSuppliers.length === 0) return null;

    return activeSuppliers.reduce((cheapest, current) => {
      return current.wholesale < cheapest.wholesale ? current : cheapest;
    });
  },

  /**
   * Count price changes in history
   */
  countPriceChanges(history) {
    if (!history || history.length < 2) return 0;

    const sorted = this.sortByDate(history, 'asc');
    let changes = 0;

    for (let i = 1; i < sorted.length; i++) {
      const priceDiff = Math.abs(sorted[i].wholesale - sorted[i - 1].wholesale);
      if (priceDiff > sorted[i - 1].wholesale * 0.001) { // >0.1% change
        changes++;
      }
    }

    return changes;
  },

  /**
   * Calculate days between dates
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Detect price anomalies
   */
  detectPriceAnomalies(history) {
    if (!history || history.length < 3) return [];

    const sorted = this.sortByDate(history, 'asc');
    const anomalies = [];
    const prices = sorted.map(h => h.wholesale);
    const mean = this.average(prices);
    const stdDev = this.standardDeviation(prices);

    for (let i = 1; i < sorted.length - 1; i++) {
      const prev = sorted[i - 1].wholesale;
      const curr = sorted[i].wholesale;
      const next = sorted[i + 1].wholesale;

      // Spike detection (V or Λ shape)
      const changePrev = Math.abs((curr - prev) / prev);
      const changeNext = Math.abs((next - curr) / curr);

      if (changePrev > 0.3 && changeNext > 0.3) {
        anomalies.push({
          date: sorted[i].date,
          wholesale: curr,
          type: 'spike_or_dip',
          severity: Math.max(changePrev, changeNext)
        });
      }

      // Invalid price
      if (curr <= 0) {
        anomalies.push({
          date: sorted[i].date,
          wholesale: curr,
          type: 'invalid_price',
          severity: 1.0
        });
      }

      // Statistical outlier (>3 standard deviations)
      if (stdDev > 0) {
        const zScore = Math.abs((curr - mean) / stdDev);
        if (zScore > 3) {
          anomalies.push({
            date: sorted[i].date,
            wholesale: curr,
            type: 'statistical_outlier',
            z_score: zScore,
            severity: Math.min(zScore / 5, 1.0)
          });
        }
      }
    }

    return anomalies;
  },

  /**
   * Calculate consistency score (0-1)
   */
  calculateConsistencyScore(history) {
    if (!history || history.length < 20) return 0.5;

    const sorted = this.sortByDate(history, 'asc');
    const consistencyFactors = [];

    // Factor 1: Change Magnitude Consistency
    const changes = [];
    for (let i = 1; i < sorted.length; i++) {
      const change = Math.abs(
        (sorted[i].wholesale - sorted[i - 1].wholesale) / sorted[i - 1].wholesale
      );
      if (change > 0.001) {
        changes.push(change);
      }
    }

    if (changes.length > 0) {
      const avgChange = this.average(changes);
      const stdDevChange = this.standardDeviation(changes);
      const cv = avgChange > 0 ? stdDevChange / avgChange : 0;
      const changeConsistency = Math.max(0, 1 - cv);
      consistencyFactors.push(changeConsistency);
    }

    // Factor 2: Direction Consistency
    let upCount = 0, downCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].wholesale > sorted[i - 1].wholesale) upCount++;
      else if (sorted[i].wholesale < sorted[i - 1].wholesale) downCount++;
    }

    const total = upCount + downCount;
    if (total > 0) {
      const dominance = Math.max(upCount, downCount) / total;
      const oscillation = 1 - Math.abs(0.5 - (upCount / total)) * 2;
      const directionConsistency = Math.max(dominance, oscillation);
      consistencyFactors.push(directionConsistency);
    }

    // Overall consistency
    return consistencyFactors.length > 0
      ? this.average(consistencyFactors)
      : 0.5;
  },

  /**
   * Load plugin configuration
   */
  

  async loadConfig() {
    const now = Date.now();

    if (configCache && (now - cacheTime) < CACHE_TTL) {
      return configCache;
    }

    try {
      const config = await strapi.entityService.findMany(
        'plugin::bargain-detector.configuration',
        { limit: 1 }
      );

      configCache = config || this.getDefaultConfig();
      cacheTime = now;

      return configCache;
    } catch (error) {
      return this.getDefaultConfig();
    }
  },

  // Clear cache function
  clearConfigCache() {
    configCache = null;
    cacheTime = 0;
  },

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      opportunity_rules: {
        price_drop: {
          strong: 20,
          medium: 15,
          low: 10,
          minimum: 5
        },
        historic_low: {
          exact_match: true,
          near_threshold: 5,
          confidence_required: 0.7
        },
        multi_supplier: {
          min_suppliers: 2,
          agreement_threshold: 0.8,
          time_window_hours: 24
        },
        flash_deal: {
          enabled: true,
          min_drop_percent: 10,
          max_time_window_hours: 6,
          urgency_threshold: 15
        },
        inventory_factor: {
          enabled: true,
          low_stock_boost: 20,
          reorder_point_boost: 10,
          out_of_stock_boost: 30
        }
      },
      risk_rules: {
        volatility: {
          high: 15,
          medium: 8,
          low: 5
        },
        inventory_underwater: {
          warning_threshold: -5,
          urgent_threshold: -15,
          critical_threshold: -25
        },
        supplier_trust: {
          min_data_points: 30,
          min_reliability_score: 60,
          error_tolerance: 0.05
        }
      },
      scoring_weights: {
        opportunity: {
          price_advantage: 40,
          timing: 30,
          inventory_need: 20,
          confidence: 10
        },
        risk: {
          volatility: 35,
          market_position: 35,
          supplier_reliability: 30
        }
      },
      recommendation_thresholds: {
        strong_buy: {
          min_opportunity: 80,
          max_risk: 30,
          min_confidence: 0.75
        },
        buy: {
          min_opportunity: 65,
          max_risk: 40,
          min_confidence: 0.65
        },
        cautious_buy: {
          min_opportunity: 50,
          max_risk: 60,
          min_confidence: 0.5
        },
        watch: {
          min_opportunity: 40,
          max_risk: 50
        },
        avoid: {
          max_risk: 70
        }
      }
    };
  }
});