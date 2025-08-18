'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('coupons-newsletter')
      .service('myService')
      .getWelcomeMessage();
  },
});
