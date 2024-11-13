/**
 * `add-user` middleware
 */

// import { Strapi } from '@strapi/strapi';

module.exports =  (config, { strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {

    if (ctx.request.header.authorization) {
      const token = ctx.request.header.authorization.split(' ')[1];
      
      const { id } = await strapi.plugins['users-permissions'].services.jwt.getToken(ctx);
      ctx.state.user = await strapi.plugins['users-permissions'].services.user.fetchAuthenticatedUser(id);
    }

    await next();
  };
};
