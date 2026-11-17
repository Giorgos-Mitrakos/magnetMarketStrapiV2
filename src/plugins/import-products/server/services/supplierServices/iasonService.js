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
            return { message: "Error", error: err.message };
        }
    },

    async scrapIasonForCookies(browser, importRef, entry) {
    let page = null;

    try {
      page = await strapi
        .plugin("import-products")
        .service("scrapHelpers")
        .createPage(browser, false);

      await strapi
      .plugin("import-products")
      .service("scrapHelpers")
      .retry(
        () =>
          page.goto("https://www.iason.gr/customer/account/login", {
            waitUntil: "networkidle2", // Εδώ ήταν το σφάλμα
            timeout: 60000,
          }),
        2,
        false
      );

      const usernameValue = process.env.IASON_USERNAME;
      const passwordValue = process.env.IASON_PASSWORD;

      await page.waitForSelector("#email", { visible: true, timeout: 15000 });
      
      await page.type("#email", usernameValue, { delay: strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .randomWait(300, 700) });
      await page.type("#pass", passwordValue, { delay: strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .randomWait(300, 700) });
      
      await Promise.all([
        page.click("#send2"),
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 45000 })
      ]);
      
      // Επιστρέφουμε τη σελίδα που "έχει" ήδη τα cookies μέσα της
      return { page };

    } catch (error) {
      if (page) await page.close();
      throw error;
    }
  }
});