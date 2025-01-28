import product from "../../../product/controllers/product"

interface IBilling {
    companyName: string
    businessActivity: string
    afm: string
    doy: string
    lastname: string
    firstname: string
    country: string
    city: string
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
    city: string
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

export default {
    async afterCreate(event) {
        const { result } = event

        const order = await strapi.entityService.findOne('api::order.order', result.id, {
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

        const productsRows = products.map(product => ({ ...product, productTotal: product.quantity * product.price }
        ))

        const productsCost = products.reduce((total, item) => {
            return total + item.price * item.quantity
        }, 0)

        //     const subTable = `
        //     <div style="width:100%; margin-top:2rem; display:flex; font-weight:bold; font-size: 1rem; flex-direction:column; align-items:flex-end;">
        //         <p>Υποσύνολο: ${productsCost} €</p>
        //         <p>${order.shipping.name}: ${order.shipping.cost} €</p>
        //         <p>${order.payment.name}: ${order.payment.cost} €</p>
        //         <p>Σύνολο: ${order.total} €</p>
        //     </div>
        //     `

        //     const orderDetailsTable = `
        //     <section style="width:100%; margin-top:2rem;  display: grid; grid-template-columns: auto auto auto;">
        //         <div>
        //             <h2>ΣΤΟΙΧΕΙΑ ΤΙΜΟΛΟΓΗΣΗΣ</h2>
        //             ${order.isInvoice ?
        //             `
        //             <p>Εταιρία: ${billing.companyName}</p>
        //             <p>Δραστηριότητα: ${billing.businessActivity}</p>
        //             <p>Α.Φ.Μ.: ${billing.afm}</p>
        //             <p>Δ.Ο.Υ.: ${billing.doy}</p>
        //             `
        //             :
        //             `
        //             <p>Επίθετο: ${billing.lastname}</p>
        //             <p>Όνομα: ${billing.firstname}</p>                
        //             `
        //         }
        //             <p>Χώρα: ${billing.country}</p>
        //             <p>Νομός: ${billing.state}</p>
        //             <p>Οδός: ${billing.street}</p>
        //             <p>Τ.Κ.: ${billing.zipCode}</p>
        //             <p>Κινητό: ${billing.mobilePhone}</p>
        //             <p>Σταθερό: ${billing.telephone}</p>
        //         </div>
        //         <div>
        //             <h2>ΠΑΡΑΔΟΣΗ</h2>
        //             <p>Επίθετο: ${shipping.lastname}</p>
        //             <p>Όνομα: ${shipping.firstname}</p>
        //             <p>Χώρα: ${shipping.country}</p>
        //             <p>Νομός: ${shipping.state}</p>
        //             <p>Οδός: ${shipping.street}</p>
        //             <p>Τ.Κ.: ${shipping.zipCode}</p>
        //             <p>Κινητό: ${shipping.mobilePhone}</p>
        //             <p>Σταθερό: ${shipping.telephone}</p>
        //         </div>
        //         <div>
        //             <h2>ΣΧΟΛΙΑ</h2>
        //             <p>${order.delivery_notes}</p>
        //         </div>
        //     </section>`

        //     const orderProductsTable = `
        //     <section style="width:100%; margin-top:2rem;">
        //     <table>
        //         <colgroup>
        //             <col span="1" style="width: 10%;">
        //             <col span="1" style="width: 10%;">
        //             <col span="1" style="width: 50%;">
        //             <col span="1" style="width: 10%;">
        //             <col span="1" style="width: 10%;">
        //             <col span="1" style="width: 10%;">
        //         </colgroup>
        //         <tr>
        //             <th style="text-align: left;">Φώτο</th>
        //             <th style="text-align: left;">Κωδικός</th>
        //             <th style="text-align: left;">Προιόν</th>
        //             <th style="text-align: left;">Ποσότητα</th>
        //             <th style="text-align: left;">Τιμή</th>
        //             <th style="text-align: left;">Σύνολο Προιόντος</th>
        //         </tr>
        //        ${productsRows}
        //     </table>
        //     </section>
        //    `

        let templateReferenceId = 0

        switch (order.status) {
            case 'Σε αναμονή':
                templateReferenceId = 1;
                break;
            case 'Εκκρεμεί πληρωμή':
                templateReferenceId = 3;
                break;
            case 'Σε επεξεργασία':
                templateReferenceId = 2;
                break;
            case 'Ολοκληρωμένη':
                templateReferenceId = 4;
                break;
            case 'Ακυρωμένη':
                templateReferenceId = 5;
                break;
            case 'Επιστροφή χρημάτων':
                templateReferenceId = 6;
                break;
            case 'Αποτυχημένη':
                templateReferenceId = 7;
                break;
            default:
                templateReferenceId = 7;
                break;
        }

        const emailVariables = {
            billing: {
                firstname: `${billing.firstname}`,
                lastname: `${billing.lastname}`,
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

        try {
            await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId, to: order.user.email, emailVariables, subject: `Magnetmarket - Η παραγγελία σας με κωδικό #${order.id} είναι σε κατάσταση: ${order.status}!` })
            await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId: 8, to: ['info@magnetmarket.gr', 'giorgos_mitrakos@yahoo.com', 'kkoulogiannis@gmail.com'], emailVariables, subject: `Νέα παραγγελία στο site, Αρ.παρ #${order.id}` })
        } catch (error) {
            console.log(error)
        }

        // try {
        //     await strapi
        //         .plugin('email-designer')
        //         .service('email')
        //         .sendTemplatedEmail(
        //             {
        //                 // required
        //                 to: order.user.email,

        //                 // optional if /config/plugins.js -> email.settings.defaultFrom is set
        //                 from: 'info@magnetmarket.gr',

        //                 // optional if /config/plugins.js -> email.settings.defaultReplyTo is set
        //                 replyTo: 'info@magnetmarket.gr',

        //                 // optional array of files
        //                 attachments: []
        //                 //  products.map(product => {
        //                 //     return ({
        //                 //         filename: product.image,
        //                 //         href: `http://localhost:1337${product.image}`,
        //                 //         cid: product.id
        //                 //     })
        //                 // }),
        //             },
        //             {
        //                 // required - Ref ID defined in the template designer (won't change on import)
        //                 templateReferenceId: templateReferenceId,

        //                 // If provided here will override the template's subject.
        //                 // Can include variables like `Thank you for your order {{= USER.firstName }}!`
        //                 subject: `Magnetmarket - Η παραγγελία σας με κωδικό #${order.id} είναι σε κατάσταση: ${order.status}!`,
        //             },
        //             {
        //                 // this object must include all variables you're using in your email template
        //                 emailVariables
        //             }
        //         );
        //     // await strapi.plugins["email"].services.email.sendTemplatedEmail(
        //     //     {
        //     //         from: "info@magnetmarket.gr",
        //     //         to: `info@magnetmarket.gr;giorgos_mitrakos@yahoo.com;kkoulogiannis@gmail.com;`,
        //     //     },
        //     //     emailOrderNotificationTemplate
        //     // );
        // } catch (error) {
        //     console.log(error)
        // }

    },

    async beforeUpdate(event) {
        const order = await strapi.entityService.findOne('api::order.order', event.params.where.id, {
            populate: {
                user: true,
                shipping: true,
                payment: true,
                comments: true
            },
        })

        if (event.params.data.status && order.status !== event.params.data.status) {

            const billing = order.billing_address.valueOf() as IBilling
            const shipping = order.shipping_address.valueOf() as IShipping
            const products = order.products.valueOf() as IOrderProduct[]

            const productsRows = products.map(product => ({ ...product, productTotal: product.quantity * product.price }
            ))

            const productsCost = products.reduce((total, item) => {
                return total + item.price * item.quantity
            }, 0)

            let templateReferenceId = 0

            switch (event.params.data.status) {
                case 'Σε αναμονή':
                    templateReferenceId = 1;
                    break;
                case 'Εκκρεμεί πληρωμή':
                    templateReferenceId = 3;
                    break;
                case 'Σε επεξεργασία':
                    templateReferenceId = 2;
                    break;
                case 'Ολοκληρωμένη':
                    templateReferenceId = 4;
                    break;
                case 'Ακυρωμένη':
                    templateReferenceId = 5;
                    break;
                case 'Επιστροφή χρημάτων':
                    templateReferenceId = 6;
                    break;
                case 'Αποτυχημένη':
                    templateReferenceId = 7;
                    break;
                default:
                    templateReferenceId = 7;
                    break;
            }

            const emailVariables = {
                billing: {
                    firstname: `${billing.firstname}`,
                    lastname: `${billing.lastname}`,
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

            try {
                await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId, to: order.user.email, emailVariables, subject: `Magnetmarket - Η παραγγελία σας με κωδικό #${order.id} είναι σε κατάσταση: ${event.params.data.status}!` })

            } catch (error) {
                console.log(error)
            }
        }
    },

}