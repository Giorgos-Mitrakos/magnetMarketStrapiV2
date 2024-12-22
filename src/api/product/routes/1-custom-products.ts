export default {
    routes: [
        {
            method: "POST",
            path: "/product/searchProducts",
            handler: "product.searchProducts",
            config: {
                auth: false,
                // middlewares: ["api::order.add-user"],
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },
        {
            method: "POST",
            path: "/product/searchFilters",
            handler: "product.searchFilters",
            config: {
                auth: false,
                // middlewares: ["api::order.add-user"],
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },
    ]
};