/**
 * shipping service
 */

import { factories } from '@strapi/strapi';
import type { Attribute } from "@strapi/strapi";
export type IShipping = Attribute.GetValues<"api::shipping.shipping">;
export type IProduct = Attribute.GetValues<"api::product.product">;

export default factories.createCoreService('api::shipping.shipping', ({ strapi }) => ({
    async findShippingCost(ctx) {

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

            const shipper: IShipping = await strapi.db.query('api::shipping.shipping').findOne({
                select: ['id', 'name'],
                where: { name: shippingMethod.shipping },
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

            if (shippings && shippingIds.includes(Number(shippingMethod.id))) {

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

            // function parseNestedJSON(json) {
            //     const data = JSON.parse(json);

            //     // Recursively parse any nested objects 
            //     for (const key in data) {
            //         if (typeof data[key] === 'string' && data[key].startsWith('{')) {
            //             data[key] = parseNestedJSON(data[key]);
            //         }
            //     }

            //     return data;
            // }

            // console.log("Type:", typeof ctx.request.body)
            // console.log("request:", ctx.request.body)
            // const requestBody = parseNestedJSON(ctx.request.body)
            const { addresses, cartItems, shippingMethod } = ctx.request.body
            const totalWeight = cartItems.reduce((accumulator, item) => {
                return accumulator += item.quantity * item.weight;
            }, 0)

            if (shippingMethod && shippingMethod.pickup)
                return { cost: 0 }

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
            console.log(error)
        }
    },

    async findPaymentCost(ctx) {

        const { paymentMethod, shippingMethod } = ctx.request.body

        if (shippingMethod.pickup === true) {
            return { cost: 0 }
        }

        const payment = await strapi.db.query("api::payment.payment").findOne({
            select: ['name', 'price'],
            where: { name: paymentMethod.payment }
        })
        return { cost: payment.price }
        // return { cost: 15 }
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
