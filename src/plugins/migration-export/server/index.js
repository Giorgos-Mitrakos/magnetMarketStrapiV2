'use strict';

/**
 * (2026-10-30) migration-export — εξαγωγή δεδομένων για τη μεταφορά στο magnetmarketV3.
 *
 *   • ΜΟΝΟ ΑΝΑΓΝΩΣΗ: δεν γράφει τίποτα, δεν έχει content-types (καμία αλλαγή
 *     στη βάση), lifecycles ή cron. Κάνει κάτι μόνο όταν του ζητηθούν δεδομένα.
 *   • ΚΛΕΙΣΤΟ εξ ορισμού: λειτουργεί μόνο αν οριστεί στο .env το
 *     MIGRATION_EXPORT_TOKEN (≥ 24 χαρακτήρες) και κάθε αίτημα στέλνει το ίδιο
 *     στο header «x-migration-token». Αλλιώς απαντά 404.
 *   • Χωρίς σελίδα στο admin.
 *
 * Διευθύνσεις:
 *   GET /api/migration-export/summary
 *   GET /api/migration-export/data/:entity?afterId=0&limit=200[&updatedSince=ISO][&drafts=1][&ids=1,2,3]
 */
const routes = require('./routes');
const controllers = require('./controllers');
const services = require('./services');

module.exports = {
  register() {},
  bootstrap({ strapi }) {
    const enabled = String(process.env.MIGRATION_EXPORT_TOKEN || '').length >= 24;
    strapi.log.info(`[migration-export] ${enabled ? 'ΕΝΕΡΓΟ (υπάρχει token)' : 'ανενεργό (χωρίς MIGRATION_EXPORT_TOKEN)'}`);
  },
  destroy() {},
  config: { default: {}, validator() {} },
  routes,
  controllers,
  services,
  contentTypes: {},
  policies: {},
  middlewares: {},
};
