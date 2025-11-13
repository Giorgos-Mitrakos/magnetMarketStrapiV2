'use strict';

module.exports = ({ strapi }) => ({
  async parseTelehermesXml({ entry }) {
    try {
      const importRef = await strapi
        .plugin('import-products')
        .service('importHelpers')
        .createImportRef(entry);

      // Αντιστοιχώ τα πεδία του xml του προμηθευτή με τα πεδία που σχετίζονται με τη βάση
      importRef.mapFields = {
        //  isGreater = true όταν η διαθεσιμότητα είναι με αριθμό τεμαχίων
        // isGreater = φαλσε όταν η διαθεσιμότητα είναι με όνομα
        isGreater: false,
        // splitter , αν η κατηγορίες στο xml βρίσκονται σε ένα πεδίο με διαχωρισμό 
        // μέσω καποιου χαρακτήρα συνήθως (/ ή >) αλλιώς αν υπάρχουν ξεχωριστά πεδία για τις
        // υποκατηγορίες βάζω null
        splitter: null,
        category: 'category_level_1',
        subcategory: 'category_level_2',
        sub2category: null,
        stock_level: 'availability',
        wholesale: 'wholesale_price',
        retail_price: 'retail_price',
        recycle_tax: null,
        in_offer: null,
        name: 'title',
        brand: 'manufacturer',
        mpn: 'mpn',
        model: null,
        barcode: 'ean',
        supplierCode: 'sku',
        description: 'full_description',
        short_description: 'short_description',
        image: 'image',
        additional_images: null,
        additional_files: null,
        supplierProductURL: null,
        attributes: 'specifications.item',
        weight: null,
        width: null,
        length: null,
        height: null,
        skoutz_url: null
      }

      if (!entry.isActive) {
        await strapi
          .plugin('import-products')
          .service('importHelpers')
          .deleteEntry(entry, importRef);
      }
      else {

        const { products, message } = await this.getTelehermesData(entry, importRef);

        if (message === 'Error')
          return { message }

        if (products.length === 0)
          return { "message": "xml is empty" }

        for (let dt of products) {
          const product = await strapi
            .plugin('import-products')
            .service('productHelpers')
            .createProductFields(entry, dt, importRef)

          // Αν δεν υπάρχει ούτε mpn ούτε barcode προχώρα στην επόμενη εγγραφή
          if (!product.mpn && !product.barcode)
            continue

          product.wholesale = product.wholesale.replace('.', '').replace(',', '.')
          product.retail_price = product.retail_price.replace('.', '').replace(',', '.')

          const { entryCheck } = await strapi
            .plugin('import-products')
            .service('productHelpers')
            .checkIfProductExists(product.mpn, product.barcode, product.name, product.model);


          // αν δεν υπάρχει το προϊόν το δημιουργώ αλλιώς ενημερώνω 

          // αν δεν υπάρχει το προϊόν το δημιουργώ αλλιώς ενημερώνω 
          if (!entryCheck) {
            try {
              const result = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .createEntry(product, importRef);

              if (!result?.success) {
                console.log(`Failed to create product: ${dt.title}, reason: ${result?.reason}`)
              }
            } catch (error) {
              console.error("errors in create:", error, error.details?.errors, "Προϊόν:", dt.title)
            }
          }
          else {
            try {
              await strapi
                .plugin('import-products')
                .service('importHelpers')
                .updateEntry(entryCheck, product, importRef);
            } catch (error) {
              console.log(error)
            }
          }
        }

        await strapi
          .plugin('import-products')
          .service('importHelpers')
          .deleteEntry(entry, importRef);
      }
      console.log("End of Import")
      return { "message": "ok" }
    }
    catch (err) {
      console.log(err)
      return { "message": "Error" }
    }
  },

  async getTelehermesData(entry, importRef) {
    try {
      const url = `${entry.importedURL}`
      const config = {
        headers: {
          "Accept-Encoding": "gzip,deflate,compress"
        }
      }

      // Κατεβάζω το xml
      const { response, message } = await strapi
        .plugin('import-products')
        .service('importHelpers')
        .getXmlData(url, config)

      const { data } = await response

      if (message === 'Error')
        return { message }

      const xml = await strapi
        .plugin('import-products')
        .service('importHelpers')
        .parseXml(await data)

      const availableProducts = strapi
        .plugin('import-products')
        .service('productHelpers')
        .filterData(xml.telehermes.products[0].product, importRef.categoryMap, importRef.mapFields)

      return { products: availableProducts }

    } catch (error) {
      console.log(error)
    }
  },
});
