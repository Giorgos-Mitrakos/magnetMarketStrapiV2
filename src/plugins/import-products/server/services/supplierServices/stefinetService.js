'use strict';

const Axios = require('axios');
const fs = require('fs');

module.exports = ({ strapi }) => ({
  async parseStefinetXml({ entry }) {
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
        splitter: '::',
        category: 'category',
        subcategory: null,
        sub2category: null,
        stock_level: 'availStatus',
        wholesale: 'price',
        retail_price: 'SRP',
        recycle_tax: null,
        in_offer: null,
        name: 'descr',
        brand: 'manufacturer',
        mpn: 'code',
        model: null,
        barcode: 'barcode',
        supplierCode: 'productcode',
        description: 'fulldescr',
        short_description: null,
        image: 'mainimage',
        additional_images: 'detailimage',
        additional_files: null,
        supplierProductURL: 'PID',
        attributes: null,
        weight: 'weight',
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
        // Δημιουργώ url και config meta opo;ia θα τρέξει η συνάρτηση
        // που θα κατεβάσει το xml
        const url = `${entry.importedURL}?username=${process.env.STEFINET_USERNAME}
        &password=${process.env.STEFINET_PASSWORD}`
        const config = {
          headers: {
            "Accept-Encoding": "gzip,deflate,compress",
            "Content-Type": " application/xml",
            "Accept": "application/xml"
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

        for (let product of xml.PriceCatalog.product) {
          if (product.category.includes('ΝΕΑ ΠΡΟΪΟΝΤΑ')) {
            const index = product.category.indexOf('ΝΕΑ ΠΡΟΪΟΝΤΑ');
            product.category.splice(index, 1);
          }
          else if (product.category.includes('LAST PIECES')) {
            const index = product.category.indexOf('LAST PIECES');
            product.category.splice(index, 1);
          }
        }

        const filteredProducts = xml.PriceCatalog.product.filter(x => x.category.length > 0)

        const products = strapi
          .plugin('import-products')
          .service('productHelpers')
          .filterData(filteredProducts, importRef.categoryMap, importRef.mapFields)

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

          const { entryCheck } = await strapi
            .plugin('import-products')
            .service('productHelpers')
            .checkIfProductExists(product.mpn, product.barcode, product.name, product.model);

          // αν δεν υπάρχει το προϊόν το δημιουργώ αλλιώς ενημερώνω
          if (!entryCheck) {
            try {
              const response = await strapi
                .plugin('import-products')
                .service('importHelpers')
                .createEntry(product, importRef);

              await response
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
});