/**
 * order service
 */

const CryptoJS = require('crypto-js');
import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
export type IProduct = Attribute.GetValues<"api::product.product">;
export type IOrder = Attribute.GetValues<"api::order.order">;

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

type OrderStatusEnum =
    'Επιβεβαιωμένη' |
    'Εκκρεμεί πληρωμή' |
    'Σε επεξεργασία' |
    'Σε αναμονή' |
    'Ολοκληρωμένη' |
    'Ακυρωμένη' |
    'Επιστροφή χρημάτων' |
    'Αποτυχημένη' |
    'Πρόχειρο'


export default factories.createCoreService('api::order.order', ({ strapi }) => ({

    async getOrder(ctx) {
        try {
            const { id } = ctx

            const order = await strapi.entityService.findOne('api::order.order', id, {
                fields: ['products',
                    'total',
                    'status',
                    'billing_address',
                    'different_shipping',
                    'shipping_address',
                    'installments'],
                populate: {
                    payment: true,
                    shipping: true
                }
            })

            const { availability } = await this.findAvailabilityDays(order)

            if (availability === null || availability === undefined) {
                return {
                    order, deliverydays: null
                }
            }

            const deliveryDate = new Date()
            let earlyDeviveryDate = deliveryDate
            let lateDeviveryDate = deliveryDate
            if (order.shipping.name === 'Παραλαβή από το κατάστημα (17:30 - 18:30)') {
                earlyDeviveryDate = this.addDays(deliveryDate, availability)
                lateDeviveryDate = this.addDays(deliveryDate, availability + 1)
            }
            else {
                earlyDeviveryDate = this.addDays(deliveryDate, availability + 1)
                lateDeviveryDate = this.addDays(deliveryDate, availability + 3)
            }

            return {
                order, deliverydays: {
                    early: earlyDeviveryDate,
                    late: lateDeviveryDate
                }
            }


        } catch (error) {
            throw new Error(error.message);
        }
    },

    async findAvailabilityDays(order) {
        try {
            const products = typeof order.products === 'string'
                ? JSON.parse(order.products)
                : order.products

            const productIds = products.map(product => product.id)

            const orderProducts = await strapi.entityService.findMany('api::product.product', {
                fields: ['inventory'],
                populate: { supplierInfo: { fields: ['name', 'wholesale', 'recycle_tax', 'in_stock'] } },
                filters: {
                    id: { $in: productIds }
                }
            })

            if (orderProducts.every(x => x.inventory > 0)) {
                return { availability: 0 }
            }
            else {
                const suppliers = await strapi.db.query('plugin::import-products.importxml').findMany({
                    select: ['name', 'availability', 'order_time', 'shipping'],
                });

                const availabilities: any[] = orderProducts.map(product => {
                    const { cheaperAvailableSupplier } = strapi
                        .plugin('export-platforms-xml')
                        .service('xmlService')
                        .findCheaperSupplier(product, suppliers)

                    return cheaperAvailableSupplier?.availability
                })

                if (availabilities.find(x => x === undefined)) {
                    return { availability: null }
                }
                const maxVal = availabilities.reduce((max, current) => (current > max ? current : max), 0);

                return { availability: maxVal }
            }


        } catch (error) {
            console.log("error in findAvailability", error)
        }
    },

    // Function to Add days to current date
    addDays(date: Date, days: number) {
        const newDate = new Date(date);
        newDate.setDate(date.getDate() + days);
        return newDate;
    },

    async createNewOrder(ctx) {
        try {
            const { checkout } = ctx.request.body
            const user = ctx.state.user;

            // 1. Ελέγχω αν όλες οι απαρα'ιτητες πληροφορίες είναι διαθέσιμες
            if (!checkout.addresses || !checkout.shippingMethod || !checkout.paymentMethod || checkout.cart.length <= 0)
                return { message: "Missing required data", status: "fail" }

            // 2. Έλεγχος coupon (πριν από οτιδήποτε άλλο)
            let discount = 0;
            let shipping = 0;

            if (checkout.appliedCoupon) {
                try {
                    const discountParams = {
                        code: checkout.appliedCoupon?.code,
                        userEmail: checkout.addresses.billing.email,
                        cart: checkout.cart,
                        cartTotal: checkout.totals.subtotal
                    }
                    const response = await this.getDiscount(discountParams)

                    if (response.discountType === "free_shipping") {
                        shipping = 0
                    }
                    else {
                        discount = response.discount
                    }

                } catch (error) {
                    return {
                        status: "fail",
                        message: error.message || "Invalid coupon code",
                        // You might want to include additional error details
                        errorDetails: error.response?.data || null
                    };
                }
            }

            // 3. Ελέγχω στη βάση αν όλα τα προϊόντα είναι διαθέσιμα
            const productIds = checkout.cart.map(x => Number(x.id))
            type ProductStatus = "InStock" | "MediumStock" | "LowStock" | "Backorder" | "IsExpected" | "AskForPrice" | "OutOfStock" | "Discontinued";

            const availableStatus: ProductStatus[] = [
                "InStock",
                "MediumStock",
                "LowStock",
                "Backorder",
                "IsExpected"
            ];

            const products: IProduct[] = await strapi.entityService.findMany('api::product.product', {
                fields: ['id', 'name', 'price', 'sale_price', 'is_sale'],
                filters: { id: { $in: productIds }, status: { $in: availableStatus } },
            })

            const availableProductIds = products.map(p => p.id);
            const missingProducts = productIds.filter(id => !availableProductIds.includes(id));

            if (missingProducts.length > 0) {
                return {
                    message: `Τα προϊόντα με τους ακόλουθους κωδικούς δεν είναι διαθέσιμα: ${missingProducts.join(', ')}`,
                    status: "fail"
                };
            }

            // 4. Υπολογισμοί
            const fullProducts = checkout.cart.map(item => {
                const product = products.find(p => p.id === Number(item.id))
                return {
                    ...item,
                    is_sale: product.is_sale || false,
                    sale_price: product.sale_price || null,
                    price: product.price
                }
            })

            const cartTotal = fullProducts.reduce((sum, item) => {
                let itemPrice = item.is_sale && item.sale_price ? item.sale_price : item.price
                return sum + itemPrice * item.quantity
            }, 0)

            // 5. Έλεγχος payment method
            const paymentMethodDb = await strapi.entityService.findOne('api::payment.payment', checkout.paymentMethod.id, {
                fields: ['price', 'method'],
            })

            if (!paymentMethodDb) {
                return { message: "Invalid payment method", status: "fail" };
            }

            // 6. Υπολογισμός shipping
            try {
                const shippingCost = await strapi.service('api::shipping.shipping').findShippingCost(checkout)
                shipping = shippingCost.cost;

            } catch (error) {
                return {
                    status: "fail",
                    message: error.message || "Πρόβλημα στον υπολογισμό των μεταφορικών",
                    // You might want to include additional error details
                    errorDetails: error.response?.data || null
                };
            }

            // 7. Final calculations
            const finalTotal = Math.max(0, cartTotal + shipping + paymentMethodDb.price - discount);


            // 8. Δημιουργία χρήστη/διευθύνσεων (μόνο αν όλα είναι OK)
            const currentUser = await this.getOrCreateUser(user, checkout.addresses.billing.email);
            await this.upsertAddresses(currentUser.id, checkout.addresses);

            // 9. Δημιουργία παραγγελίας
            const newOrder = await this.createOrderEntity(
                fullProducts,
                checkout,
                paymentMethodDb,
                shipping,
                discount,
                finalTotal,
                currentUser.id
            );

            // 10. Εφαρμογή coupon (μόνο αν όλα πήγαν καλά)
            if (checkout.appliedCoupon) {
                await strapi.service('api::coupon.coupon').redeemCoupon({
                    code: checkout.appliedCoupon.code,
                    userEmail: checkout.addresses.billing.email,
                    cartItems: checkout.cart,
                    cartTotal: cartTotal,
                    orderId: newOrder.id
                });
            }

            return {
                status: "succeed",
                message: "Επιτυχής Καταχώρηση",
                orderId: newOrder.id,
                amount: finalTotal,
                installments: newOrder.installments,
            };

        } catch (error) {
            console.log(error)
            return {
                status: "fail",
                message: error.message // This will contain the specific validation error
            };
        }
    },

    // Βοηθητικές συναρτήσεις
    async getOrCreateUser(user, email) {
        if (user) return user;

        const existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { email },
            populate: ['billing_address', 'shipping_address'],
        });

        if (existingUser) return existingUser;

        return await strapi.entityService.create('plugin::users-permissions.user', {
            data: {
                email,
                username: email,
            }
        });
    },

    async upsertAddresses(userId, addresses) {
        const upsert = async (address, type) => {
            const filter = { [`user_${type}`]: userId };
            const existing = await strapi.db.query("api::user-address.user-address").findOne({ where: filter });
            const data = { ...address, [`user_${type}`]: userId };

            if (existing) {
                await strapi.entityService.update("api::user-address.user-address", existing.id, { data });
            } else {
                await strapi.entityService.create("api::user-address.user-address", { data });
            }
        };

        await upsert(addresses.billing, 'billing');
        if (addresses.different_shipping) {
            await upsert(addresses.shipping, 'shipping');
        }
    },

    async createOrderEntity(products, checkout, paymentMethod, shippingCost, discount, total, userId) {
        const shippingDetails = {
            name: checkout.shippingMethod.shipping,
            cost: shippingCost,
        };

        const payment = {
            name: checkout.paymentMethod.attributes.name,
            cost: paymentMethod.price,
        };

        let status: OrderStatusEnum = paymentMethod.method === 'cash' || paymentMethod.method === 'cash_on_delivery'
            ? 'Επιβεβαιωμένη'
            : 'Εκκρεμεί πληρωμή';

        return await strapi.entityService.create('api::order.order', {
            data: {
                products,
                payment,
                shipping: shippingDetails,
                total,
                discount,
                installments: checkout.installments || 1,
                user: userId,
                status,
                different_shipping: checkout.addresses.different_shipping,
                isInvoice: checkout.addresses.billing.isInvoice,
                billing_address: checkout.addresses.billing,
                shipping_address: checkout.addresses.shipping,
                delivery_notes: checkout.addresses.deliveryNotes,
                publishedAt: new Date(),
            }
        });
    },

    async getDiscount(checkout) {
        try {
            const { code, userEmail, cart, cartTotal } = checkout

            if (!code || !userEmail || !cart || cartTotal === undefined) {
                throw new Error("Missing required checkout information");
            }

            const user = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { email: userEmail },
            })

            const verifiedCoupon = await strapi.service('api::coupon.coupon').validateCoupon(code, { user: user, cartItems: cart, cartTotal })

            if (!verifiedCoupon.valid) {
                throw new Error(verifiedCoupon.message || "Το κουπόνι δεν είναι έγκυρο");
            }

            const { coupon } = verifiedCoupon;
            const { discountType, discountValue, restrictions } = coupon;

            // Check if cart has discounted products (based on your product schema)
            const hasDiscountedItems = cart.some(item => item.is_sale && item.sale_price != null);

            // Apply coupon restrictions for discounted products
            if (restrictions?.discountedProductsPolicy) {
                switch (restrictions.discountedProductsPolicy) {
                    case "exclude_discounted":
                        if (hasDiscountedItems) {
                            throw new Error("Το κουπόνι δεν ισχύει για καλάθια με εκπτωτικά προϊόντα");
                        }
                        break;

                    case "apply_only_to_non_discounted":
                        if (!hasDiscountedItems) {
                            // Proceed normally (coupon applies to entire cart)
                        } else {
                            // Calculate discount ONLY for non-discounted items
                            const nonDiscountedTotal = cart.reduce((total, item) => {
                                return !item.is_sale ? total + item.price * item.quantity : total;
                            }, 0);

                            // Recalculate discount based on non-discounted total
                            switch (discountType) {
                                case "percentage":
                                    return {
                                        discountType,
                                        discount: nonDiscountedTotal * discountValue / 100
                                    };
                                case "fixed_amount":
                                    return {
                                        discountType,
                                        discount: Math.min(discountValue, nonDiscountedTotal)
                                    };
                                case "free_shipping":
                                    return { discountType, discount: 0 }; // Handle shipping separately
                            }
                        }
                        break;

                    case "allow_with_discounts":
                    default:
                        // No restrictions, proceed normally
                        break;
                }
            }

            // Default discount calculation (applies to full cartTotal)
            let discount = 0;
            switch (discountType) {
                case "percentage":
                    discount = cartTotal * discountValue / 100;
                    break;
                case "fixed_amount":
                    discount = Math.min(discountValue, cartTotal); // Prevent negative totals
                    break;
                case "free_shipping":
                    discount = 0; // Handle shipping logic elsewhere
                    break;
            }

            return { discountType: verifiedCoupon.coupon.discountType, discount }

        } catch (error) {
            // console.error("Discount calculation error:", error);
            // Re-throw the error with its original message
            throw new Error(error.message);
        }
    },

    async sendConfirmOrderEmail({ templateReferenceId, to, emailVariables, subject }) {
        try {

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

        } catch (error) {
            console.log(error)
        }
    },

    async saveTicket(ctx) {
        try {
            const { orderId, TransTicket } = ctx.request.body

            await strapi.entityService.update('api::order.order', orderId, {
                data: {
                    Bank_info: {
                        TranTicket: TransTicket
                    }
                }
            })

            return { ResultCode: 0, message: "Ticket Saved" }
        } catch (error) {
            console.log(error)
        }
    },

    async saveBankResponse(ctx) {
        try {
            const { bankResponse } = ctx.request.body

            const ticket: IOrder = await strapi.entityService.findOne('api::order.order', bankResponse.MerchantReference, {
                fields: ['id, status'],
                populate: ['Bank_info']
            })

            let status = ticket.status

            if (bankResponse.ResultCode && bankResponse.ResultCode.trim() === '0') {
                if (bankResponse.StatusFlag === "Success") {
                    status = "Επιβεβαιωμένη"
                }
                else {
                    status = "Αποτυχημένη"
                }
            }
            else {
                status = "Αποτυχημένη"
            }

            await strapi.entityService.update('api::order.order', bankResponse.MerchantReference, {
                data: {
                    status: status,
                    Bank_info: {
                        TranTicket: ticket.Bank_info.TranTicket,
                        SupportReferenceID: bankResponse.SupportReferenceID,
                        ResponseDescription: bankResponse.ResponseDescription,
                        StatusFlag: bankResponse.StatusFlag,
                        TransactionId: bankResponse.TransactionId,
                        TraceID: bankResponse.TraceID,
                        ResponseCode: bankResponse.ResponseCode,
                        MerchantReference: bankResponse.MerchantReference,
                        ApprovalCode: bankResponse.ApprovalCode,
                        PackageNo: bankResponse.PackageNo,
                        PaymentMethod: bankResponse.PaymentMethod
                    }
                }
            })

            return { message: "Saved" }
        } catch (error) {
            console.log(error)
        }
    },

    async getTicket(ctx) {
        try {
            const { orderId } = ctx.request.body

            const ticket: IOrder = await strapi.entityService.findOne('api::order.order', orderId, {
                fields: ['id'],
                populate: ['Bank_info']
            })

            const transTicket = ticket?.Bank_info.TranTicket

            if (!transTicket)
                return { Flag: 'fail', ticket: null }


            return { Flag: 'success', ticket: transTicket }
        } catch (error) {
            console.log(error)
        }
    },

    async sendEmail(ctx) {
        const { to, subject, text } = ctx.request.body

        await strapi.plugins['email'].services.email.send({
            to: to,
            from: `info@magnetmarket.gr`,
            subject: subject,
            text: text
        });

    },

    async sendStatusEmail(order) {
        try {

            const billing = order.billing_address.valueOf() as IBilling
            const shipping = order.shipping_address.valueOf() as IShipping
            const products = order.products.valueOf() as IOrderProduct[]

            const productsRows = products.map(product => ({ ...product, price: product.is_sale && product.sale_price > 0 ? product.sale_price : product.price, productTotal: product.is_sale && product.sale_price > 0 ? product.quantity * product.sale_price : product.quantity * product.price }
            ))

            const productsCost = products.reduce((total, item) => {
                if (item.is_sale && item.sale_price > 0) {
                    return total + item.sale_price * item.quantity
                }

                return total + item.price * item.quantity
            }, 0)

            const installmentsCost = order.total - (productsCost + order.shipping.cost + order.payment.cost)

            const emailVariables = {
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
                    user: order.user.email,
                    products: productsRows,
                    isInvoice: order.isInvoice,
                    different_shipping: order.different_shipping,
                    [`status_${order.status.replace(/ /g, '_')}`]: true,
                    showBankAccounts: order.payment.name === "Τραπεζική κατάθεση" ? true : false,
                    productsCost: productsCost.toFixed(2),
                    shippingName: order.shipping.name,
                    discount: order.discount,
                    shippingCost: order.shipping.cost > 0 ? order.shipping.cost.toFixed(2) : null,
                    paymentName: order.payment.name,
                    paymentCost: order.payment.cost ? order.payment.cost.toFixed(2) : null,
                    installmentsCost: installmentsCost > 0 ? installmentsCost.toFixed(2) : null,
                    total: order.total.toFixed(2)
                },
            }

            if (order.status !== "Πρόχειρο")
                await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId: 1, to: order.user.email, emailVariables, subject: `Magnetmarket - Η παραγγελία σας με κωδικό #${order.id} είναι σε κατάσταση: ${order.status}!` })

            return emailVariables

        } catch (error) {
            console.log(error)
        }
    },

    async sendVoucherEmail({ order, voucher }) {
        const courier = await strapi.db.query('api::shipping.shipping').findOne({
            select: ['name', 'tracking_url'],
            where: { name: order.shipping.name },
        })

        const emailVariables = {
            customer: {
                firstName: order.different_shipping ? order.shipping_address.firstname : order.billing_address.firstname,
                lastName: order.different_shipping ? order.shipping_address.lastname : order.billing_address.lastname,
                phone: order.different_shipping ? order.shipping_address.mobilePhone : order.billing_address.mobilePhone,
            },
            order: {
                id: order.id,
                shipping_code: voucher,
                courier: courier.name,
                tracking_url: courier.tracking_url,
                shipping: {
                    address: order.different_shipping ? order.shipping_address.street : order.billing_address.street,
                    city: order.different_shipping ? order.shipping_address.city : order.billing_address.city,
                    state: order.different_shipping ? order.shipping_address.state : order.billing_address.state,
                    postcode: order.different_shipping ? order.shipping_address.zipCode : order.billing_address.zipCode,
                    delivery_notes: order.delivery_notes !== "" ? order.delivery_notes : false
                }
            },
        }

        await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId: 2, to: order.user.email, emailVariables, subject: `Magnetmarket - Η παραγγελία σας με κωδικό #${order.id} έχει αποσταλεί!` })

    },

    /**
    * Generate unsubscribe token with expiration
    * @param {string} email - User email
    * @param {number} expiresInHours - Expiration time in hours
    * @returns {string} - Token
    */

    generateUnsubscribeToken(email, expiresInHours = 720) { // 30 days default
        try {
            const secret = process.env.UNSUBSCRIBE_SECRET;

            if (!secret) {
                throw new Error('UNSUBSCRIBE_SECRET environment variable is not defined');
            }

            const payload = {
                email: email,
                action: 'unsubscribe',
                expires: Date.now() + (expiresInHours * 60 * 60 * 1000)
            };

            const payloadString = JSON.stringify(payload);
            const signature = CryptoJS.HmacSHA256(payloadString, secret).toString();

            // Base64 encode the combined signature and payload
            const tokenData = `${signature}:${payloadString}`;
            const encodedToken = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(tokenData));

            return encodedToken;


        } catch (error) {
            console.error('Error generating unsubscribe token:', error);
            throw error;
        }
    },

    /**
     * Verify unsubscribe token
     * @param {string} email - User email
     * @param {string} token - Token to verify
     * @returns {boolean} - True if valid
     */
    verifyUnsubscribeToken(email, token) {
        try {
            console.log(email, token)
            const secret = process.env.UNSUBSCRIBE_SECRET;

            if (!secret) {
                console.error('UNSUBSCRIBE_SECRET environment variable is not defined');
                return false;
            }

            // 1. Base64 decode the token
            const decodedBytes = CryptoJS.enc.Base64.parse(token);
            const decodedString = decodedBytes.toString(CryptoJS.enc.Utf8);

            if (!decodedString.includes(':')) {
                console.error('Invalid token format: missing delimiter');
                return false;
            }

            // 2. Split signature and payload
            const delimiterIndex = decodedString.indexOf(':');
            const receivedSignature = decodedString.substring(0, delimiterIndex);
            const payloadString = decodedString.substring(delimiterIndex + 1);

            if (!receivedSignature || !payloadString) {
                console.error('Invalid token format: missing signature or payload');
                return false;
            }

            // 3. Parse JSON payload
            let payload;
            try {
                payload = JSON.parse(payloadString);
            } catch (parseError) {
                console.error('Failed to parse token payload:', parseError, 'Payload:', payloadString);
                return false;
            }

            // 4. Check expiration
            if (Date.now() > payload.expires) {
                console.log('Token expired');
                return false;
            }

            // 5. Check email match
            if (payload.email !== email) {
                console.log('Email mismatch');
                return false;
            }

            // 6. Check action
            if (payload.action !== 'unsubscribe') {
                console.log('Invalid action');
                return false;
            }

            // 7. Verify signature
            const expectedSignature = CryptoJS.HmacSHA256(payloadString, secret).toString();

            // Constant-time comparison
            const receivedHash = CryptoJS.SHA256(receivedSignature).toString();
            const expectedHash = CryptoJS.SHA256(expectedSignature).toString();

            return receivedHash === expectedHash;

        } catch (error) {
            console.log(error)
        }
    },
}));
