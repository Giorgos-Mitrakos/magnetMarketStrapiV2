'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('platform-scrapper')
      .service('myService')
      .getWelcomeMessage();
  },
});
