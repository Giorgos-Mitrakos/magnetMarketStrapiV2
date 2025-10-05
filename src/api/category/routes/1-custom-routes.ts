export default {
    routes: [
        {
            method: "GET",
            path: "/category/menu",
            handler: "category.getMenu",
            config: {
                // auth: false,
                // See the usage section below for middleware naming conventions
            },
        },
        {
            method: "GET",
            path: "/category/categoriesMapping",
            handler: "category.getCategoriesMapping",
            config: {
                // auth: false,
                // See the usage section below for middleware naming conventions
            },
        },
        {
            method: "POST",
            path: "/category/categoryMetadata",
            handler: "category.categoryMetadata",
            config: {
                // auth: false,
                // See the usage section below for middleware naming conventions
            },
        },
        {
            method: "POST",
            path: "/category/getCategoryProducts",
            handler: "category.getCategoryProducts",
            config: {
                // auth: false,
                // See the usage section below for middleware naming conventions
            },
        },
    ]
};