'use strict';

const importxmlService = require('./importxml');
const categoryService = require('./categorymap');
const charnameService = require('./charnamemap');
const charvalueService = require('./charvaluemap');
const stockmapService = require('./stockmap');
const whitelistService = require('./whitelistmap');
const blacklistService = require('./blacklistmap');
const importHelpers = require('./helpers/import-helpers')
const productHelpers = require('./helpers/product-helpers')
const categoryHelpers = require('./helpers/category-helpers')
const priceHelpers = require('./helpers/price-helpers')
const supplierHelpers = require('./helpers/supplier-helpers')
const fileHelpers = require('./helpers/file-helpers')
const scrapHelpers = require('./helpers/scrap-helpers')
const oktabitService = require('./supplierServices/oktabitService');
const questService = require('./supplierServices/questService');
const novatronService = require('./supplierServices/novatronService');
const globalsatService = require('./supplierServices/globalsatService');
const zegetronService = require('./supplierServices/zegetronService');
const westnetService = require('./supplierServices/westnetService');
const cpiService = require('./supplierServices/cpiService');
const telehermesService = require('./supplierServices/telehermesService');
const dotmediaService = require('./supplierServices/dotmediaService');
const aciService = require('./supplierServices/aciService');
const stefinetService = require('./supplierServices/stefinetService');
const smart4allService = require('./supplierServices/smart4allService');
const cacheService = require('./helpers/cache-service');
const batchHelpers = require('./helpers/batch-helpers.js');

// Parsers
const weightParser = require('./parsers/weight-parser');
const dimensionsParser = require('./parsers/dimensions-parser');
const imagesParser = require('./parsers/images-parser');
const characteristicsParser = require('./parsers/characteristics-parser');

// Base supplier class
const baseSupplier = require('./helpers/base-supplier.js');

// Supplier adapters
const zegetronAdapter = require('./supplierAdapters/zegetron-adapter.js');
const telehermesAdapter = require('./supplierAdapters/telehermes-adapter.js');
const globalsatAdapter = require('./supplierAdapters/globalsat-adapter.js');
const dotmediaAdapter = require('./supplierAdapters/dotmedia-adapter');
const cpiAdapter = require('./supplierAdapters/cpi-adapter.js');
const oktabitAdapter = require('./supplierAdapters/oktabit-adapter.js');
const stefinetAdapter = require('./supplierAdapters/stefinet-adapter.js');
const westnetAdapter = require('./supplierAdapters/westnet-adapter.js');
const smart4allAdapter = require('./supplierAdapters/smart4all-adapter.js');
const questAdapter = require('./supplierAdapters/quest-adapter.js');
const novatronAdapter = require('./supplierAdapters/novatron-adapter.js');
const globalsatScrapAdapter = require('./supplierAdapters/globalsat-scrap-adapter.js');

module.exports = {
  cacheService,
  batchHelpers,

  // Base supplier class
  baseSupplier,

  // Parsers
  weightParser,
  dimensionsParser,
  imagesParser,
  characteristicsParser,

  // Supplier adapters

  zegetronAdapter,
  telehermesAdapter,
  globalsatAdapter,
  globalsatScrapAdapter,
  dotmediaAdapter,
  cpiAdapter,
  oktabitAdapter,
  stefinetAdapter,
  westnetAdapter,
  smart4allAdapter,
  questAdapter,
  novatronAdapter,

  // Supplier services
  importxmlService,
  categoryService,
  charnameService,
  charvalueService,
  stockmapService,
  whitelistService,
  blacklistService,
  importHelpers,
  productHelpers,
  fileHelpers,
  categoryHelpers,
  priceHelpers,
  supplierHelpers,
  scrapHelpers,
  oktabitService,
  questService,
  novatronService,
  globalsatService,
  zegetronService,
  westnetService,
  telehermesService,
  cpiService,
  dotmediaService,
  aciService,
  stefinetService,
  smart4allService
};
