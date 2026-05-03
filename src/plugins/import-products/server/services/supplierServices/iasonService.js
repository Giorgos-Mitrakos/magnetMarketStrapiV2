'use strict';

/**
 * Iason Service
 * Χρησιμοποιεί το IasonAdapter
 */
module.exports = ({ strapi }) => ({
    async parseIasonXml({ entry }) {
        try {
            const adapter = strapi
                .plugin('import-products')
                .service('iasonAdapter')(entry);

            return await adapter.import();

        } catch (err) {
            console.error('Error in parseIasonXml:', err);
            return { message: "Error", error: err.message };
        }
    },

    async scrapIasonForCookies(browser, importRef, entry) {
        const logger = strapi.plugin('import-products').service('logger');
        let page = null;

        

        const loadImages = false;
        page = await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .createPage(browser, loadImages);

        await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .retry(
                () => page.goto('https://www.iason.gr/customer/account/login', {
                    waitUntil: "networkidle0",
                    timeout: 30000
                }),
                10,
                false
            );

        if (!page) throw new Error('Page is required');

        logger.logToFile('Navigation to login page successful');

        await page.waitForSelector('body', { timeout: 10000 });
        const bodyHandle = await page.$('body');
        if (!bodyHandle) throw new Error('Body not found');

        const formHandle = await bodyHandle.$('#login-form');
        if (!formHandle) throw new Error('Login form not found');

        const username = await formHandle.$('#email');
        const password = await formHandle.$('#pass');
        const button = await formHandle.$('#send2');

        if (!username || !password || !button) {
            throw new Error('Login form elements not found');
        }

        const usernameValue = process.env.IASON_USERNAME;
        const passwordValue = process.env.IASON_PASSWORD;

        if (!usernameValue || !passwordValue) {
            logger.logToFile('MISSING CREDENTIALS: IASON_USERNAME not found');
            throw new Error('Login credentials not configured');
        }

        await username.type(usernameValue, {
            delay: strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .randomWait(300, 700)
        });

        await password.type(passwordValue, {
            delay: strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .randomWait(300, 700)
        });

        await Promise.all([
            button.click(),
            page.waitForNavigation({ timeout: 30000 }).catch(err => {
                console.warn('Navigation timeout:', err.message);
            })
        ]);

        const cookies = await page.cookies();
        logger.logToFile('Cookies retrieved:', cookies);

        const cookieToSend = cookies.filter(x => x.name === 'PHPSESSID')
        if (!cookieToSend[0]) {
            logger.logToFile('PHPSESSID NOT FOUND in cookies');
        }
        await page.close()
        return cookieToSend[0];
    }
});