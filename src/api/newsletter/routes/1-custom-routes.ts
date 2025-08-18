export default {
    routes: [
        {
            method: 'GET',
            path: '/newsletter/unsubscribe/:email',
            handler: 'newsletter.unsubscribe',
            config: {
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