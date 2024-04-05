'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('export-platforms-xml')
      .service('myService')
      .getWelcomeMessage();
  },
});
