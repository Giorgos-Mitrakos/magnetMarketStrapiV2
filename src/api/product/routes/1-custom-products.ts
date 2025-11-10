export default {
    routes: [
        {
            method: "POST",
            path: "/product/searchProducts",
            handler: "product.searchProducts",
            config: {
                // auth: false,
                // middlewares: ["api::order.add-user"],
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },
        {
            method: "POST",
            path: "/product/brandFilters",
            handler: "product.brandFilters",
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
            path: "/product/getProductBySlug",
            handler: "product.getProductBySlug",
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
            path: "/product/getHotOrSale",
            handler: "product.getHotOrSale",
            config: {
                // auth: false,
                // middlewares: ["api::order.add-user"],
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },
        {
            method: "POST",
            path: "/product/getOffers",
            handler: "product.getOffers",
            config: {
                // auth: false,
                // middlewares: ["api::order.add-user"],
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },
    ]
};