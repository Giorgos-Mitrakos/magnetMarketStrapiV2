'use strict';

module.exports = ({ strapi }) => ({
  async setPrice(existedProduct, supplierInfo, categoryInfo, product) {
    try {
      let brandId = product.brand?.id;
      const taxRate = Number(process.env.GENERAL_TAX_RATE)

      // Βρίσκω τους προμηθευτές που έχουν το προϊόν διαθέσιμο
      const filteredSupplierInfo = supplierInfo.filter(x => x.in_stock === true)
      
      let recycleTax = product.recycleTax ? parseFloat(product.recycleTax) : 0

      // Βρίσκω τον προμηθευτή που έχει διαθέσιμο το προϊόν και έχει τη μικρότερη τιμή χονδρικής
      let minSupplierPrice = filteredSupplierInfo?.reduce((prev, current) => {
        return (prev.wholesale < current.wholesale) ? prev : current
      })

      // Αναζητώ στη βάση τον προμηθευτή με τη μικρότερη τιμή για να βρώ το κόστος των μεταφορικών
      const supplier = await strapi.db.query('plugin::import-products.importxml').findOne({
        select: ['name', 'shipping'],
        where: { name: minSupplierPrice.name },
      });

      // Αποθηκεύω σε μεταβλητή τα μεταφορικά
      let supplierShipping = supplier.shipping ? supplier.shipping : 0

      // Βρίσκω τα ποστοστά ανα πλατφόρμα
      let percentages = this.findProductPlatformPercentage(categoryInfo, brandId)

      let minPrices = {}

      let prices = {}

      // Βρίσκω τις ελάχιστες τιμές ανα πλατφόρμα
      minPrices.wholesale = parseFloat(minSupplierPrice.wholesale)
      const minGeneral = (parseFloat(minSupplierPrice.wholesale) + parseFloat(recycleTax) + parseFloat(percentages.general.addToPrice) + parseFloat(supplierShipping)) * (taxRate / 100 + 1) * (parseFloat(percentages.general.platformCategoryPercentage) / 100 + 1)
      minPrices.general = parseFloat(minGeneral)
      const minSkroutz = (parseFloat(minSupplierPrice.wholesale) + parseFloat(recycleTax) + parseFloat(percentages.skroutz.addToPrice) + parseFloat(supplierShipping)) * (taxRate / 100 + 1) * (parseFloat(percentages.skroutz.platformCategoryPercentage) / 100 + 1)
      minPrices.skroutz = parseFloat(minSkroutz)
      const minShopflix = (parseFloat(minSupplierPrice.wholesale) + parseFloat(recycleTax) + parseFloat(percentages.shopflix.addToPrice) + parseFloat(supplierShipping)) * (taxRate / 100 + 1) * (parseFloat(percentages.shopflix.platformCategoryPercentage) / 100 + 1)
      minPrices.shopflix = parseFloat(minShopflix)

      if (existedProduct) {
        const skroutz = existedProduct.platforms.find(x => x.platform === "Skroutz")
        const shopflix = existedProduct.platforms.find(x => x.platform === "Shopflix")

        if (minSupplierPrice.name.toLowerCase() === "globalsat") {
          const retailPrice = parseFloat(minSupplierPrice.retail_price)
          const suggestedPrice = parseFloat(retailPrice - 0.5)
          this.createPrices(existedProduct, prices, minPrices, suggestedPrice, skroutz, shopflix)
        }
        else if (minSupplierPrice.name.toLowerCase() === "telehermes") {
          const retailPrice = parseFloat(minSupplierPrice.retail_price)
          const suggestedPrice = parseFloat(retailPrice - 0.5)
          this.createPrices(existedProduct, prices, minPrices, suggestedPrice, skroutz, shopflix)
        }
        else if (minSupplierPrice.name.toLowerCase() === "dotmedia") {
          // let retail_price = parseFloat(minSupplierPrice.retail_price)

          // if (parseFloat(minSupplierPrice.wholesale) > 0) {
          const retailPrice = parseFloat(minSupplierPrice.retail_price)
          const suggestedPrice = parseFloat(retailPrice)
          this.createPrices(existedProduct, prices, minPrices, suggestedPrice, skroutz, shopflix)
          // }
          // else {

          // }
        }
        else if (minSupplierPrice.name.toLowerCase() === "novatron" && existedProduct.name.toLowerCase().includes("vigi")) {
          let retail_price = parseFloat(minSupplierPrice.retail_price)
          const retailPrice = retail_price ? parseFloat(retail_price) : null
          const suggestedPrice = retailPrice ? parseFloat(retailPrice) : null
          this.createPrices(existedProduct, prices, minPrices, suggestedPrice, skroutz, shopflix)
        }
        else {
          let isGlobalsat = filteredSupplierInfo?.find(x => x.name.toLowerCase() === "globalsat")
          const retailPrice = isGlobalsat ? isGlobalsat.retail_price : null
            // (product.retail_price ? parseFloat(product.retail_price) : null)
          const suggestedPrice = retailPrice ? parseFloat(retailPrice) : null
          this.createPrices(existedProduct, prices, minPrices, suggestedPrice, skroutz, shopflix)
        }
      }
      else {
        if (minSupplierPrice.name.toLowerCase() === "globalsat") {
          const retailPrice = parseFloat(product.retail_price)
          const suggestedPrice = parseFloat(retailPrice - 0.5)
          this.createPrices(null, prices, minPrices, suggestedPrice, null, null)
        }
        else if (minSupplierPrice.name.toLowerCase() === "telehermes") {
          const retailPrice = parseFloat(product.retail_price)
          this.createPrices(null, prices, minPrices, retailPrice, null, null)
        }
        else if (minSupplierPrice.name.toLowerCase() === "dotmedia") {
          if (this.is_a_greaterthan_b(minSupplierPrice.wholesale, 0)) {
            const retailPrice = parseFloat(product.retail_price)
            this.createPrices(null, prices, minPrices, retailPrice, null, null)
          }
          else {
            prices.generalPrice = {
              price: parseFloat(product.retail_price).toFixed(2),
              isFixed: false
            }

            prices.skroutzPrice = {
              platform: "Skroutz",
              price: parseFloat(product.retail_price).toFixed(2),
              is_fixed_price: false,
            }

            prices.shopflixPrice = {
              platform: "Shopflix",
              price: parseFloat(product.retail_price).toFixed(2),
              is_fixed_price: false,
            }
          }
        }
        else if (minSupplierPrice.name.toLowerCase() === "novatron" && product.name.toLowerCase().includes("vigi")) {
          const retailPrice = parseFloat(product.retail_price)
          this.createPrices(null, prices, minPrices, retailPrice, null, null)
        }
        else {
          this.createPrices(null, prices, minPrices, null, null, null)
        }
      }
      return prices

    } catch (error) {
      console.log("product>>>>>", existedProduct, "minSupplierPrice>>>>>>>", minSupplierPrice,
        "supplier>>>>>>", supplier, error)
    }
  },

  findProductPlatformPercentage(categoryInfo, brandId) {
    let percentage = Number(process.env.GENERAL_CATEGORY_PERCENTAGE)
    let addToPrice = Number(process.env.GENERAL_SHIPPING_PRICE)

    // Αρχικά αποθηκεύω τις default τιμές που έχω στο αρχείο env
    let percentages = {
      general: {
        platformCategoryPercentage: percentage,
        addToPrice: addToPrice,
      },
      skroutz: {
        platformCategoryPercentage: percentage,
        addToPrice: addToPrice,
      },
      shopflix: {
        platformCategoryPercentage: percentage,
        addToPrice: addToPrice,
      }
    }

    // Βρίσκω τα ποσοστά της κατηγορίας ανά πλατφόρμα
    const generalCategoryPercentage = categoryInfo.cat_percentage.find(x => x.name.toLowerCase().trim() === "general")
    const skroutzCategoryPercentage = categoryInfo.cat_percentage.find(x => x.name.toLowerCase().trim() === "skroutz")
    const shopflixCategoryPercentage = categoryInfo.cat_percentage.find(x => x.name.toLowerCase().trim() === "shopflix")

    if (generalCategoryPercentage) {
      if (generalCategoryPercentage.percentage) {
        percentages.general.platformCategoryPercentage = generalCategoryPercentage.percentage
      }
      percentages.general.addToPrice = generalCategoryPercentage.add_to_price ? generalCategoryPercentage.add_to_price : 0

      // Αναζητώ αν υπάρχει ξεχωριστό ποσοστό λόγω κατασκευαστή στην κατηγορία 
      if (generalCategoryPercentage.brand_perc && generalCategoryPercentage.brand_perc.length > 0) {
        const brandPercentage = generalCategoryPercentage.brand_perc.find(x => x.brand?.id === brandId)
        if (brandPercentage) {
          percentages.general.platformCategoryPercentage = brandPercentage.percentage
          percentages.general.brandPercentage = brandPercentage.percentage
        }
      }
    }

    // Αν υπάρχει ξεχωριστό ποσοστό στην πλατφόρα αποθηκεύω αυτές τις τιμές αλλιώς τα γενικά ποσοστά
    if (skroutzCategoryPercentage) {
      if (skroutzCategoryPercentage.percentage) {
        percentages.skroutz.platformCategoryPercentage = skroutzCategoryPercentage.percentage
      }
      else {
        percentages.skroutz.platformCategoryPercentage = percentages.general.platformCategoryPercentage
      }

      percentages.skroutz.addToPrice = skroutzCategoryPercentage.add_to_price ? skroutzCategoryPercentage.add_to_price : 0

      // Αναζητώ αν υπάρχει ξεχωριστό ποσοστό λόγω κατασκευαστή στην κατηγορία 
      if (skroutzCategoryPercentage.brand_perc && skroutzCategoryPercentage.brand_perc.length > 0) {
        const brandPercentage = skroutzCategoryPercentage.brand_perc.find(x => x.brand?.id === brandId)
        if (brandPercentage) {
          percentages.skroutz.platformCategoryPercentage = brandPercentage.percentage
        }
        else if (percentages.general.brandPercentage) {
          percentages.skroutz.platformCategoryPercentage = percentages.general.brandPercentage
        }
      }
      else if (percentages.general.brandPercentage) {
        percentages.skroutz.platformCategoryPercentage = percentages.general.brandPercentage
      }
    }
    else {
      percentages.skroutz.platformCategoryPercentage = percentages.general.platformCategoryPercentage
      percentages.skroutz.addToPrice = percentages.general.addToPrice
    }

    // Αν υπάρχει ξεχωριστό ποσοστό στην πλατφόρα αποθηκεύω αυτές τις τιμές αλλιώς τα γενικά ποσοστά
    if (shopflixCategoryPercentage) {
      if (shopflixCategoryPercentage.percentage) {
        percentages.shopflix.platformCategoryPercentage = shopflixCategoryPercentage.percentage
      }
      else {
        percentages.shopflix.platformCategoryPercentage = percentages.general.platformCategoryPercentage
      }

      percentages.shopflix.addToPrice = shopflixCategoryPercentage.add_to_price ? shopflixCategoryPercentage.add_to_price : 0

      if (shopflixCategoryPercentage.brand_perc && shopflixCategoryPercentage.brand_perc.length > 0) {
        const brandPercentage = shopflixCategoryPercentage.brand_perc.find(x => x.brand?.id === brandId)
        if (brandPercentage) {
          percentages.shopflix.platformCategoryPercentage = brandPercentage.percentage
        }
        else if (percentages.general.brandPercentage) {
          percentages.shopflix.platformCategoryPercentage = percentages.general.brandPercentage
        }
      }
      else if (percentages.general.brandPercentage) {
        percentages.shopflix.platformCategoryPercentage = percentages.general.brandPercentage
      }
    }
    else {
      percentages.shopflix.platformCategoryPercentage = percentages.general.platformCategoryPercentage
      percentages.shopflix.addToPrice = percentages.general.addToPrice
    }
    return percentages
  },

  createPrices(existedProduct, prices, minPrices, suggestedPrice, skroutz, shopflix) {
    if (existedProduct) {
      if (existedProduct.inventory && existedProduct.inventory > 0) {
        prices.generalPrice = {
          price: parseFloat(existedProduct.price).toFixed(2),
          isFixed: true
        }

        if (skroutz) {
          prices.skroutzPrice = prices.skroutzPrice = {
            platform: "Skroutz",
            price: parseFloat(skroutz.price).toFixed(2),
            is_fixed_price: true,
          }
        }
        else {
          prices.skroutzPrice = {
            platform: "Skroutz",
            price: parseFloat(minPrices.skroutz).toFixed(2),
            is_fixed_price: true,
          }
        }

        if (shopflix) {
          prices.shopflixPrice = {
            platform: "Shopflix",
            price: parseFloat(shopflix.price).toFixed(2),
            is_fixed_price: true,
          }
        }
        else {
          prices.shopflixPrice = {
            platform: "Shopflix",
            price: parseFloat(minPrices.shopflix).toFixed(2),
            is_fixed_price: true,
          }
        }
      }
      else {
        const general = this.updatePrices(existedProduct.price, existedProduct.is_fixed_price, minPrices.general, suggestedPrice, minPrices.wholesale)
        prices.generalPrice = {
          price: general.price,
          isFixed: general.isFixed
        }

        const skroutzPrice = this.updatePrices(skroutz?.price, skroutz?.is_fixed_price, minPrices.skroutz, suggestedPrice, minPrices.wholesale)
        prices.skroutzPrice = {
          platform: "Skroutz",
          price: skroutzPrice.price,
          is_fixed_price: skroutzPrice.isFixed,
        }

        const shopflixPrice = this.updatePrices(shopflix?.price, shopflix?.is_fixed_price, minPrices.shopflix, suggestedPrice, minPrices.wholesale)
        prices.shopflixPrice = {
          platform: "Shopflix",
          price: shopflixPrice.price,
          is_fixed_price: shopflixPrice.isFixed,
        }
      }
    }
    else {
      if (suggestedPrice && this.is_a_greaterthan_b(suggestedPrice, minPrices.general)) {
        prices.generalPrice = {
          price: parseFloat(suggestedPrice).toFixed(2),
          isFixed: false
        }
      }
      else {
        prices.generalPrice = {
          price: parseFloat(minPrices.general).toFixed(2),
          isFixed: false
        }
      }

      if (suggestedPrice && this.is_a_greaterthan_b(suggestedPrice, minPrices.skroutz)) {
        prices.skroutzPrice = {
          platform: "Skroutz",
          price: parseFloat(suggestedPrice).toFixed(2),
          is_fixed_price: false,
        }
      }
      else {
        prices.skroutzPrice = {
          platform: "Skroutz",
          price: parseFloat(minPrices.skroutz).toFixed(2),
          is_fixed_price: false,
        }
      }

      if (suggestedPrice && this.is_a_greaterthan_b(suggestedPrice, minPrices.shopflix)) {
        prices.shopflixPrice = {
          platform: "Shopflix",
          price: suggestedPrice.toFixed(2),
          is_fixed_price: false,
        }
      }
      else {
        prices.shopflixPrice = {
          platform: "Shopflix",
          price: parseFloat(minPrices.shopflix).toFixed(2),
          is_fixed_price: false,
        }
      }
    }
  },

  updatePrices(existed, is_fixed_price, min, suggested, wholesale) {

    const existedPrice = existed ? existed : null
    const minPrice = min && this.is_a_greaterthan_b(wholesale, 0) ? min : null
    const suggestedPrice = suggested ? suggested : null
    const isFixed = is_fixed_price ? is_fixed_price : false

    if (suggestedPrice) {
      if (minPrice) {
        if (this.is_a_greaterthan_b(suggestedPrice, minPrice)) {
          if (existedPrice && this.is_a_greaterthan_b(existedPrice, suggestedPrice)) {
            if (isFixed) {
              return {
                price: existedPrice.toFixed(2),
                isFixed: isFixed
              }
            }
            else {
              return {
                price: suggestedPrice.toFixed(2),
                isFixed: false
              }
            }
          }
          else {
            if (existedPrice && this.is_a_greaterthan_b(existedPrice, minPrice)) {
              if (isFixed) {
                return {
                  price: existedPrice.toFixed(2),
                  isFixed: isFixed
                }
              }
              else {
                return {
                  price: suggestedPrice.toFixed(2),
                  isFixed: isFixed
                }
              }
            }
            else {
              if (this.is_a_greaterthan_b(wholesale, 0)) {
                return {
                  price: suggestedPrice.toFixed(2),
                  isFixed: false
                }
              }
              else {
                return {
                  price: suggestedPrice.toFixed(2),
                  isFixed: false
                }
              }
            }
          }
        }
        else {
          if (existedPrice && this.is_a_greaterthan_b(existedPrice, minPrice)) {
            if (isFixed) {
              return {
                price: existedPrice.toFixed(2),
                isFixed: isFixed
              }
            }
            else {
              return {
                price: minPrice.toFixed(2),
                isFixed: false
              }
            }
          }
          else {
            return {
              price: minPrice.toFixed(2),
              isFixed: false
            }
          }
        }
      }
      else {
        if (existedPrice && this.is_a_greaterthan_b(existedPrice, suggestedPrice)) {
          if (isFixed) {
            return {
              price: existedPrice.toFixed(2),
              isFixed: false
            }
          }
          else {
            return {
              price: suggestedPrice.toFixed(2),
              isFixed: false
            }
          }
        }
        else {
          return {
            price: suggestedPrice.toFixed(2),
            isFixed: false
          }
        }
      }
    }
    else {
      if (minPrice) {
        if (existedPrice && this.is_a_greaterthan_b(existedPrice, minPrice)) {
          if (isFixed) {
            return {
              price: existedPrice.toFixed(2),
              isFixed: isFixed
            }
          }
          else {
            return {
              price: minPrice.toFixed(2),
              isFixed: isFixed
            }
          }
        }
        else {
          return {
            price: minPrice.toFixed(2),
            isFixed: false
          }
        }
      }
      else {
        return {
          price: existedPrice.toFixed(2),
          isFixed: false
        }
      }
    }
  },

  is_a_greaterthan_b(a, b) {
    const first = typeof a === 'number' ? a : parseFloat(a)
    const second = typeof b === 'number' ? b : parseFloat(a)
    if (Math.round(first * 100) > Math.round(second * 100)) { return true }
    else {
      return false
    }


  },

  is_not_equal(a, b) {
    const first = typeof a === 'number' ? a : parseFloat(a)
    const second = typeof b === 'number' ? b : parseFloat(b)
    if (Math.round(first * 100) !== Math.round(second * 100)) { return true }
    else {
      return false
    }
  }
});
