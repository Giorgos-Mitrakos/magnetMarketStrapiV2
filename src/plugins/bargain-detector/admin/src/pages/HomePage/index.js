import React, { useState, useEffect } from 'react';
import { Layout, HeaderLayout, ContentLayout, Box, Button } from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';
import pluginId from '../../pluginId';

const HomePage = () => {
  const { get } = useFetchClient();
  const history = useHistory();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch opportunities
      const { data } = await get(`/${pluginId}/opportunities?filters[status][$eq]=active&pagination[limit]=100`);
      
      const opportunities = data || [];
      
      // Calculate stats
      const stats = {
        total: opportunities.length,
        byPriority: {
          critical: opportunities.filter(o => o.priority === 'critical').length,
          high: opportunities.filter(o => o.priority === 'high').length,
          medium: opportunities.filter(o => o.priority === 'medium').length,
          low: opportunities.filter(o => o.priority === 'low').length,
        },
        byRecommendation: {},
        avgOpportunity: 0,
        avgRisk: 0,
      };
      
      // Group by recommendation
      opportunities.forEach(opp => {
        const rec = opp.recommendation;
        stats.byRecommendation[rec] = (stats.byRecommendation[rec] || 0) + 1;
      });
      
      // Averages
      if (opportunities.length > 0) {
        stats.avgOpportunity = (
          opportunities.reduce((sum, o) => sum + o.opportunity_score, 0) / opportunities.length
        ).toFixed(1);
        stats.avgRisk = (
          opportunities.reduce((sum, o) => sum + o.risk_score, 0) / opportunities.length
        ).toFixed(1);
      }
      
      setStats(stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box padding={8} background="neutral100">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            Loading...
          </div>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <HeaderLayout
        title="Bargain Detector Dashboard"
        subtitle="Real-time opportunity monitoring and analysis"
        primaryAction={
          <Button onClick={() => history.push(`/plugins/${pluginId}/opportunities`)}>
            View All Opportunities
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
              value={stats.total}
              icon="🎯"
              background="#e0f2fe"
            />
            <StatCard
              title="Critical Priority"
              value={stats.byPriority.critical}
              icon="🚨"
              background="#fee2e2"
            />
            <StatCard
              title="Avg Opportunity"
              value={`${stats.avgOpportunity}/100`}
              icon="📈"
              background="#dcfce7"
            />
            <StatCard
              title="Avg Risk"
              value={`${stats.avgRisk}/100`}
              icon="⚠️"
              background="#fef3c7"
            />
          </div>

          {/* Priority Distribution */}
          <Box background="neutral0" padding={6} hasRadius shadow="tableShadow" marginBottom={4}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>
              Priority Distribution
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
              <PriorityBox label="Critical" count={stats.byPriority.critical} color="#ef4444" />
              <PriorityBox label="High" count={stats.byPriority.high} color="#f97316" />
              <PriorityBox label="Medium" count={stats.byPriority.medium} color="#eab308" />
              <PriorityBox label="Low" count={stats.byPriority.low} color="#22c55e" />
            </div>
          </Box>

          {/* Recommendations */}
          <Box background="neutral0" padding={6} hasRadius shadow="tableShadow">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>
              Recommendations Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(stats.byRecommendation).map(([rec, count]) => (
                <div key={rec} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem'
                }}>
                  <span style={{ fontWeight: 500 }}>
                    {rec.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span style={{ 
                    background: '#3b82f6', 
                    color: 'white', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
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
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            {title}
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
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
      textAlign: 'center'
    }}>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{count}</p>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>{label}</p>
    </div>
  );
};

export default HomePage;