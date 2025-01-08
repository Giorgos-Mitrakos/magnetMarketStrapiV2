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

    async sendConfirmOrderEmail({ addresses, cartItems, totalCost, orderId }) {

        interface IBilling {
            companyName: string
            businessActivity: string
            afm: string
            doy: string
            lastname: string
            firstname: string
            country: string
            state: string
            street: string
            zipCode: string
            mobilePhone: string
            telephone: string
        }

        interface IShipping {
            lastname: string
            firstname: string
            country: string
            state: string
            street: string
            zipCode: string
            mobilePhone: string
            telephone: string
        }

        interface IOrderProduct {
            id: string,
            name: string
            slug: string
            image: string
            price: number,
            weight: number,
            is_sale: boolean,
            quantity: number,
            sale_price: number,
            isAvailable: boolean
        }

        const order = await strapi.entityService.findOne('api::order.order', orderId, {
            populate: {
                user: true,
                shipping: true,
                payment: true,
                comments: true
            },
        })

        const billing = order.billing_address.valueOf() as IBilling
        const shipping = order.shipping_address.valueOf() as IShipping
        const products = order.products.valueOf() as IOrderProduct[]

        const productsRows = products.map(product => (
            `<tr>
                <td><img style="width:30px; height:30px" src='http://localhost:1337${product.image}'><img></td>
                <td style="text-align: left;">${product.name}</td>
                <td style="text-align: left;">${product.quantity}</td>
                <td style="text-align: left;">${product.price} €</td>
                <td style="text-align: left;">${product.quantity * product.price} €</td>
            </tr>`
        ))

        const productsCost = products.reduce((total, item) => {
            return total + item.price * item.quantity
        }, 0)

        const subTable = `
        <div style="width:100%; margin-top:2rem; display:flex; font-weight:bold; font-size: 1rem; flex-direction:column; align-items:flex-end;">
            <p>Υποσύνολο: ${productsCost} €</p>
            <p>Μεταφορικά: ${order.shipping.cost} €</p>
            <p>Αντικαταβολή: ${order.payment.cost} €</p>
            <p>Σύνολο: ${order.total} €</p>
        </div>
        `

        const orderDetailsTable = `
        <section style="width:100%; margin-top:2rem;  display: grid; grid-template-columns: auto auto auto;">
            <div>
                <h2>ΣΤΟΙΧΕΙΑ ΤΙΜΟΛΟΓΗΣΗΣ</h2>
                ${order.isInvoice ?
                `
                <p>Εταιρία: ${billing.companyName}</p>
                <p>Δραστηριότητα: ${billing.businessActivity}</p>
                <p>Α.Φ.Μ.: ${billing.afm}</p>
                <p>Δ.Ο.Υ.: ${billing.doy}</p>
                `
                :
                `
                <p>Επίθετο: ${billing.lastname}</p>
                <p>Όνομα: ${billing.firstname}</p>                
                `
            }
                <p>Χώρα: ${billing.country}</p>
                <p>Νομός: ${billing.state}</p>
                <p>Οδός: ${billing.street}</p>
                <p>Τ.Κ.: ${billing.zipCode}</p>
                <p>Κινητό: ${billing.mobilePhone}</p>
                <p>Σταθερό: ${billing.telephone}</p>
            </div>
            <div>
                <h2>ΠΑΡΑΔΟΣΗ</h2>
                <p>Επίθετο: ${shipping.lastname}</p>
                <p>Όνομα: ${shipping.firstname}</p>
                <p>Χώρα: ${shipping.country}</p>
                <p>Νομός: ${shipping.state}</p>
                <p>Οδός: ${shipping.street}</p>
                <p>Τ.Κ.: ${shipping.zipCode}</p>
                <p>Κινητό: ${shipping.mobilePhone}</p>
                <p>Σταθερό: ${shipping.telephone}</p>
            </div>
            <div>
                <h2>ΣΧΟΛΙΑ</h2>
                <p>${order.delivery_notes}</p>
            </div>
        </section>`

        const orderProductsTable = `
        <section style="width:100%; margin-top:2rem;">
        <table>
            <colgroup>
                <col span="1" style="width: 10%;">
                <col span="1" style="width: 50%;">
                <col span="1" style="width: 10%;">
                <col span="1" style="width: 10%;">
                <col span="1" style="width: 10%;">
            </colgroup>
            <tr>
                <th style="text-align: left;">Φώτο</th>
                <th style="text-align: left;">Προιόν</th>
                <th style="text-align: left;">Ποσότητα</th>
                <th style="text-align: left;">Τιμή</th>
                <th style="text-align: left;">Σύνολο Προιόντος</th>
            </tr>
           ${productsRows}
        </table>
        </section>
       `

        let htmltext = '';

        switch (order.status) {
            case 'Σε αναμονή':
                htmltext = `Ευχαριστούμε για την παραγγελία!</br>Έχουμε <strong>παραλάβει</strong> την παραγγελία σας με αριθμό <strong>#${orderId}</strong> και αναμένεται να επεξεργαστεί από άνθρωπο μας. </br>Θα ενημερωθείτε <strong>άμεσα</strong> όταν επεξεργαστεί με νέο μήνυμα. Μείνετε συντονισμένοι!`;
                break;
            case 'Εκκρεμεί πληρωμή':
                htmltext = `Έχουμε <strong>παραλάβει</strong> την παραγγελία σας με αριθμό <strong>#${orderId}</strong> και αναμένεται η πληρωμή πρίν επεξεργαστεί από άνθρωπο μας. </br>Θα ενημερωθείτε <strong>άμεσα</strong> όταν επεξεργαστεί με νέο μήνυμα. Μείνετε συντονισμένοι!`;
                break;
            case 'Σε επεξεργασία':
                htmltext = `Έχουμε <strong>παραλάβει</strong> την παραγγελία σας με αριθμό <strong>#${orderId}</strong> και επεξεργάζετε από άνθρωπο μας. </br>Θα ενημερωθείτε <strong>άμεσα</strong> όταν ολοκληρωθεί με νέο μήνυμα. Μείνετε συντονισμένοι!`;
                break;
            case 'Ολοκληρωμένη':
                htmltext = `Η παραγγελία σας με αριθμό <strong>#${orderId}</strong> έχει <strong>ολοκληρωθεί</strong> και  έχει εκδοθεί το κατάλληλο παραστατικό.Ευχαριστούμε για την προτίμησή σας!`;
                break;
            case 'Ακυρωμένη':
                htmltext = `Η παραγγελία σας με αριθμό <strong>#${orderId}</strong> έχει <strong>ακυρωθεί</strong>.`;
                break;
            case 'Επιστροφή χρημάτων':
                htmltext = `Η παραγγελία σας με αριθμό <strong>#${orderId}</strong> έχει <strong>ακυρωθεί</strong>. Και προχωρήσαμε στην επιστροφή χρημάτων`;
                break;
            case 'Αποτυχημένη':
                htmltext = `Η παραγγελία σας με αριθμό <strong>#${orderId}</strong> έχει <strong>αποτύχει</strong> να ολοκληρώσει την πληρωμή.`;
                break;
            default:
                break;
        }

        const emailTemplate = {
            subject: `Η παραγγελία σας με κωδικό #${orderId} είναι σε κατάσταση: ${order.status}!`,
            text: `${htmltext}`,
            html: `${order.status === 'Σε αναμονή' && '<h1>Ευχαριστούμε για την παραγγελία!</h1>'}
              <p>${htmltext}<p>
              ${orderDetailsTable}
              ${orderProductsTable}
              ${subTable}`,
        };

        try {

            await strapi.plugins["email"].services.email.sendTemplatedEmail(
                {
                    from: "info@magnetmarket.gr",
                    to: `${order.user.email}`,
                },
                emailTemplate
            );
        } catch (error) {
            console.log(error)
        }
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
