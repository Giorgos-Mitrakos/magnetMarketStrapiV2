'use strict';

module.exports = ({ strapi }) => ({
  async index(ctx) {
    ctx.body = await strapi
      .plugin('platform-scrapper')
      .service('categoryHelpers')
      .getPlatforms();
  },

  async getPlatformCategories(ctx) {
    if (ctx.request.body.platform.name === "Skroutz") {
      ctx.body = await strapi
        .plugin('platform-scrapper')
        .service('skroutzHelpers')
        .getSkroutzCategories(ctx.request.body);
    }
  },

  async scrapPlatformCategories(ctx) {
    ctx.body = await strapi
      .plugin('platform-scrapper')
      .service('categoryHelpers')
      .scrapPlatformCategories(ctx.request.body);
  },
});
