'use strict';

module.exports = {
    /**
       * Save configuration
        * PUT / bargain - detector / config / save
        * Body: { config object }
       */
    async save(ctx) {
        try {
            const newConfig = ctx.request.body;

            if (!newConfig || typeof newConfig !== 'object') {
                return ctx.badRequest('Valid configuration object is required');
            }

            // Validate before saving
            const errors = [];

            // Price drop validation
            const priceDrop = newConfig.opportunity_rules?.price_drop;

            if (priceDrop) {
                if (priceDrop.strong <= priceDrop.medium) {
                    errors.push('Strong drop must be greater than medium drop');
                }
                if (priceDrop.medium <= priceDrop.low) {
                    errors.push('Medium drop must be greater than low drop');
                }
                if (priceDrop.low <= priceDrop.minimum) {
                    errors.push('Low drop must be greater than minimum drop');
                }
            }

            if (errors.length > 0) {
                return ctx.badRequest(`Validation failed: ${errors.join(', ')}`);
            }

            // Add metadata
            newConfig.last_modified_at = new Date();
            newConfig.last_modified_by = ctx.state.user?.id || null;
            newConfig.version = newConfig.version || '1.0.0';

            strapi.log.info(`[Config] Saving configuration (user: ${ctx.state.user?.id})`);

            // Check if config exists
            const existingConfigs = await strapi.entityService.findMany(
                'plugin::bargain-detector.configuration',
                { limit: 1 }
            );

            let saved;

            if (existingConfigs && existingConfigs.id > 0) {
                // Update existing
                saved = await strapi.entityService.update(
                    'plugin::bargain-detector.configuration',
                    existingConfigs.id,
                    { data: newConfig }
                );
                strapi.log.info(`[Config] ✓ Configuration updated (ID: ${existingConfigs.id})`);
            } else {
                // Create new
                saved = await strapi.entityService.create(
                    'plugin::bargain-detector.configuration',
                    { data: newConfig }
                );
                strapi.log.info(`[Config] ✓ Configuration created (ID: ${saved.id})`);
            }

            // Clear cache
            const helpers = strapi.plugin('bargain-detector').service('helpers');
            helpers.clearConfigCache();

            ctx.send({
                success: true,
                data: saved,
                message: 'Configuration saved successfully'
            });

        } catch (error) {
            strapi.log.error(`[Config] Save failed: ${error.message}`, { stack: error.stack });
            ctx.badRequest('Failed to save configuration', { error: error.message });
        }
    },
    /**
     * Clear configuration cache
     * GET /bargain-detector/config/clear-cache
     */
    async clearCache(ctx) {
        try {
            const helpers = strapi.plugin('bargain-detector').service('helpers');
            helpers.clearConfigCache();

            strapi.log.info('[Config] Configuration cache cleared');

            ctx.send({
                success: true,
                message: 'Configuration cache cleared successfully'
            });

        } catch (error) {
            strapi.log.error(`[Config] Failed to clear cache: ${error.message}`);
            ctx.badRequest('Failed to clear cache', { error: error.message });
        }
    },

    /**
     * Get current configuration (cached)
     * GET /bargain-detector/config
     */
    async getConfig(ctx) {
        try {
            const helpers = strapi.plugin('bargain-detector').service('helpers');
            const config = await helpers.loadConfig();

            ctx.send({
                success: true,
                data: config
            });

        } catch (error) {
            strapi.log.error(`[Config] Failed to get config: ${error.message}`);
            ctx.badRequest('Failed to get configuration', { error: error.message });
        }
    },

    /**
     * Validate configuration without saving
     * POST /bargain-detector/config/validate
     * Body: { config: {...} }
     */
    async validate(ctx) {
        try {
            const { config } = ctx.request.body;

            if (!config) {
                return ctx.badRequest('config object is required');
            }

            // Validation logic
            const errors = [];

            // Price drop validation
            const priceDrop = config.opportunity_rules?.price_drop;
            if (priceDrop) {
                if (priceDrop.strong <= priceDrop.medium) {
                    errors.push('Strong drop must be greater than medium drop');
                }
                if (priceDrop.medium <= priceDrop.low) {
                    errors.push('Medium drop must be greater than low drop');
                }
                if (priceDrop.low <= priceDrop.minimum) {
                    errors.push('Low drop must be greater than minimum drop');
                }
            }

            // Volatility validation
            const volatility = config.risk_rules?.volatility;
            if (volatility) {
                if (volatility.high <= volatility.medium) {
                    errors.push('High volatility must be greater than medium');
                }
                if (volatility.medium <= volatility.low) {
                    errors.push('Medium volatility must be greater than low');
                }
            }

            // Recommendation thresholds
            const strongBuy = config.recommendation_thresholds?.strong_buy;
            const buy = config.recommendation_thresholds?.buy;
            const watch = config.recommendation_thresholds?.watch;

            if (strongBuy && buy) {
                if (strongBuy.min_opportunity <= buy.min_opportunity) {
                    errors.push('Strong buy opportunity must be higher than buy');
                }
            }

            if (buy && watch) {
                if (buy.min_opportunity <= watch.min_opportunity) {
                    errors.push('Buy opportunity must be higher than watch');
                }
            }

            // Automation validation
            const automation = config.automation;
            if (automation) {
                if (automation.batch_size < 1 || automation.batch_size > 500) {
                    errors.push('Batch size must be between 1 and 500');
                }
                if (automation.auto_expire_days < 1 || automation.auto_expire_days > 90) {
                    errors.push('Auto-expire days must be between 1 and 90');
                }
                if (automation.cleanup_days < 1 || automation.cleanup_days > 365) {
                    errors.push('Cleanup days must be between 1 and 365');
                }
            }

            if (errors.length > 0) {
                return ctx.send({
                    success: false,
                    valid: false,
                    errors
                });
            }

            ctx.send({
                success: true,
                valid: true,
                message: 'Configuration is valid'
            });

        } catch (error) {
            strapi.log.error(`[Config] Validation failed: ${error.message}`);
            ctx.badRequest('Validation failed', { error: error.message });
        }
    },

    /**
     * Get configuration schema/documentation
     * GET /bargain-detector/config/schema
     */
    async getSchema(ctx) {
        try {
            const schema = {
                opportunity_rules: {
                    price_drop: {
                        strong: { type: 'number', min: 0, max: 100, description: 'Strong price drop threshold (%)' },
                        medium: { type: 'number', min: 0, max: 100, description: 'Medium price drop threshold (%)' },
                        low: { type: 'number', min: 0, max: 100, description: 'Low price drop threshold (%)' },
                        minimum: { type: 'number', min: 0, max: 100, description: 'Minimum price drop threshold (%)' }
                    },
                    flash_deal: {
                        enabled: { type: 'boolean', description: 'Enable flash deal detection' },
                        min_drop_percent: { type: 'number', min: 0, max: 100, description: 'Minimum drop for flash deal (%)' },
                        max_time_window_hours: { type: 'number', min: 1, max: 24, description: 'Time window for flash detection (hours)' },
                        urgency_threshold: { type: 'number', min: 0, max: 100, description: 'Urgency threshold (%)' }
                    }
                },
                risk_rules: {
                    volatility: {
                        high: { type: 'number', min: 0, max: 100, description: 'High volatility threshold (%)' },
                        medium: { type: 'number', min: 0, max: 100, description: 'Medium volatility threshold (%)' },
                        low: { type: 'number', min: 0, max: 100, description: 'Low volatility threshold (%)' }
                    },
                    supplier_trust: {
                        min_data_points: { type: 'number', min: 1, max: 1000, description: 'Minimum price history entries' },
                        min_reliability_score: { type: 'number', min: 0, max: 100, description: 'Minimum reliability score' },
                        error_tolerance: { type: 'number', min: 0, max: 1, description: 'Maximum error rate (0-1)' }
                    }
                },
                recommendation_thresholds: {
                    strong_buy: {
                        min_opportunity: { type: 'number', min: 0, max: 100, description: 'Minimum opportunity score' },
                        max_risk: { type: 'number', min: 0, max: 100, description: 'Maximum risk score' },
                        min_confidence: { type: 'number', min: 0, max: 1, description: 'Minimum confidence (0-1)' }
                    },
                    buy: {
                        min_opportunity: { type: 'number', min: 0, max: 100 },
                        max_risk: { type: 'number', min: 0, max: 100 },
                        min_confidence: { type: 'number', min: 0, max: 1 }
                    },
                    watch: {
                        min_opportunity: { type: 'number', min: 0, max: 100 },
                        max_risk: { type: 'number', min: 0, max: 100 }
                    },
                    avoid: {
                        max_risk: { type: 'number', min: 0, max: 100 }
                    }
                },
                automation: {
                    analysis_frequency: { type: 'string', description: 'Cron expression for auto-analysis' },
                    batch_size: { type: 'number', min: 1, max: 500, description: 'Products per cron run' },
                    auto_expire_days: { type: 'number', min: 1, max: 90, description: 'Days until opportunity expires' },
                    cleanup_days: { type: 'number', min: 1, max: 365, description: 'Days to keep old records' }
                }
            };

            ctx.send({
                success: true,
                data: schema
            });

        } catch (error) {
            strapi.log.error(`[Config] Failed to get schema: ${error.message}`);
            ctx.badRequest('Failed to get schema', { error: error.message });
        }
    }
};