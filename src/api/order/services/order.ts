/**
 * order service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
export type IProduct = Attribute.GetValues<"api::product.product">;
export type IOrder = Attribute.GetValues<"api::order.order">;
const { render } = require('@react-email/components');

export default factories.createCoreService('api::order.order', ({ strapi }) => ({

    async createNewOrder(ctx) {
        try {
            const { cartItems, addresses, shippingMethod, paymentMethod, shippingCost, paymentCost, cartTotal, installments } = ctx.request.body

            const user = ctx.state.user;

            let newOrder = null

            // Ελέγχω αν όλα τα προϊόντα είναι διαθέσιμα
            const isAllProductsAvailable = cartItems.every(item => item.isAvailable === true)
            if (!isAllProductsAvailable) return { message: "cartItems", status: "fail" }

            if (!addresses)
                return { message: "addresses", status: "fail" }
            if (!shippingMethod)
                return { message: "shippingMethod", status: "fail" }
            if (!paymentMethod)
                return { message: "paymentMethod", status: "fail" }

            const productIds = cartItems.map(x => x.id)

            const products: IProduct[] = await strapi.entityService.findMany('api::product.product', {
                fields: ['id', 'name', 'price', 'sale_price', 'is_sale'],
                filters: { id: { $in: productIds } },
            })

            const fullProducts = cartItems.map(x => {
                const product = products.find(item => Number(x.id) === item.id)
                x.is_sale = product.is_sale
                x.sale_price = product.sale_price
                return x
            })

            const totalCost = cartTotal + paymentCost.cost + shippingCost.cost

            if (!user) {
                const checkIfUserExists = await strapi.db.query('plugin::users-permissions.user').findOne({
                    where: {
                        email: addresses.billing.email
                    },
                    populate: ['shipping_address', 'billing_address'],
                });
                if (!checkIfUserExists) {
                    const newUser = await strapi.entityService.create('plugin::users-permissions.user', {
                        data: {
                            email: addresses.billing.email,
                            username: addresses.billing.email,
                        }
                    })

                    await strapi.entityService.create('api::user-address.user-address', {
                        data: {
                            firstname: addresses.billing.firstname,
                            lastname: addresses.billing.lastname,
                            companyName: addresses.billing.companyName,
                            businessActivity: addresses.billing.businessActivity,
                            afm: addresses.billing.afm,
                            doy: addresses.billing.doy,
                            country: addresses.billing.country,
                            state: addresses.billing.state,
                            city: addresses.billing.city,
                            street: addresses.billing.street,
                            zipCode: addresses.billing.zipCode,
                            mobilePhone: addresses.billing.mobilePhone,
                            telephone: addresses.billing.telephone,
                            isInvoice: addresses.billing.isInvoice,
                            user_billing: newUser.id
                        }
                    })

                    if (addresses.different_shipping) {
                        await strapi.entityService.create('api::user-address.user-address', {
                            data: {
                                firstname: addresses.shipping.firstname,
                                lastname: addresses.shipping.lastname,
                                companyName: addresses.shipping.companyName,
                                businessActivity: addresses.shipping.businessActivity,
                                afm: addresses.shipping.afm,
                                doy: addresses.shipping.doy,
                                country: addresses.shipping.country,
                                state: addresses.shipping.state,
                                city: addresses.shipping.city,
                                street: addresses.shipping.street,
                                zipCode: addresses.shipping.zipCode,
                                mobilePhone: addresses.shipping.mobilePhone,
                                telephone: addresses.shipping.telephone,
                                isInvoice: addresses.shipping.isInvoice,
                                user_shipping: newUser.id
                            }
                        })
                    }

                    const shipping = {
                        name: shippingMethod.pickup ? "Παραλαβή από το κατάστημα" : shippingMethod.shipping,
                        cost: shippingCost.cost
                    }

                    const payment = {
                        name: paymentMethod.payment,
                        cost: paymentCost.cost
                    }



                    newOrder = await strapi.entityService.create('api::order.order', {
                        data: {
                            products: cartItems,
                            payment: payment,
                            shipping: shipping,
                            total: totalCost,
                            installments: installments || 1,
                            user: newUser.id,
                            status: 'Σε αναμονή',
                            different_shipping: addresses.different_shipping,
                            isInvoice: addresses.billing.isInvoice,
                            billing_address: addresses.billing,
                            shipping_address: addresses.shipping,
                            delivery_notes: addresses.deliveryNotes,
                            publishedAt: new Date()
                        }
                    })
                }
                else {
                    if (checkIfUserExists.billing_address) {
                        await strapi.entityService.update('api::user-address.user-address', checkIfUserExists.billing_address.id, {
                            data: {
                                firstname: addresses.billing.firstname,
                                lastname: addresses.billing.lastname,
                                companyName: addresses.billing.companyName,
                                businessActivity: addresses.billing.businessActivity,
                                afm: addresses.billing.afm,
                                doy: addresses.billing.doy,
                                country: addresses.billing.country,
                                state: addresses.billing.state,
                                city: addresses.billing.city,
                                street: addresses.billing.street,
                                zipCode: addresses.billing.zipCode,
                                mobilePhone: addresses.billing.mobilePhone,
                                telephone: addresses.billing.telephone,
                                isInvoice: addresses.billing.isInvoice
                            }
                        })
                    }
                    else {
                        await strapi.entityService.create('api::user-address.user-address', {
                            data: {
                                firstname: addresses.billing.firstname,
                                lastname: addresses.billing.lastname,
                                companyName: addresses.billing.companyName,
                                businessActivity: addresses.billing.businessActivity,
                                afm: addresses.billing.afm,
                                doy: addresses.billing.doy,
                                country: addresses.billing.country,
                                state: addresses.billing.state,
                                city: addresses.billing.city,
                                street: addresses.billing.street,
                                zipCode: addresses.billing.zipCode,
                                mobilePhone: addresses.billing.mobilePhone,
                                telephone: addresses.billing.telephone,
                                isInvoice: addresses.billing.isInvoice,
                                user_billing: checkIfUserExists.id
                            }
                        })
                    }

                    if (addresses.different_shipping) {
                        if (checkIfUserExists.shipping_address) {
                            await strapi.entityService.update('api::user-address.user-address', checkIfUserExists.shipping_address.id, {
                                data: {
                                    firstname: addresses.shipping.firstname,
                                    lastname: addresses.shipping.lastname,
                                    companyName: addresses.shipping.companyName,
                                    businessActivity: addresses.shipping.businessActivity,
                                    afm: addresses.shipping.afm,
                                    doy: addresses.shipping.doy,
                                    country: addresses.shipping.country,
                                    state: addresses.shipping.state,
                                    city: addresses.shipping.city,
                                    street: addresses.shipping.street,
                                    zipCode: addresses.shipping.zipCode,
                                    mobilePhone: addresses.shipping.mobilePhone,
                                    telephone: addresses.shipping.telephone,
                                    isInvoice: addresses.shipping.isInvoice
                                }
                            })
                        }
                        else {
                            await strapi.entityService.create('api::user-address.user-address', {
                                data: {
                                    firstname: addresses.shipping.firstname,
                                    lastname: addresses.shipping.lastname,
                                    companyName: addresses.shipping.companyName,
                                    businessActivity: addresses.shipping.businessActivity,
                                    afm: addresses.shipping.afm,
                                    doy: addresses.shipping.doy,
                                    country: addresses.shipping.country,
                                    state: addresses.shipping.state,
                                    city: addresses.shipping.city,
                                    street: addresses.shipping.street,
                                    zipCode: addresses.shipping.zipCode,
                                    mobilePhone: addresses.shipping.mobilePhone,
                                    telephone: addresses.shipping.telephone,
                                    isInvoice: addresses.shipping.isInvoice,
                                    user_shipping: checkIfUserExists.id
                                }
                            })
                        }
                    }

                    const shipping = {
                        name: shippingMethod.pickup ? "Παραλαβή από το κατάστημα" : shippingMethod.shipping,
                        cost: shippingCost.cost
                    }

                    const payment = {
                        name: paymentMethod.payment,
                        cost: paymentCost.cost
                    }

                    newOrder = await strapi.entityService.create('api::order.order', {
                        data: {
                            products: cartItems,
                            payment: payment,
                            shipping: shipping,
                            total: totalCost,
                            installments: installments || 1,
                            user: checkIfUserExists.id,
                            status: 'Σε αναμονή',
                            different_shipping: addresses.different_shipping,
                            isInvoice: addresses.billing.isInvoice,
                            billing_address: addresses.billing,
                            shipping_address: addresses.shipping,
                            delivery_notes: addresses.deliveryNotes,
                            publishedAt: new Date()
                        }
                    })
                }
            }
            else {
                const findUser = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
                    populate: ['shipping_address', 'billing_address'],
                });
                if (!findUser.billing_address) {
                    await strapi.entityService.create('api::user-address.user-address', {
                        data: {
                            firstname: addresses.billing.firstname,
                            lastname: addresses.billing.lastname,
                            companyName: addresses.billing.companyName,
                            businessActivity: addresses.billing.businessActivity,
                            afm: addresses.billing.afm,
                            doy: addresses.billing.doy,
                            country: addresses.billing.country,
                            state: addresses.billing.state,
                            city: addresses.billing.city,
                            street: addresses.billing.street,
                            zipCode: addresses.billing.zipCode,
                            mobilePhone: addresses.billing.mobilePhone,
                            telephone: addresses.billing.telephone,
                            isInvoice: addresses.billing.isInvoice,
                            user_billing: findUser.id
                        }
                    })
                }
                else {
                    await strapi.entityService.update('api::user-address.user-address', findUser.billing_address.id, {
                        data: {
                            firstname: addresses.billing.firstname,
                            lastname: addresses.billing.lastname,
                            companyName: addresses.billing.companyName,
                            businessActivity: addresses.billing.businessActivity,
                            afm: addresses.billing.afm,
                            doy: addresses.billing.doy,
                            country: addresses.billing.country,
                            state: addresses.billing.state,
                            city: addresses.billing.city,
                            street: addresses.billing.street,
                            zipCode: addresses.billing.zipCode,
                            mobilePhone: addresses.billing.mobilePhone,
                            telephone: addresses.billing.telephone,
                            isInvoice: addresses.billing.isInvoice
                        }
                    })
                }

                if (addresses.different_shipping) {
                    if (findUser.shipping_address) {
                        await strapi.entityService.update('api::user-address.user-address', findUser.shipping_address.id, {
                            data: {
                                firstname: addresses.shipping.firstname,
                                lastname: addresses.shipping.lastname,
                                companyName: addresses.shipping.companyName,
                                businessActivity: addresses.shipping.businessActivity,
                                afm: addresses.shipping.afm,
                                doy: addresses.shipping.doy,
                                country: addresses.shipping.country,
                                state: addresses.shipping.state,
                                city: addresses.shipping.city,
                                street: addresses.shipping.street,
                                zipCode: addresses.shipping.zipCode,
                                mobilePhone: addresses.shipping.mobilePhone,
                                telephone: addresses.shipping.telephone,
                                isInvoice: addresses.shipping.isInvoice
                            }
                        })
                    }
                    else {
                        await strapi.entityService.create('api::user-address.user-address', {
                            data: {
                                firstname: addresses.shipping.firstname,
                                lastname: addresses.shipping.lastname,
                                companyName: addresses.shipping.companyName,
                                businessActivity: addresses.shipping.businessActivity,
                                afm: addresses.shipping.afm,
                                doy: addresses.shipping.doy,
                                country: addresses.shipping.country,
                                state: addresses.shipping.state,
                                city: addresses.shipping.city,
                                street: addresses.shipping.street,
                                zipCode: addresses.shipping.zipCode,
                                mobilePhone: addresses.shipping.mobilePhone,
                                telephone: addresses.shipping.telephone,
                                isInvoice: addresses.shipping.isInvoice,
                                user_shipping: findUser.id
                            }
                        })
                    }
                }

                const shipping = {
                    name: shippingMethod.pickup ? "Παραλαβή από το κατάστημα" : shippingMethod.shipping,
                    cost: shippingCost.cost
                }

                const payment = {
                    name: paymentMethod.payment,
                    cost: paymentCost.cost
                }

                newOrder = await strapi.entityService.create('api::order.order', {
                    data: {
                        products: fullProducts,
                        payment: payment,
                        shipping: shipping,
                        total: totalCost,
                        installments: installments || 1,
                        user: findUser.id,
                        status: 'Σε αναμονή',
                        different_shipping: addresses.different_shipping,
                        isInvoice: addresses.billing.isInvoice,
                        billing_address: addresses.billing,
                        shipping_address: addresses.shipping,
                        delivery_notes: addresses.deliveryNotes,
                        publishedAt: new Date()
                    }
                })
            }

            if (paymentMethod.payment === "Κάρτα") {

            }

            // await this.sendConfirmOrderEmail({ addresses, cartItems, totalCost, orderId: newOrder.id })

            return {
                status: "succeed",
                message: "Επιτυχής Καταχώρηση",
                orderId: newOrder.id,
                amount: totalCost,
                installments: newOrder.installments
            }

        } catch (error) {
            console.log(error)
            return { message: "something went wrong" }
        }
    },

    async sendConfirmOrderEmail({ templateReferenceId, to, emailVariables, subject }) {

        await strapi
            .plugin('email-designer')
            .service('email')
            .sendTemplatedEmail(
                {
                    // required
                    to: to,

                    // optional if /config/plugins.js -> email.settings.defaultFrom is set
                    from: 'info@magnetmarket.gr',

                    // optional if /config/plugins.js -> email.settings.defaultReplyTo is set
                    replyTo: 'info@magnetmarket.gr',

                    // optional array of files
                    attachments: []
                    //  products.map(product => {
                    //     return ({
                    //         filename: product.image,
                    //         href: `http://localhost:1337${product.image}`,
                    //         cid: product.id
                    //     })
                    // }),
                },
                {
                    // required - Ref ID defined in the template designer (won't change on import)
                    templateReferenceId: templateReferenceId,

                    // If provided here will override the template's subject.
                    // Can include variables like `Thank you for your order {{= USER.firstName }}!`
                    subject: subject,
                },
                emailVariables
            );
    },

    async saveTicket(ctx) {
        try {
            const { orderId, TransTicket } = ctx.request.body

            await strapi.entityService.update('api::order.order', orderId, {
                data: {
                    TranTicket: {
                        TranTicket: TransTicket
                    }
                }
            })

            return { ResultCode: 0, message: "Ticket Saved" }
        } catch (error) {
            console.log(error)
        }
    }
}));
