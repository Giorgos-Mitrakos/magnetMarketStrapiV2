'use strict';

const puppeteer = require('puppeteer');
const xlsx = require('xlsx')
const userAgent = require('user-agents');

module.exports = ({ strapi }) => ({
  async getPlatforms() {
    const platforms = await strapi.db.query('api::platform.platform').findMany({
      populate: {
        platformCategories: {
          orderBy: { title: 'asc' },
        },
        merchantFeeCatalogue: true
      }
    })
    return platforms;
  },

  async updateCategories(platform, categories) {

    try {
      const categoriesList = []

      for await (let category of categories) {
        categoriesList.push(category.title)

        const checkIfCategoryExists = await strapi.db.query('plugin::platform-scrapper.platformcategory').findOne({
          where: { title: category.title },
        });

        if (!checkIfCategoryExists) {
          await strapi.entityService.create('plugin::platform-scrapper.platformcategory', {
            data: {
              title: category.title,
              link: category.link,
              numberOfProducts: category.numberOfProducts,
              platform: platform.id
            },
          });
        }
        else {
          await strapi.db.query('plugin::platform-scrapper.platformcategory').update({
            where: { title: category.title },
            data: {
              name: category.title,
              link: category.link,
              numberOfProducts: category.numberOfProducts,
              platform: platform.id
            },
          });
        }
      }

      const platforms = await strapi.entityService.findMany('api::platform.platform', {
        where: {
          name: platform.name
        },
        populate: {
          platformCategories: true
        }
      })

      for (let category of platforms[0].platformCategories) {
        if (!categoriesList.includes(category.title)) {
          await strapi.entityService.delete('plugin::platform-scrapper.platformcategory', category.id)
        }
      }

      // await strapi
      //     .plugin('platforms-scraper')
      //     .service('categoryHelpers')
      //     .updateCategoriesMerchantFee(platform);
    } catch (error) {
      console.log(error)
    }
  },

  async scrapPlatformCategories({ platform }) {
    const browser = await strapi
      .plugin('import-products')
      .service('scrapHelpers')
      .createBrowser()
    try {
      await this.updatePlatformCheckedCategories(platform)

      const categoriesToScrap = platform.platformCategories.filter(category => category.isChecked === true)


      if (platform.name === "Skroutz") {
        for (let category of categoriesToScrap) {
          await strapi
            .plugin('platform-scrapper')
            .service('skroutzHelpers')
            .scrapSkroutzCategory(browser, category.link, category.title);
        }
      }


    } catch (error) {
      console.log(error)
    }
    finally {
      await browser.close();
    }
  },

  async updatePlatformCheckedCategories(platform) {
    try {
      for (let category of platform.platformCategories) {
        await strapi.entityService.update('plugin::platform-scrapper.platformcategory', category.id,
          {
            data: {
              isChecked: category.isChecked ? category.isChecked : false,
            }
          })
      }
    } catch (error) {
      console.log(error)
    }
  },

  async updateCategoriesMerchantFee({ name }) {
    try {
      const platform = await strapi.db.query('api::platform.platform').findOne({
        where: { name: name },
        populate: {
          categories: true,
          merchantFeeCatalogue: true
        }
      })

      if (!platform.merchantFeeCatalogue)
        return

      const wb = xlsx.readFile(`./public${platform.merchantFeeCatalogue.url}`)
      const ws = wb.Sheets['Τιμοκατάλογος προμηθειών']
      const data = xlsx.utils.sheet_to_json(ws)

      for (let category of platform.categories) {
        const filteredCategories = data.filter(x => x['Κατηγορία'] === category.name)
        const filteredCategory = filteredCategories[0]
        console.log(filteredCategory)
        console.log(filteredCategory['Προμήθεια Marketplace (%)'],
          filteredCategory['Προμήθεια CPS (%)'])

        const updatedCategory = await strapi.db.query('plugin::platforms-scraper.platformcategory').update({
          where: { name: category.name },
          data: {
            marketPlaceFee: parseFloat(filteredCategory['Προμήθεια Marketplace (%)']),
            cpsFee: filteredCategory['Προμήθεια CPS (%)'] === "-" ? null : parseFloat(filteredCategory['Προμήθεια CPS (%)'])
          },
        });

        console.log(updatedCategory)
      }
      // console.log(filteredData.length)
    } catch (error) {
      console.log(error)
    }
  },

  
});
