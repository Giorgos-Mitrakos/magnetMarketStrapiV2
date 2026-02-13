'use strict';

export default {
  routes: [
    {
      method: 'POST',
      path: '/expected-inquiry',
      handler: 'expected-inquiry.createAskForDate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ]
};