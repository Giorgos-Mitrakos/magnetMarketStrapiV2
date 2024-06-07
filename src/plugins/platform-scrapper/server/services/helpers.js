'use strict';

const { element } = require("prop-types");

module.exports = ({ strapi }) => ({
  convertPrice(price) {
    const convertedPrice = parseFloat(price.replace(".", "").replace(",", ".")).toFixed(2)

    return convertedPrice
  },

  async findIfScrapedProductExists(platformName, product) {
    const entry = await strapi.db.query('api::product.product').findOne({
      where: {
        platforms: {
          title_in_platform: product.title
        }
      },
      populate: {
        platforms: {
          where: { platform: platformName },
          populate: { shops: true }
        }
      },
    });

    return entry
  },

  async updateScrapedProduct(platformName, product) {
    try {

      const myShop = product.shops.find(x => x.name === "Magnet Market")

      const entry = await strapi.db.query('api::product.product').findOne({
        where: {
          name: myShop.productDescriptionName
        },
        populate: {
          platforms: true,
          supplierInfo: true
        },
      });

      if (entry) {

        let platforms = entry.platforms.map(plat => {
          let container = plat

          if (plat.platform === platformName) {
            if (product.title)
              container.title_in_platform = product.title

            if (product.link)
              container.url = product.link

            if (product.code)
              container.code_in_platform = product.code

            if (product.category)
              container.category = product.category

            if (product.proposedShop)
              container.proposed_shop = product.proposedShop

            if (product.statistics && product.statistics.averageRating)
              container.averageRating = product.statistics.averageRating

            if (product.statistics && product.statistics.numberOfReviews)
              container.numberOfReviews = product.statistics.numberOfReviews

            const shops = []
            if (product.shops) {

              product.shops.forEach(element => {
                let shop = {}
                shop.name = element.name
                shop.availability = element.productAvailability
                shop.is_pro = element.isProShop
                shop.is_express = element.isExpressDelivery
                shop.price = parseFloat(element.shopPrices.price)
                shop.marketplace_shipping = element.shopPrices.marketplace ? parseFloat(element.shopPrices.marketplace.shipping) : null
                shop.shop_shipping = element.shopPrices.shop?.shipping ? parseFloat(element.shopPrices.shop.shipping) : null

                shops.push(shop)
              });
            }

            container.shops = shops
            container.last_scrap = new Date()
            container.forced_scrap_times = 0
          }

          return container
        })

        this.findMySkroutzPlace(product, entry)


        // await strapi.entityService.update('api::product.product', entry.id, {
        //   data: {
        //     platforms: platforms,
        //   },
        // });

      }

    } catch (error) {
      console.log(error, error.details?.errors)
    }
    // console.log(product.shops)
  },

  async findPlatform(platform) {
    try {
      const entry = await strapi.db.query('api::platform.platform').findOne({
        select: ['name', 'order_time'],
        where: {
          name: platform
        },
      });

      return entry.product_scrap_days

    } catch (error) {
      console.log(error)
    }
  },

  findMySkroutzPlace(product, database_product) {
    try {
      let optimalPrice;
      

      const marketplace = product.shops.filter(x => x.shopPrices.marketplace !== undefined)

      // console.log("marketplace:", marketplace) 

      const myShopInMarketplace = marketplace.findIndex(x => x.name === "Magnet Market")
      console.log("myShopPositionInMarketplace:", myShopInMarketplace + 1)

      if (myShopInMarketplace === 0) {
        if (marketplace.length > 1) {
          console.log("SecondShop:", marketplace[1].name, "Price:", marketplace[1].shopPrices.price)
          console.log("Difference From Second in Marketplace:",
            this.convertPrice(marketplace[1].shopPrices.price)
            - this.convertPrice(myShop.shopPrices.price))
        }
        else {
          console.log("Μοναδικός στο Marketplace")
        }
      }
      else {
        console.log("FirstShop:", marketplace[0].name, "Price:", marketplace[0].shopPrices.price)
        console.log("Difference From First in Marketplace:",
          this.convertPrice(myShop.shopPrices.price)
          - this.convertPrice(marketplace[0].shopPrices.price))
      }

      const myShopPosition = product.shops.findIndex(x => x.name === "Magnet Market")
      console.log("myShopPosition:", myShopPosition + 1)
      const myShop = product.shops[myShopPosition]
      if (myShopPosition === 0) {
        if (product.shops.length > 1) {
          console.log("SecondShop:", product.shops[1].name, "Price:", product.shops[1].shopPrices.price)
          console.log("Difference From Second:",
            this.convertPrice(product.shops[1].shopPrices.price)
            - this.convertPrice(myShop.shopPrices.price))
        }
        else {
          console.log("Μοναδικός με αυτό το Προϊόν")
        }
      }
      else {
        console.log("FirstShop:", product.shops[0].name, "Price:", product.shops[0].shopPrices.price)
        console.log("Difference From First:", this.convertPrice(myShop.shopPrices.price)
          - this.convertPrice(product.shops[0].shopPrices.price))
      }


    } catch (error) {
      console.log(error)
    }
  }
})