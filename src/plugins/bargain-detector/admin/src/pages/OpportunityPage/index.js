// admin/src/pages/OpportunityPage/index.jsx
// ✅ ENHANCED: Better supplier warnings, sort options, alternative recommendations

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
  MultiSelect ,
  MultiSelectOption ,
  Dialog,
  DialogBody,
  DialogFooter,
  Textarea
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
  const [supplierSortBy, setSupplierSortBy] = useState('price'); // price, volatility, quality, drop

  // ✅ NEW: Dismissal dialog state
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [dismissing, setDismissing] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    current: true,
    price: true,
    liquidity: false,
    volatility: false,
    trend: false,
    supplier: true, // ✅ Open by default now
    scoring: false,
    insights: true,
    actions: true,
    clearance: true
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

  const handleDismissAsFalsePositive = async () => {
    try {
      setDismissing(true);

      await post(`/${pluginId}/opportunities/${id}/dismiss-clearance`, {
        reason: dismissReason
      });

      setShowDismissDialog(false);
      setDismissReason('');
      
      // Refresh opportunity
      fetchOpportunityDetails();

      // Show success message (you can use Strapi's notification system)
      console.log('Dismissed as false positive');

    } catch (error) {
      console.error('Failed to dismiss:', error);
    } finally {
      setDismissing(false);
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

  // ✅ NEW: Clearance detection data
  const clearanceDetection = opportunity.analysis_data?.clearance_detection;
  const isClearanceDetected = clearanceDetection?.detected === true;
  const wasDismissed = opportunity.dismissed_as_false_positive === true;

  // Check for risky best supplier
  const supplierAnalysis = metrics.supplierAnalysis || [];
  const bestSupplierAnalysis = supplierAnalysis.find(s => 
    s.supplier?.name === metrics.bestSupplier && s.hasData
  );
  const isBestSupplierVolatile = bestSupplierAnalysis?.priceStability === 'volatile';
  const isBestSupplierLowQuality = bestSupplierAnalysis?.dataQuality < 0.6;

  const alternativeInsight = insights.find(i => i.type === 'alternative_supplier_suggestion');


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

          {/* ✅ NEW: CLEARANCE ALERT (HIGHEST PRIORITY) */}
          {isClearanceDetected && !wasDismissed && (
            <Box 
              background="danger100" 
              padding={6} 
              hasRadius 
              marginBottom={4}
              style={{ 
                border: '3px solid #d02b20',
                animation: 'pulse 2s infinite'
              }}
            >
              <Flex justifyContent="space-between" alignItems="flex-start">
                <Box flex="1">
                  <Flex alignItems="center" gap={2} marginBottom={3}>
                    <Typography variant="alpha" fontWeight="bold" textColor="danger700">
                      🔥 CLEARANCE SALE DETECTED
                    </Typography>
                    <Badge 
                      backgroundColor="danger700" 
                      textColor="neutral0" 
                      size="L"
                    >
                      {clearanceDetection.urgency.toUpperCase()}
                    </Badge>
                  </Flex>

                  <Typography variant="beta" marginBottom={3}>
                    Supplier: <strong>{clearanceDetection.supplier.name}</strong>
                  </Typography>

                  <Grid gap={3}>
                    <GridItem col={4}>
                      <Box padding={3} background="neutral0" hasRadius>
                        <Typography variant="pi" textColor="neutral600">Confidence</Typography>
                        <Typography variant="alpha" fontWeight="bold" textColor="danger700">
                          {clearanceDetection.confidence}%
                        </Typography>
                      </Box>
                    </GridItem>
                    <GridItem col={4}>
                      <Box padding={3} background="neutral0" hasRadius>
                        <Typography variant="pi" textColor="neutral600">Signals Detected</Typography>
                        <Typography variant="alpha" fontWeight="bold" textColor="danger700">
                          {clearanceDetection.signals.length}
                        </Typography>
                      </Box>
                    </GridItem>
                    <GridItem col={4}>
                      <Box padding={3} background="neutral0" hasRadius>
                        <Typography variant="pi" textColor="neutral600">Priority</Typography>
                        <Typography variant="alpha" fontWeight="bold" textColor="danger700">
                          FLASH CLEARANCE
                        </Typography>
                      </Box>
                    </GridItem>
                  </Grid>

                  <Divider marginTop={3} marginBottom={3} />

                  <Typography variant="omega" fontWeight="bold" marginBottom={2}>
                    Detection Signals:
                  </Typography>
                  <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {clearanceDetection.signals.map((signal, idx) => (
                      <Box 
                        key={idx}
                        padding={2} 
                        background="neutral0" 
                        hasRadius
                        style={{ borderLeft: '3px solid #d02b20' }}
                      >
                        <Typography variant="omega" fontWeight="semiBold">
                          {signal.type.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="pi" textColor="neutral600">
                          {signal.message}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* ✅ Dismiss Button */}
                <Button
                  variant="tertiary"
                  startIcon={<ExclamationMarkCircle />}
                  onClick={() => setShowDismissDialog(true)}
                  style={{ marginLeft: '1rem' }}
                >
                  False Positive?
                </Button>
              </Flex>

              <Box 
                marginTop={4} 
                padding={3} 
                background="neutral0" 
                hasRadius
                style={{ borderLeft: '4px solid #d02b20' }}
              >
                <Typography variant="omega" fontWeight="bold" textColor="danger700">
                  ⏰ ACT FAST
                </Typography>
                <Typography variant="pi" textColor="neutral600" marginTop={1}>
                  Typical clearance window: 5-10 days. Stock liquidation opportunities don't last long!
                </Typography>
              </Box>
            </Box>
          )}

          {/* ✅ Show if was dismissed */}
          {wasDismissed && (
            <Alert 
              variant="default" 
              title="Dismissed as False Positive"
              marginBottom={4}
            >
              This clearance opportunity was marked as a false positive. 
              Future alerts for this supplier/product combination are suppressed.
            </Alert>
          )}

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

          {/* ✅ NEW: Best Supplier Warning (if risky) */}
          {(isBestSupplierVolatile || isBestSupplierLowQuality) && (
            <Alert 
              variant="warning" 
              title="⚠️ Best Supplier Warning"
              marginBottom={4}
            >
              <Typography>
                <strong>{metrics.bestSupplier}</strong> is currently cheapest but has{' '}
                {isBestSupplierVolatile && 'volatile pricing'}
                {isBestSupplierVolatile && isBestSupplierLowQuality && ' and '}
                {isBestSupplierLowQuality && 'low data quality'}
                . {alternativeInsight ? 'See alternative below.' : 'Consider verifying price before large orders.'}
              </Typography>
              {bestSupplierAnalysis && (
                <Box marginTop={2}>
                  <Typography variant="pi" textColor="neutral700">
                    Volatility: {bestSupplierAnalysis.coefficientOfVariation?.toFixed(1)}% | 
                    Data Quality: {(bestSupplierAnalysis.dataQuality * 100)?.toFixed(0)}% | 
                    Anomalies: {bestSupplierAnalysis.anomalies}
                  </Typography>
                </Box>
              )}
            </Alert>
          )}

          {/* Alternative Supplier Recommendation */}
          {alternativeInsight && (
            <Box 
              background="primary100" 
              padding={4} 
              hasRadius 
              marginBottom={4}
              style={{ border: '2px solid #4945ff' }}
            >
              <Flex gap={2} alignItems="center">
                <Typography variant="beta" fontWeight="bold" textColor="primary700">
                  💡 Alternative Supplier
                </Typography>
              </Flex>
              <Typography marginTop={2}>
                {alternativeInsight.message}
              </Typography>
              {alternativeInsight.details && (
                <Box marginTop={2} padding={3} background="neutral0" hasRadius>
                  <Grid gap={2}>
                    <GridItem col={6}>
                      <Typography variant="omega" textColor="neutral600">Price Difference</Typography>
                      <Typography fontWeight="semiBold">
                        +€{alternativeInsight.details.price_difference} (+{alternativeInsight.details.percent_difference}%)
                      </Typography>
                    </GridItem>
                    <GridItem col={6}>
                      <Typography variant="omega" textColor="neutral600">Data Quality</Typography>
                      <Typography fontWeight="semiBold">
                        {alternativeInsight.details.data_quality}%
                      </Typography>
                    </GridItem>
                  </Grid>
                  <Typography variant="pi" textColor="neutral600" marginTop={2}>
                    <em>{alternativeInsight.details.interpretation}</em>
                  </Typography>
                </Box>
              )}
            </Box>
          )}

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

          {/* ✅ NEW: Clearance Details Section */}
          {isClearanceDetected && !wasDismissed && (
            <GridItem col={12}>
              <CollapsibleSection
                title="🔥 Clearance Detection Details"
                expanded={expandedSections.clearance}
                onToggle={() => toggleSection('clearance')}
              >
                <Grid gap={4}>
                  <GridItem col={6}>
                    <Typography variant="sigma" marginBottom={2}>Detection Info</Typography>
                    <MetricRow label="Supplier" value={clearanceDetection.supplier.name} />
                    <MetricRow label="Confidence" value={`${clearanceDetection.confidence}%`} highlight="danger" />
                    <MetricRow label="Urgency" value={clearanceDetection.urgency.toUpperCase()} highlight="danger" />
                    <MetricRow label="Signals Detected" value={clearanceDetection.signals.length} />
                    <MetricRow 
                      label="Detected At" 
                      value={new Date(clearanceDetection.detected_at).toLocaleString()} 
                    />
                  </GridItem>

                  <GridItem col={6}>
                    <Typography variant="sigma" marginBottom={2}>All Clearance Suppliers</Typography>
                    {clearanceDetection.all_clearance_suppliers?.length > 0 ? (
                      <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {clearanceDetection.all_clearance_suppliers.map((supplier, idx) => (
                          <Box 
                            key={idx}
                            padding={2} 
                            background="danger100" 
                            hasRadius
                          >
                            <Typography fontWeight="semiBold">{supplier.supplier.name}</Typography>
                            <Typography variant="pi" textColor="neutral600">
                              Confidence: {supplier.confidence}% | Urgency: {supplier.urgency}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography textColor="neutral600">Only one supplier detected</Typography>
                    )}
                  </GridItem>
                </Grid>

                <Divider marginTop={4} marginBottom={4} />

                <Typography variant="sigma" marginBottom={2}>Signal Breakdown</Typography>
                <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {clearanceDetection.signals.map((signal, idx) => (
                    <Box 
                      key={idx}
                      padding={3} 
                      background="neutral0" 
                      hasRadius
                      style={{ borderLeft: '4px solid #d02b20' }}
                    >
                      <Flex justifyContent="space-between" alignItems="center" marginBottom={2}>
                        <Typography fontWeight="bold">
                          {signal.type.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                        <Badge 
                          backgroundColor={
                            signal.severity === 'critical' ? 'danger700' :
                            signal.severity === 'high' ? 'danger100' : 'warning100'
                          }
                          textColor={
                            signal.severity === 'critical' ? 'neutral0' :
                            signal.severity === 'high' ? 'danger700' : 'warning700'
                          }
                        >
                          {signal.severity.toUpperCase()}
                        </Badge>
                      </Flex>
                      <Typography variant="omega" marginBottom={2}>
                        {signal.message}
                      </Typography>
                      {signal.details && (
                        <Box padding={2} background="neutral100" hasRadius>
                          <Typography variant="pi" textColor="neutral600">
                            {Object.entries(signal.details).map(([key, val]) => (
                              <div key={key}>
                                <strong>{key.replace(/_/g, ' ')}:</strong> {String(val)}
                              </div>
                            ))}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </CollapsibleSection>
            </GridItem>
          )}

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

            {/* Price Metrics */}
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
                    <Typography variant="sigma" marginBottom={2}>Price Drops & Position</Typography>
                    <MetricRow
                      label="Drop from 30d Avg"
                      value={`${metrics.drop_from_avg?.toFixed(1) || 0}%`}
                      highlight={metrics.drop_from_avg > 10 ? 'success' : null}
                    />
                    <MetricRow
                      label="Distance from Historic Min"
                      value={`${metrics.distance_from_min?.toFixed(1) || 0}%`}
                      highlight={metrics.distance_from_min < 5 ? 'success' : null}
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

            {/* Liquidity Metrics */}
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

            {/* Volatility Metrics */}
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

            {/* Trend Analysis */}
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

            {/* ✅ ENHANCED: Supplier Metrics with Sort */}
            <GridItem col={12}>
              <CollapsibleSection
                title="🏪 Supplier Comparison"
                expanded={expandedSections.supplier}
                onToggle={() => toggleSection('supplier')}
              >
                {/* ✅ NEW: Sort Controls */}
                <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
                  <Typography variant="sigma">Sort suppliers by:</Typography>
                  <Box style={{ minWidth: '200px' }}>
                    <MultiSelect 
                      value={supplierSortBy}
                      onChange={setSupplierSortBy}
                      size="S"
                    >
                      <MultiSelectOption  value="price">Price (Low to High)</MultiSelectOption >
                      <MultiSelectOption  value="volatility">Volatility (Low to High)</MultiSelectOption >
                      <MultiSelectOption  value="quality">Data Quality (High to Low)</MultiSelectOption >
                      <MultiSelectOption  value="drop">Price Drop % (High to Low)</MultiSelectOption >
                    </MultiSelect >
                  </Box>
                </Flex>

                {metrics.supplierAnalysis && metrics.supplierAnalysis.length > 0 ? (
                  <SupplierComparisonTable 
                    suppliers={metrics.supplierAnalysis} 
                    bestSupplier={metrics.bestSupplier}
                    sortBy={supplierSortBy}
                  />
                ) : (
                  <Typography textColor="neutral600">No supplier data available</Typography>
                )}
                
                <Divider marginTop={4} marginBottom={4} />
                
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
                    <MetricRow
                      label="Supplier Price Spread"
                      value={`${metrics.supplierPriceSpread || 0}%`}
                      highlight={metrics.supplierPriceSpread > 20 ? 'warning' : null}
                    />
                    <MetricRow
                      label="Supplier Agreement"
                      value={`${metrics.supplierAgreement || 0}%`}
                      highlight={metrics.supplierAgreement > 85 ? 'success' : null}
                    />
                    {metrics.stableSuppliers !== undefined && (
                      <MetricRow
                        label="Stable/Volatile Suppliers"
                        value={`${metrics.stableSuppliers} / ${metrics.volatileSuppliers}`}
                      />
                    )}
                  </GridItem>
                </Grid>
                
                {metrics.suppliers_dropping >= 2 && (
                  <Box padding={2} background="success100" hasRadius marginTop={4}>
                    <Typography fontWeight="bold" textColor="success700">
                      ✅ Multiple Suppliers Dropping - Market Signal!
                    </Typography>
                  </Box>
                )}
              </CollapsibleSection>
            </GridItem>

            {/* Flash Deal */}
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

            {/* Scoring Breakdown */}
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

      {/* ✅ NEW: Dismiss Dialog */}
      <Dialog
        onClose={() => setShowDismissDialog(false)}
        title="Dismiss as False Positive"
        isOpen={showDismissDialog}
      >
        <DialogBody>
          <Typography marginBottom={3}>
            Are you sure this clearance detection is a <strong>false positive</strong>?
          </Typography>
          <Typography variant="pi" textColor="neutral600" marginBottom={4}>
            This will prevent future clearance alerts for this supplier/product combination for 30 days.
          </Typography>
          
          <Textarea
            label="Reason (optional)"
            placeholder="e.g., Verified with supplier - this is normal pricing, not clearance"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
          />
        </DialogBody>
        <DialogFooter
          startAction={
            <Button onClick={() => setShowDismissDialog(false)} variant="tertiary">
              Cancel
            </Button>
          }
          endAction={
            <Button 
              onClick={handleDismissAsFalsePositive}
              loading={dismissing}
              variant="danger"
            >
              Dismiss as False Positive
            </Button>
          }
        />
      </Dialog>
    </Layout>
  );
};

// ===== HELPER COMPONENTS =====

/**
 * ✅ ENHANCED: Supplier table with sort + warnings
 */
const SupplierComparisonTable = ({ suppliers, bestSupplier, sortBy }) => {
  const suppliersWithData = suppliers.filter(s => s.hasData);
  
  if (suppliersWithData.length === 0) {
    return <Typography textColor="neutral600">No suppliers with sufficient data</Typography>;
  }

  // ✅ Sort logic
  let sorted = [...suppliersWithData];
  switch (sortBy) {
    case 'price':
      sorted.sort((a, b) => a.currentPrice - b.currentPrice);
      break;
    case 'volatility':
      sorted.sort((a, b) => (a.coefficientOfVariation || 0) - (b.coefficientOfVariation || 0));
      break;
    case 'quality':
      sorted.sort((a, b) => (b.dataQuality || 0) - (a.dataQuality || 0));
      break;
    case 'drop':
      sorted.sort((a, b) => (b.dropFrom30d || 0) - (a.dropFrom30d || 0));
      break;
    default:
      sorted.sort((a, b) => a.currentPrice - b.currentPrice);
  }

  return (
    <Box style={{ overflowX: 'auto' }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        fontSize: '0.875rem'
      }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #eaeaea' }}>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Supplier</th>
            <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>Current Price</th>
            <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>30d Avg</th>
            <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>Drop %</th>
            <th style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 600 }}>Volatility</th>
            <th style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 600 }}>Stability</th>
            <th style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 600 }}>Trend</th>
            <th style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 600 }}>Quality</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((supplier, idx) => {
            const isBest = supplier.supplier.name === bestSupplier;
            const isInStock = supplier.supplier.in_stock;
            const isVolatile = supplier.priceStability === 'volatile';
            const isLowQuality = supplier.dataQuality < 0.6;
            
            // ✅ Warning styling
            let rowBackground = 'transparent';
            if (isBest && !isVolatile && !isLowQuality) {
              rowBackground = '#dcfce7'; // Green - good best supplier
            } else if (isBest && (isVolatile || isLowQuality)) {
              rowBackground = '#fef3c7'; // Yellow - risky best supplier
            }
            
            return (
              <tr 
                key={idx}
                style={{ 
                  borderBottom: '1px solid #f3f4f6',
                  backgroundColor: rowBackground,
                  opacity: isInStock ? 1 : 0.5
                }}
              >
                <td style={{ padding: '0.75rem' }}>
                  <Flex direction="column">
                    <Flex alignItems="center" gap={1}>
                      <Typography fontWeight={isBest ? 'bold' : 'normal'}>
                        {supplier.supplier.name}
                      </Typography>
                      {isBest && <span>🏆</span>}
                      {isBest && isVolatile && <span title="Volatile pricing">⚠️</span>}
                      {isBest && isLowQuality && <span title="Low data quality">⚠️</span>}
                      {!isInStock && <span> (Out of Stock)</span>}
                    </Flex>
                    <Typography variant="pi" textColor="neutral600">
                      {supplier.dataPoints} data points
                    </Typography>
                  </Flex>
                </td>
                
                <td style={{ textAlign: 'right', padding: '0.75rem' }}>
                  <Typography fontWeight={isBest ? 'bold' : 'normal'}>
                    €{supplier.currentPrice?.toFixed(2)}
                  </Typography>
                </td>
                
                <td style={{ textAlign: 'right', padding: '0.75rem' }}>
                  <Typography textColor="neutral600">
                    €{supplier.avg30d?.toFixed(2)}
                  </Typography>
                </td>
                
                <td style={{ textAlign: 'right', padding: '0.75rem' }}>
                  <Typography 
                    fontWeight="semiBold"
                    textColor={supplier.isDropping ? 'success700' : 'neutral600'}
                  >
                    {supplier.dropFrom30d?.toFixed(1)}%
                    {supplier.isDropping && ' ↓'}
                  </Typography>
                </td>
                
                <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                  <Badge 
                    backgroundColor={
                      supplier.coefficientOfVariation < 5 ? 'success100' :
                      supplier.coefficientOfVariation < 10 ? 'warning100' : 'danger100'
                    }
                    textColor={
                      supplier.coefficientOfVariation < 5 ? 'success700' :
                      supplier.coefficientOfVariation < 10 ? 'warning700' : 'danger700'
                    }
                  >
                    {supplier.coefficientOfVariation?.toFixed(1)}%
                  </Badge>
                </td>
                
                <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                  <Badge
                    backgroundColor={
                      supplier.priceStability === 'stable' ? 'success100' :
                      supplier.priceStability === 'moderate' ? 'warning100' : 'danger100'
                    }
                    textColor={
                      supplier.priceStability === 'stable' ? 'success700' :
                      supplier.priceStability === 'moderate' ? 'warning700' : 'danger700'
                    }
                  >
                    {supplier.priceStability?.toUpperCase()}
                  </Badge>
                </td>
                
                <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                  <Typography variant="omega">
                    {formatTrendDirection(supplier.trend?.direction)}
                  </Typography>
                </td>
                
                <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                  <Box
                    style={{
                      width: '60px',
                      height: '8px',
                      background: '#eaeaea',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      margin: '0 auto'
                    }}
                  >
                    <Box
                      style={{
                        width: `${(supplier.dataQuality * 100) || 0}%`,
                        height: '100%',
                        background: supplier.dataQuality > 0.7 ? '#46b849' : 
                                   supplier.dataQuality > 0.5 ? '#f59e0b' : '#d02b20',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </Box>
                  <Typography variant="pi" textColor="neutral600" style={{ marginTop: '0.25rem' }}>
                    {((supplier.dataQuality || 0) * 100).toFixed(0)}%
                  </Typography>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Legend */}
      <Box marginTop={4} padding={3} background="neutral100" hasRadius>
        <Typography variant="pi" textColor="neutral600" marginBottom={2}>
          <strong>Legend:</strong>
        </Typography>
        <Grid gap={2}>
          <GridItem col={6}>
            <Typography variant="pi" textColor="neutral600">
              • <strong>Volatility:</strong> Price variation (lower = better)
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              • <strong>Stability:</strong> Overall price behavior classification
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              • <strong>Quality:</strong> Data reliability score (0-100%)
            </Typography>
          </GridItem>
          <GridItem col={6}>
            <Typography variant="pi" textColor="neutral600">
              • 🏆 = Currently cheapest supplier
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              • ⚠️ = Warning (volatile or low quality)
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              • <span style={{ background: '#fef3c7', padding: '2px 4px' }}>Yellow</span> = Risky best supplier
            </Typography>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
};

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
      primary: 'primary700',
      warning: 'warning700'
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

/**
 * ✅ ENHANCED: Better insight card with expandable details
 */
const InsightCard = ({ insight }) => {
  const [expanded, setExpanded] = useState(false);
  
  const severityProps = {
    positive: { backgroundColor: 'success100', textColor: 'success700', icon: '✅' },
    warning: { backgroundColor: 'warning100', textColor: 'warning700', icon: '⚠️' },
    urgent: { backgroundColor: 'danger100', textColor: 'danger700', icon: '🚨' },
    info: { backgroundColor: 'primary100', textColor: 'primary700', icon: 'ℹ️' }
  };
  const props = severityProps[insight.severity] || severityProps.info;

  const hasDetails = insight.details && Object.keys(insight.details).length > 0;

  return (
    <Box background={props.backgroundColor} padding={3} hasRadius>
      <Flex gap={2} alignItems="flex-start">
        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{props.icon}</span>
        <Box flex="1">
          <Typography fontWeight="semiBold" textColor={props.textColor} variant="omega">
            {insight.message}
          </Typography>
          
          {hasDetails && (
            <>
              <Box 
                marginTop={2}
                style={{ cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
              >
                <Typography variant="pi" textColor={props.textColor} style={{ textDecoration: 'underline' }}>
                  {expanded ? '▼ Hide details' : '▶ Show details'}
                </Typography>
              </Box>
              
              {expanded && (
                <Box marginTop={2} padding={2} background="neutral0" hasRadius>
                  <Typography variant="pi" textColor="neutral600">
                    {Object.entries(insight.details).map(([key, val]) => (
                      <div key={key} style={{ marginBottom: '4px' }}>
                        <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
                        {typeof val === 'object' && val !== null
                          ? Array.isArray(val)
                            ? val.map((item, i) => (
                                <div key={i} style={{ marginLeft: '1rem' }}>
                                  {typeof item === 'object' 
                                    ? JSON.stringify(item)
                                    : String(item)
                                  }
                                </div>
                              ))
                            : JSON.stringify(val, null, 2)
                          : String(val)
                        }
                      </div>
                    ))}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

const ActionCard = ({ action, isClearance }) => {
  const priorityProps = {
    flash_clearance: { backgroundColor: 'danger100', borderColor: '#d02b20' },
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
      style={{ 
        borderLeft: `4px solid ${props.borderColor}`,
        animation: action.priority === 'flash_clearance' ? 'pulse 2s infinite' : 'none'
      }}
    >
      <Flex justifyContent="space-between" marginBottom={1}>
        <Typography fontWeight="semiBold" variant="omega">
          {action.priority === 'flash_clearance' && '🔥 '}
          {action.description || action.action}
        </Typography>
        <Badge size="S">{action.priority === 'flash_clearance' ? 'FLASH' : action.priority}</Badge>
      </Flex>
      {action.rationale && (
        <Typography variant="pi" textColor="neutral600" marginBottom={1}>
          {action.rationale}
        </Typography>
      )}
      {action.urgency && (
        <Typography variant="pi" fontWeight="bold" textColor="danger700" marginBottom={1}>
          Urgency: {action.urgency.toUpperCase()}
        </Typography>
      )}
      {action.time_window && (
        <Typography variant="pi" textColor="danger700" marginBottom={1}>
          ⏰ Time Window: {action.time_window}
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
    strong_down: '📉',
    down: '↘️',
    stable: '➡️',
    up: '↗️',
    strong_up: '📈',
    reversing: '🔄',
    insufficient_data: '❓'
  };
  return labels[direction] || direction;
};

// Add pulse animation to CSS
const styles = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}


export default OpportunityPage;