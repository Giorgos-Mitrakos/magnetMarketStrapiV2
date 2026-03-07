'use strict';

module.exports = ({ strapi }) => ({

  // ════════════════════════════════════════════════════════════
  // CATEGORIES
  // ════════════════════════════════════════════════════════════

  async getCategories(ctx) {
    const { page = 1, pageSize = 10, search = '' } = ctx.query;
    try {
      const filters = {};
      if (search) {
        filters.name = { $containsi: search };
      }
      const categories = await strapi.entityService.findPage('api::category.category', {
        filters,
        populate: {
          cat_percentage: true,
          products: { count: true },
        },
        page,
        pageSize,
        sort: { name: 'asc' },
      });
      ctx.body = categories;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async getCategoryPricing(ctx) {
    const { id } = ctx.params;
    try {
      const category = await strapi.entityService.findOne('api::category.category', id, {
        populate: {
          cat_percentage: {
            populate: {
              brand_perc: { populate: ['brand'] },
            },
          },
          products: {
            filters: {
              status: { $in: ['InStock', 'MediumStock', 'LowStock'] },
              publishedAt: { $notNull: true },
            },
            populate: {
              brand:        true,
              supplierInfo: true,
            },
            limit: 50,
          },
        },
      });

      if (!category) return ctx.notFound('Category not found');

      if (category.products) {
        category.products = category.products.filter(product => {
          if (!product.supplierInfo || product.supplierInfo.length === 0) return false;
          return product.supplierInfo.some(s =>
            s.in_stock === true &&
            s.wholesale !== null &&
            s.wholesale !== undefined &&
            parseFloat(s.wholesale) > 0
          );
        });
      }

      ctx.body = category;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async calculatePricing(ctx) {
    const { id } = ctx.params;
    const { platformConfig, sampleProducts } = ctx.request.body;
    try {
      const pricingService = strapi.plugin('pricing-manager').service('pricingService');
      const calculations = await pricingService.calculatePricingScenarios({
        categoryId: id,
        platformConfig,
        sampleProducts,
      });
      ctx.body = calculations;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async updateCategoryPricing(ctx) {
    const { id } = ctx.params;
    const { cat_percentage, customer_share_pct } = ctx.request.body;
    try {
      const updated = await strapi.entityService.update('api::category.category', id, {
        data: { cat_percentage, customer_share_pct },
        populate: {
          cat_percentage: {
            populate: {
              brand_perc: { populate: ['brand'] },
            },
          },
        },
      });
      ctx.body = updated;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  // ════════════════════════════════════════════════════════════
  // PRODUCTS
  // ════════════════════════════════════════════════════════════

  async getProducts(ctx) {
    const { page = 1, pageSize = 20, search = '' } = ctx.query;
    try {
      const filters = {
        publishedAt: { $notNull: true },
      };

      if (search) {
        filters.$or = [
          { name: { $containsi: search } },
          { sku:  { $containsi: search } },
          { mpn:  { $containsi: search } },
        ];
      }

      const products = await strapi.entityService.findPage('api::product.product', {
        filters,
        populate: {
          category: { fields: ['id', 'name'] },
          brand:    { fields: ['id', 'name'] },
          platforms: true,
        },
        fields: [
          'id', 'name', 'sku', 'price', 'sale_price',
          'is_sale', 'status', 'is_fixed_price', 'inventory'
        ],
        page,
        pageSize,
        sort: { name: 'asc' },
      });

      ctx.body = products;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async getProduct(ctx) {
    const { id } = ctx.params;
    try {
      const product = await strapi.entityService.findOne('api::product.product', id, {
        populate: {
          category: {
            populate: {
              cat_percentage: {
                populate: {
                  brand_perc: { populate: ['brand'] },
                },
              },
            },
          },
          brand:        true,
          supplierInfo: true,
          platforms:    true,
        },
      });

      if (!product) return ctx.notFound('Product not found');

      // ── Εμπλουτισμός supplierInfo με shipping από importxml ──
      // Ίδια λογική με setPrice.js: supplier?.shipping || GENERAL_SHIPPING_PRICE
      if (product.supplierInfo && product.supplierInfo.length > 0) {
        const supplierNames = [...new Set(product.supplierInfo.map(s => s.name).filter(Boolean))];

        const importSuppliers = await Promise.all(
          supplierNames.map(name =>
            strapi.db.query('plugin::import-products.importxml').findOne({
              select: ['name', 'shipping'],
              where: { name },
            })
          )
        );

        const shippingMap = {};
        importSuppliers.forEach(s => {
          if (s) shippingMap[s.name] = parseFloat(s.shipping) || Number(process.env.GENERAL_SHIPPING_PRICE) || 3;
        });

        product.supplierInfo = product.supplierInfo.map(s => ({
          ...s,
          shipping: shippingMap[s.name] ?? Number(process.env.GENERAL_SHIPPING_PRICE) ?? 3,
        }));
      }

      ctx.body = product;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async updateProductPricing(ctx) {
    const { id } = ctx.params;
    const {
      price,
      sale_price,
      is_sale,
      is_hot,
      inventory,
      status,
      is_fixed_price,
      is_in_house,
      notice_if_available,
      platforms,           // [{ id, price, is_fixed_price }]
    } = ctx.request.body;

    try {
      // ── Build update data (μόνο τα πεδία που στέλνονται) ──
      const data = {};

      if (price              !== undefined) data.price              = price;
      if (sale_price         !== undefined) data.sale_price         = sale_price;
      if (is_sale            !== undefined) data.is_sale            = is_sale;
      if (is_hot             !== undefined) data.is_hot             = is_hot;
      if (inventory          !== undefined) data.inventory          = inventory;
      if (status             !== undefined) data.status             = status;
      if (is_fixed_price     !== undefined) data.is_fixed_price     = is_fixed_price;
      if (is_in_house        !== undefined) data.is_in_house        = is_in_house;
      if (notice_if_available !== undefined) data.notice_if_available = notice_if_available;
      if (platforms          !== undefined) data.platforms          = platforms;

      const updated = await strapi.entityService.update('api::product.product', id, {
        data,
        populate: {
          platforms:    true,
          supplierInfo: true,
          category: {
            populate: {
              cat_percentage: {
                populate: {
                  brand_perc: { populate: ['brand'] },
                },
              },
            },
          },
          brand: true,
        },
      });

      ctx.body = updated;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  // ════════════════════════════════════════════════════════════
  // SHARED
  // ════════════════════════════════════════════════════════════

  async getSettings(ctx) {
    ctx.body = {
      taxRate:             Number(process.env.GENERAL_TAX_RATE)           || 24,
      shippingPrice:       Number(process.env.GENERAL_SHIPPING_PRICE)     || 3,
      managementCost:      Number(process.env.GENERAL_CATEGORY_MANAGMENT) || 2,
      packagingCost:       Number(process.env.GENERAL_CATEGORY_PACKAGING) || 1,
      profitMargin:        Number(process.env.GENERAL_CATEGORY_PROFIT)    || 10,
      commission:          Number(process.env.GENERAL_CATEGORY_PERCENTAGE) || 20,
      customerSharePct:    Number(process.env.SITE_CUSTOMER_SHARE_PCT)    || 60,
      guaranteedMinIncome: Number(process.env.GUARANTEED_MINMIMUM_INCOME) || 3,
    };
  },

  async getBrands(ctx) {
    try {
      const brands = await strapi.entityService.findMany('api::brand.brand', {
        sort: { name: 'asc' },
        limit: -1,
      });
      ctx.body = brands;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async getPlatforms(ctx) {
    try {
      const componentUID = 'categories.percentage';
      const component    = strapi.components[componentUID];

      if (!component) return ctx.badRequest('Component not found');

      const nameAttribute = component.attributes.name;
      if (!nameAttribute || !nameAttribute.enum) return ctx.badRequest('Platform enum not found');

      const platforms = nameAttribute.enum.map((platform) => ({
        value: platform,
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
      }));

      ctx.body = platforms;
    } catch (error) {
      console.error('Error fetching platforms:', error);
      ctx.throw(500, error);
    }
  },
});