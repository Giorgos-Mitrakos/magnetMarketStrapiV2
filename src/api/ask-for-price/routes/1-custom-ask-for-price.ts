'use strict';

export default {
  routes: [
    {
      method: 'POST',
      path: '/ask-for-price',
      handler: 'ask-for-price.create',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/ask-for-price',
      handler: 'ask-for-price.find',
      config: {
        auth: {
          strategies: ['api-token']
        },
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/ask-for-price/:id',
      handler: 'ask-for-price.update',
      config: {
        auth: {
          strategies: ['api-token']
        },
        policies: [],
      },
    }
  ]
};