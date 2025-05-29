'use strict';

const myService = require('./my-service');
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

module.exports = {
  myService,
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
