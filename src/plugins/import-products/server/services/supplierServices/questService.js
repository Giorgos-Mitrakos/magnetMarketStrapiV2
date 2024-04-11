'use strict';

module.exports = ({ strapi }) => ({

  async parseQuest({ entry }) {
    try {

      const importRef = await strapi
        .plugin('import-products')
        .service('importHelpers')
        .createImportRef(entry);

      if (!entry.isActive) {
        await strapi
          .plugin('import-products')
          .service('importHelpers')
          .deleteEntry(entry, importRef);
      }
      else {

        const response = await this.scrapQuest(importRef, entry);

        if (response && response.message === "error") {
          await strapi.entityService.update('plugin::import-products.importxml', entry.id,
            {
              data: {
                lastRun: new Date(),
                report: `Created: ${importRef.created}, Updated: ${importRef.updated},Republished: ${importRef.republished} Skipped: ${importRef.skipped}, Deleted: ${importRef.deleted},
                    Δημιουργήθηκε κάποιο σφάλμα κατά τη διαδικάσία. Ξαναπροσπαθήστε!`,
              },
            })
        }
        else {
          await strapi
            .plugin('import-products')
            .service('importHelpers')
            .deleteEntry(entry, importRef);
        }
      }
      console.log("End of Import")
      return { "message": "ok" }
    } catch (error) {
      console.log(error)
    }
  },

  async loginQuest(page, supplier) {
    const bodyHandle = await page.$('body');

    const acceptCookiesForm = await page.$('#CybotCookiebotDialog')
    if (acceptCookiesForm) {
      const acceptCookiesButton = await page.$('#CybotCookiebotDialogBodyButtonAccept')
      acceptCookiesButton.click();
    }

    await strapi
      .plugin('import-products')
      .service('scrapHelpers')
      .sleep(2000)

    const formHandle = await bodyHandle.$('#form');

    await strapi
      .plugin('import-products')
      .service('scrapHelpers')
      .sleep(2000)

    const modal = await formHandle.$('.modal-content');
    if (modal) {
      const closeModal = await modal.$('.close');
      await closeModal.click()
    }

    const usernameWrapper = await formHandle.$('#username');
    const username = await usernameWrapper.$('input');
    const passwordWrapper = await formHandle.$('#password');
    const password = await passwordWrapper.$('input');
    const button = await formHandle.$('#submit-button');
    await username.type(process.env.QUEST_USERNAME,
      {
        delay: strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .randomWait(300, 700)
      })

    await password.type(process.env.QUEST_PASSWORD,
      {
        delay: strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .randomWait(300, 700)
      })

    await Promise.all([
      await button.click(),
      await page.waitForNavigation({
        waitUntil: 'networkidle0',
      })
    ])

    await page.cookies()
      .then((cookies) => {
        const cookiesJson = JSON.stringify(cookies, null, 2)
        return cookiesJson
      })
      .then((cookiesJson) => {
        strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .saveCookies(supplier, cookiesJson)
      })
      .catch((error) => console.log(error))

    return page
  },

  async scrapQuest(importRef, entry) {
    const browser = await strapi
      .plugin('import-products')
      .service('scrapHelpers')
      .createBrowser()
    try {

      let filteredCategories = {
        categories: [],
      }

      const loadImages = false;
      let page = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .createPage(await browser, loadImages)

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .loadCookies(entry.name, await page)

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .retry(
          () => page.goto('https://www.questonline.gr', { waitUntil: "networkidle0" }),
          10, // retry this 10 times,
          false
        );

      const pageUrl = page.url();

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .sleep(strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .randomWait(1500, 2000))

      if (pageUrl === "https://www.questonline.gr/Special-Pages/Logon?ReturnUrl=%2f") {
        page = await this.loginQuest(page, entry.name)
      }

      let scrapCategories = await page.$eval('div.nav-2-wrapper', (element) => {
        const navList = element.querySelectorAll(".nav-2")
        // let liElements = navList.length

        const categories = []
        for (let ul of navList) {
          let categoriesList = ul.querySelectorAll("li");

          for (let li of categoriesList) {
            let category = {}
            const categoryAnchor = li.querySelector('a')
            const categoryTitleSpan = li.querySelector('span')
            category.title = categoryTitleSpan.textContent.trim()
            category.link = categoryAnchor.getAttribute("href")
            category.subCategories = []
            categories.push(category)
          }
        }
        return categories;
      })

      let newCategories = strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .filterCategories(scrapCategories, importRef)

      filteredCategories.categories = newCategories

      for (let category of newCategories) {

        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .sleep(strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .randomWait(1500, 3000))

        await this.scrapQuestSubcategories(browser, category, filteredCategories, importRef, entry);
      }
    } catch (error) {
      console.log(error)
      return { "message": "error" }
    }
    finally {
      await browser.close();
    }
  },

  async scrapQuestSubcategories(browser, category, filteredCategories, importRef, entry) {

    const loadImages = false;

    let page = await strapi
      .plugin('import-products')
      .service('scrapHelpers')
      .createPage(await browser, loadImages)

    try {

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .retry(
          () => page.goto(`https://www.questonline.gr${category.link}`, { waitUntil: "networkidle0" }),
          10, // retry this 10 times,
          false
        );

      const scrapSub = await page.$eval('.side-menu', (element) => {
        const subList = element.querySelector('ul')
        const subcategoriesList = subList.querySelectorAll('li')

        const subcategories = []
        for (let sub of subcategoriesList) {
          let subcategory = {}
          const subcategoryAnchor = sub.querySelector('a')
          subcategory.title = subcategoryAnchor.textContent.trim()
          subcategory.link = subcategoryAnchor.getAttribute('href')
          subcategory.subCategories = []
          subcategories.push(subcategory)
        }
        return subcategories
      })

      const catIndex = filteredCategories.categories.findIndex(x => x.title === category.title)
      filteredCategories.categories[catIndex].subCategories = scrapSub

      filteredCategories.categories = strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .filterCategories(filteredCategories.categories, importRef)

      for (let sub of filteredCategories.categories[catIndex].subCategories) {
        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .sleep(strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .randomWait(4000, 10000))

        await this.scrapQuestSubcategories2(browser, category.title, sub, filteredCategories, importRef, entry)
      }
    } catch (error) {
      console.log(error)
    }
    finally {
      page.close()
    }
  },

  async scrapQuestSubcategories2(browser, category, subcategory, filteredCategories, importRef, entry) {
    const loadImages = false;

    let page = await strapi
      .plugin('import-products')
      .service('scrapHelpers')
      .createPage(await browser, loadImages)

    try {
      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .retry(
          () => page.goto(`https://www.questonline.gr${subcategory.link}`, { waitUntil: "networkidle0" }),
          10, // retry this 10 times,
          false
        );

      const sideMenu = await page.$('.side-menu')

      const catIndex = filteredCategories.categories.findIndex(x => x.title === category)
      const subIndex = filteredCategories.categories[catIndex].subCategories.findIndex(x => x.title === subcategory.title)

      if (sideMenu) {
        const scrapSub = await page.$eval('.side-menu', (element) => {
          const subList = element.querySelector('ul')
          const subcategoriesList = subList.querySelectorAll('li')

          const subcategories = []
          for (let sub of subcategoriesList) {
            let subcategory = {}
            const subcategoryAnchor = sub.querySelector('a')
            subcategory.title = subcategoryAnchor.textContent.trim()
            subcategory.link = subcategoryAnchor.getAttribute('href')
            subcategory.subCategories = []
            subcategories.push(subcategory)
          }
          return subcategories
        })


        filteredCategories.categories[catIndex].subCategories[subIndex].subCategories = scrapSub
        filteredCategories.categories = strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .filterCategories(filteredCategories.categories, importRef)

        for (let sub2 of filteredCategories.categories[catIndex].subCategories[subIndex].subCategories) {
          await this.scrapQuestCategory(browser, sub2.link, category, subcategory.title, sub2.title, importRef, entry)
          await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .sleep(strapi
              .plugin('import-products')
              .service('scrapHelpers')
              .randomWait(1000, 3000))
        }
      }
      else {
        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .sleep(strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .randomWait(4000, 10000))

        await this.scrapQuestCategory(browser, subcategory.link, category, subcategory.title, null, importRef, entry)
      }

    } catch (error) {
      console.log(error)
    }
    finally {
      page.close()
    }
  },

  async scrapQuestCategory(browser, link, category, subcategory, sub2category, importRef, entry) {
    const loadImages = false;

    let page = await strapi
      .plugin('import-products')
      .service('scrapHelpers')
      .createPage(await browser, loadImages)

    try {

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .retry(
          () => page.goto(`https://www.questonline.gr${link}?pagesize=300&skuavailableindays=1`, { waitUntil: "networkidle0" }),
          10, // retry this 10 times,
          false
        );

      const scrapProducts = await page.$eval('div.region-area-three>div.inner-area.inner-area-three', (element) => {
        const productListWrapper = element.querySelector('div.box>ul.product-list')
        const productList = productListWrapper.querySelectorAll('li>article>div.description-container')

        const products = []
        for (let prod of productList) {
          let product = {}
          const leftContainer = prod.querySelector('div.description-container-left')
          const titleWrapper = leftContainer.querySelector('header.title-container>h2.title>a')
          product.name = titleWrapper.textContent.trim()
          const linkHref = titleWrapper.getAttribute('href')
          product.link = `https://www.questonline.gr${linkHref}`
          product.supplierCode = leftContainer.querySelector('.product-code').textContent.split('.')[1].trim();

          const inOffer = leftContainer.querySelector('.offer')
          if (inOffer) {
            const discount = leftContainer.querySelector('.discount>span').textContent.replace("%", "").replace("-", "")
            product.in_offer = true
            product.discount = discount
          } else {
            product.in_offer = false
            product.discount = 0
          }

          const rightContainer = prod.querySelector('.description-container-right')
          const productAvailability = rightContainer.querySelector('div.availability>span').textContent.trim()
          const priceWrapper = rightContainer.querySelector('.price-container')
          const initialWholesale = priceWrapper.querySelector('.deleted-price')
          if (initialWholesale) {
            product.initial_wholesale = initialWholesale.textContent.replace('€', '').replace(',', '.').trim()
          }
          product.wholesale = priceWrapper.querySelector('.final-price').textContent.replace('€', '').replace(',', '.').trim()

          product.stockLevel = productAvailability

          products.push(product)
        }
        return products
      })

      const products = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .updateAndFilterScrapProducts(scrapProducts, category, subcategory, sub2category, importRef, entry)

      for (let product of products) {
        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .sleep(strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .randomWait(3000, 7000))

        await this.scrapQuestProduct(browser, product.link, category, subcategory, sub2category, importRef, entry)

      }

    } catch (error) {
      console.log(error)
    }
    finally {
      page.close()
    }
  },

  async scrapQuestProduct(browser, productLink, category, subcategory, sub2category, importRef, entry) {
    const loadImages = true;

    let page = await strapi
      .plugin('import-products')
      .service('scrapHelpers')
      .createPage(await browser, loadImages)


    try {

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .retry(
          () => page.goto(productLink, { waitUntil: "networkidle0" }),
          10, // retry this 10 times,
          false
        );

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .sleep(strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .randomWait(3000, 10000))

      const scrapProduct = await page.$eval('.details-page', (scrap) => {
        const product = {}

        const element = scrap.querySelector('div.content-container div.region-area-two')
        // Αφαίρεσα div.content-container div.region-area-two 
        const titleWrapper = element.querySelector('.inner-area-one .title')
        product.name = titleWrapper.textContent.trim();
        const supplierCodeWrapper = element.querySelector('#SkuNumber')
        product.supplierCode = supplierCodeWrapper.textContent.split('.')[1].trim();

        const inOffer = element.querySelector('.offer')
        if (inOffer) {
          const discount = element.querySelector('.discount>span').textContent.replace("%", "").replace("-", "")
          product.in_offer = true
          product.discount = discount
        } else {
          product.in_offer = false
          product.discount = 0
        }

        const imageWrapper = element.querySelectorAll('.box-two .thumbnails li img')
        product.imagesSrc = []
        for (let imgSrc of imageWrapper) {
          const src = imgSrc.getAttribute('src').split('?')[0]
          // const imageLink = src.startsWith('/') ? `https://www.questonline.gr${src}` : src;
          if (src.startsWith('/')) {
            product.imagesSrc.push({ url: `https://www.questonline.gr${src}?maxsidesize=1024` })
          }
          else if (!src.endsWith('.jpg.aspx') && !src.endsWith('.jpeg.aspx') && !src.endsWith('.png.aspx')) {
            product.imagesSrc.push({ url: `${src}?maxsidesize=1024` })
          }
        }

        const priceWrapper = element.querySelector('.box-three')
        product.initial_wholesale = priceWrapper.querySelector('.deleted-price')?.textContent.replace('€', '').replace(',', '.').trim()
        product.wholesale = priceWrapper.querySelector('.final-price').textContent.replace('€', '').replace(',', '.').trim()

        product.stockLevel = priceWrapper.querySelector('#realAvail').textContent.trim()

        switch (product.stockLevel) {
          case 'Διαθέσιμο':
            product.status = "InStock"
            break;
          case 'Διαθέσιμο - Περιορισμένη ποσότητα':
            product.status = "LowStock"
            break;
          default:
            product.status = "OutOfStock"
            break;
        }

        const tabsWrapper = scrap.querySelector('.tabs-content .technical-charact')

        if (tabsWrapper) {
          const liWrappers = tabsWrapper.querySelectorAll('li')

          const prod_chars = []
          for (let i = 0; i < liWrappers.length; i += 2) {
            prod_chars.push({
              name: liWrappers[i].querySelector('span').textContent.trim(),
              value: liWrappers[i + 1].querySelector('span').textContent.trim(),
            })
          }

          product.prod_chars = prod_chars
        }

        return product
      })

      if (scrapProduct.prod_chars.find(x => x.name === "Μεικτό βάρος")) {
        let chars = scrapProduct.prod_chars.find(x => x.name === "Μεικτό βάρος")
        let weight = parseFloat(chars.value.replace("kg", "").replace(",", ".").trim()) * 1000

        scrapProduct.weight = parseInt(weight)
      }
      else if (scrapProduct.prod_chars.find(x => x.name === "Βάρος (κιλά)")) {
        let chars = scrapProduct.prod_chars.find(x => x.name === "Βάρος (κιλά)")
        let weight = parseFloat(chars.value.replace("kg", "").replace(",", ".").trim()) * 1000

        scrapProduct.weight = parseInt(weight)
      }

      scrapProduct.link = productLink
      scrapProduct.mpn = scrapProduct.prod_chars.find(x => x.name === "Part Number").value?.trim();
      scrapProduct.barcode = scrapProduct.prod_chars.find(x => x.name === "EAN Number").value?.trim();
      scrapProduct.model = scrapProduct.prod_chars.find(x => x.name === "Μοντέλο")?.value?.trim();
      scrapProduct.brand = scrapProduct.prod_chars.find(x => x.name === "Κατασκευαστής")?.value?.trim()

      scrapProduct.entry = entry
      scrapProduct.category = { title: category }
      scrapProduct.subcategory = { title: subcategory }
      scrapProduct.sub2category = { title: sub2category }

      // await this.importQuestProduct(scrapProduct, category, subcategory, sub2category,
      //         importRef, entry, auth)

      if (scrapProduct.imagesSrc.length !== 0) {
        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .importScrappedProduct(scrapProduct, importRef)
      }

    } catch (error) {
      console.log(error)
    }
    finally {
      page.close()
    }
  },
});
