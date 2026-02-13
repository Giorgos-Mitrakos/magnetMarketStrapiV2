'use strict';

export default {
    routes: [
        {
            method: 'POST',
            path: '/notify-me/subscribe',
            handler: 'notify-me.subscribe',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/notify-me/unsubscribe/:token',
            handler: 'notify-me.unsubscribe',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/notify-me/check',
            handler: 'notify-me.check',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/notify-me',
            handler: 'notify-me.find',
            config: {
                auth: {
                    strategies: ['api-token']
                },
                policies: [],
            },
        }
    ]
};