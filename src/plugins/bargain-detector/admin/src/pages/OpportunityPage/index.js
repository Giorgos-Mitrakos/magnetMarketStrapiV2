// admin/src/pages/OpportunityPage/index.jsx

import React, { useState, useEffect } from 'react';
import {
  Layout,
  HeaderLayout,
  ContentLayout,
  Box,
  Grid,
  GridItem,
  Typography,
  Badge,
  Divider,
  Button,
  Flex,
  Alert,
  Accordion,
  AccordionToggle,
  AccordionContent
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';
import { useHistory, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Cross, ChevronDown } from '@strapi/icons';
import pluginId from '../../pluginId';

const OpportunityPage = () => {
  const { id } = useParams();
  const { get, put } = useFetchClient();
  const history = useHistory();
  const [opportunity, setOpportunity] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    current: true,
    price: true,
    liquidity: false,
    volatility: false,
    trend: false,
    supplier: false,
    scoring: false,
    insights: true,
    actions: true
  });

  useEffect(() => {
    fetchOpportunityDetails();
  }, [id]);

  const fetchOpportunityDetails = async () => {
    try {
      setLoading(true);

      const { data: oppData } = await get(`/${pluginId}/opportunities/${id}?populate=product`);
      setOpportunity(oppData);

      if (oppData?.product?.id) {
        const { data: prodData } = await get(
          `/content-manager/collection-types/api::product.product/${oppData.product.id}?populate=supplierInfo.price_progress`
        );
        setProduct(prodData);
      }

      if (!oppData.viewed) {
        await put(`/${pluginId}/opportunities/${id}`, {
          data: { viewed: true, viewed_at: new Date().toISOString() }
        });
      }

    } catch (error) {
      console.error('Failed to fetch opportunity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAs = async (status) => {
    try {
      await put(`/${pluginId}/opportunities/${id}`, {
        data: {
          status,
          action_taken: status,
          actioned_at: new Date().toISOString()
        }
      });
      fetchOpportunityDetails();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <Layout>
        <Box padding={8}>
          <Flex justifyContent="center">
            <Typography>Loading...</Typography>
          </Flex>
        </Box>
      </Layout>
    );
  }

  if (!opportunity) {
    return (
      <Layout>
        <Box padding={8}>
          <Alert variant="danger" title="Error">
            Opportunity not found
          </Alert>
        </Box>
      </Layout>
    );
  }

  const recDetails = opportunity.analysis_data?.recommendation_details || {};
  const metrics = opportunity.analysis_data?.metrics_summary || {};
  const insights = opportunity.analysis_data?.key_insights || [];
  const actions = opportunity.analysis_data?.action_items || [];
  const currentState = opportunity.analysis_data?.current_state || {};
  const opportunityBreakdown = opportunity.analysis_data?.opportunity_breakdown || {};
  const riskBreakdown = opportunity.analysis_data?.risk_breakdown || {};
  const confidenceBreakdown = opportunity.analysis_data?.confidence_breakdown || {};

  return (
    <Layout>
      <HeaderLayout
        title={`Opportunity #${opportunity.id}`}
        subtitle={`Product: ${product?.name || `#${opportunity.product?.id}`}`}
        navigationAction={
          <Button
            onClick={() => history.push(`/plugins/${pluginId}/opportunities`)}
            startIcon={<ArrowLeft />}
            variant="tertiary"
          >
            Back
          </Button>
        }
        primaryAction={
          opportunity.status === 'active' && (
            <Flex gap={2}>
              <Button
                onClick={() => handleMarkAs('purchased')}
                startIcon={<Check />}
                variant="success"
              >
                Mark as Purchased
              </Button>
              <Button
                onClick={() => handleMarkAs('dismissed')}
                startIcon={<Cross />}
                variant="secondary"
              >
                Dismiss
              </Button>
            </Flex>
          )
        }
      />

      <ContentLayout>
        <Box padding={8} background="neutral100">

          {/* Score Cards */}
          <Grid gap={4} marginBottom={6}>
            <GridItem col={3}>
              <ScoreCard
                title="Opportunity Score"
                value={opportunity.opportunity_score}
                max={100}
                color="success"
              />
            </GridItem>
            <GridItem col={3}>
              <ScoreCard
                title="Risk Score"
                value={opportunity.risk_score}
                max={100}
                color="danger"
              />
            </GridItem>
            <GridItem col={3}>
              <InfoCard
                title="Priority"
                value={opportunity.priority.toUpperCase()}
                badge={true}
                badgeProps={getPriorityBadgeProps(opportunity.priority)}
              />
            </GridItem>
            <GridItem col={3}>
              <InfoCard
                title="Confidence"
                value={opportunity.confidence.toUpperCase()}
              />
            </GridItem>
          </Grid>

          {/* Recommendation Box */}
          <Box
            background="primary100"
            padding={6}
            hasRadius
            marginBottom={6}
            style={{ border: '2px solid #4945ff' }}
          >
            <Typography variant="beta" fontWeight="bold" textColor="primary700" marginBottom={2}>
              {formatRecommendation(opportunity.recommendation)}
            </Typography>

            {recDetails.rationale && (
              <Typography marginBottom={3}>
                {recDetails.rationale}
              </Typography>
            )}

            {recDetails.action && (
              <Box background="neutral0" padding={3} hasRadius marginBottom={2}>
                <Typography fontWeight="semiBold" textColor="primary600">
                  💡 Action: {recDetails.action}
                </Typography>
              </Box>
            )}

            {recDetails.suggested_stock_days && (
              <Badge backgroundColor="success100" textColor="success700" size="L">
                📦 Suggested Stock: {recDetails.suggested_stock_days} days
              </Badge>
            )}

            {recDetails.note && (
              <Typography variant="pi" textColor="neutral600" marginTop={2}>
                <em>{recDetails.note}</em>
              </Typography>
            )}
          </Box>

          {/* Expandable Sections */}
          <Grid gap={4} marginBottom={6}>

            {/* Current State */}
            <GridItem col={12}>
              <CollapsibleSection
                title="📍 Current State"
                expanded={expandedSections.current}
                onToggle={() => toggleSection('current')}
              >
                <Grid gap={4}>
                  <GridItem col={6}>
                    <MetricRow label="Current Price" value={`€${currentState.current_price?.toFixed(2) || 'N/A'}`} />
                    <MetricRow label="Current Stock" value={currentState.current_stock || 0} />
                    <MetricRow label="Cheapest Supplier" value={currentState.cheapest_supplier?.name || 'N/A'} />
                  </GridItem>
                  <GridItem col={6}>
                    <MetricRow label="Total Suppliers" value={currentState.total_suppliers || 0} />
                    <MetricRow label="Suppliers In Stock" value={currentState.suppliers_in_stock || 0} />
                  </GridItem>
                </Grid>
              </CollapsibleSection>
            </GridItem>

            {/* Price Metrics - EXPANDED */}
            <GridItem col={12}>
              <CollapsibleSection
                title="💰 Price Metrics (Complete)"
                expanded={expandedSections.price}
                onToggle={() => toggleSection('price')}
              >
                <Grid gap={4}>
                  <GridItem col={6}>
                    <Typography variant="sigma" marginBottom={2}>Current & Averages</Typography>
                    <MetricRow label="Current Best" value={`€${metrics.current_price?.toFixed(2) || 'N/A'}`} highlight="primary" />
                    <Divider marginTop={2} marginBottom={2} />
                    <MetricRow label="7d Average" value={`€${metrics.avg_7d?.toFixed(2) || 'N/A'}`} />
                    <MetricRow label="30d Average" value={`€${metrics.avg_30d?.toFixed(2) || 'N/A'}`} />
                    <MetricRow label="60d Average" value={`€${metrics.avg_60d?.toFixed(2) || 'N/A'}`} />
                    <MetricRow label="90d Average" value={`€${metrics.avg_90d?.toFixed(2) || 'N/A'}`} />
                    <Divider marginTop={2} marginBottom={2} />
                    <MetricRow label="Historic Min" value={`€${metrics.historic_min?.toFixed(2) || 'N/A'}`} highlight="success" />
                    <MetricRow label="Historic Max" value={`€${metrics.historic_max?.toFixed(2) || 'N/A'}`} highlight="danger" />
                  </GridItem>

                  <GridItem col={6}>
                    <Typography variant="sigma" marginBottom={2}>Min/Max per Period</Typography>
                    <MetricRow label="Min 7d" value={`€${metrics.min_7d?.toFixed(2) || 'N/A'}`} />
                    <MetricRow label="Max 7d" value={`€${metrics.max_7d?.toFixed(2) || 'N/A'}`} />
                    <Divider marginTop={2} marginBottom={2} />
                    <MetricRow label="Min 30d" value={`€${metrics.min_30d?.toFixed(2) || 'N/A'}`} />
                    <MetricRow label="Max 30d" value={`€${metrics.max_30d?.toFixed(2) || 'N/A'}`} />
                    <Divider marginTop={2} marginBottom={2} />
                    <MetricRow label="Min 60d" value={`€${metrics.min_60d?.toFixed(2) || 'N/A'}`} />
                    <MetricRow label="Max 60d" value={`€${metrics.max_60d?.toFixed(2) || 'N/A'}`} />
                    <Divider marginTop={2} marginBottom={2} />
                    <MetricRow label="Min 90d" value={`€${metrics.min_90d?.toFixed(2) || 'N/A'}`} />
                    <MetricRow label="Max 90d" value={`€${metrics.max_90d?.toFixed(2) || 'N/A'}`} />
                  </GridItem>

                  <GridItem col={12}>
                    <Divider marginTop={3} marginBottom={3} />
                    <Typography variant="sigma" marginBottom={2}>Price Drops & Position</Typography>
                  </GridItem>

                  <GridItem col={6}>
                    <MetricRow
                      label="Drop from 7d Avg"
                      value={`${metrics.dropFrom7d?.toFixed(1) || 0}%`}
                      highlight={metrics.dropFrom7d > 10 ? 'success' : null}
                    />
                    <MetricRow
                      label="Drop from 30d Avg"
                      value={`${metrics.drop_from_avg?.toFixed(1) || 0}%`}
                      highlight={metrics.drop_from_avg > 10 ? 'success' : null}
                    />
                    <MetricRow
                      label="Drop from 60d Avg"
                      value={`${metrics.dropFrom60d?.toFixed(1) || 0}%`}
                      highlight={metrics.dropFrom60d > 10 ? 'success' : null}
                    />
                    <MetricRow
                      label="Drop from 90d Avg"
                      value={`${metrics.dropFrom90d?.toFixed(1) || 0}%`}
                      highlight={metrics.dropFrom90d > 10 ? 'success' : null}
                    />
                  </GridItem>

                  <GridItem col={6}>
                    <MetricRow
                      label="Distance from Historic Min"
                      value={`${metrics.distance_from_min?.toFixed(1) || 0}%`}
                      highlight={metrics.distance_from_min < 5 ? 'success' : null}
                    />
                    <MetricRow
                      label="Distance from Historic Max"
                      value={`${metrics.distance_from_max?.toFixed(1) || 0}%`}
                    />
                    <Divider marginTop={2} marginBottom={2} />
                    {metrics.is_historic_low && (
                      <Box padding={2} background="success100" hasRadius marginBottom={2}>
                        <Typography fontWeight="bold" textColor="success700">
                          🎯 Historic Low Price!
                        </Typography>
                      </Box>
                    )}
                    {metrics.is_near_historic_low && !metrics.is_historic_low && (
                      <Box padding={2} background="success100" hasRadius marginBottom={2}>
                        <Typography fontWeight="bold" textColor="success700">
                          📍 Near Historic Low
                        </Typography>
                      </Box>
                    )}
                  </GridItem>
                </Grid>
              </CollapsibleSection>
            </GridItem>

            {/* Liquidity Metrics - NEW */}
            <GridItem col={12}>
              <CollapsibleSection
                title="🔄 Liquidity Metrics"
                expanded={expandedSections.liquidity}
                onToggle={() => toggleSection('liquidity')}
              >
                <Grid gap={4}>
                  <GridItem col={6}>
                    <MetricRow
                      label="Liquidity Score"
                      value={`${metrics.liquidity?.liquidity_score || 0}/100`}
                      highlight={metrics.liquidity?.liquidity_score >= 70 ? 'success' : null}
                    />
                    <MetricRow
                      label="Fast Mover"
                      value={metrics.liquidity?.is_fast_mover ? '✅ Yes' : '❌ No'}
                    />
                    <MetricRow
                      label="Purchase Frequency"
                      value={formatFrequency(metrics.liquidity?.purchase_frequency)}
                    />
                  </GridItem>
                  <GridItem col={6}>
                    <MetricRow
                      label="Avg Days Between Purchases"
                      value={metrics.liquidity?.avg_days_between_purchases
                        ? `${metrics.liquidity.avg_days_between_purchases.toFixed(0)} days`
                        : 'N/A'
                      }
                    />
                    <MetricRow
                      label="Days Since Last Purchase"
                      value={metrics.liquidity?.days_since_last_purchase
                        ? `${metrics.liquidity.days_since_last_purchase} days`
                        : 'N/A'
                      }
                    />
                    <MetricRow
                      label="Total Purchases"
                      value={metrics.liquidity?.total_purchases || 0}
                    />
                  </GridItem>
                </Grid>
              </CollapsibleSection>
            </GridItem>

            {/* Volatility Metrics - NEW */}
            <GridItem col={12}>
              <CollapsibleSection
                title="📊 Volatility Metrics"
                expanded={expandedSections.volatility}
                onToggle={() => toggleSection('volatility')}
              >
                <Grid gap={4}>
                  <GridItem col={6}>
                    <MetricRow
                      label="Coefficient of Variation"
                      value={`${metrics.volatility?.coefficient_of_variation?.toFixed(2) || 0}%`}
                      highlight={metrics.volatility?.coefficient_of_variation > 15 ? 'danger' : null}
                    />
                    <MetricRow
                      label="Std Dev (30d)"
                      value={`€${metrics.volatility?.std_dev_30d?.toFixed(2) || 0}`}
                    />
                  </GridItem>
                  <GridItem col={6}>
                    <MetricRow
                      label="Price Changes (30d)"
                      value={metrics.volatility?.price_changes_30d || 0}
                    />
                    {metrics.volatility?.coefficient_of_variation > 15 && (
                      <Box padding={2} background="danger100" hasRadius marginTop={2}>
                        <Typography fontWeight="bold" textColor="danger700">
                          ⚠️ High Volatility
                        </Typography>
                      </Box>
                    )}
                  </GridItem>
                </Grid>
              </CollapsibleSection>
            </GridItem>

            {/* Trend Analysis - NEW */}
            <GridItem col={12}>
              <CollapsibleSection
                title="📈 Trend Analysis"
                expanded={expandedSections.trend}
                onToggle={() => toggleSection('trend')}
              >
                <Grid gap={4}>
                  <GridItem col={6}>
                    <MetricRow
                      label="Direction"
                      value={formatTrendDirection(metrics.trend?.direction)}
                    />
                    <MetricRow
                      label="Strength"
                      value={metrics.trend?.strength || 0}
                    />
                  </GridItem>
                  <GridItem col={6}>
                    <MetricRow
                      label="Accelerating"
                      value={metrics.trend?.accelerating ? '✅ Yes' : '❌ No'}
                    />
                    {metrics.trend?.direction === 'strong_down' && (
                      <Box padding={2} background="success100" hasRadius marginTop={2}>
                        <Typography fontWeight="bold" textColor="success700">
                          📉 Strong Downward Trend - Good timing!
                        </Typography>
                      </Box>
                    )}
                    {metrics.trend?.direction === 'strong_up' && (
                      <Box padding={2} background="danger100" hasRadius marginTop={2}>
                        <Typography fontWeight="bold" textColor="danger700">
                          📈 Strong Upward Trend - Unfavorable
                        </Typography>
                      </Box>
                    )}
                  </GridItem>
                </Grid>
              </CollapsibleSection>
            </GridItem>

            {/* Supplier Metrics - NEW */}
            <GridItem col={12}>
              <CollapsibleSection
                title="🏪 Supplier Metrics"
                expanded={expandedSections.supplier}
                onToggle={() => toggleSection('supplier')}
              >
                <Grid gap={4}>
                  <GridItem col={6}>
                    <MetricRow
                      label="Suppliers Dropping Prices"
                      value={metrics.suppliers_dropping || 0}
                    />
                    <MetricRow
                      label="Best Price Savings vs Avg"
                      value={`${metrics.best_price_savings?.toFixed(1) || 0}%`}
                      highlight={metrics.best_price_savings > 5 ? 'success' : null}
                    />
                  </GridItem>
                  <GridItem col={6}>
                    {metrics.suppliers_dropping >= 2 && (
                      <Box padding={2} background="success100" hasRadius>
                        <Typography fontWeight="bold" textColor="success700">
                          ✅ Multiple Suppliers Dropping - Market Signal!
                        </Typography>
                      </Box>
                    )}
                  </GridItem>
                </Grid>
              </CollapsibleSection>
            </GridItem>

            {/* Flash Deal - NEW */}
            {metrics.is_flash_deal && (
              <GridItem col={12}>
                <Box background="danger100" padding={4} hasRadius style={{ border: '2px solid #d02b20' }}>
                  <Typography variant="beta" fontWeight="bold" textColor="danger700" marginBottom={2}>
                    ⚡ FLASH DEAL DETECTED
                  </Typography>
                  <Grid gap={2}>
                    <GridItem col={4}>
                      <Typography variant="omega" textColor="neutral600">Hours Since Drop</Typography>
                      <Typography variant="alpha" fontWeight="bold" textColor="danger700">
                        {metrics.hours_since_drop?.toFixed(1)} hours
                      </Typography>
                    </GridItem>
                    <GridItem col={4}>
                      <Typography variant="omega" textColor="neutral600">Drop Percentage</Typography>
                      <Typography variant="alpha" fontWeight="bold" textColor="danger700">
                        {metrics.flashDropPercent?.toFixed(1)}%
                      </Typography>
                    </GridItem>
                    <GridItem col={4}>
                      <Typography variant="omega" textColor="neutral600">Urgency</Typography>
                      <Badge backgroundColor="danger700" textColor="neutral0" size="L">
                        {metrics.hours_since_drop < 3 ? 'CRITICAL' : metrics.hours_since_drop < 6 ? 'HIGH' : 'MEDIUM'}
                      </Badge>
                    </GridItem>
                  </Grid>
                </Box>
              </GridItem>
            )}

            {/* Scoring Breakdown - NEW */}
            <GridItem col={12}>
              <CollapsibleSection
                title="🎯 Scoring Breakdown"
                expanded={expandedSections.scoring}
                onToggle={() => toggleSection('scoring')}
              >
                <Grid gap={4}>
                  <GridItem col={4}>
                    <Typography variant="sigma" marginBottom={2}>Opportunity Components</Typography>
                    <MetricRow
                      label="Price Advantage"
                      value={`${opportunityBreakdown.price_advantage?.score || 0}/50`}
                    />
                    <MetricRow
                      label="Timing"
                      value={`${opportunityBreakdown.timing?.score || 0}/30`}
                    />
                    <MetricRow
                      label="Liquidity Factor"
                      value={`${opportunityBreakdown.liquidity_factor?.score || 0}/20`}
                    />
                  </GridItem>

                  <GridItem col={4}>
                    <Typography variant="sigma" marginBottom={2}>Risk Components</Typography>
                    <MetricRow
                      label="Volatility"
                      value={`${riskBreakdown.volatility?.score || 0}/35`}
                    />
                    <MetricRow
                      label="Market Position"
                      value={`${riskBreakdown.market_position?.score || 0}/35`}
                    />
                    <MetricRow
                      label="Supplier Reliability"
                      value={`${riskBreakdown.supplier_reliability?.score || 0}/30`}
                    />
                  </GridItem>

                  <GridItem col={4}>
                    <Typography variant="sigma" marginBottom={2}>Confidence Factors</Typography>
                    <MetricRow
                      label="Confidence Score"
                      value={`${confidenceBreakdown.score || 0}/10`}
                    />
                    <MetricRow
                      label="Confidence Value"
                      value={`${(confidenceBreakdown.value * 100 || 0).toFixed(0)}%`}
                    />
                    <MetricRow
                      label="Level"
                      value={confidenceBreakdown.enum?.toUpperCase() || 'N/A'}
                    />
                  </GridItem>
                </Grid>
              </CollapsibleSection>
            </GridItem>

          </Grid>

          {/* Insights & Actions */}
          <Grid gap={4}>
            <GridItem col={6}>
              <Box background="neutral0" padding={6} hasRadius shadow="tableShadow">
                <Typography variant="delta" marginBottom={4}>
                  💡 Key Insights
                </Typography>
                <Divider marginBottom={3} />

                {insights.length === 0 ? (
                  <Typography textColor="neutral600">No insights available</Typography>
                ) : (
                  <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {insights.map((insight, idx) => (
                      <InsightCard key={idx} insight={insight} />
                    ))}
                  </Box>
                )}
              </Box>
            </GridItem>

            <GridItem col={6}>
              <Box background="neutral0" padding={6} hasRadius shadow="tableShadow">
                <Typography variant="delta" marginBottom={4}>
                  ✅ Recommended Actions
                </Typography>
                <Divider marginBottom={3} />

                {actions.length === 0 ? (
                  <Typography textColor="neutral600">No actions available</Typography>
                ) : (
                  <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {actions.map((action, idx) => (
                      <ActionCard key={idx} action={action} />
                    ))}
                  </Box>
                )}
              </Box>
            </GridItem>
          </Grid>

        </Box>
      </ContentLayout>
    </Layout>
  );
};

// ===== HELPER COMPONENTS =====

const ScoreCard = ({ title, value, max, color }) => {
  const percentage = (value / max) * 100;
  const colors = {
    success: { bg: 'success100', text: 'success700', bar: '#46b849' },
    danger: { bg: 'danger100', text: 'danger700', bar: '#d02b20' }
  };
  const c = colors[color];

  return (
    <Box background="neutral0" padding={4} hasRadius shadow="tableShadow">
      <Typography variant="sigma" textColor="neutral600" marginBottom={2}>
        {title}
      </Typography>
      <Typography variant="alpha" fontWeight="bold" textColor={c.text} marginBottom={2}>
        {value}/{max}
      </Typography>
      <Box
        style={{
          width: '100%',
          height: '8px',
          background: '#eaeaea',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        <Box
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: c.bar,
            transition: 'width 0.3s ease'
          }}
        />
      </Box>
    </Box>
  );
};

const InfoCard = ({ title, value, badge, badgeProps }) => {
  return (
    <Box background="neutral0" padding={4} hasRadius shadow="tableShadow">
      <Typography variant="sigma" textColor="neutral600" marginBottom={2}>
        {title}
      </Typography>
      {badge ? (
        <Badge {...badgeProps} size="L">{value}</Badge>
      ) : (
        <Typography variant="alpha" fontWeight="bold">
          {value}
        </Typography>
      )}
    </Box>
  );
};

const CollapsibleSection = ({ title, children, expanded, onToggle }) => {
  return (
    <Box background="neutral0" hasRadius shadow="tableShadow">
      <Box
        padding={4}
        style={{
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid #eaeaea' : 'none'
        }}
        onClick={onToggle}
      >
        <Flex justifyContent="space-between" alignItems="center">
          <Typography variant="delta" fontWeight="bold">
            {title}
          </Typography>
          <Box
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <ChevronDown />
          </Box>
        </Flex>
      </Box>

      {expanded && (
        <Box padding={4}>
          {children}
        </Box>
      )}
    </Box>
  );
};

const MetricRow = ({ label, value, highlight }) => {
  const getHighlightColor = () => {
    if (!highlight) return 'neutral800';
    const colors = {
      success: 'success700',
      danger: 'danger700',
      primary: 'primary700'
    };
    return colors[highlight] || 'neutral800';
  };

  return (
    <Flex justifyContent="space-between" padding={2}>
      <Typography variant="omega" textColor="neutral600">{label}</Typography>
      <Typography
        variant="omega"
        fontWeight="semiBold"
        textColor={getHighlightColor()}
      >
        {value}
      </Typography>
    </Flex>
  );
};

const InsightCard = ({ insight }) => {
  const severityProps = {
    positive: { backgroundColor: 'success100', textColor: 'success700', icon: '✅' },
    warning: { backgroundColor: 'warning100', textColor: 'warning700', icon: '⚠️' },
    urgent: { backgroundColor: 'danger100', textColor: 'danger700', icon: '🚨' },
    info: { backgroundColor: 'primary100', textColor: 'primary700', icon: 'ℹ️' }
  };
  const props = severityProps[insight.severity] || severityProps.info;

  return (
    <Box background={props.backgroundColor} padding={3} hasRadius>
      <Flex gap={2} alignItems="flex-start">
        <span style={{ fontSize: '1.2rem' }}>{props.icon}</span>
        <Box flex="1">
          <Typography fontWeight="semiBold" textColor={props.textColor} variant="omega">
            {insight.message}
          </Typography>
          {insight.details && Object.keys(insight.details).length > 0 && (
            <Box marginTop={2} padding={2} background="neutral0" hasRadius>
              <Typography variant="pi" textColor="neutral600">
                {Object.entries(insight.details).map(([key, val]) => (
                  <div key={key}>
                    <strong>{key.replace(/_/g, ' ')}:</strong> {typeof val === 'object' ? JSON.stringify(val) : val}
                  </div>
                ))}
              </Typography>
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

const ActionCard = ({ action }) => {
  const priorityProps = {
    critical: { backgroundColor: 'danger100', borderColor: '#d02b20' },
    high: { backgroundColor: 'warning100', borderColor: '#f57c00' },
    medium: { backgroundColor: 'alternative100', borderColor: '#9c27b0' },
    low: { backgroundColor: 'success100', borderColor: '#46b849' }
  };
  const props = priorityProps[action.priority] || {};

  return (
    <Box
      background={props.backgroundColor}
      padding={3}
      hasRadius
      style={{ borderLeft: `4px solid ${props.borderColor}` }}
    >
      <Flex justifyContent="space-between" marginBottom={1}>
        <Typography fontWeight="semiBold" variant="omega">
          {action.description || action.action}
        </Typography>
        <Badge size="S">{action.priority}</Badge>
      </Flex>
      {action.rationale && (
        <Typography variant="pi" textColor="neutral600" marginBottom={1}>
          {action.rationale}
        </Typography>
      )}
      {action.note && (
        <Typography variant="pi" textColor="neutral600" style={{ fontStyle: 'italic' }}>
          Note: {action.note}
        </Typography>
      )}
      {action.suggested_quantity && (
        <Box marginTop={2} padding={2} background="neutral0" hasRadius>
          <Typography variant="pi" fontWeight="semiBold">
            📦 Suggested Quantity: {action.suggested_quantity.recommended} units
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {action.suggested_quantity.reasoning}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// ===== HELPER FUNCTIONS =====

const getPriorityBadgeProps = (priority) => {
  const props = {
    critical: { backgroundColor: 'danger100', textColor: 'danger700' },
    high: { backgroundColor: 'warning100', textColor: 'warning700' },
    medium: { backgroundColor: 'alternative100', textColor: 'alternative700' },
    low: { backgroundColor: 'success100', textColor: 'success700' }
  };
  return props[priority] || {};
};

const formatRecommendation = (rec) => {
  return rec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatFrequency = (freq) => {
  if (!freq) return 'Unknown';
  return freq.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatTrendDirection = (direction) => {
  if (!direction) return 'Unknown';
  const labels = {
    strong_down: '📉 Strong Down',
    down: '↘️ Down',
    stable: '➡️ Stable',
    up: '↗️ Up',
    strong_up: '📈 Strong Up',
    reversing: '🔄 Reversing',
    insufficient_data: '❓ Insufficient Data'
  };
  return labels[direction] || direction;
};

export default OpportunityPage;