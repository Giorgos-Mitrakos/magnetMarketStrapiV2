'use strict';

module.exports = {
  /**
   * Get all patterns with filtering and pagination
   * GET /bargain-detector/patterns
   */
  async find(ctx) {
    try {
      const { query } = ctx;
      
      // Extract pagination
      const page = parseInt(query.pagination?.page) || 1;
      const pageSize = parseInt(query.pagination?.pageSize) || 25;
      const start = (page - 1) * pageSize;
      
      // Build filters
      const filters = query.filters || {};
      
      // Add default filter: only active patterns
      if (filters.is_active === undefined) {
        filters.is_active = true;
      }
      
      // Get total count
      const total = await strapi.db.query('plugin::bargain-detector.pattern').count({
        where: filters
      });
      
      // Get paginated data
      const patterns = await strapi.entityService.findMany(
        'plugin::bargain-detector.pattern',
        {
          filters,
          sort: query.sort || { confidence: 'desc', times_observed: 'desc' },
          start,
          limit: pageSize
        }
      );
      
      // Calculate success rate for each pattern
      const enrichedPatterns = patterns.map(p => ({
        ...p,
        success_rate: p.times_observed > 0 
          ? ((p.times_successful / p.times_observed) * 100).toFixed(1)
          : 0,
        reliability: p.times_observed > 0
          ? p.times_successful / p.times_observed >= 0.7 ? 'high' :
            p.times_successful / p.times_observed >= 0.5 ? 'medium' : 'low'
          : 'unproven'
      }));
      
      ctx.send({
        data: enrichedPatterns,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total
          }
        }
      });
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] Find failed: ${error.message}`);
      ctx.badRequest('Failed to fetch patterns', { error: error.message });
    }
  },

  /**
   * Get one pattern by ID
   * GET /bargain-detector/patterns/:id
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      
      const pattern = await strapi.entityService.findOne(
        'plugin::bargain-detector.pattern',
        id
      );
      
      if (!pattern) {
        return ctx.notFound('Pattern not found');
      }
      
      // Enrich with calculated fields
      const enriched = {
        ...pattern,
        success_rate: pattern.times_observed > 0
          ? ((pattern.times_successful / pattern.times_observed) * 100).toFixed(1)
          : 0,
        reliability: pattern.times_observed > 0
          ? pattern.times_successful / pattern.times_observed >= 0.7 ? 'high' :
            pattern.times_successful / pattern.times_observed >= 0.5 ? 'medium' : 'low'
          : 'unproven'
      };
      
      ctx.send(enriched);
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] FindOne failed: ${error.message}`);
      ctx.badRequest('Failed to fetch pattern', { error: error.message });
    }
  },

  /**
   * Validate a pattern (mark success/failure)
   * POST /bargain-detector/patterns/:id/validate
   * Body: { wasSuccessful: true/false, notes: "..." }
   */
  async validate(ctx) {
    try {
      const { id } = ctx.params;
      const { wasSuccessful, notes } = ctx.request.body;
      
      // Validation
      if (typeof wasSuccessful !== 'boolean') {
        return ctx.badRequest('wasSuccessful must be a boolean');
      }
      
      const pattern = await strapi.entityService.findOne(
        'plugin::bargain-detector.pattern',
        id
      );
      
      if (!pattern) {
        return ctx.notFound('Pattern not found');
      }
      
      // Update pattern
      const patternService = strapi.plugin('bargain-detector').service('patterns');
      await patternService.validatePattern(id, wasSuccessful);
      
      // Get updated pattern
      const updated = await strapi.entityService.findOne(
        'plugin::bargain-detector.pattern',
        id
      );
      
      strapi.log.info(
        `[Patterns Controller] Pattern ${id} validated as ${wasSuccessful ? 'successful' : 'failed'} ` +
        `by user ${ctx.state.user?.id}`
      );
      
      ctx.send({
        success: true,
        data: updated,
        message: `Pattern validated as ${wasSuccessful ? 'successful' : 'failed'}`,
        meta: {
          new_success_rate: ((updated.times_successful / updated.times_observed) * 100).toFixed(1)
        }
      });
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] Validate failed: ${error.message}`);
      ctx.badRequest('Failed to validate pattern', { error: error.message });
    }
  },

  /**
   * Deactivate a pattern
   * POST /bargain-detector/patterns/:id/deactivate
   * Body: { reason: "No longer relevant" }
   */
  async deactivate(ctx) {
    try {
      const { id } = ctx.params;
      const { reason } = ctx.request.body;
      
      const pattern = await strapi.entityService.findOne(
        'plugin::bargain-detector.pattern',
        id
      );
      
      if (!pattern) {
        return ctx.notFound('Pattern not found');
      }
      
      if (!pattern.is_active) {
        return ctx.badRequest('Pattern is already inactive');
      }
      
      // Update pattern
      const updated = await strapi.entityService.update(
        'plugin::bargain-detector.pattern',
        id,
        {
          data: {
            is_active: false,
            notes: reason ? `Deactivated: ${reason}` : pattern.notes
          }
        }
      );
      
      strapi.log.info(`[Patterns Controller] Pattern ${id} deactivated by user ${ctx.state.user?.id}`);
      
      ctx.send({
        success: true,
        data: updated,
        message: 'Pattern deactivated'
      });
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] Deactivate failed: ${error.message}`);
      ctx.badRequest('Failed to deactivate pattern', { error: error.message });
    }
  },

  /**
   * Reactivate a pattern
   * POST /bargain-detector/patterns/:id/activate
   */
  async activate(ctx) {
    try {
      const { id } = ctx.params;
      
      const pattern = await strapi.entityService.findOne(
        'plugin::bargain-detector.pattern',
        id
      );
      
      if (!pattern) {
        return ctx.notFound('Pattern not found');
      }
      
      if (pattern.is_active) {
        return ctx.badRequest('Pattern is already active');
      }
      
      // Update pattern
      const updated = await strapi.entityService.update(
        'plugin::bargain-detector.pattern',
        id,
        {
          data: {
            is_active: true
          }
        }
      );
      
      strapi.log.info(`[Patterns Controller] Pattern ${id} reactivated by user ${ctx.state.user?.id}`);
      
      ctx.send({
        success: true,
        data: updated,
        message: 'Pattern activated'
      });
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] Activate failed: ${error.message}`);
      ctx.badRequest('Failed to activate pattern', { error: error.message });
    }
  },

  /**
   * Delete a pattern permanently
   * DELETE /bargain-detector/patterns/:id
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      
      const pattern = await strapi.entityService.findOne(
        'plugin::bargain-detector.pattern',
        id
      );
      
      if (!pattern) {
        return ctx.notFound('Pattern not found');
      }
      
      await strapi.entityService.delete(
        'plugin::bargain-detector.pattern',
        id
      );
      
      strapi.log.info(`[Patterns Controller] Pattern ${id} deleted by user ${ctx.state.user?.id}`);
      
      ctx.send({
        success: true,
        message: 'Pattern deleted permanently'
      });
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] Delete failed: ${error.message}`);
      ctx.badRequest('Failed to delete pattern', { error: error.message });
    }
  },

  /**
   * Get pattern statistics
   * GET /bargain-detector/patterns/stats
   */
  async getStats(ctx) {
    try {
      // Get all patterns
      const allPatterns = await strapi.entityService.findMany(
        'plugin::bargain-detector.pattern',
        {
          limit: -1 // Get all
        }
      );
      
      // Calculate stats
      const stats = {
        total: allPatterns.length,
        active: allPatterns.filter(p => p.is_active).length,
        inactive: allPatterns.filter(p => !p.is_active).length,
        
        byType: {},
        byScope: {},
        byReliability: {
          high: 0,     // success rate >= 70%
          medium: 0,   // success rate >= 50%
          low: 0,      // success rate < 50%
          unproven: 0  // times_observed === 0
        },
        
        avgConfidence: 0,
        avgSuccessRate: 0,
        totalObservations: 0,
        totalSuccesses: 0
      };
      
      // Process each pattern
      allPatterns.forEach(p => {
        // By type
        stats.byType[p.pattern_type] = (stats.byType[p.pattern_type] || 0) + 1;
        
        // By scope
        stats.byScope[p.scope] = (stats.byScope[p.scope] || 0) + 1;
        
        // By reliability
        if (p.times_observed === 0) {
          stats.byReliability.unproven++;
        } else {
          const successRate = p.times_successful / p.times_observed;
          if (successRate >= 0.7) stats.byReliability.high++;
          else if (successRate >= 0.5) stats.byReliability.medium++;
          else stats.byReliability.low++;
        }
        
        // Totals
        stats.totalObservations += p.times_observed || 0;
        stats.totalSuccesses += p.times_successful || 0;
      });
      
      // Calculate averages
      if (allPatterns.length > 0) {
        stats.avgConfidence = (
          allPatterns.reduce((sum, p) => sum + (p.confidence || 0), 0) / allPatterns.length
        ).toFixed(2);
      }
      
      if (stats.totalObservations > 0) {
        stats.avgSuccessRate = (
          (stats.totalSuccesses / stats.totalObservations) * 100
        ).toFixed(1);
      }
      
      ctx.send({
        success: true,
        data: stats
      });
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] GetStats failed: ${error.message}`);
      ctx.badRequest('Failed to fetch pattern statistics', { error: error.message });
    }
  },

  /**
   * Detect and save patterns for a product
   * POST /bargain-detector/patterns/detect/:productId
   */
  async detectForProduct(ctx) {
    try {
      const { productId } = ctx.params;
      
      if (!productId || isNaN(parseInt(productId))) {
        return ctx.badRequest('Valid productId is required');
      }
      
      // Get product with full data
      const product = await strapi.entityService.findOne(
        'api::product.product',
        productId,
        {
          populate: {
            supplierInfo: {
              populate: { price_progress: true }
            },
            purchace_history: true,
            category: true
          }
        }
      );
      
      if (!product) {
        return ctx.notFound('Product not found');
      }
      
      // Calculate metrics
      const metricsService = strapi.plugin('bargain-detector').service('metrics');
      const metrics = await metricsService.calculateMetrics(product);
      
      if (!metrics) {
        return ctx.badRequest('Insufficient data to detect patterns (need at least 3 price history points)');
      }
      
      // Detect patterns
      const patternService = strapi.plugin('bargain-detector').service('patterns');
      const patterns = await patternService.detectPatterns(product, metrics);
      
      // Save patterns to database
      const savedPatterns = [];
      for (const pattern of patterns) {
        try {
          const saved = await patternService.savePattern(pattern);
          savedPatterns.push(saved);
        } catch (error) {
          strapi.log.error(`[Patterns Controller] Failed to save pattern: ${error.message}`);
        }
      }
      
      strapi.log.info(
        `[Patterns Controller] Detected ${patterns.length} patterns for product ${productId}, ` +
        `saved ${savedPatterns.length}`
      );
      
      ctx.send({
        success: true,
        data: {
          detected: patterns.length,
          saved: savedPatterns.length,
          patterns: savedPatterns
        },
        message: `Detected ${patterns.length} patterns for product "${product.name}"`
      });
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] Detect failed: ${error.message}`);
      ctx.badRequest('Failed to detect patterns', { error: error.message });
    }
  },

  /**
   * Get patterns for a specific product
   * GET /bargain-detector/patterns/product/:productId
   */
  async findByProduct(ctx) {
    try {
      const { productId } = ctx.params;
      
      if (!productId || isNaN(parseInt(productId))) {
        return ctx.badRequest('Valid productId is required');
      }
      
      // Find patterns for this product
      const patterns = await strapi.entityService.findMany(
        'plugin::bargain-detector.pattern',
        {
          filters: {
            scope: 'product',
            scope_target: String(productId),
            is_active: true
          },
          sort: { confidence: 'desc' }
        }
      );
      
      // Enrich with success rates
      const enriched = patterns.map(p => ({
        ...p,
        success_rate: p.times_observed > 0
          ? ((p.times_successful / p.times_observed) * 100).toFixed(1)
          : 0
      }));
      
      ctx.send({
        success: true,
        data: enriched,
        meta: {
          productId: parseInt(productId),
          count: enriched.length
        }
      });
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] FindByProduct failed: ${error.message}`);
      ctx.badRequest('Failed to fetch patterns', { error: error.message });
    }
  },

  /**
   * Bulk pattern detection for multiple products
   * POST /bargain-detector/patterns/detect-batch
   * Body: { productIds: [1, 2, 3] }
   */
  async detectBatch(ctx) {
    try {
      const { productIds } = ctx.request.body;
      
      if (!productIds || !Array.isArray(productIds)) {
        return ctx.badRequest('productIds array is required');
      }
      
      if (productIds.length > 100) {
        return ctx.badRequest('Maximum 100 products per batch');
      }
      
      strapi.log.info(`[Patterns Controller] Starting batch pattern detection for ${productIds.length} products`);
      
      const results = {
        total: productIds.length,
        processed: 0,
        failed: 0,
        totalPatternsDetected: 0,
        totalPatternsSaved: 0,
        errors: []
      };
      
      const patternService = strapi.plugin('bargain-detector').service('patterns');
      const metricsService = strapi.plugin('bargain-detector').service('metrics');
      
      for (const productId of productIds) {
        try {
          // Get product
          const product = await strapi.entityService.findOne(
            'api::product.product',
            productId,
            {
              populate: {
                supplierInfo: { populate: { price_progress: true } },
                purchace_history: true
              }
            }
          );
          
          if (!product) {
            results.failed++;
            results.errors.push({ productId, error: 'Product not found' });
            continue;
          }
          
          // Calculate metrics
          const metrics = await metricsService.calculateMetrics(product);
          
          if (!metrics) {
            results.failed++;
            results.errors.push({ productId, error: 'Insufficient data' });
            continue;
          }
          
          // Detect patterns
          const patterns = await patternService.detectPatterns(product, metrics);
          results.totalPatternsDetected += patterns.length;
          
          // Save patterns
          for (const pattern of patterns) {
            try {
              await patternService.savePattern(pattern);
              results.totalPatternsSaved++;
            } catch (error) {
              strapi.log.error(`Failed to save pattern: ${error.message}`);
            }
          }
          
          results.processed++;
          
        } catch (error) {
          results.failed++;
          results.errors.push({ productId, error: error.message });
        }
      }
      
      strapi.log.info(
        `[Patterns Controller] Batch detection complete: ` +
        `${results.processed}/${results.total} processed, ` +
        `${results.totalPatternsDetected} patterns detected, ` +
        `${results.totalPatternsSaved} patterns saved`
      );
      
      ctx.send({
        success: true,
        data: results,
        message: `Processed ${results.processed}/${results.total} products, detected ${results.totalPatternsDetected} patterns`
      });
      
    } catch (error) {
      strapi.log.error(`[Patterns Controller] DetectBatch failed: ${error.message}`);
      ctx.badRequest('Failed to detect patterns', { error: error.message });
    }
  }
};