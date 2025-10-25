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
