export default {
    routes: [
        {
            method: "POST",
            path: "/order/createOrder",
            handler: "order.createOrder",
            config: {
                auth: false,
                middlewares: ["api::order.add-user"],
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },
        {
            method: "POST",
            path: "/order/saveTicket",
            handler: "order.saveTicket",
            config: {
                auth: false,
                middlewares: ["api::order.add-user"],
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },
        {
            method: "POST",
            path: "/order/sendEmail",
            handler: "order.sendEmail",
            config: {
                auth: false,
                middlewares: ["api::order.add-user"],
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },
    ]
};