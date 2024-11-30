export default {
    routes: [
        {
            method: "POST",
            path: "/category/brandFilter",
            handler: "category.brandFilter",
            config: {
                auth: false,
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },

        {
            method: "POST",
            path: "/category/categoryFilter",
            handler: "category.categoryFilter",
            config: {
                auth: false,
                // See the usage section below for middleware naming conventions
            },
            // config:{
            //   auth:true
            // }
        },
    ]
};