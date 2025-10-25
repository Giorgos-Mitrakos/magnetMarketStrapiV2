// server/services/analyzer.js
// Simplified wrapper around opportunity-analyzer for storage & notifications

'use strict';

module.exports = ({ strapi }) => ({
  /**
   * Analyze product and store result
   * This is the main entry point - calls opportunity-analyzer then stores
   */
  async analyzeAndStore(productId, options = {}) {
    const startTime = Date.now();

    try {
      // 1. Fetch product
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: {
          supplierInfo: {
            populate: { price_progress: true }
          },
          purchace_history: true,  // ✅ Needed for liquidity calculations
          category: true,
        }
      });

      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // 2. Run analysis using opportunity-analyzer
      strapi.log.debug(`[Analyzer] Analyzing product ${productId}: ${product.name}`);

      const opportunityAnalyzer = strapi
        .plugin('bargain-detector')
        .service('opportunity-analyzer');

      const analysis = await opportunityAnalyzer.analyzeProduct(product, options);

      // 3. Store result
      const stored = await this.storeOpportunity(product, analysis, options);

      // 4. Send notification if needed
      const config = await strapi
        .plugin('bargain-detector')
        .service('helpers')
        .loadConfig();

      if (this.shouldNotify(stored, config)) {
        await this.sendNotification(stored, product, config);
      }

      strapi.log.info(
        `[Analyzer] ✓ Product ${productId} analyzed and stored in ${Date.now() - startTime}ms`
      );

      return stored;

    } catch (error) {
      strapi.log.error(`[Analyzer] Failed to analyze product ${productId}: ${error.message}`);
      throw error;
    }
  },

  /**
   * Store opportunity in database
   * ✅ UPDATED: Now stores suggested_stock_days
   */
  async storeOpportunity(product, analysis, options = {}) {
    const config = await strapi
      .plugin('bargain-detector')
      .service('helpers')
      .loadConfig();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (config.automation?.auto_expire_days || 7));

    // Check if recent opportunity exists
    const existing = await strapi.entityService.findMany(
      'plugin::bargain-detector.bargainopportunity',
      {
        filters: {
          product: product.id,
          status: 'active'
        },
        sort: { analyzed_at: 'desc' },
        limit: 1
      }
    );

    const data = {
      product: product.id,
      analyzed_at: new Date(),
      opportunity_score: analysis.opportunity_score,
      risk_score: analysis.risk_score,
      confidence: analysis.confidence,
      recommendation: analysis.recommendation,
      priority: analysis.priority,
      status: 'active',
      expires_at: expiresAt,

      analysis_data: {
        current_state: analysis.current_state,
        opportunity_breakdown: analysis.opportunity_breakdown,
        risk_breakdown: analysis.risk_breakdown,
        confidence_breakdown: analysis.confidence_breakdown,
        metrics_summary: analysis.metrics_summary,
        key_insights: analysis.key_insights,
        action_items: analysis.action_items,
        signals_detected: analysis.signals,
        patterns_matched: analysis.patterns_matched,

        // ✅ Recommendation details (includes suggested_stock_days)
        recommendation_details: {
          rationale: analysis.recommendation_rationale,
          action: analysis.recommendation_action,
          suggested_stock_days: analysis.suggested_stock_days || null,
          note: analysis.recommendation_note || null
        },

        metadata: analysis.metadata
      }
    };

    // Update existing or create new
    if (existing && existing.length > 0) {
      const existingOpp = existing[0];
      const scoreChange = Math.abs(existingOpp.opportunity_score - data.opportunity_score);
      const recChanged = existingOpp.recommendation !== data.recommendation;

      // Update if significant change
      if (scoreChange > 5 || recChanged) {
        return await strapi.entityService.update(
          'plugin::bargain-detector.bargainopportunity',
          existingOpp.id,
          { data }
        );
      }

      // No significant change - return existing
      return existingOpp;
    } else {
      // Create new opportunity
      return await strapi.entityService.create(
        'plugin::bargain-detector.bargainopportunity',
        { data }
      );
    }
  },

  /**
   * Batch analyze and store
   */
  async analyzeBatchAndStore(productIds, options = {}) {
    const startTime = Date.now();

    // Create analysis run record
    const analysisRun = await strapi.entityService.create(
      'plugin::bargain-detector.analysisrun',
      {
        data: {
          started_at: new Date(),
          status: 'running',
          trigger: options.trigger || 'api',
          triggered_by: options.userId || null,
          products_total: productIds.length
        }
      }
    );

    strapi.log.info(`[Analyzer] Starting batch run ${analysisRun.id} for ${productIds.length} products`);

    const results = {
      success: [],
      failed: [],
      opportunities: { critical: 0, high: 0, medium: 0, low: 0 },
      recommendations: {}
    };

    const { parallel = false, maxConcurrent = 5, continueOnError = true } = options;

    try {
      if (parallel) {
        // Parallel processing
        const batches = [];
        for (let i = 0; i < productIds.length; i += maxConcurrent) {
          batches.push(productIds.slice(i, i + maxConcurrent));
        }

        for (const batch of batches) {
          const promises = batch.map(id =>
            this.analyzeAndStore(id, { ...options, analysisRunId: analysisRun.id })
              .then(result => ({ success: true, result }))
              .catch(error => ({ success: false, id, error: error.message }))
          );

          const batchResults = await Promise.all(promises);

          batchResults.forEach(item => {
            if (item.success) {
              results.success.push(item.result);
              results.opportunities[item.result.priority]++;
              results.recommendations[item.result.recommendation] =
                (results.recommendations[item.result.recommendation] || 0) + 1;
            } else {
              results.failed.push({ product_id: item.id, error: item.error });
            }
          });
        }
      } else {
        // Sequential processing
        for (const id of productIds) {
          try {
            const result = await this.analyzeAndStore(id, {
              ...options,
              analysisRunId: analysisRun.id
            });

            results.success.push(result);
            results.opportunities[result.priority]++;
            results.recommendations[result.recommendation] =
              (results.recommendations[result.recommendation] || 0) + 1;

          } catch (error) {
            results.failed.push({ product_id: id, error: error.message });
            if (!continueOnError) throw error;
          }
        }
      }

      // Calculate averages
      const avgOppScore = results.success.length > 0
        ? results.success.reduce((sum, r) => sum + r.opportunity_score, 0) / results.success.length
        : 0;

      const avgRiskScore = results.success.length > 0
        ? results.success.reduce((sum, r) => sum + r.risk_score, 0) / results.success.length
        : 0;

      // Update analysis run
      await strapi.entityService.update(
        'plugin::bargain-detector.analysisrun',
        analysisRun.id,
        {
          data: {
            completed_at: new Date(),
            status: results.failed.length === 0 ? 'completed' : 'partial',
            products_analyzed: results.success.length,
            products_skipped: results.failed.length,
            opportunities_found: results.success.length,
            execution_time_ms: Date.now() - startTime,
            errors: results.failed.length > 0 ? results.failed : null,
            summary: {
              total: productIds.length,
              successful: results.success.length,
              failed: results.failed.length,
              avg_opportunity: avgOppScore.toFixed(1),
              avg_risk: avgRiskScore.toFixed(1),
              by_priority: results.opportunities,
              by_recommendation: results.recommendations
            }
          }
        }
      );

      strapi.log.info(
        `[Analyzer] Batch run ${analysisRun.id} completed: ` +
        `${results.success.length}/${productIds.length} in ${Date.now() - startTime}ms`
      );

      return {
        analysis_run_id: analysisRun.id,
        total: productIds.length,
        successful: results.success.length,
        failed: results.failed.length,
        opportunities: results.success,
        errors: results.failed,
        summary: {
          by_priority: results.opportunities,
          by_recommendation: results.recommendations,
          avg_opportunity_score: avgOppScore.toFixed(1),
          avg_risk_score: avgRiskScore.toFixed(1)
        }
      };

    } catch (error) {
      // Mark as failed
      await strapi.entityService.update(
        'plugin::bargain-detector.analysisrun',
        analysisRun.id,
        {
          data: {
            completed_at: new Date(),
            status: 'failed',
            products_analyzed: results.success.length,
            products_skipped: results.failed.length,
            execution_time_ms: Date.now() - startTime,
            errors: [{ message: error.message }]
          }
        }
      );

      throw error;
    }
  },

  /**
   * Check if notification should be sent
   */
  shouldNotify(opportunity, config) {
    if (opportunity.notified) return false;

    const alerts = config.alert_settings || {};

    // Flash deals
    if (alerts.flash_deals?.enabled) {
      const hasFlashDeal = opportunity.analysis_data?.key_insights?.some(
        insight => insight.type === 'flash_opportunity'
      );
      if (hasFlashDeal && opportunity.opportunity_score >= alerts.flash_deals.min_score) {
        return true;
      }
    }

    // Critical opportunities
    if (alerts.critical_opportunities?.enabled) {
      if (opportunity.priority === 'critical' ||
        (opportunity.opportunity_score >= alerts.critical_opportunities.min_score &&
          opportunity.priority === 'high')) {
        return true;
      }
    }

    return false;
  },

  /**
   * Send notification
   */
  async sendNotification(opportunity, product, config) {
    try {
      const alerts = config.alert_settings || {};
      const channels = [];

      if (opportunity.priority === 'critical') {
        channels.push(...(alerts.critical_opportunities?.channels || []));
      }

      const uniqueChannels = [...new Set(channels)];

      for (const channel of uniqueChannels) {
        if (channel === 'email') {
          await this.sendEmail(opportunity, product);
        }
        // Slack support removed - not configured
      }

      // Mark as notified
      await strapi.entityService.update(
        'plugin::bargain-detector.bargainopportunity',
        opportunity.id,
        {
          data: {
            notified: true,
            notified_at: new Date(),
            notification_channels: uniqueChannels
          }
        }
      );

      strapi.log.info(`[Analyzer] Notifications sent via: ${uniqueChannels.join(', ')}`);

    } catch (error) {
      strapi.log.error(`[Analyzer] Notification failed: ${error.message}`);
    }
  },

  /**
   * Send email notification
   * ✅ UPDATED: Uses new recommendation_details structure
   */
  async sendEmail(opportunity, product) {
    if (!strapi.plugin('email')) return;

    try {
      const insights = opportunity.analysis_data?.key_insights || [];
      const actions = opportunity.analysis_data?.action_items || [];
      const recDetails = opportunity.analysis_data?.recommendation_details || {};

      const html = `
        <h2>${opportunity.priority === 'critical' ? '🚨' : '💰'} Bargain Alert - ${product.name}</h2>
        
        <h3>Scores</h3>
        <p><strong>Opportunity Score:</strong> ${opportunity.opportunity_score}/100</p>
        <p><strong>Risk Score:</strong> ${opportunity.risk_score}/100</p>
        <p><strong>Confidence:</strong> ${opportunity.confidence}</p>
        
        <h3>Recommendation</h3>
        <p><strong>Action:</strong> ${opportunity.recommendation.toUpperCase()}</p>
        ${recDetails.suggested_stock_days ? `<p><strong>Suggested Stock:</strong> ${recDetails.suggested_stock_days} days</p>` : ''}
        <p>${recDetails.rationale || ''}</p>
        <p><em>${recDetails.action || ''}</em></p>
        ${recDetails.note ? `<p><small>${recDetails.note}</small></p>` : ''}
        
        <h3>Key Insights</h3>
        <ul>${insights.map(i => `<li><strong>${i.type}:</strong> ${i.message}</li>`).join('')}</ul>
        
        <h3>Recommended Actions</h3>
        <ul>${actions.map(a => `<li>${a.description || a.action}</li>`).join('')}</ul>
        
        <p><a href="${process.env.STRAPI_ADMIN_URL || 'https://magnetmarket.gr'}/admin">View in Dashboard</a></p>
      `;

      await strapi.plugin('email').service('email').send({
        to: ['giorgos_mitrakos@yahoo.com', 'info@magnetmarket.gr', 'kkoulogiannis@gmail.com'],
        subject: `${opportunity.priority === 'critical' ? '🚨 URGENT' : '💰'} Bargain Alert - ${product.name}`,
        html
      });

      strapi.log.info(`[Analyzer] Email sent for opportunity ${opportunity.id}`);
    } catch (error) {
      strapi.log.error(`[Analyzer] Email failed: ${error.message}`);
    }
  },

  /**
   * Expire old opportunities
   */
  async expireOldOpportunities() {
    try {
      const now = new Date();
      const expired = await strapi.entityService.findMany(
        'plugin::bargain-detector.bargainopportunity',
        {
          filters: {
            status: 'active',
            expires_at: { $lt: now }
          }
        }
      );

      for (const opp of expired) {
        await strapi.entityService.update(
          'plugin::bargain-detector.bargainopportunity',
          opp.id,
          {
            data: {
              status: 'expired',
              outcome: opp.outcome === 'pending' ? 'expired' : opp.outcome
            }
          }
        );
      }

      strapi.log.info(`[Analyzer] Expired ${expired.length} opportunities`);
      return expired.length;

    } catch (error) {
      strapi.log.error(`[Analyzer] Expire failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * Cleanup old records
   */
  async cleanup() {
    try {
      const config = await strapi
        .plugin('bargain-detector')
        .service('helpers')
        .loadConfig();

      const cleanupDays = config.automation?.cleanup_days || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - cleanupDays);

      const deletedOpps = await strapi.db.query('plugin::bargain-detector.bargainopportunity').deleteMany({
        where: {
          analyzed_at: { $lt: cutoffDate },
          status: { $in: ['expired', 'dismissed'] }
        }
      });

      const deletedRuns = await strapi.db.query('plugin::bargain-detector.analysisrun').deleteMany({
        where: {
          completed_at: { $lt: cutoffDate },
          status: { $in: ['completed', 'failed'] }
        }
      });

      strapi.log.info(
        `[Analyzer] Cleanup: ${deletedOpps.count || 0} opportunities, ` +
        `${deletedRuns.count || 0} runs deleted`
      );

      return {
        opportunities: deletedOpps.count || 0,
        analysis_runs: deletedRuns.count || 0
      };

    } catch (error) {
      strapi.log.error(`[Analyzer] Cleanup failed: ${error.message}`);
      throw error;
    }
  }
});