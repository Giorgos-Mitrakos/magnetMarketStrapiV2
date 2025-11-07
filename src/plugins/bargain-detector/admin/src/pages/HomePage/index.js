import React, { useState, useEffect } from 'react';
import { Layout, HeaderLayout, ContentLayout, Box, Button, Link } from '@strapi/design-system';
import { useFetchClient, useRBAC } from '@strapi/helper-plugin';
import { Cog } from '@strapi/icons';
import { useHistory } from 'react-router-dom';
import pluginId from '../../pluginId';

const HomePage = () => {
  const { get } = useFetchClient();
  const { push } = useHistory();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await get(`/${pluginId}/stats`)

      if (response?.data?.success && response.data.data) {
        setStats(response.data.data);
      } else {
        setStats({
          total: 0,
          byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
          byRecommendation: {},
          avgOpportunity: 0,
          avgRisk: 0
        });
      }

    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError(err.message || 'Unknown error occurred');
      setStats({
        total: 0,
        byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
        byRecommendation: {},
        avgOpportunity: 0,
        avgRisk: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToSettings = () => {
    push(`/plugins/${pluginId}/settings`);
  };

  if (loading) {
    return (
      <Layout>
        <Box padding={8} background="neutral100">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            Loading dashboard statistics...
          </div>
        </Box>
      </Layout>
    );
  }

  if (error && !stats) {
    return (
      <Layout>
        <HeaderLayout
          title="Bargain Detector Dashboard"
          subtitle="Real-time opportunity monitoring and analysis"
        />
        <ContentLayout>
          <Box padding={8} background="neutral100">
            <Box
              background="danger100"
              padding={6}
              hasRadius
              style={{ textAlign: 'center' }}
            >
              <p style={{ color: '#d02b20', fontWeight: 600 }}>
                Failed to load statistics: {error}
              </p>
              <Button
                onClick={fetchStats}
                style={{ marginTop: '1rem' }}
                variant="secondary"
              >
                Retry
              </Button>
            </Box>
          </Box>
        </ContentLayout>
      </Layout>
    );
  }

  const displayStats = stats || {
    total: 0,
    byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
    byRecommendation: {},
    avgOpportunity: 0,
    avgRisk: 0
  };

  return (
    <Layout>
      <HeaderLayout
        title="Bargain Detector Dashboard"
        subtitle="Real-time opportunity monitoring and analysis"
        primaryAction={
          <Button onClick={() => push(`/plugins/${pluginId}/opportunities`)}>
            View All Opportunities
          </Button>
        }
        secondaryAction={
          <Button
            onClick={navigateToSettings}
            startIcon={<Cog />}
            variant="tertiary"
          >
            Settings
          </Button>
        }
      />
      <ContentLayout>
        <Box padding={8} background="neutral100">

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <StatCard
              title="Total Opportunities"
              value={displayStats.total}
              icon="🎯"
              background="#e0f2fe"
            />
            <StatCard
              title="Critical Priority"
              value={displayStats.byPriority.critical}
              icon="🚨"
              background="#fee2e2"
            />
            <StatCard
              title="Avg Opportunity"
              value={`${displayStats.avgOpportunity}/100`}
              icon="📈"
              background="#dcfce7"
            />
            <StatCard
              title="Avg Risk"
              value={`${displayStats.avgRisk}/100`}
              icon="⚠️"
              background="#fef3c7"
            />
          </div>

          {/* Priority Distribution */}
          <Box background="neutral0" padding={6} hasRadius shadow="tableShadow" marginBottom={4}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                Priority Distribution
              </h3>
              <span style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                fontWeight: 500
              }}>
                Active Opportunities
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem'
            }}>
              <PriorityBox label="Critical" count={displayStats.byPriority.critical} color="#ef4444" />
              <PriorityBox label="High" count={displayStats.byPriority.high} color="#f97316" />
              <PriorityBox label="Medium" count={displayStats.byPriority.medium} color="#eab308" />
              <PriorityBox label="Low" count={displayStats.byPriority.low} color="#22c55e" />
            </div>
          </Box>

          {/* Recommendations */}
          <Box background="neutral0" padding={6} hasRadius shadow="tableShadow">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                Recommendations Breakdown
              </h3>
              <Button
                onClick={fetchStats}
                size="S"
                variant="tertiary"
              >
                Refresh
              </Button>
            </div>

            {!displayStats.byRecommendation || Object.keys(displayStats.byRecommendation).length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6b7280'
              }}>
                No recommendations available
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(displayStats.byRecommendation)
                  .sort((a, b) => b[1] - a[1])
                  .map(([rec, count]) => (
                    <div
                      key={rec}
                      onClick={() => push(`/plugins/${pluginId}/opportunities?recommendation=${rec}`)}
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: '#f9fafb',
                          borderRadius: '0.5rem',
                          transition: 'background 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
                      >
                        <span style={{ fontWeight: 500, fontSize: '0.95rem', color: '#111827' }}>
                          {formatRecommendation(rec)}
                        </span>
                        <span style={{
                          background: getRecommendationColor(rec),
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '1rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          minWidth: '2.5rem',
                          textAlign: 'center'
                        }}>
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Box>

        </Box>
      </ContentLayout>
    </Layout>
  );
};

const StatCard = ({ title, value, icon, background }) => {
  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.5rem',
            fontWeight: 500
          }}>
            {title}
          </p>
          <p style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0
          }}>
            {value}
          </p>
        </div>
        <div style={{
          background,
          width: '3rem',
          height: '3rem',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem'
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const PriorityBox = ({ label, count, color }) => {
  return (
    <div style={{
      padding: '1rem',
      background: '#f9fafb',
      borderRadius: '0.5rem',
      borderLeft: `4px solid ${color}`,
      textAlign: 'center',
      transition: 'transform 0.2s',
      cursor: 'default'
    }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <p style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color,
        margin: 0,
        marginBottom: '0.25rem'
      }}>
        {count}
      </p>
      <p style={{
        fontSize: '0.875rem',
        color: '#6b7280',
        margin: 0,
        fontWeight: 500
      }}>
        {label}
      </p>
    </div>
  );
};

const formatRecommendation = (rec) => {
  return rec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getRecommendationColor = (rec) => {
  const colors = {
    'strong_buy_and_stock': '#10b981',
    'buy_on_demand': '#3b82f6',
    'opportunistic_stock': '#8b5cf6',
    'watch': '#f59e0b',
    'wait_for_order': '#6b7280',
    'avoid': '#ef4444',
    'clearance_urgent': '#dc2626',
    'clearance_soon': '#f97316'
  };
  return colors[rec] || '#3b82f6';
};

export default HomePage;