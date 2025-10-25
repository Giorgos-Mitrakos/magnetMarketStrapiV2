// server/controllers/opportunities.js

'use strict';

module.exports = {
  /**
   * Find all opportunities with filters
   * GET /bargain-detector/opportunities
   */
  async find(ctx) {
    try {
      const { query } = ctx;
      
      const opportunities = await strapi.entityService.findMany(
        'plugin::bargain-detector.bargainopportunity',
        {
          ...query,
          populate: {
            product: {
              fields: ['id', 'name', 'slug']
            }
          }
        }
      );
      
      ctx.send(opportunities);
      
    } catch (error) {
      ctx.badRequest('Failed to fetch opportunities', { error: error.message });
    }
  },

  /**
   * Find one opportunity by ID
   * GET /bargain-detector/opportunities/:id
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      
      const opportunity = await strapi.entityService.findOne(
        'plugin::bargain-detector.bargainopportunity',
        id,
        {
          populate: {
            product: {
              fields: ['id', 'name', 'slug', 'sku']
            }
          }
        }
      );
      
      if (!opportunity) {
        return ctx.notFound('Opportunity not found');
      }
      
      ctx.send(opportunity);
      
    } catch (error) {
      console.log(error)
      ctx.badRequest('Failed to fetch opportunity', { error: error.message });
    }
  },

  /**
   * Update opportunity
   * PUT /bargain-detector/opportunities/:id
   */
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const { data } = ctx.request.body;
      
      const updated = await strapi.entityService.update(
        'plugin::bargain-detector.bargainopportunity',
        id,
        { data }
      );
      
      ctx.send(updated);
      
    } catch (error) {
      ctx.badRequest('Failed to update opportunity', { error: error.message });
    }
  },

  /**
   * Mark opportunity status
   * PUT /bargain-detector/opportunities/:id/mark-as/:status
   */
  async markAs(ctx) {
    try {
      const { id, status } = ctx.params;
      
      const validStatuses = ['active', 'purchased', 'dismissed', 'expired'];
      if (!validStatuses.includes(status)) {
        return ctx.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
      
      const updated = await strapi.entityService.update(
        'plugin::bargain-detector.bargainopportunity',
        id,
        {
          data: {
            status,
            action_taken: status === 'active' ? 'waiting' : status,
            actioned_at: status !== 'active' ? new Date() : null
          }
        }
      );
      
      ctx.send({
        success: true,
        data: updated,
        message: `Opportunity marked as ${status}`
      });
      
    } catch (error) {
      ctx.badRequest('Failed to update status', { error: error.message });
    }
  },

  /**
   * Get dashboard statistics
   * GET /bargain-detector/stats
   */
  async getStats(ctx) {
    try {
      // Get all active opportunities
      const opportunities = await strapi.entityService.findMany(
        'plugin::bargain-detector.bargainopportunity',
        {
          filters: { status: 'active' },
          limit: 1000
        }
      );
      
      const stats = {
        total: opportunities.length,
        byPriority: {
          critical: opportunities.filter(o => o.priority === 'critical').length,
          high: opportunities.filter(o => o.priority === 'high').length,
          medium: opportunities.filter(o => o.priority === 'medium').length,
          low: opportunities.filter(o => o.priority === 'low').length
        },
        byRecommendation: {},
        byStatus: {},
        avgOpportunity: 0,
        avgRisk: 0,
        avgConfidence: 0
      };
      
      // Group by recommendation
      opportunities.forEach(opp => {
        stats.byRecommendation[opp.recommendation] = 
          (stats.byRecommendation[opp.recommendation] || 0) + 1;
        
        stats.byStatus[opp.status] = 
          (stats.byStatus[opp.status] || 0) + 1;
      });
      
      // Calculate averages
      if (opportunities.length > 0) {
        stats.avgOpportunity = (
          opportunities.reduce((sum, o) => sum + o.opportunity_score, 0) / opportunities.length
        ).toFixed(1);
        
        stats.avgRisk = (
          opportunities.reduce((sum, o) => sum + o.risk_score, 0) / opportunities.length
        ).toFixed(1);
      }
      
      ctx.send({
        success: true,
        data: stats
      });
      
    } catch (error) {
      ctx.badRequest('Failed to fetch stats', { error: error.message });
    }
  },

  /**
   * Get recent analysis runs
   * GET /bargain-detector/analysis-runs
   */
  async getAnalysisRuns(ctx) {
    try {
      const runs = await strapi.entityService.findMany(
        'plugin::bargain-detector.analysisrun',
        {
          sort: { started_at: 'desc' },
          limit: 20
        }
      );
      
      ctx.send(runs);
      
    } catch (error) {
      ctx.badRequest('Failed to fetch analysis runs', { error: error.message });
    }
  },

  /**
   * Delete opportunity
   * DELETE /bargain-detector/opportunities/:id
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      
      const deleted = await strapi.entityService.delete(
        'plugin::bargain-detector.bargainopportunity',
        id
      );
      
      ctx.send({
        success: true,
        data: deleted,
        message: 'Opportunity deleted'
      });
      
    } catch (error) {
      ctx.badRequest('Failed to delete opportunity', { error: error.message });
    }
  }
};