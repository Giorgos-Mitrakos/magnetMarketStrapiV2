'use strict';

/**
 * (2026-10-30) Ανάγνωση δεδομένων ανά τύπο, σε σελίδες με βάση το id
 * (afterId → «φέρε τα επόμενα μετά από αυτό»), ώστε:
 *   • να μη χάνεται ούτε να διπλασιάζεται τίποτα αν αλλάξουν δεδομένα στο μεταξύ
 *   • να μένει χαμηλή η μνήμη (μία μικρή σελίδα τη φορά)
 *
 * Οι σχέσεις και οι φωτογραφίες επιστρέφονται μόνο ως ids (τα αρχεία έρχονται
 * χωριστά από τον τύπο «files»). Τα components επιστρέφονται ολόκληρα.
 * Το populate χτίζεται αυτόματα από τα schemas — αν προστεθεί πεδίο, έρχεται κι αυτό.
 */

/** Οι τύποι που εξάγονται. uid ή collectionName (για τα plugins βρίσκεται το uid μόνο του). */
const ENTITIES = {
  // Κατάλογος
  brands: { uid: 'api::brand.brand' },
  categories: { uid: 'api::category.category' },
  platforms: { uid: 'api::platform.platform' },
  products: { uid: 'api::product.product', maxLimit: 200, publishedOnly: true },
  files: { uid: 'plugin::upload.file', maxLimit: 1000 },

  // Importer
  suppliers: { collection: 'importxmls', plugin: 'import-products' },
  'category-maps': { collection: 'categorymaps', plugin: 'import-products' },
  'whitelist-maps': { collection: 'whitelistmaps', plugin: 'import-products' },
  'blacklist-maps': { collection: 'blacklistmaps', plugin: 'import-products' },
  'char-name-maps': { collection: 'charnamemaps', plugin: 'import-products' },
  'char-value-maps': { collection: 'charvaluemaps', plugin: 'import-products' },
  'stock-maps': { collection: 'stockmaps', plugin: 'import-products' },
  'brand-excl-maps': { collection: 'brandexclmaps', plugin: 'import-products' },

  // Πελάτες / παραγγελίες
  users: { uid: 'plugin::users-permissions.user' },
  'user-addresses': { uid: 'api::user-address.user-address' },
  orders: { uid: 'api::order.order', maxLimit: 200 },
  coupons: { uid: 'api::coupon.coupon' },
  'coupon-usages': { uid: 'api::coupon-usage.coupon-usage' },
  newsletters: { uid: 'api::newsletter.newsletter' },
  'notify-mes': { uid: 'api::notify-me.notify-me' },
  'expected-inquiries': { uid: 'api::expected-inquiry.expected-inquiry' },
  'ask-for-prices': { uid: 'api::ask-for-price.ask-for-price' },
};

/** Πεδία που ΔΕΝ βγαίνουν ποτέ (tokens επαναφοράς/επιβεβαίωσης) */
const NEVER = {
  'plugin::users-permissions.user': ['resetPasswordToken', 'confirmationToken'],
};

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

module.exports = ({ strapi }) => {
  const uidCache = {};

  function resolveUid(name) {
    const def = ENTITIES[name];
    if (!def) return null;
    if (def.uid) return def.uid;
    if (uidCache[name]) return uidCache[name];
    const found = Object.values(strapi.contentTypes).find(
      (ct) => ct.collectionName === def.collection && (!def.plugin || ct.plugin === def.plugin)
    );
    uidCache[name] = found ? found.uid : null;
    return uidCache[name];
  }

  function schemaOf(uid) {
    return strapi.contentTypes[uid] || strapi.components[uid] || null;
  }

  /**
   * Populate από το schema: σχέσεις/media → μόνο id, components → ολόκληρα
   * (με τις δικές τους σχέσεις/media ως ids), αναδρομικά.
   */
  function buildPopulate(uid, depth = 0) {
    const schema = schemaOf(uid);
    if (!schema || depth > 5) return {};
    const out = {};
    for (const [name, attr] of Object.entries(schema.attributes || {})) {
      if (attr.type === 'relation') {
        if (String(attr.relation || '').startsWith('morph')) continue;
        // Η «αντίστροφη» πλευρά (π.χ. brand.products) παραλείπεται: η ίδια σύνδεση
        // έρχεται από την άλλη πλευρά (product.brand) — αλλιώς μια μάρκα θα έφερνε
        // χιλιάδες ids. Ούτε createdBy/updatedBy (χρήστες του admin).
        if (attr.mappedBy || String(attr.target || '').startsWith('admin::')) continue;
        // Ο ρόλος του χρήστη: και το όνομα/είδος (για «Authenticated» κ.λπ.)
        if (attr.target === 'plugin::users-permissions.role') out[name] = { select: ['id', 'name', 'type'] };
        else out[name] = { select: ['id'] };
      } else if (attr.type === 'media') {
        out[name] = { select: ['id'] };
      } else if (attr.type === 'component') {
        const inner = buildPopulate(attr.component, depth + 1);
        out[name] = Object.keys(inner).length ? { populate: inner } : true;
      } else if (attr.type === 'dynamiczone') {
        out[name] = true;
      }
    }
    return out;
  }

  /** Σχέσεις/media σε σκέτα ids (ή λίστα ids), αναδρομικά στα components */
  function flatten(uid, row) {
    const schema = schemaOf(uid);
    if (!schema || !row || typeof row !== 'object') return row;
    const out = { ...row };
    for (const [name, attr] of Object.entries(schema.attributes || {})) {
      if (!(name in out)) continue;
      if (attr.type === 'relation' && (attr.mappedBy || String(attr.target || '').startsWith('admin::'))) {
        delete out[name];
        continue;
      }
      const v = out[name];
      if (attr.type === 'relation' || attr.type === 'media') {
        if (attr.target === 'plugin::users-permissions.role') continue; // κρατάμε {id,name,type}
        if (Array.isArray(v)) out[name] = v.map((x) => (x && typeof x === 'object' ? x.id : x));
        else out[name] = v && typeof v === 'object' ? v.id : v ?? null;
      } else if (attr.type === 'component') {
        if (Array.isArray(v)) out[name] = v.map((c) => flatten(attr.component, c));
        else out[name] = v ? flatten(attr.component, v) : null;
      }
    }
    for (const f of NEVER[uid] || []) delete out[f];
    return out;
  }

  return {
    entities() {
      return Object.keys(ENTITIES);
    },

    /** Μία σελίδα ενός τύπου */
    async page(name, { afterId = 0, limit = 0, updatedSince = null, drafts = false, ids = null } = {}) {
      const def = ENTITIES[name];
      const uid = resolveUid(name);
      if (!def || !uid || !schemaOf(uid)) return null;
      const max = Math.min(def.maxLimit || MAX_LIMIT, MAX_LIMIT);
      const take = Math.max(1, Math.min(limit || DEFAULT_LIMIT, max));

      // Συγκεκριμένα ids (π.χ. μόνο οι φωτογραφίες που χρειάζονται) — αλλιώς σελίδα μετά το afterId
      const where = Array.isArray(ids) && ids.length ? { id: { $in: ids.slice(0, max) } } : { id: { $gt: afterId } };
      const schema = schemaOf(uid);
      // Τα drafts των προϊόντων δεν μεταφέρονται (εκτός αν ζητηθούν ρητά)
      if (!ids && def.publishedOnly && !drafts && schema.options && schema.options.draftAndPublish) {
        where.publishedAt = { $notNull: true };
      }
      if (updatedSince) {
        const d = new Date(updatedSince);
        if (!isNaN(d.getTime())) where.updatedAt = { $gte: d };
      }

      const rows = await strapi.db.query(uid).findMany({
        where,
        orderBy: { id: 'asc' },
        limit: take,
        populate: buildPopulate(uid),
      });

      const data = rows.map((r) => flatten(uid, r));
      const last = rows.length ? rows[rows.length - 1].id : null;
      return {
        entity: name,
        uid,
        data,
        meta: {
          count: data.length,
          limit: take,
          afterId,
          nextAfterId: !ids && rows.length === take ? last : null, // null = τέλος
        },
      };
    },

    /** Πλήθη ανά τύπο + έλεγχοι πριν τη μεταφορά */
    async summary() {
      const counts = {};
      for (const name of Object.keys(ENTITIES)) {
        const uid = resolveUid(name);
        if (!uid || !schemaOf(uid)) {
          counts[name] = null;
          continue;
        }
        counts[name] = await strapi.db.query(uid).count({});
      }

      const P = 'api::product.product';
      const pq = strapi.db.query(P);
      const products = {
        total: counts.products,
        published: await pq.count({ where: { publishedAt: { $notNull: true } } }),
        drafts: await pq.count({ where: { publishedAt: { $null: true } } }),
        // Χωρίς διαθέσιμο προμηθευτή (σημείωση του importer)
        withDeletedAt: await pq.count({ where: { publishedAt: { $notNull: true }, deletedAt: { $notNull: true } } }),
        archived: await pq.count({ where: { publishedAt: { $notNull: true }, is_archived: true } }),
        withRedirect: await pq.count({
          where: { publishedAt: { $notNull: true }, redirect_to_url: { $notNull: true, $ne: '' } },
        }),
        withoutSlug: await pq.count({ where: { publishedAt: { $notNull: true }, slug: { $null: true } } }),
        maxId: (await pq.findOne({ select: ['id'], orderBy: { id: 'desc' } }) || {}).id || null,
      };

      // Φωτογραφίες: τύποι αρχείων, μεγέθη, διευθύνσεις
      const knex = strapi.db.connection;
      const filesTable = strapi.db.metadata.get('plugin::upload.file').tableName;
      const byExt = await knex(filesTable).select('ext').count({ n: '*' }).sum({ kb: 'size' }).groupBy('ext');
      const fq = strapi.db.query('plugin::upload.file');
      const files = {
        total: counts.files,
        byExt: byExt.map((r) => ({ ext: r.ext, count: Number(r.n), sizeMB: Math.round(Number(r.kb || 0) / 1024) })),
        widerThan1024: await fq.count({ where: { width: { $gt: 1024 } } }),
        absoluteUrls: await fq.count({ where: { url: { $startsWith: 'http' } } }),
        providers: (await knex(filesTable).select('provider').count({ n: '*' }).groupBy('provider')).map((r) => ({
          provider: r.provider,
          count: Number(r.n),
        })),
      };

      const nq = strapi.db.query('api::newsletter.newsletter');
      const newsletters = {
        total: counts.newsletters,
        subscribed: await nq.count({ where: { subscribed: true } }),
      };

      const oq = strapi.db.query('api::order.order');
      const orders = {
        total: counts.orders,
        drafts: await oq.count({ where: { publishedAt: { $null: true } } }),
        firstId: (await oq.findOne({ select: ['id'], orderBy: { id: 'asc' } }) || {}).id || null,
        lastId: (await oq.findOne({ select: ['id'], orderBy: { id: 'desc' } }) || {}).id || null,
      };

      return {
        generatedAt: new Date().toISOString(),
        strapiVersion: strapi.config.get('info.strapi') || null,
        entities: Object.keys(ENTITIES),
        counts,
        products,
        files,
        newsletters,
        orders,
      };
    },
  };
};
