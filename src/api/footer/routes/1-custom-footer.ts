export default {
    routes: [
        {
            method: 'GET',
            path: '/footer/getFooter',
            handler: 'footer.getFooter',
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ]
}