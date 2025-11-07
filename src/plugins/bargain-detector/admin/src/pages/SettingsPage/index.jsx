// admin/src/pages/SettingsPage/index.jsx
// Configuration management UI

import React, { useState, useEffect } from 'react';
import {
    Layout,
    HeaderLayout,
    ContentLayout,
    Box,
    Grid,
    GridItem,
    Typography,
    Button,
    Flex,
    Alert,
    TextInput,
    NumberInput,
    ToggleInput,
    Divider,
    Accordion,
    AccordionToggle,
    AccordionContent
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';
import { ArrowLeft, Check, Refresh } from '@strapi/icons';
import pluginId from '../../pluginId';

const SettingsPage = () => {
    const { get, put } = useFetchClient();
    const history = useHistory();

    const [config, setConfig] = useState(null);
    const [originalConfig, setOriginalConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    const [expandedSections, setExpandedSections] = useState({
        opportunity: true,
        risk: true,
        scoring: false,
        recommendations: true,
        patterns: false,
        alerts: false,
        automation: true
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    useEffect(() => {
        // Check if config has changed
        if (config && originalConfig) {
            const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
            setHasChanges(changed);
        }
    }, [config, originalConfig]);

    const fetchConfig = async () => {
        try {
            setLoading(true);

            // Try to get existing config via plugin endpoint first
            try {
                const pluginResponse = await get(`/${pluginId}/config`);

                if (pluginResponse?.data?.data) {
                    setConfig(pluginResponse.data.data);
                    setOriginalConfig(JSON.parse(JSON.stringify(pluginResponse.data.data)));
                    setLoading(false);
                    return;
                }
            } catch (error) {
                console.log('No config via plugin endpoint, trying Content Manager...');
            }

            // Fallback to Content Manager API
            const response = await get('/content-manager/single-types/plugin::bargain-detector.configuration');

            if (response?.data) {
                setConfig(response.data);
                setOriginalConfig(JSON.parse(JSON.stringify(response.data)));
            } else {
                // If no config exists, create default
                await createDefaultConfig();
            }

        } catch (error) {
            console.error('Failed to fetch config:', error);
            // If config doesn't exist at all, create default
            await createDefaultConfig();
        } finally {
            setLoading(false);
        }
    };

    const createDefaultConfig = async () => {
        try {
            const defaultConfig = getDefaultConfig();

            // Use entityService directly via our plugin endpoint
            const response = await put(`/${pluginId}/config/save`, defaultConfig);

            if (response?.data) {
                setConfig(response.data);
                setOriginalConfig(JSON.parse(JSON.stringify(response.data)));
                setMessage({ type: 'info', text: 'Default configuration created' });
            }

        } catch (error) {
            console.error('Failed to create default config:', error);
            setMessage({ type: 'danger', text: 'Failed to create default configuration' });
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);

            // Validate config
            const validation = validateConfig(config);
            if (!validation.valid) {
                setMessage({ type: 'danger', text: validation.error });
                setSaving(false);
                return;
            }

            console.log('Saving config to:', `/${pluginId}/config/save`);
            console.log('Config data:', config);

            // Save via our plugin endpoint
            const response = await put(`/${pluginId}/config/save`, config);

            console.log('Save response:', response);

            if (response?.data?.success && response?.data?.data) {
                // Response structure: { data: { success: true, data: {...}, message: '...' } }
                const savedConfig = response.data.data;
                setConfig(savedConfig);
                setOriginalConfig(JSON.parse(JSON.stringify(savedConfig)));
                setHasChanges(false);
                setMessage({ type: 'success', text: 'Configuration saved successfully!' });

                // Clear cache on backend
                try {
                    await get(`/${pluginId}/config/clear-cache`);
                } catch (cacheError) {
                    console.warn('Cache clear failed (non-critical):', cacheError);
                }
            } else if (response?.data) {
                // Direct response without wrapper
                setConfig(response.data);
                setOriginalConfig(JSON.parse(JSON.stringify(response.data)));
                setHasChanges(false);
                setMessage({ type: 'success', text: 'Configuration saved successfully!' });
            } else {
                throw new Error('Invalid response from server');
            }

        } catch (error) {
            console.error('Failed to save config:', error);
            console.error('Error response:', error?.response);
            setMessage({
                type: 'danger',
                text: error?.response?.data?.error?.message ||
                    error?.response?.data?.message ||
                    error.message ||
                    'Failed to save configuration. Check console for details.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setConfig(JSON.parse(JSON.stringify(originalConfig)));
        setMessage({ type: 'info', text: 'Changes discarded' });
    };

    const handleResetToDefaults = async () => {
        if (!window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            return;
        }

        const defaultConfig = getDefaultConfig();
        setConfig(defaultConfig);
        setMessage({ type: 'warning', text: 'Configuration reset to defaults (not saved yet)' });
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const updateConfig = (path, value) => {
        setConfig(prev => {
            const newConfig = { ...prev };
            const keys = path.split('.');
            let current = newConfig;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }

            current[keys[keys.length - 1]] = value;
            return newConfig;
        });
    };

    if (loading) {
        return (
            <Layout>
                <Box padding={8}>
                    <Flex justifyContent="center">
                        <Typography>Loading configuration...</Typography>
                    </Flex>
                </Box>
            </Layout>
        );
    }

    if (!config) {
        return (
            <Layout>
                <Box padding={8}>
                    <Alert variant="danger" title="Error">
                        Failed to load configuration
                    </Alert>
                </Box>
            </Layout>
        );
    }

    return (
        <Layout>
            <HeaderLayout
                title="Plugin Configuration"
                subtitle="Configure opportunity detection rules and thresholds"
                navigationAction={
                    <Button
                        onClick={() => history.push(`/plugins/${pluginId}`)}
                        startIcon={<ArrowLeft />}
                        variant="tertiary"
                    >
                        Back to Dashboard
                    </Button>
                }
                primaryAction={
                    <Flex gap={2}>
                        {hasChanges && (
                            <Button
                                onClick={handleReset}
                                variant="tertiary"
                            >
                                Discard Changes
                            </Button>
                        )}
                        <Button
                            onClick={handleResetToDefaults}
                            variant="secondary"
                        >
                            Reset to Defaults
                        </Button>
                        <Button
                            onClick={handleSave}
                            loading={saving}
                            disabled={!hasChanges}
                            startIcon={<Check />}
                        >
                            Save Configuration
                        </Button>
                    </Flex>
                }
            />

            <ContentLayout>
                <Box padding={8} background="neutral100">

                    {/* Message Banner */}
                    {message && (
                        <Box marginBottom={4}>
                            <Alert
                                variant={message.type}
                                title={message.type === 'success' ? 'Success' : message.type === 'danger' ? 'Error' : 'Info'}
                                onClose={() => setMessage(null)}
                                closeLabel="Close"
                            >
                                {message.text}
                            </Alert>
                        </Box>
                    )}

                    {/* Has Changes Banner */}
                    {hasChanges && (
                        <Box marginBottom={4}>
                            <Alert variant="warning" title="Unsaved Changes">
                                You have unsaved changes. Click "Save Configuration" to apply them.
                            </Alert>
                        </Box>
                    )}

                    {/* OPPORTUNITY RULES */}
                    <Box background="neutral0" hasRadius shadow="tableShadow" marginBottom={4}>
                        <Box
                            padding={4}
                            style={{ cursor: 'pointer', borderBottom: expandedSections.opportunity ? '1px solid #eaeaea' : 'none' }}
                            onClick={() => toggleSection('opportunity')}
                        >
                            <Flex justifyContent="space-between" alignItems="center">
                                <Typography variant="delta" fontWeight="bold">
                                    💰 Opportunity Rules
                                </Typography>
                                <Typography variant="pi" textColor="neutral600">
                                    {expandedSections.opportunity ? '▼' : '▶'}
                                </Typography>
                            </Flex>
                        </Box>

                        {expandedSections.opportunity && (
                            <Box padding={4}>
                                <Typography variant="sigma" marginBottom={3}>Price Drop Thresholds (%)</Typography>
                                <Grid gap={4}>
                                    <GridItem col={3}>
                                        <NumberInput
                                            label="Strong Drop"
                                            name="opportunity_rules.price_drop.strong"
                                            value={config.opportunity_rules?.price_drop?.strong || 20}
                                            onValueChange={(value) => updateConfig('opportunity_rules.price_drop.strong', value)}
                                            min={0}
                                            max={100}
                                            hint="Percentage for strong price drop signal"
                                        />
                                    </GridItem>
                                    <GridItem col={3}>
                                        <NumberInput
                                            label="Medium Drop"
                                            name="opportunity_rules.price_drop.medium"
                                            value={config.opportunity_rules?.price_drop?.medium || 15}
                                            onValueChange={(value) => updateConfig('opportunity_rules.price_drop.medium', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={3}>
                                        <NumberInput
                                            label="Low Drop"
                                            name="opportunity_rules.price_drop.low"
                                            value={config.opportunity_rules?.price_drop?.low || 10}
                                            onValueChange={(value) => updateConfig('opportunity_rules.price_drop.low', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={3}>
                                        <NumberInput
                                            label="Minimum Drop"
                                            name="opportunity_rules.price_drop.minimum"
                                            value={config.opportunity_rules?.price_drop?.minimum || 5}
                                            onValueChange={(value) => updateConfig('opportunity_rules.price_drop.minimum', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                </Grid>

                                <Divider marginTop={4} marginBottom={4} />

                                <Typography variant="sigma" marginBottom={3}>Flash Deal Settings</Typography>
                                <Grid gap={4}>
                                    <GridItem col={3}>
                                        <ToggleInput
                                            label="Enable Flash Deals"
                                            name="opportunity_rules.flash_deal.enabled"
                                            checked={config.opportunity_rules?.flash_deal?.enabled ?? true}
                                            onChange={(e) => updateConfig('opportunity_rules.flash_deal.enabled', e.target.checked)}
                                        />
                                    </GridItem>
                                    <GridItem col={3}>
                                        <NumberInput
                                            label="Min Drop %"
                                            value={config.opportunity_rules?.flash_deal?.min_drop_percent || 10}
                                            onValueChange={(value) => updateConfig('opportunity_rules.flash_deal.min_drop_percent', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={3}>
                                        <NumberInput
                                            label="Time Window (hours)"
                                            value={config.opportunity_rules?.flash_deal?.max_time_window_hours || 6}
                                            onValueChange={(value) => updateConfig('opportunity_rules.flash_deal.max_time_window_hours', value)}
                                            min={1}
                                            max={24}
                                        />
                                    </GridItem>
                                    <GridItem col={3}>
                                        <NumberInput
                                            label="Urgency Threshold %"
                                            value={config.opportunity_rules?.flash_deal?.urgency_threshold || 15}
                                            onValueChange={(value) => updateConfig('opportunity_rules.flash_deal.urgency_threshold', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                </Grid>
                            </Box>
                        )}
                    </Box>

                    {/* RISK RULES */}
                    <Box background="neutral0" hasRadius shadow="tableShadow" marginBottom={4}>
                        <Box
                            padding={4}
                            style={{ cursor: 'pointer', borderBottom: expandedSections.risk ? '1px solid #eaeaea' : 'none' }}
                            onClick={() => toggleSection('risk')}
                        >
                            <Flex justifyContent="space-between" alignItems="center">
                                <Typography variant="delta" fontWeight="bold">
                                    ⚠️ Risk Rules
                                </Typography>
                                <Typography variant="pi" textColor="neutral600">
                                    {expandedSections.risk ? '▼' : '▶'}
                                </Typography>
                            </Flex>
                        </Box>

                        {expandedSections.risk && (
                            <Box padding={4}>
                                <Typography variant="sigma" marginBottom={3}>Volatility Thresholds (%)</Typography>
                                <Grid gap={4}>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="High Volatility"
                                            value={config.risk_rules?.volatility?.high || 15}
                                            onValueChange={(value) => updateConfig('risk_rules.volatility.high', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Medium Volatility"
                                            value={config.risk_rules?.volatility?.medium || 8}
                                            onValueChange={(value) => updateConfig('risk_rules.volatility.medium', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Low Volatility"
                                            value={config.risk_rules?.volatility?.low || 5}
                                            onValueChange={(value) => updateConfig('risk_rules.volatility.low', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                </Grid>

                                <Divider marginTop={4} marginBottom={4} />

                                <Typography variant="sigma" marginBottom={3}>Supplier Trust Settings</Typography>
                                <Grid gap={4}>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Min Data Points"
                                            value={config.risk_rules?.supplier_trust?.min_data_points || 30}
                                            onValueChange={(value) => updateConfig('risk_rules.supplier_trust.min_data_points', value)}
                                            min={1}
                                            max={1000}
                                            hint="Minimum price history entries needed"
                                        />
                                    </GridItem>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Min Reliability Score"
                                            value={config.risk_rules?.supplier_trust?.min_reliability_score || 60}
                                            onValueChange={(value) => updateConfig('risk_rules.supplier_trust.min_reliability_score', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Error Tolerance"
                                            value={config.risk_rules?.supplier_trust?.error_tolerance || 0.05}
                                            onValueChange={(value) => updateConfig('risk_rules.supplier_trust.error_tolerance', value)}
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            hint="Maximum acceptable error rate (0-1)"
                                        />
                                    </GridItem>
                                </Grid>
                            </Box>
                        )}
                    </Box>

                    {/* RECOMMENDATION THRESHOLDS */}
                    <Box background="neutral0" hasRadius shadow="tableShadow" marginBottom={4}>
                        <Box
                            padding={4}
                            style={{ cursor: 'pointer', borderBottom: expandedSections.recommendations ? '1px solid #eaeaea' : 'none' }}
                            onClick={() => toggleSection('recommendations')}
                        >
                            <Flex justifyContent="space-between" alignItems="center">
                                <Typography variant="delta" fontWeight="bold">
                                    🎯 Recommendation Thresholds
                                </Typography>
                                <Typography variant="pi" textColor="neutral600">
                                    {expandedSections.recommendations ? '▼' : '▶'}
                                </Typography>
                            </Flex>
                        </Box>

                        {expandedSections.recommendations && (
                            <Box padding={4}>
                                <Typography variant="sigma" marginBottom={3}>Strong Buy</Typography>
                                <Grid gap={4} marginBottom={4}>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Min Opportunity"
                                            value={config.recommendation_thresholds?.strong_buy?.min_opportunity || 80}
                                            onValueChange={(value) => updateConfig('recommendation_thresholds.strong_buy.min_opportunity', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Max Risk"
                                            value={config.recommendation_thresholds?.strong_buy?.max_risk || 30}
                                            onValueChange={(value) => updateConfig('recommendation_thresholds.strong_buy.max_risk', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Min Confidence"
                                            value={config.recommendation_thresholds?.strong_buy?.min_confidence || 0.75}
                                            onValueChange={(value) => updateConfig('recommendation_thresholds.strong_buy.min_confidence', value)}
                                            min={0}
                                            max={1}
                                            step={0.05}
                                        />
                                    </GridItem>
                                </Grid>

                                <Divider marginBottom={4} />

                                <Typography variant="sigma" marginBottom={3}>Buy</Typography>
                                <Grid gap={4} marginBottom={4}>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Min Opportunity"
                                            value={config.recommendation_thresholds?.buy?.min_opportunity || 65}
                                            onValueChange={(value) => updateConfig('recommendation_thresholds.buy.min_opportunity', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Max Risk"
                                            value={config.recommendation_thresholds?.buy?.max_risk || 40}
                                            onValueChange={(value) => updateConfig('recommendation_thresholds.buy.max_risk', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={4}>
                                        <NumberInput
                                            label="Min Confidence"
                                            value={config.recommendation_thresholds?.buy?.min_confidence || 0.65}
                                            onValueChange={(value) => updateConfig('recommendation_thresholds.buy.min_confidence', value)}
                                            min={0}
                                            max={1}
                                            step={0.05}
                                        />
                                    </GridItem>
                                </Grid>

                                <Divider marginBottom={4} />

                                <Typography variant="sigma" marginBottom={3}>Watch</Typography>
                                <Grid gap={4} marginBottom={4}>
                                    <GridItem col={6}>
                                        <NumberInput
                                            label="Min Opportunity"
                                            value={config.recommendation_thresholds?.watch?.min_opportunity || 40}
                                            onValueChange={(value) => updateConfig('recommendation_thresholds.watch.min_opportunity', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                    <GridItem col={6}>
                                        <NumberInput
                                            label="Max Risk"
                                            value={config.recommendation_thresholds?.watch?.max_risk || 50}
                                            onValueChange={(value) => updateConfig('recommendation_thresholds.watch.max_risk', value)}
                                            min={0}
                                            max={100}
                                        />
                                    </GridItem>
                                </Grid>

                                <Divider marginBottom={4} />

                                <Typography variant="sigma" marginBottom={3}>Avoid</Typography>
                                <Grid gap={4}>
                                    <GridItem col={12}>
                                        <NumberInput
                                            label="Max Risk"
                                            value={config.recommendation_thresholds?.avoid?.max_risk || 70}
                                            onValueChange={(value) => updateConfig('recommendation_thresholds.avoid.max_risk', value)}
                                            min={0}
                                            max={100}
                                            hint="Above this risk score, recommendation is 'avoid'"
                                        />
                                    </GridItem>
                                </Grid>
                            </Box>
                        )}
                    </Box>

                    {/* AUTOMATION */}
                    <Box background="neutral0" hasRadius shadow="tableShadow" marginBottom={4}>
                        <Box
                            padding={4}
                            style={{ cursor: 'pointer', borderBottom: expandedSections.automation ? '1px solid #eaeaea' : 'none' }}
                            onClick={() => toggleSection('automation')}
                        >
                            <Flex justifyContent="space-between" alignItems="center">
                                <Typography variant="delta" fontWeight="bold">
                                    ⚙️ Automation Settings
                                </Typography>
                                <Typography variant="pi" textColor="neutral600">
                                    {expandedSections.automation ? '▼' : '▶'}
                                </Typography>
                            </Flex>
                        </Box>

                        {expandedSections.automation && (
                            <Box padding={4}>
                                <Grid gap={4}>
                                    <GridItem col={6}>
                                        <TextInput
                                            label="Analysis Frequency (Cron)"
                                            name="automation.analysis_frequency"
                                            value={config.automation?.analysis_frequency || '0 */3 * * *'}
                                            onChange={(e) => updateConfig('automation.analysis_frequency', e.target.value)}
                                            hint="Cron expression (e.g., '0 */3 * * *' = every 3 hours)"
                                        />
                                    </GridItem>
                                    <GridItem col={6}>
                                        <NumberInput
                                            label="Batch Size"
                                            value={config.automation?.batch_size || 100}
                                            onValueChange={(value) => updateConfig('automation.batch_size', value)}
                                            min={1}
                                            max={500}
                                            hint="Products to analyze per cron run"
                                        />
                                    </GridItem>
                                    <GridItem col={6}>
                                        <NumberInput
                                            label="Auto-Expire Days"
                                            value={config.automation?.auto_expire_days || 7}
                                            onValueChange={(value) => updateConfig('automation.auto_expire_days', value)}
                                            min={1}
                                            max={90}
                                            hint="Days until opportunity expires"
                                        />
                                    </GridItem>
                                    <GridItem col={6}>
                                        <NumberInput
                                            label="Cleanup Days"
                                            value={config.automation?.cleanup_days || 30}
                                            onValueChange={(value) => updateConfig('automation.cleanup_days', value)}
                                            min={1}
                                            max={365}
                                            hint="Delete expired records older than X days"
                                        />
                                    </GridItem>
                                </Grid>
                            </Box>
                        )}
                    </Box>

                </Box>
            </ContentLayout>
        </Layout>
    );
};

// ===== HELPER FUNCTIONS =====

function validateConfig(config) {
    // Validate price drop thresholds are in order
    const priceDrop = config.opportunity_rules?.price_drop;
    if (priceDrop) {
        if (priceDrop.strong <= priceDrop.medium) {
            return { valid: false, error: 'Strong drop must be greater than medium drop' };
        }
        if (priceDrop.medium <= priceDrop.low) {
            return { valid: false, error: 'Medium drop must be greater than low drop' };
        }
        if (priceDrop.low <= priceDrop.minimum) {
            return { valid: false, error: 'Low drop must be greater than minimum drop' };
        }
    }

    // Validate volatility thresholds
    const volatility = config.risk_rules?.volatility;
    if (volatility) {
        if (volatility.high <= volatility.medium) {
            return { valid: false, error: 'High volatility must be greater than medium' };
        }
        if (volatility.medium <= volatility.low) {
            return { valid: false, error: 'Medium volatility must be greater than low' };
        }
    }

    // Validate recommendation thresholds
    const strongBuy = config.recommendation_thresholds?.strong_buy;
    const buy = config.recommendation_thresholds?.buy;
    const watch = config.recommendation_thresholds?.watch;

    if (strongBuy && buy) {
        if (strongBuy.min_opportunity <= buy.min_opportunity) {
            return { valid: false, error: 'Strong buy opportunity must be higher than buy' };
        }
    }

    if (buy && watch) {
        if (buy.min_opportunity <= watch.min_opportunity) {
            return { valid: false, error: 'Buy opportunity must be higher than watch' };
        }
    }

    return { valid: true };
}

function getDefaultConfig() {
    return {
        opportunity_rules: {
            price_drop: { strong: 20, medium: 15, low: 10, minimum: 5 },
            historic_low: { exact_match: true, near_threshold: 5, confidence_required: 0.7 },
            multi_supplier: { min_suppliers: 2, agreement_threshold: 0.8, time_window_hours: 24 },
            flash_deal: { enabled: true, min_drop_percent: 10, max_time_window_hours: 6, urgency_threshold: 15 },
            inventory_factor: { enabled: true, low_stock_boost: 20, reorder_point_boost: 10, out_of_stock_boost: 30 }
        },
        risk_rules: {
            volatility: { high: 15, medium: 8, low: 5 },
            inventory_underwater: { warning_threshold: -5, urgent_threshold: -15, critical_threshold: -25 },
            supplier_trust: { min_data_points: 30, min_reliability_score: 60, error_tolerance: 0.05 }
        },
        scoring_weights: {
            opportunity: { price_advantage: 40, timing: 30, inventory_need: 20, confidence: 10 },
            risk: { volatility: 35, market_position: 35, supplier_reliability: 30 }
        },
        recommendation_thresholds: {
            strong_buy: { min_opportunity: 80, max_risk: 30, min_confidence: 0.75 },
            buy: { min_opportunity: 65, max_risk: 40, min_confidence: 0.65 },
            cautious_buy: { min_opportunity: 50, max_risk: 60, min_confidence: 0.5 },
            watch: { min_opportunity: 40, max_risk: 50 },
            avoid: { max_risk: 70 }
        },
        pattern_settings: {
            seasonal: { enabled: true, min_occurrences: 2, min_confidence: 0.7, look_back_years: 3 },
            supplier_behavior: { enabled: true, min_correlation: 0.75, min_samples: 20 },
            day_of_week: { enabled: true, min_samples_per_day: 10 }
        },
        alert_settings: {
            flash_deals: { enabled: true, min_score: 85, channels: ['email', 'dashboard'] },
            critical_opportunities: { enabled: true, min_score: 80, max_stock: 2, channels: ['email', 'dashboard'] },
            inventory_risks: { enabled: true, underwater_threshold: -15, channels: ['dashboard'] },
            daily_digest: { enabled: true, time: '08:00', min_opportunities: 3 }
        },
        automation: {
            analysis_frequency: '0 */3 * * *',
            auto_expire_days: 7,
            cleanup_days: 30,
            batch_size: 100
        },
        version: '1.0.0'
    };
}

export default SettingsPage;