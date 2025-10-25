// server/controllers/analysis.js
// Complete analysis controller with validation and error handling

'use strict';

module.exports = {
  /**
   * Analyze a single product
   * POST /bargain-detector/analysis/single
   * Body: { productId: 123 }
   * 
   * @returns {Object} Analyzed opportunity
   */
  async analyzeSingle(ctx) {
    try {
      const { productId } = ctx.request.body;
      
      // Validation
      if (!productId) {
        return ctx.badRequest('productId is required');
      }
      
      if (typeof productId !== 'number' && isNaN(parseInt(productId))) {
        return ctx.badRequest('productId must be a valid number');
      }
      
      // Check if product exists
      const product = await strapi.entityService.findOne(
        'api::product.product', 
        productId,
        { fields: ['id', 'name'] }
      );
      
      if (!product) {
        return ctx.notFound(`Product ${productId} not found`);
      }
      
      strapi.log.info(`[Analysis Controller] Starting analysis for product ${productId}: ${product.name}`);
      
      // Run analysis
      const analyzer = strapi.plugin('bargain-detector').service('analyzer');
      
      const result = await analyzer.analyzeAndStore(productId, {
        trigger: 'manual',
        userId: ctx.state.user?.id,
        source: 'admin_panel'
      });
      
      strapi.log.info(`[Analysis Controller] ✓ Product ${productId} analyzed successfully`);
      
      ctx.send({
        success: true,
        data: result,
        message: `Product "${product.name}" analyzed successfully`,
        meta: {
          productId: productId,
          productName: product.name,
          recommendation: result.recommendation,
          opportunityScore: result.opportunity_score,
          riskScore: result.risk_score
        }
      });
      
    } catch (error) {
      strapi.log.error(`[Analysis Controller] Single analysis failed: ${error.message}`, {
        stack: error.stack
      });
      
      ctx.status = error.status || 500;
      ctx.send({
        success: false,
        error: {
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  },
  
  /**
   * Analyze multiple products
   * POST /bargain-detector/analysis/batch
   * Body: { 
   *   productIds: [1, 2, 3], 
   *   options: { 
   *     parallel: true, 
   *     maxConcurrent: 5,
   *     continueOnError: true 
   *   } 
   * }
   * 
   * @returns {Object} Batch analysis results
   */
  async analyzeBatch(ctx) {
    try {
      const { productIds, options = {} } = ctx.request.body;
      
      // Validation
      if (!productIds || !Array.isArray(productIds)) {
        return ctx.badRequest('productIds array is required');
      }
      
      if (productIds.length === 0) {
        return ctx.badRequest('productIds array cannot be empty');
      }
      
      if (productIds.length > 200) {
        return ctx.badRequest('Maximum 200 products per batch. Use multiple batches for more products.');
      }
      
      // Validate all IDs are numbers
      const invalidIds = productIds.filter(id => typeof id !== 'number' && isNaN(parseInt(id)));
      if (invalidIds.length > 0) {
        return ctx.badRequest(`Invalid product IDs: ${invalidIds.join(', ')}`);
      }
      
      strapi.log.info(`[Analysis Controller] Starting batch analysis for ${productIds.length} products`);
      
      // Run batch analysis
      const analyzer = strapi.plugin('bargain-detector').service('analyzer');
      
      const result = await analyzer.analyzeBatchAndStore(productIds, {
        ...options,
        trigger: 'manual',
        userId: ctx.state.user?.id,
        source: 'admin_panel'
      });
      
      strapi.log.info(
        `[Analysis Controller] ✓ Batch analysis complete: ` +
        `${result.successful}/${result.total} successful, ` +
        `${result.failed} failed`
      );
      
      ctx.send({
        success: true,
        data: result,
        message: `Batch analysis complete: ${result.successful}/${result.total} products analyzed successfully`,
        meta: {
          totalRequested: productIds.length,
          successful: result.successful,
          failed: result.failed,
          analysisRunId: result.analysis_run_id
        }
      });
      
    } catch (error) {
      strapi.log.error(`[Analysis Controller] Batch analysis failed: ${error.message}`, {
        stack: error.stack
      });
      
      ctx.status = error.status || 500;
      ctx.send({
        success: false,
        error: {
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  },
  
  /**
   * Analyze all products (or filtered subset)
   * POST /bargain-detector/analysis/all
   * Body: { 
   *   filters: { category: 5, brand: 2 }, 
   *   limit: 100,
   *   parallel: true 
   * }
   * 
   * @returns {Object} Analysis results for all matching products
   */
  async analyzeAll(ctx) {
    try {
      const { filters = {}, limit = 100, parallel = true } = ctx.request.body;
      
      // Validate limit
      const maxLimit = 500;
      const actualLimit = Math.min(parseInt(limit) || 100, maxLimit);
      
      if (actualLimit > maxLimit) {
        strapi.log.warn(`[Analysis Controller] Requested limit ${limit} exceeds max ${maxLimit}, using ${maxLimit}`);
      }
      
      strapi.log.info(`[Analysis Controller] Fetching products with filters:`, filters);
      
      // Fetch products
      const products = await strapi.entityService.findMany('api::product.product', {
        fields: ['id', 'name'],
        filters: {
          publishedAt: { $notNull: true },
          ...filters
        },
        limit: actualLimit
      });
      
      if (!products || products.length === 0) {
        return ctx.send({
          success: true,
          message: 'No products found matching criteria',
          data: {
            total: 0,
            successful: 0,
            failed: 0,
            opportunities: []
          }
        });
      }
      
      strapi.log.info(`[Analysis Controller] Found ${products.length} products to analyze`);
      
      const productIds = products.map(p => p.id);
      
      // Run batch analysis
      const analyzer = strapi.plugin('bargain-detector').service('analyzer');
      
      const result = await analyzer.analyzeBatchAndStore(productIds, {
        trigger: 'manual',
        userId: ctx.state.user?.id,
        source: 'admin_panel',
        parallel: parallel,
        maxConcurrent: 5,
        continueOnError: true
      });
      
      strapi.log.info(
        `[Analysis Controller] ✓ Analyze all complete: ` +
        `${result.successful}/${result.total} successful`
      );
      
      ctx.send({
        success: true,
        data: result,
        message: `Analyzed ${result.successful}/${products.length} products successfully`,
        meta: {
          filtersApplied: Object.keys(filters).length > 0,
          productsFound: products.length,
          productsAnalyzed: result.successful,
          productsFailed: result.failed
        }
      });
      
    } catch (error) {
      strapi.log.error(`[Analysis Controller] Analyze all failed: ${error.message}`, {
        stack: error.stack
      });
      
      ctx.status = error.status || 500;
      ctx.send({
        success: false,
        error: {
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  },
  
  /**
   * Get analysis run status and details
   * GET /bargain-detector/analysis/status/:runId
   * 
   * @returns {Object} Analysis run details
   */
  async getStatus(ctx) {
    try {
      const { runId } = ctx.params;
      
      // Validation
      if (!runId || isNaN(parseInt(runId))) {
        return ctx.badRequest('Valid runId is required');
      }
      
      const analysisRun = await strapi.entityService.findOne(
        'plugin::bargain-detector.analysisrun',
        runId
      );
      
      if (!analysisRun) {
        return ctx.notFound('Analysis run not found');
      }
      
      // Calculate progress percentage
      const progress = analysisRun.products_total > 0
        ? Math.round((analysisRun.products_analyzed / analysisRun.products_total) * 100)
        : 0;
      
      // Determine if still running
      const isRunning = analysisRun.status === 'running';
      const isComplete = ['completed', 'failed', 'partial'].includes(analysisRun.status);
      
      // Calculate duration
      let duration = null;
      if (analysisRun.started_at) {
        const endTime = analysisRun.completed_at 
          ? new Date(analysisRun.completed_at) 
          : new Date();
        const startTime = new Date(analysisRun.started_at);
        duration = Math.round((endTime - startTime) / 1000); // seconds
      }
      
      ctx.send({
        success: true,
        data: {
          ...analysisRun,
          progress,
          isRunning,
          isComplete,
          duration
        }
      });
      
    } catch (error) {
      strapi.log.error(`[Analysis Controller] Get status failed: ${error.message}`);
      
      ctx.status = error.status || 500;
      ctx.send({
        success: false,
        error: {
          message: error.message
        }
      });
    }
  },
  
  /**
   * Cancel a running analysis
   * POST /bargain-detector/analysis/cancel/:runId
   * 
   * @returns {Object} Cancellation confirmation
   */
  async cancel(ctx) {
    try {
      const { runId } = ctx.params;
      
      if (!runId || isNaN(parseInt(runId))) {
        return ctx.badRequest('Valid runId is required');
      }
      
      const analysisRun = await strapi.entityService.findOne(
        'plugin::bargain-detector.analysisrun',
        runId
      );
      
      if (!analysisRun) {
        return ctx.notFound('Analysis run not found');
      }
      
      if (analysisRun.status !== 'running') {
        return ctx.badRequest('Can only cancel running analyses');
      }
      
      // Mark as cancelled
      const updated = await strapi.entityService.update(
        'plugin::bargain-detector.analysisrun',
        runId,
        {
          data: {
            status: 'failed',
            completed_at: new Date(),
            errors: [{ message: 'Cancelled by user', cancelledBy: ctx.state.user?.id }]
          }
        }
      );
      
      strapi.log.info(`[Analysis Controller] Analysis run ${runId} cancelled by user ${ctx.state.user?.id}`);
      
      ctx.send({
        success: true,
        data: updated,
        message: 'Analysis cancelled'
      });
      
    } catch (error) {
      strapi.log.error(`[Analysis Controller] Cancel failed: ${error.message}`);
      ctx.badRequest(error.message);
    }
  },
  
  /**
   * Re-analyze products that failed in a previous run
   * POST /bargain-detector/analysis/retry/:runId
   * 
   * @returns {Object} New analysis run for failed products
   */
  async retry(ctx) {
    try {
      const { runId } = ctx.params;
      
      if (!runId || isNaN(parseInt(runId))) {
        return ctx.badRequest('Valid runId is required');
      }
      
      const analysisRun = await strapi.entityService.findOne(
        'plugin::bargain-detector.analysisrun',
        runId
      );
      
      if (!analysisRun) {
        return ctx.notFound('Analysis run not found');
      }
      
      if (!analysisRun.errors || analysisRun.errors.length === 0) {
        return ctx.badRequest('No failed products to retry');
      }
      
      // Extract failed product IDs
      const failedProductIds = analysisRun.errors
        .filter(e => e.product_id)
        .map(e => e.product_id);
      
      if (failedProductIds.length === 0) {
        return ctx.badRequest('No failed products found');
      }
      
      strapi.log.info(`[Analysis Controller] Retrying ${failedProductIds.length} failed products from run ${runId}`);
      
      // Run analysis for failed products
      const analyzer = strapi.plugin('bargain-detector').service('analyzer');
      
      const result = await analyzer.analyzeBatchAndStore(failedProductIds, {
        trigger: 'retry',
        userId: ctx.state.user?.id,
        originalRunId: runId,
        parallel: true,
        continueOnError: true
      });
      
      ctx.send({
        success: true,
        data: result,
        message: `Retried ${result.successful}/${failedProductIds.length} failed products`,
        meta: {
          originalRunId: runId,
          newRunId: result.analysis_run_id,
          retriedCount: failedProductIds.length
        }
      });
      
    } catch (error) {
      strapi.log.error(`[Analysis Controller] Retry failed: ${error.message}`);
      ctx.badRequest(error.message);
    }
  }
};