export default {
  async afterUpdate(event) {
    try {
      const { result } = event;

      // ── Φόρτωσε category με populate ─────────────────────────────
      const category = await strapi.entityService.findOne(
        'api::category.category',
        String(result.id),
        {
          populate: {
            cat_percentage: {
              populate: {
                brand_perc: { populate: { brand: true } }
              }
            }
          }
        }
      );

      // ── Φόρτωσε products της κατηγορίας ──────────────────────────
      const products = await strapi.entityService.findMany('api::product.product', {
        filters: {
          $and: [
            { category: result.id },
            { publishedAt: { $notNull: true } }
          ],
        },
        populate: {
          supplierInfo: true,
          brand:        true,
          platforms:    true,
        },
      });

      const priceService = strapi.plugin('import-products').service('priceHelpers');

      for (let product of products) {

        // ── Guard: αν δεν υπάρχουν καθόλου suppliers, skip ────────
        if (!product.supplierInfo || product.supplierInfo.length === 0) {
          continue;
        }

        // ── Guard: αν δεν υπάρχουν in_stock suppliers, skip ───────
        // (το setPrice θα κρατήσει την υπάρχουσα τιμή για scenario 2A,
        //  αλλά δεν χρειάζεται να τρέξουμε καθόλου αν δεν υπάρχει stock)
        const hasInStock = product.supplierInfo.some(x => x.in_stock === true);
        if (!hasInStock) {
          continue;
        }

        try {
          // ── Υπολόγισε τιμές με τη νέα λογική ─────────────────
          // Περνάμε ΟΛΑ τα supplierInfo — το setPrice κάνει το φιλτράρισμα εσωτερικά
          const prices = await priceService.setPrice(
            product,              // existedProduct
            product.supplierInfo, // ΟΛΑ τα suppliers (setPrice φιλτράρει εσωτερικά)
            category,             // categoryInfo με cat_percentage + customer_share_pct
            product               // product (για retail_price, brand, name, recycle_tax)
          );

          const data: any = {};
          const hasInventory = product.inventory > 0;

          // ── General price (μόνο αν δεν υπάρχει inventory) ────
          if (!hasInventory) {
            const newGeneralPrice = parseFloat(prices.generalPrice.price);
            const existingPrice   = Number(product.price);

            if (!product.is_fixed_price) {
              if (newGeneralPrice !== existingPrice) {
                data.price = newGeneralPrice;
              }
            } else if (existingPrice < newGeneralPrice) {
              data.price          = newGeneralPrice;
              data.is_fixed_price = false;
            }
          }

          // ── Platform prices (μόνο αν δεν υπάρχει inventory) ──
          if (!hasInventory) {
            const skroutz  = product.platforms?.find(x => x.platform === 'Skroutz');
            const shopflix = product.platforms?.find(x => x.platform === 'Shopflix');

            const newSkroutzPrice  = parseFloat(prices.skroutzPrice.price);
            const newShopflixPrice = parseFloat(prices.shopflixPrice.price);

            const skroutzChanged  = newSkroutzPrice  !== Number(skroutz?.price);
            const shopflixChanged = newShopflixPrice !== Number(shopflix?.price);

            if (skroutzChanged || shopflixChanged) {
              data.platforms = [
                {
                  ...(skroutz  || {}),
                  platform:       'Skroutz',
                  price:          newSkroutzPrice,
                  is_fixed_price: prices.skroutzPrice.is_fixed_price ?? false,
                },
                {
                  ...(shopflix || {}),
                  platform:       'Shopflix',
                  price:          newShopflixPrice,
                  is_fixed_price: prices.shopflixPrice.is_fixed_price ?? false,
                },
              ];
            }
          }

          // ── Update μόνο αν υπάρχουν αλλαγές ──────────────────
          if (Object.keys(data).length !== 0) {
            await strapi.entityService.update('api::product.product', product.id, { data });
          }

        } catch (productError) {
          // Αν ένα product αποτύχει, συνέχισε με τα υπόλοιπα
          console.error(`Error updating product ${product.id} (${product.name}):`, productError);
          continue;
        }
      }

    } catch (error) {
      console.error('Error in category afterUpdate lifecycle:', error);
    }
  },
};