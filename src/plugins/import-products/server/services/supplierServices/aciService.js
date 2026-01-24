'use strict';

module.exports = ({ strapi }) => ({
  async parseAciJson({ entry }) {
    try {
      // Δημιουργώ τις μεταβλητές που χρειάζονται για την ενημέρωση 
      // προΪόντων του προμηθευτή
      const importRef = await strapi
        .plugin('import-products')
        .service('importHelpers')
        .createImportRef(entry);

      // Αντιστοιχώ τα πεδία του xml του προμηθευτή με τα πεδία που σχετίζονται με τη βάση
      importRef.mapFields = {
        //  isGreater = true όταν η διαθεσιμότητα είναι με αριθμό τεμαχίων
        // isGreater = false όταν η διαθεσιμότητα είναι με όνομα
        isGreater: false,
        // splitter , αν η κατηγορίες στο xml βρίσκονται σε ένα πεδίο με διαχωρισμό 
        // μέσω καποιου χαρακτήρα συνήθως (/ ή >) αλλιώς αν υπάρχουν ξεχωριστά πεδία για τις
        // υποκατηγορίες βάζω null
        splitter: null,
        category: 'Category',
        subcategory: null,
        sub2category: null,
        stock_level: 'Availability',
        wholesale: 'Price',
        retail_price: null,
        recycle_tax: 'RecycleCharges',
        in_offer: null,
        name: 'Description',
        brand: 'Brand',
        mpn: 'OEM',
        model: null,
        barcode: 'Gtin',
        supplierCode: 'Code',
        description: 'FullDescription',
        short_description: null,
        image: 'pictureURL',
        additional_images: null,
        additional_files: null,
        supplierProductURL: 'URL',
        attributes: null
      }

      if (!entry.isActive) {
        await strapi
          .plugin('import-products')
          .service('importHelpers')
          .deleteEntry(entry, importRef);
      }
      else {

        const { products, message } = await this.getAciCatalog(entry, importRef);

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

          const { entryCheck } = await strapi
            .plugin('import-products')
            .service('productHelpers')
            .checkIfProductExists(product.mpn, product.barcode, product.name, product.model);


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
      console.log(err);
    }
  },

  async getAciCatalog(entry, importRef) {
    try {
      const url = `${entry.importedURL}`
      const postData = {
        // email: "demo",
        // password: "d3m0Acc0unT",
        email: process.env.ACI_USERNAME,
        password: process.env.ACI_PASSWORD,
        english: false
      }
      const config = {
        headers: {
          "Accept-Encoding": "gzip,deflate,compress",
          "Accept": "application/json",
          "Content-type": "application/x-www-form-urlencoded",
          "Connection": "keep-alive"
        }
      }

      // Κατεβάζω το xml
      const { response, message } = await strapi
        .plugin('import-products')
        .service('importHelpers')
        .postXmlData(url, postData, config)

      const { data } = await response

      if (response.data.Success === 0)
        return { message: "Error" }

      const availableProducts = strapi
        .plugin('import-products')
        .service('productHelpers')
        .filterData(data.Data, importRef.categoryMap, importRef.mapFields)

      return { products: availableProducts }
    } catch (error) {
      console.log(error)
    }
  },

  async getAciAvailability({ entry }) {
    try {
      // Δημιουργώ τις μεταβλητές που χρειάζονται για την ενημέρωση 
      // προΪόντων του προμηθευτή
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
        category: 'Category',
        subcategory: null,
        sub2category: null,
        stock_level: 'Availability',
        wholesale: 'Price',
        retail_price: null,
        recycle_tax: 'RecycleCharges',
        in_offer: null,
        name: 'Description',
        brand: 'Brand',
        mpn: 'OEM',
        model: null,
        barcode: 'Gtin',
        supplierCode: 'Code',
        description: 'FullDescription',
        short_description: null,
        image: 'pictureURL',
        additional_images: null,
        additional_files: null,
        supplierProductURL: 'URL',
        attributes: null
      }

      if (!entry.isActive) {
        await strapi
          .plugin('import-products')
          .service('importHelpers')
          .deleteEntry(entry, importRef);
      }
      else {
        const url = `https://www.acihellas.gr/api/stockquantities`
        const postData = {
          // email: "demo",
          // password: "d3m0Acc0unT",
          email: process.env.ACI_USERNAME,
          password: process.env.ACI_PASSWORD,
          english: false
        }
        const config = {
          headers: {
            "Accept-Encoding": "gzip,deflate,compress",
            "Accept": "application/json",
            "Content-type": "application/x-www-form-urlencoded",
            "Connection": "keep-alive"
          }
        }

        // Κατεβάζω το xml
        const { response, message } = await strapi
          .plugin('import-products')
          .service('importHelpers')
          .postXmlData(url, postData, config)

        const { data } = await response

        if (response.data.Success === 0)
          return { message: "Error" }

        const products = data.Data
          .filter(filterStock)

        if (products.length === 0)
          return { "message": "xml is empty" }

        for (let dt of products) {

          let supplierCode = strapi
            .plugin('import-products')
            .service('productHelpers')
            .createFields(importRef.mapFields.supplierCode, dt)

          const checkIfEntry = await strapi.db.query('api::product.product').findOne({
            where: {
              supplierInfo: {
                $and: [
                  { name: entry.name },
                  { supplierProductId: supplierCode }
                ]
              }
            },
            populate: {
              supplierInfo: true
            }
          });

          if (checkIfEntry) {
            // if (!checkIfEntry.publishedAt) {
            //   let supplierInfo = checkIfEntry.supplierInfo
            //   const index = supplierInfo.findIndex((o) => {
            //     return o.name === entry.name
            //   })
            //   supplierInfo[index].in_stock = true;
            //   await strapi.entityService.update('api::product.product', checkIfEntry.id, {
            //     data: {
            //       publishedAt: new Date(),
            //       supplierInfo: supplierInfo,
            //       deletedAt: null
            //     },
            //   });
            //   importRef.republished += 1
            // }
            // else {
            //   importRef.skipped += 1
            // }
            importRef.related_entries.push(checkIfEntry.id)
          }

        }

        await strapi
          .plugin('import-products')
          .service('importHelpers')
          .deleteEntry(entry, importRef);
      }
      console.log("End of Import")
      return { "message": "ok" }

      function filterStock(stockName) {
        let availability = strapi
          .plugin('import-products')
          .service('productHelpers')
          .createFields(importRef.mapFields.stock_level, stockName)

        if (importRef.categoryMap.stock_map.length > 0) {
          let catIndex = importRef.categoryMap.stock_map.findIndex(x => x.name_in_xml.trim() === availability.trim())
          if (catIndex !== -1) {
            return true
          }
          else {
            return false
          }
        }
        else {
          return true
        }
      }
    } catch (error) {
      console.log(error)
    }
  },

  async getAciAttributes({ entry }) {
    try {
      // Δημιουργώ τις μεταβλητές που χρειάζονται για την ενημέρωση 
      // προΪόντων του προμηθευτή
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
        category: 'Category',
        subcategory: null,
        sub2category: null,
        stock_level: 'Availability',
        wholesale: 'Price',
        retail_price: null,
        recycle_tax: 'RecycleCharges',
        in_offer: null,
        name: 'Description',
        brand: 'Brand',
        mpn: 'OEM',
        model: null,
        barcode: 'Gtin',
        supplierCode: 'Code',
        description: 'FullDescription',
        short_description: null,
        image: 'pictureURL',
        additional_images: null,
        additional_files: null,
        supplierProductURL: 'URL',
        attributes: 'Specs'
      }

      if (!entry.isActive) {
        await strapi
          .plugin('import-products')
          .service('importHelpers')
          .deleteEntry(entry, importRef);
      }
      else {
        const url = `https://www.acihellas.gr/api/productspecs`
        const postData = {
          // email: "demo",
          // password: "d3m0Acc0unT",
          email: process.env.ACI_USERNAME,
          password: process.env.ACI_PASSWORD,
          english: false
        }
        const config = {
          headers: {
            "Accept-Encoding": "gzip,deflate,compress",
            "Accept": "application/json",
            "Content-type": "application/x-www-form-urlencoded",
            "Connection": "keep-alive"
          }
        }

        // Κατεβάζω το xml
        const { response, message } = await strapi
          .plugin('import-products')
          .service('importHelpers')
          .postXmlData(url, postData, config)

        const { data } = await response

        if (response.data.Success === 0)
          return { message: "Error" }

        const products = data.Data

        if (products.length === 0)
          return { "message": "xml is empty" }

        // const { mapCharNames, mapCharValues } = importRef.charMaps

        for (let dt of products) {
          let specs = strapi
            .plugin('import-products')
            .service('productHelpers')
            .createFields(importRef.mapFields.attributes, dt)

          const checkIfEntry = await strapi.db.query('api::product.product').findOne({
            where: {
              supplierInfo: {
                $and: [
                  { name: entry.name },
                  { supplierProductId: dt.Code.trim() }
                ]
              }
            },
            populate: {
              prod_chars: true
            },
          });

          if (checkIfEntry && checkIfEntry.prod_chars.length === 0) {

            if (specs.length > 0) {
              let product = {}
              strapi
                .plugin('import-products')
                .service('productHelpers')
                .createAttributes(specs, product, entry, importRef)

              await strapi.entityService.update('api::product.product', checkIfEntry.id, {
                data: product
              });

              importRef.updated += 1
            }
          }
        }
      }
      console.log("End of Import")
      return { "message": "ok" }
    } catch (error) {
      console.log(error)
    }
  },
});
