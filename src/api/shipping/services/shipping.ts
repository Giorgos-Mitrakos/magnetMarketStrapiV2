/**
 * shipping service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
export type IShipping = Attribute.GetValues<"api::shipping.shipping">;
export type IProduct = Attribute.GetValues<"api::product.product">;

export default factories.createCoreService('api::shipping.shipping', ({ strapi }) => ({
    async findShippingCost(checkout) {

        const calcShipping = ({ basic_fee, basic_weight, fee_above_weight, totalWeight }) => {

            const roundDifference = Math.round(totalWeight - basic_weight)
            if (roundDifference < 0) {
                return basic_fee
            }
            else {
                const shipCost = basic_fee + Math.round(roundDifference * fee_above_weight / 100) / 10
                return shipCost
            }
        }

        const findShippingFees = async ({ country, state, city, shippingMethod, totalWeight }) => {
            const shipper: IShipping = await strapi.db.query('api::shipping.shipping').findOne({
                select: ['id', 'name', 'isFreeShipping'],
                where: { id: shippingMethod.id },
                populate: {
                    disprosites_fees: true,
                    Zones: {
                        populate: {
                            states: true,
                            fees: true
                        }
                    }
                },
            })

            const countryShip = await strapi.db.query('api::country.country').findOne({
                select: ['name', 'id'],
                populate: {
                    states: {
                        select: ['name', 'id'],
                        populate: {
                            regions: {
                                where: { name: city },
                                populate: { shippings: true }
                            }
                        },
                        where: { name: state },
                    }
                },
                where: { name: country },
            });


            const shippings = countryShip.states[0].regions[0].shippings
            const shippingIds = shippings.map(x => x.id)

            if (shippings && shippingIds.includes(Number(shippingMethod.shipping))) {

                return calcShipping({ basic_fee: shipper.disprosites_fees.basic_fee, basic_weight: shipper.disprosites_fees.basic_weight, fee_above_weight: shipper.disprosites_fees.fee_above_weight, totalWeight })
            }
            else {
                const islands = shipper.Zones.find(x => x.name === 'Νησιωτικοί Προορισμοί')

                const mapIslandsStates = islands.states.map(x => x.name)
                if (mapIslandsStates.includes(state)) {
                    return calcShipping({ basic_fee: islands.fees.basic_fee, basic_weight: islands.fees.basic_weight, fee_above_weight: islands.fees.fee_above_weight, totalWeight })
                }
                else {
                    const lands = shipper.Zones.find(x => x.name === 'Χερσαίοι Προορισμοί')
                    return calcShipping({ basic_fee: lands.fees.basic_fee, basic_weight: lands.fees.basic_weight, fee_above_weight: lands.fees.fee_above_weight, totalWeight })
                }
            }
        }

        try {
            const { addresses, cart, shippingMethod } = checkout

            const shipper: IShipping = await strapi.db.query('api::shipping.shipping').findOne({
                select: ['id', 'isFreeShipping'],
                where: { id: shippingMethod.id },
            })

            if (!shipper || shipper.isFreeShipping)
                return { cost: 0 }

            const totalWeight = cart.reduce((accumulator, item) => {
                return accumulator += item.quantity * item.weight;
            }, 0)

            if (addresses && shippingMethod.shipping && shippingMethod.shipping !== "") {
                if (addresses.different_shipping) {
                    const { country, state, city } = addresses.shipping
                    const shippingCost = await findShippingFees({ country, state, city, shippingMethod, totalWeight })
                    return { cost: shippingCost }
                }
                else {
                    const { country, state, city } = addresses.billing
                    const shippingCost = await findShippingFees({ country, state, city, shippingMethod, totalWeight })

                    return { cost: shippingCost }
                }
            }
            return { cost: null }
        } catch (error) {
            throw new Error(error.message);
        }
    },

    async findPaymentCost(ctx) {

        const { paymentMethod } = ctx.request.body

        const payment = await strapi.db.query("api::payment.payment").findOne({
            select: ['name', 'price'],
            where: { id: paymentMethod.id }
        })
        return { cost: payment.price }
    },

    async findPaymentMethod(ctx) {

        const { paymentMethod } = ctx.request.body

        const payment = await strapi.db.query("api::payment.payment").findOne({
            where: { id: paymentMethod.id },
            populate: {
                installments: true,
                range: true
            }
        })
        return payment
    },

    async findCartTotal(ctx) {

        const { cartItems } = ctx.request.body

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

        const productsCost = fullProducts.reduce((total, item) => {
            if (item.is_sale && item.sale_price) {
                return total + item.sale_price * item.quantity
            }
            else {
                return total + item.price * item.quantity
            }
        }, 0)
        return { cartTotal: productsCost }
    }
}));
