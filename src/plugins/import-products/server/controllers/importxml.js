'use strict';

module.exports = ({ strapi }) => ({
    async index(ctx) {
        ctx.body = await strapi
            .plugin('import-products')
            .service('importxmlService')
            .getFile();
    },

    async saveImportedURL(ctx) {
        ctx.body = await strapi
            .plugin('import-products')
            .service('importxmlService')
            .saveImportedURL(ctx.request.body);
    },

    async runimport(ctx) {

        // if (ctx.request.body.entry.name === 'Logicom') {
        //     ctx.body = await strapi
        //         .plugin('import-products')
        //         .service('parseService')
        //         .parseLogicomXml(ctx.request.body);
        // }
        // else 
        if (ctx.request.body.entry.name === 'Oktabit') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('oktabitService')
                .parseOktabitXml(ctx.request.body);
        }
        else if (ctx.request.body.entry.name === 'Zegetron') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('zegetronService')
                .parseZegetronXml(ctx.request.body);
        }
        else if (ctx.request.body.entry.name === 'Globalsat') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('globalsatService')
                .parseGlobalsat(ctx.request.body);
        }
        else if (ctx.request.body.entry.name.toLowerCase() === 'dotmedia') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('dotmediaService')
                .parseDotMediaXml(ctx.request.body);
        }
        else if (ctx.request.body.entry.name.toLowerCase() === 'telehermes') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('telehermesService')
                .parseTelehermesXml(ctx.request.body);
        }
        else if (ctx.request.body.entry.name.toLowerCase() === 'westnet') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('westnetService')
                .parseWestnetXml(ctx.request.body);
        }
        // else if (ctx.request.body.entry.name.toLowerCase() === 'gerasis') {
        //     ctx.body = await strapi
        //         .plugin('import-products')
        //         .service('parseService')
        //         .parseGerasisXml(ctx.request.body);
        // }
        else if (ctx.request.body.entry.name.toLowerCase() === 'novatron') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('novatronService')
                .parseNovatron(ctx.request.body);
        }
        else if (ctx.request.body.entry.name.toLowerCase() === 'quest') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('questService')
                .parseQuest(ctx.request.body);
        }
        // else if (ctx.request.body.entry.name.toLowerCase() === 'smart4all') {
        //     ctx.body = await strapi
        //         .plugin('import-products')
        //         .service('parseService')
        //         .parseSmart4AllXml(ctx.request.body);
        // }
        // else if (ctx.request.body.entry.name.toLowerCase() === 'damkalidis') {
        //     ctx.body = await strapi
        //         .plugin('import-products')
        //         .service('parseService')
        //         .parseDamkalidisXml(ctx.request.body);
        // }
        else if (ctx.request.body.entry.name.toLowerCase() === 'cpi') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('cpiService')
                .parseCpiXml(ctx.request.body);
        }
        // else if (ctx.request.body.entry.name.toLowerCase() === 'netone') {
        //     ctx.body = await strapi
        //         .plugin('import-products')
        //         .service('parseService')
        //         .parseNetoneXml(ctx.request.body);
        // }
        // else if (ctx.request.body.entry.name.toLowerCase() === 'iason') {
        //     ctx.body = await strapi
        //         .plugin('import-products')
        //         .service('parseService')
        //         .parseIasonXml(ctx.request.body);
        // }
        // else if (ctx.request.body.entry.name.toLowerCase() === 'allwan') {
        //     ctx.body = await strapi
        //         .plugin('import-products')
        //         .service('parseService')
        //         .parseAllwanXml(ctx.request.body);
        // }
        else if (ctx.request.body.entry.name.toLowerCase() === 'acihellas') {
            ctx.body = await strapi
                .plugin('import-products')
                .service('aciService')
                .parseAciJson(ctx.request.body);
        }
        else {
            console.log("Wrong file")
        }
    },

    async success(ctx) {
        ctx.body = await strapi
            .plugin('import-products')
            .service('importxmlService')
            .fileImportSuccess(ctx.request.body);
    },

    async getmapping(ctx) {
        ctx.body = await strapi
            .plugin('import-products')
            .service('importxmlService')
            .getMapping(ctx.request.body);
    },

    async saveMapping(ctx) {
        ctx.body = await strapi
            .plugin('import-products')
            .service('importxmlService')
            .saveMapping(ctx.request.body);
    },

    async updatespecs(ctx) {
        ctx.body = await strapi
            .plugin('import-products')
            .service('charnameService')
            .updatespecs(ctx.request.body);
    },
});
