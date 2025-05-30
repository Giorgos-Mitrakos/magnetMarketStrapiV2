'use strict';

module.exports = ({ strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to Strapi 🚀';
  },
  async getOrders(ctx) {

    const { page } = ctx.request.body

    const offset = (parseInt(page) - 1) * 10
    const orders = await strapi.db.query('api::order.order').findWithCount({
      // select: ['products', 'total', 'status', 'different_shipping', 'createdAt', 'billing_address', 'shipping_address'],
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

    return { orders: orders[0], total: orders[1] }
  },

  async getOrder(ctx) {

    const { id } = ctx.request.body

    const order = await strapi.entityService.findOne('api::order.order', id, {
      fields: ['products', 'total', 'status', 'different_shipping', 'createdAt', 'billing_address', 'shipping_address', 'delivery_notes'],
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

    return { order: order }
  },

  async saveNote(ctx) {
    try {
      const { id, newNote, typeOfNote } = ctx.request.body

      const order = await strapi.entityService.findOne('api::order.order', id, {
        // fields: ['products', 'total', 'status', 'different_shipping', 'createdAt', 'billing_address', 'shipping_address'],
        populate: {
          user: true,
          shipping: true,
          payment: true,
          comments: true
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

      if (typeOfNote === 'Πελάτη') {
        const billing = order.billing_address.valueOf()
        const shipping = order.shipping_address.valueOf()
        const products = order.products.valueOf()

        const productsRows = products.map(product => ({ ...product, productTotal: product.quantity * product.price }
        ))

        const productsCost = products.reduce((total, item) => {
          return total + item.price * item.quantity
        }, 0)

        const emailVariables = {
          comment: addNote.comment,
          billing: {
            firstname: `${billing.firstname}`,
            lastname: `${billing.lastname}`,
            companyName: billing.companyName,
            businessActivity: billing.businessActivity,
            afm: billing.afm,
            doy: billing.doy,
            country: `${billing.country}`,
            state: `${billing.state}`,
            city: `${billing.city}`,
            street: `${billing.street}`,
            zipCode: `${billing.zipCode}`,
            mobilePhone: `${billing.mobilePhone}`,
            telephone: `${billing.telephone}`,
          },
          shipping: {
            firstname: `${shipping.firstname}`,
            lastname: `${shipping.lastname}`,
            country: `${shipping.country}`,
            state: `${shipping.state}`,
            city: `${shipping.city}`,
            street: `${shipping.street}`,
            zipCode: `${shipping.zipCode}`,
            mobilePhone: `${shipping.mobilePhone}`,
            telephone: `${shipping.telephone}`,
          },
          order: {
            id: order.id,
            products: productsRows,
            productsCost: productsCost.toFixed(2),
            shippingName: order.shipping.name,
            shippingCost: order.shipping.cost.toFixed(2),
            paymentName: order.payment.name,
            paymentCost: order.payment.cost.toFixed(2),
            total: order.total.toFixed(2)
          },
        }

        let templateReferenceId = 9
        if (order.isInvoice) {
          if (order.different_shipping) {
            templateReferenceId = 37;
          }
          else { templateReferenceId = 36; }
        }
        else {
          if (order.different_shipping) {
            templateReferenceId = 35;
          }
          else { templateReferenceId = 9; }
        }

        await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId: templateReferenceId, to: billing.email, emailVariables, subject: `Magnetmarket - Μήνυμα για την παραγγελία #${order.id}!` })


      }

      return { message: 'ok' }

    } catch (error) {
      console.log(error)
      return { message: 'error' }
    }
  },

  async deleteNote(ctx) {
    try {
      const { id, noteId } = ctx.request.body

      const order = await strapi.entityService.findOne('api::order.order', id, {
        // fields: ['products', 'total', 'status', 'different_shipping', 'createdAt', 'billing_address', 'shipping_address'],
        populate: {
          comments: true,
        },
      });

      let comments = order.comments

      const filteredComments = comments.filter(comment => comment.id !== noteId)

      await strapi.entityService.update('api::order.order', id, {
        data: {
          comments: filteredComments,
        },
      });

      return { message: 'ok' }

    } catch (error) {
      return { message: 'error' }
    }
  },

  async saveStatus(ctx) {
    const { id, status } = ctx.request.body

    await strapi.entityService.update('api::order.order', id, {
      data: {
        status,
      },
    });
  }

});
