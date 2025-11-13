'use strict';

module.exports = ({ strapi }) => ({

  async parseQuest({ entry }) {
    try {
      if (!entry) {
        throw new Error('Entry is required');
      }

      const importRef = await strapi
        .plugin('import-products')
        .service('importHelpers')
        .createImportRef(entry);

      if (!entry.isActive) {
        await strapi
          .plugin('import-products')
          .service('importHelpers')
          .deleteEntry(entry, importRef);
        return { message: "ok", info: "Entry is inactive, deleted products" };
      }

      const response = await this.scrapQuest(importRef, entry);

      if (response?.message === "error") {
        const report = `Created: ${importRef.created || 0}, Updated: ${importRef.updated || 0}, ` +
          `Republished: ${importRef.republished || 0}, Skipped: ${importRef.skipped || 0}, ` +
          `Deleted: ${importRef.deleted || 0}. Δημιουργήθηκε σφάλμα κατά τη διαδικασία.`;
        
        await strapi.entityService.update('plugin::import-products.importxml', entry.id, {
          data: {
            lastRun: new Date(),
            report,
          },
        });
        return { message: "error", report };
      } else {
        await strapi
          .plugin('import-products')
          .service('importHelpers')
          .deleteEntry(entry, importRef);
      }

      console.log("End of Import");
      return { message: "ok" };
    } catch (error) {
      console.error('Critical error in parseQuest:', error);
      return { message: "error", error: error.message };
    }
  },

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

      // Handle modal if present
      const modal = await formHandle.$('.modal-content');
      if (modal) {
        const closeModal = await modal.$('.close');
        if (closeModal) {
          await closeModal.click().catch(err => 
            console.warn('Could not close modal:', err.message)
          );
        }
      }

      // Login form elements
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

  async scrapQuest(importRef, entry) {
    let browser = null;
    let page = null;

    try {
      browser = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .createBrowser();

      const filteredCategories = {
        categories: [],
      };

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
          () => page.goto('https://www.questonline.gr', { waitUntil: "networkidle0", timeout: 30000 }),
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

          await this.scrapQuestSubcategories(browser, category, filteredCategories, importRef, entry);
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
        console.warn(`Category ${category.title} not found in filtered categories`);
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

          await this.scrapQuestSubcategories2(browser, category.title, sub, filteredCategories, importRef, entry);
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

      const subIndex = filteredCategories.categories[catIndex].subCategories.findIndex(x => x.title === subcategory.title);
      if (subIndex === -1) {
        console.warn(`Subcategory ${subcategory.title} not found`);
        return;
      }

      if (sideMenu) {
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
            await this.scrapQuestCategory(browser, sub2.link, category, subcategory.title, sub2.title, importRef, entry);
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
        await strapi
          .plugin('import-products')
          .service('scrapHelpers')
          .sleep(strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .randomWait(4000, 10000));

        await this.scrapQuestCategory(browser, subcategory.link, category, subcategory.title, null, importRef, entry);
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
          () => page.goto(`https://www.questonline.gr${link}?pagesize=300&skuavailableindays=1`, { 
            waitUntil: "networkidle0",
            timeout: 30000 
          }),
          10,
          false
        );

      await page.waitForSelector('div.region-area-three>div.inner-area.inner-area-three', { timeout: 10000 });

      const scrapProducts = await page.$eval('div.region-area-three>div.inner-area.inner-area-three', (element) => {
        const productListWrapper = element.querySelector('div.box>ul.product-list');
        if (!productListWrapper) return [];

        const productList = productListWrapper.querySelectorAll('li>article>div.description-container');
        const products = [];

        for (let prod of productList) {
          try {
            const leftContainer = prod.querySelector('div.description-container-left');
            if (!leftContainer) continue;

            const titleWrapper = leftContainer.querySelector('header.title-container>h2.title>a');
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
              const discount = discountElement?.textContent?.replace("%", "").replace("-", "") || '0';
              product.in_offer = true;
              product.discount = discount;
            } else {
              product.in_offer = false;
              product.discount = 0;
            }

            const rightContainer = prod.querySelector('.description-container-right');
            if (rightContainer) {
              const availElement = rightContainer.querySelector('div.availability>span');
              product.stockLevel = availElement?.textContent?.trim() || '';

              const priceWrapper = rightContainer.querySelector('.price-container');
              if (priceWrapper) {
                const initialWholesale = priceWrapper.querySelector('.deleted-price');
                if (initialWholesale) {
                  product.initial_wholesale = initialWholesale.textContent?.replace('€', '').replace(',', '.').trim() || '';
                }

                const finalPrice = priceWrapper.querySelector('.final-price');
                product.wholesale = finalPrice?.textContent?.replace('€', '').replace(',', '.').trim() || '0';
              }
            }

            products.push(product);
          } catch (err) {
            console.warn('Error processing product in list:', err);
          }
        }
        return products;
      }).catch(err => {
        console.error('Error extracting products:', err);
        return [];
      });

      if (!scrapProducts || scrapProducts.length === 0) {
        console.log(`No products found in ${category} > ${subcategory}`);
        return;
      }

      const products = await strapi
        .plugin('import-products')
        .service('scrapHelpers')
        .updateAndFilterScrapProducts(scrapProducts, category, subcategory, sub2category, importRef, entry);

      for (let product of products) {
        if (!product || !product.link) continue;

        try {
          await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .sleep(strapi
              .plugin('import-products')
              .service('scrapHelpers')
              .randomWait(3000, 7000));

          await this.scrapQuestProduct(browser, product.link, category, subcategory, sub2category, importRef, entry);
        } catch (err) {
          console.error(`Error scraping product ${product.link}:`, err.message);
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

  async scrapQuestProduct(browser, productLink, category, subcategory, sub2category, importRef, entry) {
    let page = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!productLink) {
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
            () => page.goto(productLink, { waitUntil: "networkidle0", timeout: 30000 }),
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

            const supplierCodeWrapper = element.querySelector('#SkuNumber');
            const codeText = supplierCodeWrapper?.textContent || '';
            const codeParts = codeText.split('.');
            product.supplierCode = codeParts.length > 1 ? codeParts[1].trim() : '';

            const inOffer = element.querySelector('.offer');
            if (inOffer) {
              const discountElement = element.querySelector('.discount>span');
              const discount = discountElement?.textContent?.replace("%", "").replace("-", "") || '0';
              product.in_offer = true;
              product.discount = discount;
            } else {
              product.in_offer = false;
              product.discount = 0;
            }

            const imageWrapper = element.querySelectorAll('.box-two .thumbnails li img');
            product.imagesSrc = [];
            for (let imgSrc of imageWrapper) {
              try {
                const srcAttr = imgSrc.getAttribute('src');
                if (!srcAttr) continue;

                const src = srcAttr.split('?')[0];
                
                if (src.startsWith('/')) { 
                  product.imagesSrc.push({ url: `https://www.questonline.gr${src}?maxsidesize=1024` });
                } else if (!src.endsWith('.jpg.aspx') && !src.endsWith('.jpeg.aspx') && !src.endsWith('.png.aspx')) {
                  product.imagesSrc.push({ url: `${src}?maxsidesize=1024` });
                }
              } catch (err) {
                console.warn('Error processing image:', err);
              }
            }

            const priceWrapper = element.querySelector('.box-three');
            if (priceWrapper) {
              const initialPrice = priceWrapper.querySelector('.deleted-price');
              product.initial_wholesale = initialPrice?.textContent?.replace('€', '').replace(',', '.').trim();

              const finalPrice = priceWrapper.querySelector('.final-price');
              product.wholesale = finalPrice?.textContent?.replace('€', '').replace(',', '.').trim() || '0';

              const availElement = priceWrapper.querySelector('#realAvail');
              product.stockLevel = availElement?.textContent?.trim() || '';
            }

            switch (product.stockLevel) {
              case 'Διαθέσιμο':
                product.status = "InStock";
                break;
              case 'Διαθέσιμο - Περιορισμένη ποσότητα':
                product.status = "LowStock";
                break;
              default:
                product.status = "OutOfStock";
                break;
            }

            const tabsWrapper = scrap.querySelector('.tabs-content .technical-charact');
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

        // Process weight
        const weightKgChar = scrapProduct.prod_chars?.find(x => x.name === "Μεικτό βάρος");
        const weightChar = scrapProduct.prod_chars?.find(x => x.name === "Βάρος (κιλά)");
        
        if (weightKgChar?.value) {
          try {
            const weight = parseFloat(weightKgChar.value.replace("kg", "").replace(",", ".").trim()) * 1000;
            scrapProduct.weight = parseInt(weight);
          } catch (err) {
            console.warn('Error parsing weight:', err);
          }
        } else if (weightChar?.value) {
          try {
            const weight = parseFloat(weightChar.value.replace("kg", "").replace(",", ".").trim()) * 1000;
            scrapProduct.weight = parseInt(weight);
          } catch (err) {
            console.warn('Error parsing weight:', err);
          }
        }

        scrapProduct.link = productLink;
        scrapProduct.mpn = scrapProduct.prod_chars?.find(x => x.name === "Part Number")?.value?.trim();
        scrapProduct.barcode = scrapProduct.prod_chars?.find(x => x.name === "EAN Number")?.value?.trim();
        scrapProduct.model = scrapProduct.prod_chars?.find(x => x.name === "Μοντέλο")?.value?.trim();
        scrapProduct.brand = scrapProduct.prod_chars?.find(x => x.name === "Κατασκευαστής")?.value?.trim();

        scrapProduct.entry = entry;
        scrapProduct.category = { title: category || '' };
        scrapProduct.subcategory = { title: subcategory || '' };
        scrapProduct.sub2category = { title: sub2category };

        if (scrapProduct.imagesSrc && scrapProduct.imagesSrc.length !== 0) {
          await strapi
            .plugin('import-products')
            .service('scrapHelpers')
            .importScrappedProduct(scrapProduct, importRef);
        } else {
          console.warn(`Product ${productLink} has no images, skipping import`);
        }

        // Success - exit retry loop
        break;

      } catch (error) {
        console.error(`Error scraping product ${productLink} (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt === maxRetries) {
          console.error(`Failed to scrape product after ${maxRetries} attempts: ${productLink}`);
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