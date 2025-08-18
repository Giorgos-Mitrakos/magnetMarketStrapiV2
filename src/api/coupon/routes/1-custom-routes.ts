export default {
    routes: [
        {
            method: 'POST',
            path: '/coupons/validate',
            handler: 'coupon.validate',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'POST',
            path: '/coupons/apply',
            handler: 'coupon.apply',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        // {
        //     method: 'POST',
        //     path: '/coupons/redeem',
        //     handler: 'coupon.redeem',
        //     config: {
        //         policies: [],
        //         middlewares: [],
        //     },
        // },
        {
            method: 'POST',
            path: '/coupons/generate',
            handler: 'coupon.generateFromTemplate',
            config: {
                policies: [],
                middlewares: [],
            },
        }
    ]
}