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
   * ✅ UPDATED: Auto-mark as urgent if clearance
   */
  async storeOpportunity(product, analysis, options = {}) {
    const config = await strapi
      .plugin('bargain-detector')
      .service('helpers')
      .loadConfig();

    const expiresAt = new Date();
    const clearanceDetection = analysis.clearance_detection;

    // ✅ Clearance opportunities expire faster
    const expireDays = clearanceDetection
      ? 7  // Clearance expires in 7 days (typical clearance window is 5-10 days)
      : (config.automation?.auto_expire_days || 7);

    expiresAt.setDate(expiresAt.getDate() + expireDays);

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

      // ✅ Auto-mark as urgent if flash_clearance
      is_urgent: analysis.priority === 'flash_clearance' || analysis.priority === 'critical',

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

        recommendation_details: {
          rationale: analysis.recommendation_rationale,
          action: analysis.recommendation_action,
          suggested_stock_days: analysis.suggested_stock_days || null,
          note: analysis.recommendation_note || null
        },

        // ✅ NEW: Clearance detection data
        clearance_detection: clearanceDetection,

        metadata: analysis.metadata
      }
    };

    // Update existing or create new
    if (existing && existing.length > 0) {
      const existingOpp = existing[0];
      const scoreChange = Math.abs(existingOpp.opportunity_score - data.opportunity_score);
      const recChanged = existingOpp.recommendation !== data.recommendation;
      const priorityChanged = existingOpp.priority !== data.priority;

      // ✅ Always update if clearance detected (even if scores similar)
      if (clearanceDetection || scoreChange > 5 || recChanged || priorityChanged) {
        return await strapi.entityService.update(
          'plugin::bargain-detector.bargainopportunity',
          existingOpp.id,
          { data }
        );
      }

      return existingOpp;
    } else {
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
   * ✅ UPDATED: Clearance alerts
   */
  shouldNotify(opportunity, config) {
    if (opportunity.notified) return false;

    const alerts = config.alert_settings || {};
    const clearanceData = opportunity.analysis_data?.clearance_detection;

    // ✅ NEW: Clearance sale alerts (HIGHEST PRIORITY)
    if (clearanceData && alerts.clearance_sales?.enabled) {
      const minConfidence = alerts.clearance_sales.min_confidence || 50;
      const sendAll = alerts.clearance_sales.send_all !== false; // Default true

      if (sendAll || clearanceData.confidence >= minConfidence) {
        return true;
      }
    }

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
   * ✅ UPDATED: Clearance notifications
   */
  async sendNotification(opportunity, product, config) {
    try {
      const alerts = config.alert_settings || {};
      const clearanceData = opportunity.analysis_data?.clearance_detection;
      const channels = [];

      // ✅ Clearance alerts
      if (clearanceData && alerts.clearance_sales?.enabled) {
        channels.push(...(alerts.clearance_sales.channels || ['email']));
      }
      // Critical/Flash
      else if (opportunity.priority === 'critical' || opportunity.priority === 'flash_clearance') {
        channels.push(...(alerts.critical_opportunities?.channels || ['email']));
      }

      const uniqueChannels = [...new Set(channels)];

      for (const channel of uniqueChannels) {
        if (channel === 'email') {
          // ✅ Use clearance-specific email if detected
          if (clearanceData) {
            await this.sendClearanceEmail(opportunity, product, clearanceData);
          } else {
            await this.sendEmail(opportunity, product);
          }
        }
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
   * ✅ NEW: Send clearance-specific email
   */
  async sendClearanceEmail(opportunity, product, clearanceData) {
    if (!strapi.plugin('email')) return;

    try {
      const recDetails = opportunity.analysis_data?.recommendation_details || {};
      const actions = opportunity.analysis_data?.action_items || [];

      // Build signals list
      const signalsList = clearanceData.signals.map(s =>
        `<li><strong>${s.type.replace(/_/g, ' ').toUpperCase()}:</strong> ${s.message}</li>`
      ).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🔥 CLEARANCE ALERT 🔥</h1>
            <p style="color: white; font-size: 18px; margin: 10px 0 0 0;">${product.name}</p>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 2px solid #ff6b6b;">
            <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ff6b6b; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #d32f2f;">
                Supplier ${clearanceData.supplier.name} is clearing stock!
              </p>
              <p style="margin: 5px 0 0 0; color: #666;">
                Confidence: ${clearanceData.confidence}% | Urgency: ${clearanceData.urgency.toUpperCase()}
              </p>
            </div>

            <h2 style="color: #333; border-bottom: 2px solid #ff6b6b; padding-bottom: 10px;">⚡ Detection Signals</h2>
            <ul style="line-height: 1.8; color: #555;">
              ${signalsList}
            </ul>

            <h2 style="color: #333; border-bottom: 2px solid #ff6b6b; padding-bottom: 10px; margin-top: 30px;">📊 Scores</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Opportunity Score:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: #28a745; font-weight: bold;">${opportunity.opportunity_score}/100</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Risk Score:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: #dc3545; font-weight: bold;">${opportunity.risk_score}/100</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Confidence:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${opportunity.confidence.toUpperCase()}</td>
              </tr>
            </table>

            <h2 style="color: #333; border-bottom: 2px solid #ff6b6b; padding-bottom: 10px; margin-top: 30px;">💡 Recommendation</h2>
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3;">
              <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #1565c0;">
                ${opportunity.recommendation.replace(/_/g, ' ').toUpperCase()}
              </p>
              ${recDetails.suggested_stock_days ? `
                <p style="margin: 0 0 10px 0; font-size: 16px; color: #1565c0;">
                  📦 Suggested Stock: <strong>${recDetails.suggested_stock_days} days</strong>
                </p>
              ` : ''}
              <p style="margin: 0; color: #555; line-height: 1.6;">
                ${recDetails.rationale || ''}
              </p>
              ${recDetails.action ? `
                <p style="margin: 10px 0 0 0; padding: 10px; background: white; border-radius: 4px; color: #333;">
                  <strong>Action:</strong> ${recDetails.action}
                </p>
              ` : ''}
            </div>

            ${actions.length > 0 ? `
              <h2 style="color: #333; border-bottom: 2px solid #ff6b6b; padding-bottom: 10px; margin-top: 30px;">✅ Action Items</h2>
              <ol style="line-height: 1.8; color: #555;">
                ${actions.map(a => `<li><strong>${a.description || a.action}</strong>${a.note ? `<br><small style="color: #888;">${a.note}</small>` : ''}</li>`).join('')}
              </ol>
            ` : ''}

            <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin-top: 30px; border-left: 4px solid #d32f2f;">
              <p style="margin: 0; font-weight: bold; color: #c62828;">⏰ TIME SENSITIVE</p>
              <p style="margin: 5px 0 0 0; color: #666;">
                Typical clearance window: ${clearanceData.recommendation?.estimated_window || '5-10 days'}. Act fast before stock runs out!
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.STRAPI_ADMIN_URL || 'https://magnetmarket.gr'}/admin/plugins/bargain-detector/opportunities/${opportunity.id}" 
                 style="display: inline-block; background: #ff6b6b; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                VIEW FULL ANALYSIS
              </a>
            </div>
          </div>

          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 2px;">
            <p style="margin: 0; color: #888; font-size: 12px;">
              This is an automated alert from Bargain Detector. 
              <a href="${process.env.STRAPI_ADMIN_URL || 'https://magnetmarket.gr'}/admin/plugins/bargain-detector/opportunities/${opportunity.id}" style="color: #ff6b6b;">
                Dismiss as false positive
              </a>
            </p>
          </div>
        </div>
      `;

      await strapi.plugin('email').service('email').send({
        to: ['giorgos_mitrakos@yahoo.com', 'info@magnetmarket.gr', 'kkoulogiannis@gmail.com'],
        subject: `🔥 CLEARANCE ALERT - ${product.name} από ${clearanceData.supplier.name}`,
        html
      });

      strapi.log.info(`[Analyzer] Clearance email sent for opportunity ${opportunity.id}`);
    } catch (error) {
      strapi.log.error(`[Analyzer] Clearance email failed: ${error.message}`);
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

      await strapi.plugins['email'].services.email.send({
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