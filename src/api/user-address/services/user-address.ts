'use strict';

/**
 * user-address service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
export type IOrders = Attribute.GetValues<"plugin::users-permissions.user">;
import order from '../../order/controllers/order';

export default factories.createCoreService('api::user-address.user-address', ({ strapi }) => ({
    async getUser(ctx) {
        try {
            const billing_address = await strapi.db.query('api::user-address.user-address').findOne({
                where: {
                    user_billing: {
                        id: ctx.state.user.id
                    }
                },
            })

            const shipping_address = await strapi.db.query('api::user-address.user-address').findOne({
                where: {
                    user_shipping: {
                        id: ctx.state.user.id
                    }
                },
            })

            return {
                user: {
                    info: {
                        id: ctx.state.user.id,
                        username: ctx.state.user.username,
                        email: ctx.state.user.email,
                    },
                    billing_address: billing_address,
                    shipping_address
                }
            }
        } catch (error) {
            console.log(error)
        }
    },

    // async findMyAddress(ctx) {
    //     try {
    //         const billing_address = await strapi.db.query('api::user-address.user-address').findMany({
    //             where: {
    //                 user_billing: {
    //                     id: ctx.state.user.id
    //                 }
    //             },
    //         })

    //         const shipping_address = await strapi.db.query('api::user-address.user-address').findMany({
    //             where: {
    //                 user_shipping: {
    //                     id: ctx.state.user.id
    //                 }
    //             },
    //         })

    //         console.log(shipping_address)
    //         return {
    //             user: {
    //                 username: ctx.state.user.username,
    //                 email: ctx.state.user.email,
    //                 firstName: ctx.state.user.firstName,
    //                 lastName: ctx.state.user.lastName,
    //                 telephone: ctx.state.user.telephone,
    //                 mobilePhone: ctx.state.user.mobilePhone,
    //                 billing_address: billing_address,
    //                 shipping_address
    //             }
    //         }
    //     } catch (error) {
    //         console.log(error)
    //     }
    // },

    async updateMyAddress(ctx) {
        try {
            const { addresses } = ctx.request.body

            const user = await strapi.entityService.findOne('plugin::users-permissions.user', ctx.state.user.id,
                {
                    populate: { shipping_address: true, billing_address: true },
                });

            if (user.billing_address) {
                await strapi.entityService.update('api::user-address.user-address', user.billing_address.id, {
                    data: {
                        isInvoice: addresses.billing.isInvoice,
                        firstname: addresses.billing.firstname,
                        lastname: addresses.billing.lastname,
                        companyName: addresses.billing.companyName,
                        businessActivity: addresses.billing.businessActivity,
                        afm: addresses.billing.afm,
                        doy: addresses.billing.doy,
                        telephone: addresses.billing.telephone,
                        mobilePhone: addresses.billing.mobilePhone,
                        street: addresses.billing.street,
                        city: addresses.billing.city,
                        state: addresses.billing.state,
                        zipCode: addresses.billing.zipCode,
                        country: addresses.billing.country
                    }
                })
            }
            else {
                await strapi.entityService.create('api::user-address.user-address', {
                    data: {
                        user_billing: ctx.state.user.id,
                        isInvoice: addresses.billing.isInvoice,
                        firstname: addresses.billing.firstname,
                        lastname: addresses.billing.lastname,
                        companyName: addresses.billing.companyName,
                        businessActivity: addresses.billing.businessActivity,
                        afm: addresses.billing.afm,
                        doy: addresses.billing.doy,
                        telephone: addresses.billing.telephone,
                        mobilePhone: addresses.billing.mobilePhone,
                        street: addresses.billing.street,
                        city: addresses.billing.city,
                        state: addresses.billing.state,
                        zipCode: addresses.billing.zipCode,
                        country: addresses.billing.country
                    }
                })
            }

            if (addresses.different_shipping) {
                if (user.shipping_address) {
                    const shipping_address = await strapi.entityService.update('api::user-address.user-address', user.shipping_address.id, {
                        data: {
                            firstname: addresses.shipping.firstname,
                            lastname: addresses.shipping.lastname,
                            telephone: addresses.shipping.telephone,
                            mobilePhone: addresses.shipping.mobilePhone,
                            street: addresses.shipping.street,
                            city: addresses.shipping.city,
                            state: addresses.shipping.state,
                            zipCode: addresses.shipping.zipCode,
                            country: addresses.shipping.country
                        }
                    })
                }
                else {
                    await strapi.entityService.create('api::user-address.user-address', {
                        data: {
                            user_shipping: ctx.state.user.id,
                            firstname: addresses.shipping.firstname,
                            lastname: addresses.shipping.lastname,
                            telephone: addresses.shipping.telephone,
                            mobilePhone: addresses.shipping.mobilePhone,
                            street: addresses.shipping.street,
                            city: addresses.shipping.city,
                            state: addresses.shipping.state,
                            zipCode: addresses.shipping.zipCode,
                            country: addresses.shipping.country,
                            isInvoice: false
                        }
                    })
                }
            }
            else {
                await strapi.entityService.delete('api::user-address.user-address', user.shipping_address.id)
            }


            return {
                message: 'ok'
            }
        } catch (error) {
            console.log(error)
        }
    },

    async getUserOrders(ctx) {
        try {
            const orders: IOrders = await strapi.entityService.findOne('plugin::users-permissions.user', ctx.state.user.id,
                {
                    fields: ['id', 'email'],
                    populate: {
                        orders:
                        {
                            sort: { createdAt: 'desc' }
                        }
                    },
                });

            return {
                orders: orders.orders
            }
        } catch (error) {
            console.log(error)
        }
    },
}));
