'use strict';

module.exports = ({ strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to Strapi 🚀';
  },
  async getOrders(ctx) {

    const { page } = ctx.request.body

    const offset = (parseInt(page) - 1) * 10
    const orders = await strapi.db.query('api::order.order').findWithCount({
      select: ['products', 'total', 'status', 'different_shipping', 'createdAt', 'billing_address', 'shipping_address'],
      orderBy: { createdAt: 'DESC' },
      limit: 10,
      offset: offset,
      populate: {
        user: {
          populate: {
            billing_address: true,
            shipping_address: true,
          }
        },
        shipping: true,
        payment: true,
        comments: true,
      },
    });

    // console.log("orders:", orders[0], "total:", orders[1])

    return { orders: orders[0], total: orders[1] }
  },

  async getOrder(ctx) {

    const { id } = ctx.request.body

    const order = await strapi.entityService.findOne('api::order.order', id, {
      fields: ['products', 'total', 'status', 'different_shipping', 'createdAt', 'billing_address', 'shipping_address'],
      populate: {
        user: {
          populate: {
            billing_address: true,
            shipping_address: true,
          }
        },
        shipping: true,
        payment: true,
        comments: true,
      },
    });

    // console.log("orders:", orders[0], "total:", orders[1])

    return { order: order }
  },

  async saveNote(ctx) {
    try {
      const { id, newNote, typeOfNote } = ctx.request.body

      const order = await strapi.entityService.findOne('api::order.order', id, {
        // fields: ['products', 'total', 'status', 'different_shipping', 'createdAt', 'billing_address', 'shipping_address'],
        populate: {
          comments: true,
        },
      });

      let comments = order.comments

      const addNote = {
        date: new Date(),
        type: typeOfNote,
        comment: newNote
      }

      comments.push(addNote)

      await strapi.entityService.update('api::order.order', id, {
        data: {
          comments: comments,
        },
      });

      return { message: 'ok' }

    } catch (error) {
      return { message: 'error' }
    }
  },

  async deleteNote(ctx) {
    try {
      const { id, noteId } = ctx.request.body

      // const order = await strapi.entityService.findOne('api::order.order', id, {
      //   // fields: ['products', 'total', 'status', 'different_shipping', 'createdAt', 'billing_address', 'shipping_address'],
      //   populate: {
      //     comments: true,
      //   },
      // });

      // let comments = order.comments

      // const filteredComments = comments.filter(comment => comment.id !== noteId)

      // await strapi.entityService.update('api::order.order', id, {
      //   data: {
      //     comments: filteredComments,
      //   },
      // });

      const categories = await strapi.entityService.findMany('api::category.category', {
        fields: ['name'],
        filters: { name: 'Υπολογιστες' },
        populate: {
          categories: true,
        },
      });

      return { message: 'ok' }

    } catch (error) {
      return { message: 'error' }
    }
  }

});
