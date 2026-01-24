'use strict';

/**
 * Quest Service - Scraping implementation
 * Works with QuestAdapter
 * 
 * Uses new cache-based flow:
 * 1. Scrape product list
 * 2. Filter via updateAndFilterScrapProducts (uses cache)
 * 3. For each product: scrape details → apply transformations → importScrappedProduct
 */
module.exports = ({ strapi }) => ({

  async parseQuest({ entry }) {
    try {
      // Get the adapter
      const adapter = strapi
        .plugin('import-products')
        .service('questAdapter')(entry);

      // Run import
      return await adapter.import();

    } catch (err) {
      console.error('Error in parseQuest:', err);
      return { message: "Error", error: err.message };
    }
  },

  async scrapQuest(importRef, entry) {
    let browser = null;
    let page = null;

    try {
      browser = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .createBrowser();

      const filteredCategories = { categories: [] };

      const loadImages = false;
      page = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .createPage(browser, loadImages);

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .loadCookies(entry.name, page);

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .retry(
          () => page.goto('https://www.questonline.gr', {
            waitUntil: "networkidle0",
            timeout: 30000
          }),
          10,
          false
        );

      const pageUrl = page.url();

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .sleep(strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .randomWait(1500, 2000));

      if (pageUrl?.includes('/Special-Pages/Logon')) {
        page = await this.loginQuest(page, entry.name);
      }

      await page.waitForSelector('div.nav-2-wrapper', { timeout: 10000 });

      const scrapCategories = await page.$eval('div.nav-2-wrapper', (element) => {
        const navList = element.querySelectorAll(".nav-2");
        const categories = [];

        for (let ul of navList) {
          const categoriesList = ul.querySelectorAll("li");

          for (let li of categoriesList) {
            try {
              const categoryAnchor = li.querySelector('a');
              const categoryTitleSpan = li.querySelector('span');

              if (!categoryAnchor || !categoryTitleSpan) continue;

              const title = categoryTitleSpan.textContent?.trim();
              const link = categoryAnchor.getAttribute("href");

              if (title && link) {
                categories.push({
                  title,
                  link,
                  subCategories: []
                });
              }
            } catch (err) {
              console.warn('Error processing category:', err);
            }
          }
        }
        return categories;
      }).catch(err => {
        console.error('Error extracting categories:', err);
        return [];
      });

      if (!scrapCategories || scrapCategories.length === 0) {
        throw new Error('No categories found');
      }

      const newCategories = strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .filterCategories(scrapCategories, importRef);

      filteredCategories.categories = newCategories;

      if (page) {
        await page.close().catch(err => console.error('Error closing initial page:', err));
      }

      // Process each category
      for (let category of newCategories) {
        if (!category || !category.link) continue;

        try {
          await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .sleep(strapi
              .plugin('import-products')
              .service('scrapHelpers')
              .randomWait(1500, 3000));

          await this.scrapQuestSubcategories(
            browser,
            category,
            filteredCategories,
            importRef,
            entry
          );
        } catch (err) {
          console.error(`Error processing category ${category.title}:`, err.message);
        }
      }

      return { message: "ok" };
    } catch (error) {
      console.error('Error in scrapQuest:', error);
      return { message: "error", error: error.message };
    } finally {
      if (browser) {
        await browser.close().catch(err => console.error('Error closing browser:', err));
      }
    }
  },

  /**
   * Login to Quest
   */
  async loginQuest(page, supplier) {
    try {
      if (!page) throw new Error('Page is required');

      await page.waitForSelector('body', { timeout: 10000 });
      const bodyHandle = await page.$('body');
      if (!bodyHandle) throw new Error('Body not found');

      // Handle cookie consent
      const acceptCookiesForm = await page.$('#CybotCookiebotDialog');
      if (acceptCookiesForm) {
        const acceptCookiesButton = await page.$('#CybotCookiebotDialogBodyButtonAccept');
        if (acceptCookiesButton) {
          await acceptCookiesButton.click().catch(err =>
            console.warn('Could not click cookie button:', err.message)
          );
        }
      }

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .sleep(2000);

      await page.waitForSelector('#form', { timeout: 10000 });
      const formHandle = await bodyHandle.$('#form');
      if (!formHandle) throw new Error('Login form not found');

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .sleep(2000);

      const modal = await formHandle.$('.modal-content');
      if (modal) {
        const closeModal = await modal.$('.close');
        if (closeModal) {
          await closeModal.click().catch(err =>
            console.warn('Could not close modal:', err.message)
          );
        }
      }

      const usernameWrapper = await formHandle.$('#username');
      const passwordWrapper = await formHandle.$('#password');
      const button = await formHandle.$('#submit-button');

      if (!usernameWrapper || !passwordWrapper || !button) {
        throw new Error('Login form elements not found');
      }

      const username = await usernameWrapper.$('input');
      const password = await passwordWrapper.$('input');

      if (!username || !password) {
        throw new Error('Login input fields not found');
      }

      const usernameValue = process.env.QUEST_USERNAME;
      const passwordValue = process.env.QUEST_PASSWORD;

      if (!usernameValue || !passwordValue) {
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
        page.waitForNavigation({
          waitUntil: 'networkidle0',
          timeout: 30000
        }).catch(err => console.warn('Navigation timeout:', err.message))
      ]);

      const cookies = await page.cookies();
      if (cookies && cookies.length > 0) {
        const cookiesJson = JSON.stringify(cookies, null, 2);
        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .saveCookies(supplier, cookiesJson);
      }

      return page;
    } catch (error) {
      console.error('Error in loginQuest:', error);
      throw error;
    }
  },

  /**
   * Scrape subcategories (level 1)
   */
  async scrapQuestSubcategories(browser, category, filteredCategories, importRef, entry) {
    let page = null;

    try {
      if (!category || !category.link) {
        console.warn('Invalid category');
        return;
      }

      const loadImages = false;
      page = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .createPage(browser, loadImages);

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .retry(
          () => page.goto(`https://www.questonline.gr${category.link}`, {
            waitUntil: "networkidle0",
            timeout: 30000
          }),
          10,
          false
        );

      await page.waitForSelector('.side-menu', { timeout: 10000 });

      const scrapSub = await page.$eval('.side-menu', (element) => {
        const subList = element.querySelector('ul');
        if (!subList) return [];

        const subcategoriesList = subList.querySelectorAll('li');
        const subcategories = [];

        for (let sub of subcategoriesList) {
          try {
            const subcategoryAnchor = sub.querySelector('a');
            if (!subcategoryAnchor) continue;

            const title = subcategoryAnchor.textContent?.trim();
            const link = subcategoryAnchor.getAttribute('href');

            if (title && link) {
              subcategories.push({
                title,
                link,
                subCategories: []
              });
            }
          } catch (err) {
            console.warn('Error processing subcategory:', err);
          }
        }
        return subcategories;
      }).catch(err => {
        console.error('Error extracting subcategories:', err);
        return [];
      });

      const catIndex = filteredCategories.categories.findIndex(x => x.title === category.title);
      if (catIndex === -1) {
        console.warn(`Category ${category.title} not found`);
        return;
      }

      filteredCategories.categories[catIndex].subCategories = scrapSub;
      filteredCategories.categories = strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .filterCategories(filteredCategories.categories, importRef);

      for (let sub of filteredCategories.categories[catIndex].subCategories) {
        if (!sub || !sub.link) continue;

        try {
          await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .sleep(strapi
              .plugin('import-products')
              .service('scrapHelpers')
              .randomWait(4000, 10000));

          await this.scrapQuestSubcategories2(
            browser,
            category.title,
            sub,
            filteredCategories,
            importRef,
            entry
          );
        } catch (err) {
          console.error(`Error processing subcategory ${sub.title}:`, err.message);
        }
      }
    } catch (error) {
      console.error(`Error in scrapQuestSubcategories for ${category?.title}:`, error);
    } finally {
      if (page) {
        await page.close().catch(err => console.error('Error closing page:', err));
      }
    }
  },

  /**
   * Scrape subcategories (level 2)
   */
  async scrapQuestSubcategories2(browser, category, subcategory, filteredCategories, importRef, entry) {
    let page = null;

    try {
      if (!subcategory || !subcategory.link) {
        console.warn('Invalid subcategory');
        return;
      }

      const loadImages = false;
      page = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .createPage(browser, loadImages);

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .retry(
          () => page.goto(`https://www.questonline.gr${subcategory.link}`, {
            waitUntil: "networkidle0",
            timeout: 30000
          }),
          10,
          false
        );

      const sideMenu = await page.$('.side-menu');

      const catIndex = filteredCategories.categories.findIndex(x => x.title === category);
      if (catIndex === -1) {
        console.warn(`Category ${category} not found`);
        return;
      }

      const subIndex = filteredCategories.categories[catIndex].subCategories.findIndex(
        x => x.title === subcategory.title
      );
      if (subIndex === -1) {
        console.warn(`Subcategory ${subcategory.title} not found`);
        return;
      }

      if (sideMenu) {
        // Has sub2categories
        const scrapSub = await page.$eval('.side-menu', (element) => {
          const subList = element.querySelector('ul');
          if (!subList) return [];

          const subcategoriesList = subList.querySelectorAll('li');
          const subcategories = [];

          for (let sub of subcategoriesList) {
            try {
              const subcategoryAnchor = sub.querySelector('a');
              if (!subcategoryAnchor) continue;

              const title = subcategoryAnchor.textContent?.trim();
              const link = subcategoryAnchor.getAttribute('href');

              if (title && link) {
                subcategories.push({
                  title,
                  link,
                  subCategories: []
                });
              }
            } catch (err) {
              console.warn('Error processing sub2category:', err);
            }
          }
          return subcategories;
        }).catch(err => {
          console.error('Error extracting sub2categories:', err);
          return [];
        });

        filteredCategories.categories[catIndex].subCategories[subIndex].subCategories = scrapSub;
        filteredCategories.categories = strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .filterCategories(filteredCategories.categories, importRef);

        for (let sub2 of filteredCategories.categories[catIndex].subCategories[subIndex].subCategories) {
          if (!sub2 || !sub2.link) continue;

          try {
            await this.scrapQuestCategory(
              browser,
              sub2.link,
              category,
              subcategory.title,
              sub2.title,
              importRef,
              entry
            );
            await strapi
              .plugin('import-products')
              .service('scrapHelpers')
              .sleep(strapi
                .plugin('import-products')
                .service('scrapHelpers')
                .randomWait(1000, 3000));
          } catch (err) {
            console.error(`Error processing sub2category ${sub2.title}:`, err.message);
          }
        }
      } else {
        // No sub2categories
        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .sleep(strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .randomWait(4000, 10000));

        await this.scrapQuestCategory(
          browser,
          subcategory.link,
          category,
          subcategory.title,
          null,
          importRef,
          entry
        );
      }

    } catch (error) {
      console.error(`Error in scrapQuestSubcategories2 for ${subcategory?.title}:`, error);
    } finally {
      if (page) {
        await page.close().catch(err => console.error('Error closing page:', err));
      }
    }
  },

  async scrapQuestCategory(browser, link, category, subcategory, sub2category, importRef, entry) {
    let page = null;

    try {
      if (!link) {
        console.warn('Invalid category link');
        return;
      }

      const loadImages = false;
      page = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .createPage(browser, loadImages);

      await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .retry(
          () => page.goto(
            `https://www.questonline.gr${link}?pagesize=300`,
            {
              waitUntil: "networkidle0",
              timeout: 30000
            }
          ),
          10,
          false
        );

      await page.waitForSelector('div.region-area-three>div.inner-area.inner-area-three', {
        timeout: 10000
      });

      const scrapProducts = await page.$eval(
        'div.region-area-three>div.inner-area.inner-area-three',
        (element) => {
          const productListWrapper = element.querySelector('div.box>ul.product-list');
          if (!productListWrapper) return [];

          const productList = productListWrapper.querySelectorAll(
            'li>article>div.description-container'
          );
          const products = [];

          for (let prod of productList) {
            try {
              const leftContainer = prod.querySelector('div.description-container-left');
              if (!leftContainer) continue;

              const titleWrapper = leftContainer.querySelector(
                'header.title-container>h2.title>a'
              );
              if (!titleWrapper) continue;

              const name = titleWrapper.textContent?.trim();
              const linkHref = titleWrapper.getAttribute('href');
              if (!name || !linkHref) continue;

              const product = {
                name,
                link: `https://www.questonline.gr${linkHref}`
              };

              const codeElement = leftContainer.querySelector('.product-code');
              const codeText = codeElement?.textContent || '';
              const codeParts = codeText.split('.');
              product.supplierCode = codeParts.length > 1 ? codeParts[1].trim() : '';

              const inOffer = leftContainer.querySelector('.offer');
              if (inOffer) {
                const discountElement = leftContainer.querySelector('.discount>span');
                const discount = discountElement?.textContent
                  ?.replace("%", "")
                  .replace("-", "") || '0';
                product.in_offer = true;
                product.discount = discount;
              } else {
                product.in_offer = false;
                product.discount = 0;
              }

              const rightContainer = prod.querySelector('.description-container-right');
              if (rightContainer) {
                const availElement = rightContainer.querySelector('div.availability>span');
                product.stock_level = availElement?.textContent?.trim() || '';

                const priceWrapper = rightContainer.querySelector('.price-container');
                if (priceWrapper) {
                  const initialWholesale = priceWrapper.querySelector('.deleted-price');
                  if (initialWholesale) {
                    product.initial_wholesale = initialWholesale.textContent
                      ?.replace('€', '')
                      .replace(',', '.')
                      .trim() || '';
                  }

                  const finalPrice = priceWrapper.querySelector('.final-price');
                  product.wholesale = finalPrice?.textContent
                    ?.replace('€', '')
                    .replace(',', '.')
                    .trim() || '0';
                }
              }

              products.push(product);
            } catch (err) {
              console.warn('Error processing product in list:', err);
            }
          }
          return products;
        }
      ).catch(err => {
        console.error('Error extracting products:', err);
        return [];
      });

      if (!scrapProducts || scrapProducts.length === 0) {
        // console.log(`No products found in ${category} > ${subcategory}`);
        return;
      }

      // ✅ Filter + Check existing products in one call
      const { products: toCreate, updateProducts } = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .updateAndFilterScrapProducts(
          scrapProducts,
          category,
          subcategory,
          sub2category,
          importRef,
          entry
        );

      // console.log(`📦 Found ${toCreate.length + updateProducts.length} products in ${category} > ${subcategory}`);

      for (let product of updateProducts) {
        if (!product || !product.link) continue;

        try {
          // ✅ CHECK: Does it need full scrape?
          const needsFullScrape = await this.needsFullScrapQuestProduct(
            product,
            category,
            subcategory,
            sub2category,
            entry
          );

          if (!needsFullScrape) {
            // ✅ QUICK UPDATE: Just update prices, no scraping
            // console.log(`⏭️  Skipping full scrape, updating prices: ${product.name}`);
            await this.quickUpdateQuestProduct(
              product,
              category,
              subcategory,
              sub2category,
              importRef,
              entry
            );
            continue;
          }

          await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .sleep(strapi
              .plugin('import-products')
              .service('scrapHelpers')
              .randomWait(2000, 5000));

          // ✅ FULL SCRAPE: Product is new or missing data
          await this.scrapQuestProduct(
            browser,
            product,
            category,
            subcategory,
            sub2category,
            importRef,
            entry
          );

        } catch (err) {
          console.error(`Error processing product ${product?.name}:`, err.message);
        }
      }

      // ✅ Process each product - smart decision tree
      for (let product of toCreate) {
        if (!product || !product.link) continue;

        try {
          await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .sleep(strapi
              .plugin('import-products')
              .service('scrapHelpers')
              .randomWait(1000, 3000));

          // ✅ FULL SCRAPE: Product is new or missing data
          await this.scrapQuestProduct(
            browser,
            product,
            category,
            subcategory,
            sub2category,
            importRef,
            entry
          );

        } catch (err) {
          console.error(`Error processing product ${product?.name}:`, err.message);
        }
      }


    } catch (error) {
      console.error(`Error in scrapQuestCategory for ${category} > ${subcategory}:`, error);
    } finally {
      if (page) {
        await page.close().catch(err => console.error('Error closing page:', err));
      }
    }
  },

  /**
   * FIXED: needsFullScrapQuestProduct
   * 
   * Checks if product already exists AND has all required data
   * Returns TRUE if needs full scrape, FALSE if quick update is enough
   */
  async needsFullScrapQuestProduct(productMeta, category, subcategory, sub2category, entry) {
    try {
      if (!productMeta._existingId) {
        // console.log(`🆕 NEW product (no existing ID): ${productMeta.name}`);
        return true; // New product - needs full scrape
      }

      // ✅ Get existing product details
      const existingProduct = await strapi.entityService.findOne(
        'api::product.product',
        productMeta._existingId,
        {
          fields: ['id', 'name', 'weight'],
          populate: {
            prod_chars: { fields: ['id'], limit: 1 },
            image: { fields: ['id'], limit: 1 },
            additionalImages: { fields: ['id'], limit: 5 }
          }
        }
      ).catch(err => {
        console.warn(`Error fetching product ${productMeta._existingId}:`, err.message);
        return null;
      });

      if (!existingProduct) {
        console.log(`❌ Existing product not found: ${productMeta._existingId}`);
        return true;
      }

      // ✅ Check completeness
      const hasImages = !!(existingProduct.image?.id ||
        (existingProduct.additionalImages && existingProduct.additionalImages.length > 0));
      const hasCharacteristics = !!(existingProduct.prod_chars && existingProduct.prod_chars.length > 0);

      if (!hasImages) {
        console.log(`🖼️  Missing images: ${productMeta.name}`);
        return true;
      }

      if (!hasCharacteristics) {
        console.log(`📋 Missing characteristics: ${productMeta.name}`);
        return true;
      }

      // ✅ Product is complete - just update prices
      console.log(`✅ Complete & current: ${productMeta.name}`);
      return false;

    } catch (error) {
      console.error(`Error in needsFullScrapQuestProduct:`, error.message);
      return true; // Default to full scrape on error
    }
  },

  /**
   * FIXED: quickUpdateQuestProduct
   * 
   * Fast update: only prices + stock from list page data
   * NO new scraping, NO image processing
   */
  async quickUpdateQuestProduct(productMeta, category, subcategory, sub2category, importRef, entry) {
    try {
      if (!productMeta._existingId) {
        console.warn(`⚠️  No existing ID for quick update: ${productMeta.name}`);
        return;
      }

      // ✅ Create minimal product object (only fields that changed)
      const product = {
        entry,
        name: productMeta.name,
        supplierCode: productMeta.supplierCode,
        wholesale: productMeta.wholesale,
        initial_wholesale: productMeta.initial_wholesale,
        in_offer: productMeta.in_offer,
        discount: productMeta.discount,
        stock_level: productMeta.stock_level,
        category: { title: category },
        subcategory: { title: subcategory },
        sub2category: { title: sub2category }
      };

      // ✅ Get existing product by ID - FULL populate like cache does
      const existingProduct = await strapi.db.query('api::product.product').findOne({
        where: { id: productMeta._existingId },
        populate: {
          supplierInfo: {
            populate: {
              price_progress: true,
            }
          },
          related_import: true,
          brand: true,
          category: {
            populate: {
              cat_percentage: {
                populate: {
                  brand_perc: {
                    populate: {
                      brand: true
                    }
                  }
                }
              }
            }
          },
          platforms: true,
          prod_chars: true
        }
      }).catch(err => {
        console.warn(`Error fetching product for update:`, err.message);
        return null;
      });

      if (!existingProduct) {
        console.warn(`❌ Product not found for update: ${productMeta._existingId}`);
        return;
      }

      // ✅ Update product (prices only)
      const result = await strapi
        .plugin('import-products')
        .service('importHelpers')
        .updateEntry(existingProduct, product, importRef);

      if (result?.success) {
        console.log(`💰 Quick update: ${product.name}`);
      } else {
        console.warn(`❌ Quick update failed: ${product.name}`);
      }

    } catch (error) {
      console.error(`Error in quickUpdateQuestProduct:`, error.message);
    }
  },

  /**
   * Scrape individual product details AND import
   * ✅ KEY CHANGE: Scrape → Transform → Import (one-by-one)
   */
  async scrapQuestProduct(browser, productMeta, category, subcategory, sub2category, importRef, entry) {
    let page = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!productMeta.link) {
          throw new Error('Product link is required');
        }

        const loadImages = true;
        page = await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .createPage(browser, loadImages);

        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .retry(
            () => page.goto(productMeta.link, {
              waitUntil: "networkidle0",
              timeout: 30000
            }),
            10,
            false
          );

        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .sleep(strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .randomWait(3000, 10000));

        await page.waitForSelector('.details-page', { timeout: 10000 });

        const scrapProduct = await page.$eval('.details-page', (scrap) => {
          try {
            const product = {};

            const element = scrap.querySelector('div.content-container div.region-area-two');
            if (!element) return null;

            const titleWrapper = element.querySelector('.inner-area-one .title');
            product.name = titleWrapper?.textContent?.trim();
            if (!product.name) return null;

            const imageWrapper = element.querySelectorAll('.box-two #image-container .owl-item li a img');
            product.imagesSrc = [];
            for (let imgSrc of imageWrapper) {
              try {
                const srcAttr = imgSrc.getAttribute('src');
                if (!srcAttr) continue;

                const src = srcAttr.split('?')[0];

                if (src.startsWith('/')) {
                  product.imagesSrc.push({
                    url: `https://www.questonline.gr${src}?maxsidesize=1024`
                  });
                } else if (!src.endsWith('.jpg.aspx') &&
                  !src.endsWith('.jpeg.aspx') &&
                  !src.endsWith('.png.aspx')) {
                  product.imagesSrc.push({ url: `${src}?maxsidesize=1024` });
                }
              } catch (err) {
                console.warn('Error processing image:', err);
              }
            }

            const priceWrapper = element.querySelector('.box-three');
            if (priceWrapper) {
              const initialPrice = priceWrapper.querySelector('.deleted-price');
              product.initial_wholesale = initialPrice?.textContent
                ?.replace('€', '')
                .replace(',', '.')
                .trim();

              const finalPrice = priceWrapper.querySelector('.final-price');
              product.wholesale = finalPrice?.textContent
                ?.replace('€', '')
                .replace(',', '.')
                .trim() || '0';

              const availElement = priceWrapper.querySelector('#realAvail');
              product.stock_level = availElement?.textContent?.trim() || '';
            }

            const tabsWrapper = scrap.querySelector('.details-info .accordion-container .technical-charact');
            product.prod_chars = [];

            if (tabsWrapper) {
              const liWrappers = tabsWrapper.querySelectorAll('li');

              for (let i = 0; i < liWrappers.length; i += 2) {
                try {
                  if (i + 1 < liWrappers.length) {
                    const nameElement = liWrappers[i].querySelector('span');
                    const valueElement = liWrappers[i + 1].querySelector('span');

                    const name = nameElement?.textContent?.trim();
                    const value = valueElement?.textContent?.trim();

                    if (name && value) {
                      product.prod_chars.push({ name, value });
                    }
                  }
                } catch (err) {
                  console.warn('Error processing characteristic:', err);
                }
              }
            }

            return product;
          } catch (error) {
            console.error('Error in product extraction:', error);
            return null;
          }
        }).catch(err => {
          console.error('Error evaluating product page:', err);
          return null;
        });

        if (!scrapProduct) {
          throw new Error('Failed to extract product data');
        }

        // ✅ Merge with metadata from list page
        const product = {
          ...productMeta,
          ...scrapProduct,
          link: productMeta.link,
          entry,
          category: { title: category || '' },
          subcategory: { title: subcategory || '' },
          sub2category: { title: sub2category }
        };

        if (scrapProduct.prod_chars && scrapProduct.prod_chars.length > 0) {
          const brandChar = scrapProduct.prod_chars.find(x => x.name === 'Κατασκευαστής');

          if (brandChar && brandChar.value) {
            product.brand = brandChar.value.trim(); // Προσθήκη .trim() για ασφάλεια
          }
        }

        // ✅ Import product (transformProduct will be called by QuestAdapter)
        if (product.imagesSrc && product.imagesSrc.length !== 0) {
          await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .importScrappedProduct(product, importRef);
        } else {
          console.warn(`⚠️  Product ${product.name} has no images, skipping`);
        }

        // Success - exit retry loop
        break;

      } catch (error) {
        console.error(
          `Error scraping product (attempt ${attempt}/${maxRetries}):`,
          error.message
        );

        if (attempt === maxRetries) {
          console.error(`❌ Failed after ${maxRetries} attempts`);
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      } finally {
        if (page) {
          await page.close().catch(err => console.error('Error closing product page:', err));
          page = null;
        }
      }
    }
  },
});