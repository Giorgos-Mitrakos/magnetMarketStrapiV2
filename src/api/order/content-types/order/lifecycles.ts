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
            await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId: 8, to: ['giorgos_mitrakos@yahoo.com'], emailVariables, subject: `Νέα παραγγελία στο site, Αρ.παρ #${order.id}` })
        } catch (error) {
            console.log(error)
        }

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