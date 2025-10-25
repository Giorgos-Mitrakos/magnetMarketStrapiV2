import React, { useState, useEffect } from 'react';
import {
  Layout,
  HeaderLayout,
  ContentLayout,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Typography,
  Badge,
  IconButton,
  Flex,
  Button,
  SingleSelect,
  SingleSelectOption,
  SearchForm,
  Searchbar
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';
import { Eye, Refresh } from '@strapi/icons';
import pluginId from '../../pluginId';

const OpportunitiesPage = () => {
  const { get } = useFetchClient();
  const history = useHistory();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'active',
    priority: 'all',
    recommendation: 'all',
    search: ''
  });

  useEffect(() => {
    fetchOpportunities();
  }, [filters]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);

      let query = `/${pluginId}/opportunities?populate=product`;

      // Add filters
      if (filters.status !== 'all') {
        query += `&filters[status][$eq]=${filters.status}`;
      }
      if (filters.priority !== 'all') {
        query += `&filters[priority][$eq]=${filters.priority}`;
      }
      if (filters.recommendation !== 'all') {
        query += `&filters[recommendation][$eq]=${filters.recommendation}`;
      }

      query += '&pagination[limit]=100&sort=priority:asc,opportunity_score:desc';

      const { data } = await get(query);

      let filtered = data || [];

      // Client-side search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(opp => {
          const productName = opp.product?.name?.toLowerCase() || '';
          const productId = String(opp.product?.id || '');
          return productName.includes(searchLower) || productId.includes(searchLower);
        });
      }

      setOpportunities(filtered);

    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id) => {
    history.push(`/plugins/${pluginId}/opportunities/${id}`);
  };

  const handleMarkAs = async (id, newStatus) => {
    try {
      await get(`/${pluginId}/opportunities/${id}/mark-as/${newStatus}`);
      fetchOpportunities();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <Layout>
      <HeaderLayout
        title="Bargain Opportunities"
        subtitle={`${opportunities.length} opportunities found`}
        primaryAction={
          <Button
            onClick={fetchOpportunities}
            startIcon={<Refresh />}
            loading={loading}
          >
            Refresh
          </Button>
        }
      />

      <ContentLayout>
        <Box padding={8} background="neutral100">

          {/* Filters */}
          <Box
            background="neutral0"
            padding={4}
            hasRadius
            shadow="tableShadow"
            marginBottom={4}
          >
            <Flex gap={4} wrap="wrap">
              {/* Search */}
              <Box style={{ flex: '1 1 300px' }}>
                <SearchForm>
                  <Searchbar
                    name="search"
                    placeholder="Search by product name or ID..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onClear={() => setFilters({ ...filters, search: '' })}
                  />
                </SearchForm>
              </Box>

              {/* Status Filter */}
              <Box style={{ minWidth: '150px' }}>
                <SingleSelect
                  label="Status"
                  placeholder="All statuses"
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SingleSelectOption value="all">All</SingleSelectOption>
                  <SingleSelectOption value="active">Active</SingleSelectOption>
                  <SingleSelectOption value="purchased">Purchased</SingleSelectOption>
                  <SingleSelectOption value="dismissed">Dismissed</SingleSelectOption>
                  <SingleSelectOption value="expired">Expired</SingleSelectOption>
                </SingleSelect>
              </Box>

              {/* Priority Filter */}
              <Box style={{ minWidth: '150px' }}>
                <SingleSelect
                  label="Priority"
                  placeholder="All priorities"
                  value={filters.priority}
                  onChange={(value) => setFilters({ ...filters, priority: value })}
                >
                  <SingleSelectOption value="all">All</SingleSelectOption>
                  <SingleSelectOption value="critical">Critical</SingleSelectOption>
                  <SingleSelectOption value="high">High</SingleSelectOption>
                  <SingleSelectOption value="medium">Medium</SingleSelectOption>
                  <SingleSelectOption value="low">Low</SingleSelectOption>
                </SingleSelect>
              </Box>

              {/* Recommendation Filter */}
              <Box style={{ minWidth: '200px' }}>
                <SingleSelect
                  label="Recommendation"
                  placeholder="All recommendations"
                  value={filters.recommendation}
                  onChange={(value) => setFilters({ ...filters, recommendation: value })}
                >
                  <SingleSelectOption value="all">All</SingleSelectOption>
                  <SingleSelectOption value="strong_buy_and_stock">Strong Buy & Stock</SingleSelectOption>
                  <SingleSelectOption value="buy_on_demand">Buy On Demand</SingleSelectOption>
                  <SingleSelectOption value="opportunistic_stock">Opportunistic Stock</SingleSelectOption>
                  <SingleSelectOption value="watch">Watch</SingleSelectOption>
                  <SingleSelectOption value="wait_for_order">Wait For Order</SingleSelectOption>
                  <SingleSelectOption value="avoid">Avoid</SingleSelectOption>
                  <SingleSelectOption value="clearance_urgent">Clearance Urgent</SingleSelectOption>
                  <SingleSelectOption value="clearance_soon">Clearance Soon</SingleSelectOption>
                </SingleSelect>
              </Box>
            </Flex>
          </Box>

          {/* Table */}
          <Box background="neutral0" hasRadius shadow="tableShadow">
            {loading ? (
              <Box padding={8}>
                <Flex justifyContent="center">
                  <Typography>Loading...</Typography>
                </Flex>
              </Box>
            ) : opportunities.length === 0 ? (
              <Box padding={8}>
                <Flex justifyContent="center">
                  <Typography>No opportunities found</Typography>
                </Flex>
              </Box>
            ) : (
              <Table colCount={8} rowCount={opportunities.length} >
                <Thead>
                  <Tr>
                    <Th
                      style={{
                        width: '400px',
                        maxWidth: '400px'
                      }}
                    >
                      <Typography variant="sigma">Product</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Priority</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Opportunity</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Risk</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Recommendation</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Status</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Analyzed</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Actions</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {opportunities.map((opp) => (
                    <Tr key={opp.id}>
                      <Td style={{ maxWidth: '400px' }}>
                        <Flex direction="column">
                          <Typography
                            fontWeight="semiBold"
                            style={{
                              whiteSpace: 'normal',
                              wordWrap: 'break-word',
                              maxWidth: '400px',
                              display: 'block'
                            }}
                          >
                            {opp.product?.name || `Product #${opp.product?.id || 'N/A'}`}
                          </Typography>
                          <Typography variant="pi" textColor="neutral600">
                            ID: {opp.product?.id || 'N/A'}
                          </Typography>
                        </Flex>
                      </Td>
                      <Td>
                        <Badge {...getPriorityBadgeProps(opp.priority)}>
                          {opp.priority}
                        </Badge>
                      </Td>
                      <Td>
                        <ScoreBar
                          value={opp.opportunity_score}
                          color="success"
                        />
                      </Td>
                      <Td>
                        <ScoreBar
                          value={opp.risk_score}
                          color="danger"
                        />
                      </Td>
                      <Td>
                        <Typography variant="omega" fontWeight="semiBold">
                          {formatRecommendation(opp.recommendation)}
                        </Typography>
                      </Td>
                      <Td>
                        <Badge active={opp.status === 'active'}>
                          {opp.status}
                        </Badge>
                      </Td>
                      <Td>
                        <Typography variant="pi" textColor="neutral600">
                          {formatDate(opp.analyzed_at)}
                        </Typography>
                      </Td>
                      <Td>
                        <Flex gap={1}>
                          <IconButton
                            onClick={() => handleViewDetails(opp.id)}
                            label="View details"
                            icon={<Eye />}
                          />
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>
        </Box>
      </ContentLayout>
    </Layout>
  );
};

// Helper Components
const ScoreBar = ({ value, color }) => {
  const colors = {
    success: '#46b849',
    danger: '#d02b20'
  };

  return (
    <Flex alignItems="center" gap={2}>
      <Box
        style={{
          width: '60px',
          height: '8px',
          background: '#eaeaea',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        <Box
          style={{
            width: `${value}%`,
            height: '100%',
            background: colors[color],
            transition: 'width 0.3s ease'
          }}
        />
      </Box>
      <Typography variant="omega" fontWeight="semiBold">
        {value}
      </Typography>
    </Flex>
  );
};

// Helper Functions
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

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default OpportunitiesPage;