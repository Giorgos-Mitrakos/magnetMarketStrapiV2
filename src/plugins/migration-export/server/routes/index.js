'use strict';

// Δημόσιες (content-api) διαδρομές κάτω από /api/migration-export — ο έλεγχος
// γίνεται με το δικό μας token στον controller (όχι με χρήστες του Strapi).
module.exports = {
  'content-api': {
    type: 'content-api',
    routes: [
      {
        method: 'GET',
        path: '/summary',
        handler: 'exportController.summary',
        config: { auth: false, policies: [] },
      },
      {
        method: 'GET',
        path: '/data/:entity',
        handler: 'exportController.data',
        config: { auth: false, policies: [] },
      },
    ],
  },
};
