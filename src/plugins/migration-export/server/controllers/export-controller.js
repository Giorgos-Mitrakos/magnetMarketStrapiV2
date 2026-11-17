'use strict';

const crypto = require('crypto');

/** Έλεγχος token. Χωρίς ρυθμισμένο token → 404 (σαν να μην υπάρχει το plugin). */
function authorized(ctx) {
  const expected = String(process.env.MIGRATION_EXPORT_TOKEN || '');
  if (expected.length < 24) return 'disabled';
  const got = String(ctx.get('x-migration-token') || '');
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return 'denied';
  return 'ok';
}

function guard(ctx) {
  const r = authorized(ctx);
  if (r === 'disabled') {
    ctx.notFound();
    return false;
  }
  if (r === 'denied') {
    strapi.log.warn(`[migration-export] απορρίφθηκε αίτημα χωρίς σωστό token από ${ctx.request.ip}`);
    ctx.unauthorized('Λάθος token');
    return false;
  }
  return true;
}

module.exports = ({ strapi }) => {
  const service = () => strapi.plugin('migration-export').service('exportService');

  return {
    /** GET /api/migration-export/summary — πλήθη και ό,τι «περίεργο» βρεθεί */
    async summary(ctx) {
      if (!guard(ctx)) return;
      try {
        ctx.body = await service().summary();
      } catch (e) {
        strapi.log.error(`[migration-export] summary: ${e && e.stack ? e.stack : e}`);
        ctx.internalServerError('Αποτυχία σύνοψης');
      }
    },

    /** GET /api/migration-export/data/:entity — μία σελίδα δεδομένων */
    async data(ctx) {
      if (!guard(ctx)) return;
      const started = Date.now();
      const { entity } = ctx.params;
      const q = ctx.query || {};
      try {
        const result = await service().page(entity, {
          afterId: Number(q.afterId) || 0,
          limit: Number(q.limit) || 0,
          updatedSince: q.updatedSince ? String(q.updatedSince) : null,
          drafts: q.drafts === '1' || q.drafts === 'true',
          // ids=1,2,3 → μόνο αυτές οι εγγραφές
          ids: q.ids
            ? String(q.ids)
                .split(',')
                .map((x) => Number(x))
                .filter((x) => Number.isInteger(x) && x > 0)
            : null,
        });
        if (!result) return ctx.notFound(`Άγνωστος τύπος: ${entity}`);
        strapi.log.info(
          `[migration-export] ${entity} afterId=${q.afterId || 0} → ${result.data.length} εγγραφές (${Date.now() - started}ms)`
        );
        ctx.body = result;
      } catch (e) {
        strapi.log.error(`[migration-export] ${entity}: ${e && e.stack ? e.stack : e}`);
        ctx.internalServerError('Αποτυχία εξαγωγής');
      }
    },
  };
};
