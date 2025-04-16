
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

        const productsRows = products.map(product => ({ ...product, productTotal: product.is_sale && product.sale_price > 0 ? product.quantity * product.sale_price : product.quantity * product.price }
        ))

        const productsCost = products.reduce((total, item) => {
            if (item.is_sale && item.sale_price > 0) {
                return total + item.sale_price * item.quantity
            }

            return total + item.price * item.quantity
        }, 0)

        let templateReferenceId = 0

        switch (order.status) {
            case 'Σε αναμονή':
                if (order.isInvoice) {
                    if (order.different_shipping) {
                        templateReferenceId = 33;
                    }
                    else { templateReferenceId = 34; }
                }
                else {
                    if (order.different_shipping) {
                        templateReferenceId = 32;
                    }
                    else { templateReferenceId = 1; }
                }
                break;
            case 'Σε επεξεργασία':
                if (order.isInvoice) {
                    if (order.different_shipping) {
                        templateReferenceId = 15;
                    }
                    else { templateReferenceId = 16; }
                }
                else {
                    if (order.different_shipping) {
                        templateReferenceId = 2;
                    }
                    else { templateReferenceId = 14; }
                }
                break;
            case 'Εκκρεμεί πληρωμή':
                if (order.isInvoice) {
                    if (order.different_shipping) {
                        templateReferenceId = 19;
                    }
                    else { templateReferenceId = 18; }
                }
                else {
                    if (order.different_shipping) {
                        templateReferenceId = 17;
                    }
                    else { templateReferenceId = 3; }
                }
                break;
            case 'Ολοκληρωμένη':
                if (order.isInvoice) {
                    if (order.different_shipping) {
                        templateReferenceId = 21;
                    }
                    else { templateReferenceId = 22; }
                }
                else {
                    if (order.different_shipping) {
                        templateReferenceId = 20;
                    }
                    else { templateReferenceId = 4; }
                }
                break;
            case 'Ακυρωμένη':
                if (order.isInvoice) {
                    if (order.different_shipping) {
                        templateReferenceId = 25;
                    }
                    else { templateReferenceId = 24; }
                }
                else {
                    if (order.different_shipping) {
                        templateReferenceId = 23;
                    }
                    else { templateReferenceId = 5; }
                }
                break;
            case 'Επιστροφή χρημάτων':
                if (order.isInvoice) {
                    if (order.different_shipping) {
                        templateReferenceId = 28;
                    }
                    else { templateReferenceId = 27; }
                }
                else {
                    if (order.different_shipping) {
                        templateReferenceId = 26;
                    }
                    else { templateReferenceId = 6; }
                }
                break;
            case 'Αποτυχημένη':
                if (order.isInvoice) {
                    if (order.different_shipping) {
                        templateReferenceId = 30;
                    }
                    else { templateReferenceId = 31; }
                }
                else {
                    if (order.different_shipping) {
                        templateReferenceId = 29;
                    }
                    else { templateReferenceId = 7; }
                }
                break;
            default:
                if (order.isInvoice) {
                    if (order.different_shipping) {
                        templateReferenceId = 30;
                    }
                    else { templateReferenceId = 31; }
                }
                else {
                    if (order.different_shipping) {
                        templateReferenceId = 29;
                    }
                    else { templateReferenceId = 7; }
                }
                break;
        }

        const installmentsCost = order.total - (productsCost + order.shipping.cost + order.shipping.cost)

        const emailVariables = installmentsCost > 0 ?
            {
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
                    installmentsCost: installmentsCost.toFixed(2),
                    total: order.total.toFixed(2)
                },
            }
            :
            {
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

        try {
            let newOrderTemplate = 8
            if (order.isInvoice) {
                if (order.different_shipping) {
                    templateReferenceId = 13;
                }
                else { templateReferenceId = 12; }
            }
            else {
                if (order.different_shipping) {
                    templateReferenceId = 8;
                }
                else { templateReferenceId = 11; }
            }
            await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId, to: order.user.email, emailVariables, subject: `Magnetmarket - Η παραγγελία σας με κωδικό #${order.id} είναι σε κατάσταση: ${order.status}!` })
            await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId: newOrderTemplate, to: ['giorgos_mitrakos@yahoo.com', "info@magnetmarket.gr", "kkoulogiannis@gmail.com"], emailVariables, subject: `Νέα παραγγελία στο site, Αρ.παρ #${order.id}` })
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
                    if (order.isInvoice) {
                        if (order.different_shipping) {
                            templateReferenceId = 33;
                        }
                        else { templateReferenceId = 34; }
                    }
                    else {
                        if (order.different_shipping) {
                            templateReferenceId = 32;
                        }
                        else { templateReferenceId = 1; }
                    }
                    break;
                case 'Σε επεξεργασία':
                    if (order.isInvoice) {
                        if (order.different_shipping) {
                            templateReferenceId = 15;
                        }
                        else { templateReferenceId = 16; }
                    }
                    else {
                        if (order.different_shipping) {
                            templateReferenceId = 2;
                        }
                        else { templateReferenceId = 14; }
                    }
                    break;
                case 'Εκκρεμεί πληρωμή':
                    if (order.isInvoice) {
                        if (order.different_shipping) {
                            templateReferenceId = 19;
                        }
                        else { templateReferenceId = 18; }
                    }
                    else {
                        if (order.different_shipping) {
                            templateReferenceId = 17;
                        }
                        else { templateReferenceId = 3; }
                    }
                    break;
                case 'Ολοκληρωμένη':
                    if (order.isInvoice) {
                        if (order.different_shipping) {
                            templateReferenceId = 21;
                        }
                        else { templateReferenceId = 22; }
                    }
                    else {
                        if (order.different_shipping) {
                            templateReferenceId = 20;
                        }
                        else { templateReferenceId = 4; }
                    }
                    break;
                case 'Ακυρωμένη':
                    if (order.isInvoice) {
                        if (order.different_shipping) {
                            templateReferenceId = 25;
                        }
                        else { templateReferenceId = 24; }
                    }
                    else {
                        if (order.different_shipping) {
                            templateReferenceId = 23;
                        }
                        else { templateReferenceId = 5; }
                    }
                    break;
                case 'Επιστροφή χρημάτων':
                    if (order.isInvoice) {
                        if (order.different_shipping) {
                            templateReferenceId = 28;
                        }
                        else { templateReferenceId = 27; }
                    }
                    else {
                        if (order.different_shipping) {
                            templateReferenceId = 26;
                        }
                        else { templateReferenceId = 6; }
                    }
                    break;
                case 'Αποτυχημένη':
                    if (order.isInvoice) {
                        if (order.different_shipping) {
                            templateReferenceId = 30;
                        }
                        else { templateReferenceId = 31; }
                    }
                    else {
                        if (order.different_shipping) {
                            templateReferenceId = 29;
                        }
                        else { templateReferenceId = 7; }
                    }
                    break;
                default:
                    if (order.isInvoice) {
                        if (order.different_shipping) {
                            templateReferenceId = 30;
                        }
                        else { templateReferenceId = 31; }
                    }
                    else {
                        if (order.different_shipping) {
                            templateReferenceId = 29;
                        }
                        else { templateReferenceId = 7; }
                    }
                    break;
            }

            const installmentsCost = order.total - (productsCost + order.shipping.cost + order.shipping.cost)

            const emailVariables = installmentsCost > 0 ?
                {
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
                        installmentsCost: installmentsCost.toFixed(2),
                        total: order.total.toFixed(2)
                    },
                }
                :
                {
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

            try {
                await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId, to: order.user.email, emailVariables, subject: `Magnetmarket - Η παραγγελία σας με κωδικό #${order.id} είναι σε κατάσταση: ${event.params.data.status}!` })

            } catch (error) {
                console.log(error)
            }
        }
    },

}