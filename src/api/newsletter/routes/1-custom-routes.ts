export default {
    routes: [
        {
            method: 'POST',
            path: '/newsletter/unsubscribe',
            handler: 'newsletter.unsubscribe',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'POST',
            path: '/newsletter/subscribe',
            handler: 'newsletter.subscribe',
            config: {
                auth: false, // if you want it public
                policies: [],
                middlewares: [],
            },
        },
    ]
}