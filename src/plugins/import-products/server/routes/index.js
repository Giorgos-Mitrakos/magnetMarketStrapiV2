module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: 'importxml.index',
    config: {
      policies: [],
    },
  },

  {
    method: 'POST',
    path: '/saveImportedURL',
    handler: 'importxml.saveImportedURL',
    config: {
      auth: false,
      policies: [],
    },
  },

  {
    method: 'POST',
    path: '/runimport',
    handler: 'importxml.runimport',
    config: {
      auth: false,
      policies: [],
    },
  },

  {
    method: 'POST',
    path: '/importSuccess',
    handler: 'importxml.success',
    config: {
      auth: false,
      policies: [],
    },
  },

  {
    method: 'POST',
    path: '/mapping',
    handler: 'importxml.getmapping',
    config: {
      auth: false,
      policies: [],
    },
  },

  {
    method: 'POST',
    path: '/saveMapping',
    handler: 'importxml.saveMapping',
    config: {
      auth: false,
      policies: [],
    },
  },

  {
    method: 'POST',
    path: '/updatespecs',
    handler: 'importxml.updatespecs',
    config: {
      auth: false,
      policies: [],
    },
  },

  {
    method: 'POST',
    path: '/sync-brand-blocking/:entryId',
    handler: 'importxml.syncBrandBlocking',
    config: { policies: [] }
  },

  {
    // ⚠️ Setup only - κάλεσέ το μία φορά για να πάρεις credentials
    method: 'GET',
    path: '/logicom-api/credentials',
    handler: 'logicomApi.getCredentials',
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: 'GET',
    path: '/logicom-api/health',
    handler: 'logicomApi.health',
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: 'GET',
    path: '/logicom-api/token',
    handler: 'logicomApi.generateToken',
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: 'GET',
    path: '/logicom-api/products',
    handler: 'logicomApi.getProducts',
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: 'GET',
    path: '/logicom-api/inventory',
    handler: 'logicomApi.getInventory',
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: 'GET',
    path: '/logicom-api/price',
    handler: 'logicomApi.getPrice',
    config: {
      policies: [],
      auth: false
    }
  },

  {
    method: 'GET',
    path: '/logicom-api/GenerateAccessToken',
    handler: 'logicomApi.proxyGenerateAccessToken',
    config: { policies: [] }
  },
  {
    method: 'GET',
    path: '/logicom-api/GetProducts',
    handler: 'logicomApi.proxyGetProducts',
    config: { policies: [] }
  },
  {
    method: 'GET',
    path: '/logicom-api/GetInventory',
    handler: 'logicomApi.proxyGetInventory',
    config: { policies: [] }
  },
  {
    method: 'GET',
    path: '/logicom-api/GetPrice',
    handler: 'logicomApi.proxyGetPrice',
    config: { policies: [] }
  },
];
