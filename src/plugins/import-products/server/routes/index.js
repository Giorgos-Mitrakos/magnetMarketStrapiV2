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
];
