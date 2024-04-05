'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('import-products')
      .service('myService')
      .getWelcomeMessage();
  },
});
