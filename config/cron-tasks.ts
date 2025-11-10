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
            rule: "10 8,12,22 * * *",
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
            rule: "52 6-22 * * *",
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
            rule: "4 7,11,16,21 * * *",
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
            rule: "55 8,12 * * *",
        },
    },

    // updateDOTMEDIAwithScrapping: {
    //     task: async ({ strapi }) => {
    //         // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
    //         const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
    //             where: { name: "DotMedia" },
    //             populate: {
    //                 importedFile: true,
    //                 stock_map: {
    //                     fields: ['name'],
    //                     sort: 'name:asc',
    //                 },
    //             },
    //         })

    //         await strapi
    //             .plugin('import-products')
    //             .service('dotmediaService')
    //             .scrapDotMedia({ entry });
    //     },
    //     options: {
    //         rule: "10 5 * * *",
    //     },
    // },

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
            rule: "40 11,16,18,21 * * *",
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
            rule: "45 7,11,14,16,18,21 * * *",
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
            rule: "25 9,12,15,18 * * *",
        },
    },

    // updateACICataloge: {
    //     task: async ({ strapi }) => {
    //         // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
    //         const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
    //             where: { name: "Acihellas" },
    //             populate: {
    //                 importedFile: true,
    //                 stock_map: {
    //                     fields: ['name'],
    //                     sort: 'name:asc',
    //                 },
    //             },
    //         })

    //         await strapi
    //             .plugin('import-products')
    //             .service('aciService')
    //             .parseAciJson({ entry });
    //     },
    //     options: {
    //         rule: "50 6, * * *",
    //     },
    // },

    // updateACIAvailability: {
    //     task: async ({ strapi }) => {
    //         // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
    //         const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
    //             where: { name: "Acihellas" },
    //             populate: {
    //                 importedFile: true,
    //                 stock_map: {
    //                     fields: ['name'],
    //                     sort: 'name:asc',
    //                 },
    //             },
    //         })

    //         await strapi
    //             .plugin('import-products')
    //             .service('aciService')
    //             .getAciAvailability({ entry });
    //     },
    //     options: {
    //         rule: "51 7,9,11,15,17,21 * * *",
    //     },
    // },

    // updateACIAttributes: {
    //     task: async ({ strapi }) => {
    //         // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
    //         const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
    //             where: { name: "Acihellas" },
    //             populate: {
    //                 importedFile: true,
    //                 stock_map: {
    //                     fields: ['name'],
    //                     sort: 'name:asc',
    //                 },
    //             },
    //         })

    //         await strapi
    //             .plugin('import-products')
    //             .service('aciService')
    //             .getAciAttributes({ entry });
    //     },
    //     options: {
    //         rule: "5 2 * * 2,6",
    //     },
    // },

    updateStefinet: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Stefinet" },
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
                .service('stefinetService')
                .parseStefinetXml({ entry });
        },
        options: {
            rule: "48 * * * *",
        },
    },

    updateSmart4All: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
            const entry = await strapi.db.query('plugin::import-products.importxml').findOne({
                where: { name: "Smart4All" },
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
                .service('smart4allService')
                .parseSmart4AllXml({ entry });
        },
        options: {
            rule: "56 * * * *",
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
            rule: "10 17 * * *",
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
            rule: "1 * * * *",
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
            rule: "58 * * * *",
        },
    },

    createBestpricexXml: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).

            await strapi
                .plugin('export-platforms-xml')
                .service('xmlService')
                .createXml('bestprice');
        },
        options: {
            rule: "3 * * * *",
        },
    },

    reconstruct: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).

            await strapi
                .plugin('export-platforms-xml')
                .service('xmlService')
                .checkIfThereIsSupplierInStock();
        },
        options: {
            rule: "56 * * * *",
        },
    },

    findNotRelatedFiles: {
        task: async ({ strapi }) => {
            // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).

            await strapi
                .plugin('import-products')
                .service('fileHelpers')
                .findNotRelatedFiles();
        },
        options: {
            rule: "5 3 1 */2 *",
        },
    },

    // Expire old opportunities daily at 2 AM
    expireOpportunities: {
        task: async ({ strapi }) => {
            try {
                strapi.log.info('[Bargain Detector] Expiring old opportunities...');

                const analyzer = strapi.plugin('bargain-detector').service('analyzer');
                const expired = await analyzer.expireOldOpportunities();

                strapi.log.info(`[Bargain Detector] Expired ${expired} opportunities`);
            } catch (error) {
                strapi.log.error(`[Bargain Detector] Expire task failed: ${error.message}`);
            }
        },
        options: {
            rule: '0 2 * * *',  // Daily at 2 AM
            tz: 'Europe/Athens'
        }
    },

    // Cleanup old records weekly
    cleanupRecords: {
        task: async ({ strapi }) => {
            try {
                strapi.log.info('[Bargain Detector] Running cleanup...');

                const analyzer = strapi.plugin('bargain-detector').service('analyzer');
                const result = await analyzer.cleanup();

                strapi.log.info(
                    `[Bargain Detector] Cleanup complete: ` +
                    `${result.opportunities} opportunities, ${result.analysis_runs} runs deleted`
                );
            } catch (error) {
                strapi.log.error(`[Bargain Detector] Cleanup failed: ${error.message}`);
            }
        },
        options: {
            rule: '0 3 * * 0',  // Weekly on Sunday at 3 AM
            tz: 'Europe/Athens'
        }
    }
};