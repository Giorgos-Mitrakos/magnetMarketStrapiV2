export default {
  routes: [
    {
      method: 'GET',
      path: '/brands/all',
      handler: 'brand.findAll',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/brands/getBrandProducts',
      handler: 'brand.getBrandProducts',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },

  ],
};