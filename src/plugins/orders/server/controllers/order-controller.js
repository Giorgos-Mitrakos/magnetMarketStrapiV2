'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('orders')
      .service('orderService')
      .getWelcomeMessage();
  },
  async getOrders(ctx) {
    ctx.body = await strapi
      .plugin('orders')
      .service('orderService')
      .getOrders(ctx);
  },
  async getOrder(ctx) {
    ctx.body = await strapi
      .plugin('orders')
      .service('orderService')
      .getOrder(ctx);
  },
  async saveNote(ctx) {
    ctx.body = await strapi
      .plugin('orders')
      .service('orderService')
      .saveNote(ctx);
  },
  async deleteNote(ctx) {
    ctx.body = await strapi
      .plugin('orders')
      .service('orderService')
      .deleteNote(ctx);
  },
  async saveStatus(ctx) {
    ctx.body = await strapi
      .plugin('orders')
      .service('orderService')
      .saveStatus(ctx);
  },
});
