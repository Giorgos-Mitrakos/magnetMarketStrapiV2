'use strict';

module.exports = [
  // ── Categories ────────────────────────────────────────────
  {
    method: 'GET',
    path: '/categories',
    handler: 'pricingController.getCategories',
    config: { policies: [], auth: false },
  },
  {
    method: 'GET',
    path: '/categories/:id',
    handler: 'pricingController.getCategoryPricing',
    config: { policies: [], auth: false },
  },
  {
    method: 'POST',
    path: '/categories/:id/calculate',
    handler: 'pricingController.calculatePricing',
    config: { policies: [], auth: false },
  },
  {
    method: 'PUT',
    path: '/categories/:id/pricing',
    handler: 'pricingController.updateCategoryPricing',
    config: { policies: [], auth: false },
  },

  // ── Products ──────────────────────────────────────────────
  {
    method: 'GET',
    path: '/products',
    handler: 'pricingController.getProducts',
    config: { policies: [], auth: false },
  },
  {
    method: 'GET',
    path: '/products/:id',
    handler: 'pricingController.getProduct',
    config: { policies: [], auth: false },
  },
  {
    method: 'PUT',
    path: '/products/:id/pricing',
    handler: 'pricingController.updateProductPricing',
    config: { policies: [], auth: false },
  },

  // ── Shared ────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/settings',
    handler: 'pricingController.getSettings',
    config: { policies: [], auth: false },
  },
  {
    method: 'GET',
    path: '/brands',
    handler: 'pricingController.getBrands',
    config: { policies: [], auth: false },
  },
  {
    method: 'GET',
    path: '/platforms',
    handler: 'pricingController.getPlatforms',
    config: { policies: [], auth: false },
  },
];