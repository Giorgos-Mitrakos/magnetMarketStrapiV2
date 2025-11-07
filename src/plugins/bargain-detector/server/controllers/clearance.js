// server/controllers/clearance.js
'use strict';

module.exports = ({ strapi }) => ({
  
  /**
   * Dismiss clearance opportunity as false positive
   * POST /bargain-detector/opportunities/:id/dismiss-clearance
   */
  async dismissAsFalsePositive(ctx) {
    try {
      const { id } = ctx.params;
      const { reason } = ctx.request.body;
      const userId = ctx.state.user?.id || ctx.state.user?.email || 'unknown';

      if (!id) {
        return ctx.badRequest('Opportunity ID is required');
      }

      const clearanceService = strapi
        .plugin('bargain-detector')
        .service('clearance-detector');

      const result = await clearanceService.dismissAsFalsePositive(id, userId, reason);

      ctx.send({
        success: true,
        message: 'Clearance dismissed as false positive',
        data: result
      });

    } catch (error) {
      strapi.log.error('[Clearance Controller] Dismiss failed:', error);
      ctx.badRequest(error.message);
    }
  },

  /**
   * List all clearance dismissals
   * GET /bargain-detector/clearance-dismissals
   */
  async listDismissals(ctx) {
    try {
      const { page = 1, pageSize = 25, productId, supplierId } = ctx.query;

      const filters = {};
      if (productId) filters.product = productId;
      if (supplierId) filters.supplier = supplierId;

      const dismissals = await strapi.entityService.findPage(
        'plugin::bargain-detector.clearancedismissal',
        {
          filters,
          populate: ['product', 'supplier', 'opportunity'],
          sort: { dismissed_at: 'desc' },
          page,
          pageSize
        }
      );

      ctx.send({
        data: dismissals.results,
        meta: {
          pagination: {
            page: dismissals.pagination.page,
            pageSize: dismissals.pagination.pageSize,
            pageCount: dismissals.pagination.pageCount,
            total: dismissals.pagination.total
          }
        }
      });

    } catch (error) {
      strapi.log.error('[Clearance Controller] List failed:', error);
      ctx.badRequest(error.message);
    }
  },

  /**
   * Undo a dismissal (re-enable clearance alerts for this supplier/product)
   * DELETE /bargain-detector/clearance-dismissals/:id
   */
  async undoDismissal(ctx) {
    try {
      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest('Dismissal ID is required');
      }

      // Delete the dismissal record
      await strapi.entityService.delete(
        'plugin::bargain-detector.clearancedismissal',
        id
      );

      ctx.send({
        success: true,
        message: 'Dismissal removed - clearance alerts re-enabled'
      });

    } catch (error) {
      strapi.log.error('[Clearance Controller] Undo failed:', error);
      ctx.badRequest(error.message);
    }
  }
});