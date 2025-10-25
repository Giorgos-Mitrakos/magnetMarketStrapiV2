'use strict';
const bargainopportunity = require('./bargainopportunity');
const pattern = require('./pattern');
const ruleexecution = require('./rule-execution');
const analysisrun = require('./analysis-run');
const configuration = require('./configuration');
const categoryconfig = require('./category-config');

module.exports = {
    bargainopportunity,
    pattern,
    analysisrun,
    ruleexecution,
    configuration,
    categoryconfig
};
