module.exports = [
  {
    method: 'POST',
    path: '/analysis/single',
    handler: 'analysis.analyzeSingle',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'POST',
    path: '/analysis/batch',
    handler: 'analysis.analyzeBatch',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'POST',
    path: '/analysis/all',
    handler: 'analysis.analyzeAll',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/analysis/status/:runId',
    handler: 'analysis.getStatus',
    config: {
      policies: [],
      middlewares: []
    }
  },

  // ========== OPPORTUNITIES ROUTES ==========
  {
    method: 'GET',
    path: '/opportunities',
    handler: 'opportunities.find',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/opportunities/:id',
    handler: 'opportunities.findOne',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'PUT',
    path: '/opportunities/:id',
    handler: 'opportunities.update',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'PUT',
    path: '/opportunities/:id/mark-as/:status',
    handler: 'opportunities.markAs',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'DELETE',
    path: '/opportunities/:id',
    handler: 'opportunities.delete',
    config: {
      policies: [],
      middlewares: []
    }
  },

  // ========== STATS & DASHBOARD ROUTES ==========
  {
    method: 'GET',
    path: '/stats',
    handler: 'opportunities.getStats',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/analysis-runs',
    handler: 'opportunities.getAnalysisRuns',
    config: {
      policies: [],
      middlewares: []
    }
  },

  // ========== PATTERN ROUTES ==========
  {
    method: 'GET',
    path: '/patterns',
    handler: 'patterns.find',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/patterns/stats',
    handler: 'patterns.getStats',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/patterns/:id',
    handler: 'patterns.findOne',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'POST',
    path: '/patterns/:id/validate',
    handler: 'patterns.validate',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'POST',
    path: '/patterns/:id/activate',
    handler: 'patterns.activate',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'POST',
    path: '/patterns/:id/deactivate',
    handler: 'patterns.deactivate',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'DELETE',
    path: '/patterns/:id',
    handler: 'patterns.delete',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/patterns/product/:productId',
    handler: 'patterns.findByProduct',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'POST',
    path: '/patterns/detect/:productId',
    handler: 'patterns.detectForProduct',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'POST',
    path: '/patterns/detect-batch',
    handler: 'patterns.detectBatch',
    config: {
      policies: [],
      middlewares: []
    }
  },

  // ========== CONFIG ROUTES ==========
  {
    method: 'PUT',
    path: '/config/save',
    handler: 'config.save',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/config',
    handler: 'config.getConfig',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/config/clear-cache',
    handler: 'config.clearCache',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'POST',
    path: '/config/validate',
    handler: 'config.validate',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/config/schema',
    handler: 'config.getSchema',
    config: {
      policies: [],
      middlewares: []
    }
  },

  // ========== CLEARANCE ROUTES (✅ NEW) ==========
  {
    method: 'POST',
    path: '/opportunities/:id/dismiss-clearance',
    handler: 'clearance.dismissAsFalsePositive',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'GET',
    path: '/clearance-dismissals',
    handler: 'clearance.listDismissals',
    config: {
      policies: [],
      middlewares: []
    }
  },
  {
    method: 'DELETE',
    path: '/clearance-dismissals/:id',
    handler: 'clearance.undoDismissal',
    config: {
      policies: [],
      middlewares: []
    }
  },


  // ========== WEBHOOK ROUTE (OPTIONAL) ==========
  // {
  //   method: 'POST',
  //   path: '/webhook/price-update',
  //   handler: 'webhook.priceUpdate',
  //   config: {
  //     auth: false,
  //     policies: []
  //   }
  // }
];
