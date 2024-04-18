export default {
    scrapQUEST: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "QUEST" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('questService')
                .parseQuest({ entry });
        },
        options: {
            rule: "10 8,22 * * *",
        },
    },

    scrapGLOBALSAT: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "globalsat" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('globalsatService')
                .parseGlobalsat({ entry });
        },
        options: {
            rule: "40 6-22 * * *",
        },
    },

    scrapNOVATRON: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Novatron" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('novatronService')
                .parseNovatron({ entry });
        },
        options: {
            rule: "4 10 * * *",
        },
    },

    updateWestnet: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Westnet" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('westnetService')
                .parseWestnetXml({ entry });
        },
        options: {
            rule: "15 7,8,12 * * *",
        },
    },

    updateOKTABIT: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Oktabit" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('oktabitService')
                .parseOktabitXml({ entry });
        },
        options: {
            rule: "15 9,13 * * *",
        },
    },

    updateZEGETRON: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Zegetron" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('zegetronService')
                .parseZegetronXml({ entry });
        },
        options: {
            rule: "54 8,12 * * *",
        },
    },

    updateDOTMEDIAwithScrapping: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "DotMedia" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('dotmediaService')
                .scrapDotMedia({ entry });
        },
        options: {
            rule: "10 5 * * *",
        },
    },

    updateDOTMEDIAwithXML: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "DotMedia" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('dotmediaService')
                .parseDotMediaXml({ entry });
        },
        options: {
            rule: "10 10,16,18,22 * * *",
        },
    },

    updateTELEHERMES: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Telehermes" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('telehermesService')
                .parseTelehermesXml({ entry });
        },
        options: {
            rule: "5 8,11,14,16,18,22 * * *",
        },
    },

    updateCPI: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Cpi" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('cpiService')
                .parseCpiXml({ entry });
        },
        options: {
            rule: "25 18 * * *",
        },
    },

    updateACICataloge: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "AciHellas" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('aciService')
                .parseAciJson({ entry });
        },
        options: {
            rule: "50 6,13,19 * * *",
        },
    },

    updateACIAvailability: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "AciHellas" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('aciService')
                .getAciAvailability({ entry });
        },
        options: {
            rule: "51 7,9,11,15,17,21 * * *",
        },
    },

    updateACIAttributes: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "AciHellas" },
                populate: {
                    importedFile: true,
                    stock_map: {
                        fields: ['name'],
                        sort: 'name:asc',
                    },
                },
            })

            await strapi
                .plugin('import-products')
                .service('aciService')
                .getAciAttributes({ entry });
        },
        options: {
            rule: "5 2 * * 2,6",
        },
    },

    updateAll: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            await strapi
                .plugin('import-products')
                .service('importHelpers')
                .updateAll();
        },
        options: {
            rule: "8 17 * * *",
        },
    },

    createSkroutzXml: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).

            await strapi
                .plugin('export-platforms-xml')
                .service('xmlService')
                .createXml('Skroutz');
        },
        options: {
            rule: "46 * * * *",
        },
    },
 
    createShopflixXml: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).

            await strapi
                .plugin('export-platforms-xml')
                .service('xmlService')
                .createXml('Shopflix');
        },
        options: {
            rule: "44 * * * *",
        },
    },
};