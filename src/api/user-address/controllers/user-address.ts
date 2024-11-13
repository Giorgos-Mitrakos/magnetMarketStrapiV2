'use strict';

/**
 * user-address controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController('api::user-address.user-address', ({ strapi }) => ({
  async getUser(ctx) {
    ctx.body = await strapi.service('api::user-address.user-address').getUser(ctx);
    return {
      okay: true,
      type: "GET",
    };
  },
  async updateUser(ctx) {
    ctx.body = await strapi.service('api::user-address.user-address').updateMyAddress(ctx);


    return {
      okay: true,
      type: "POST",
    };
  },
  async getUserOrders(ctx) {
    ctx.body = await strapi.service('api::user-address.user-address').getUserOrders(ctx);
    return {
      okay: true,
      type: "GET",
    };
  },
}));
