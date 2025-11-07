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
import { Eye, Refresh } from '@strapi/icons';
import pluginId from '../../pluginId';

const OpportunitiesPage = () => {
  const { get } = useFetchClient();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    pageCount: 0,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    recommendation: 'all',
    search: ''
  });

  useEffect(() => {
    fetchOpportunities();
  }, [filters.status, filters.priority, filters.recommendation, pagination.page, pagination.pageSize]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);

      let query = `/${pluginId}/opportunities?populate=product`;

      // Add pagination
      query += `&pagination[page]=${pagination.page}&pagination[pageSize]=${pagination.pageSize}`;

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

      // Add sorting
      query += '&sort[0]=priority:asc&sort[1]=opportunity_score:desc';

      const response = await get(query);
      
      const opportunitiesData = response.data?.data || [];
      const paginationMeta = response.data?.meta?.pagination || {
        page: 1,
        pageSize: 25,
        pageCount: 0,
        total: 0
      };

      // Client-side search filter
      let filtered = opportunitiesData;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = opportunitiesData.filter(opp => {
          const productName = opp.product?.name?.toLowerCase() || '';
          const productId = String(opp.product?.id || '');
          const recommendation = opp.recommendation?.toLowerCase() || '';
          return productName.includes(searchLower) || 
                 productId.includes(searchLower) ||
                 recommendation.includes(searchLower);
        });
      }

      setOpportunities(filtered);
      
      // Update pagination meta
      setPagination(prev => ({
        ...prev,
        pageCount: paginationMeta.pageCount || 1,
        total: paginationMeta.total || filtered.length
      }));

    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e) => {
    handleFilterChange('search', e.target.value);
  };

  const clearSearch = () => {
    handleFilterChange('search', '');
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      recommendation: 'all',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const navigateToDetails = (id) => {
    window.location.href = `/admin/plugins/${pluginId}/opportunities/${id}`;
  };

  return (
    <Layout>
      <HeaderLayout
        title="Bargain Opportunities"
        subtitle={`${pagination.total} opportunities found`}
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
            <Flex gap={4} wrap="wrap" alignItems="end">
              {/* Search */}
              <Box style={{ flex: '1 1 300px' }}>
                <SearchForm>
                  <Searchbar
                    name="search"
                    placeholder="Search by product name, ID or recommendation..."
                    value={filters.search}
                    onChange={handleSearch}
                    onClear={clearSearch}
                  />
                </SearchForm>
              </Box>

              {/* Status Filter */}
              <Box style={{ minWidth: '150px' }}>
                <SingleSelect
                  label="Status"
                  placeholder="All statuses"
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
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
                  onChange={(value) => handleFilterChange('priority', value)}
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
                  onChange={(value) => handleFilterChange('recommendation', value)}
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

              {/* Page Size */}
              <Box style={{ minWidth: '120px' }}>
                <SingleSelect
                  label="Per page"
                  value={String(pagination.pageSize)}
                  onChange={(value) => handlePageSizeChange(parseInt(value))}
                >
                  <SingleSelectOption value="10">10</SingleSelectOption>
                  <SingleSelectOption value="25">25</SingleSelectOption>
                  <SingleSelectOption value="50">50</SingleSelectOption>
                  <SingleSelectOption value="100">100</SingleSelectOption>
                </SingleSelect>
              </Box>

              {/* Reset Filters */}
              <Box>
                <Button
                  onClick={handleResetFilters}
                  variant="tertiary"
                  size="L"
                >
                  Reset Filters
                </Button>
              </Box>
            </Flex>
          </Box>

          {/* Table */}
          <Box background="neutral0" hasRadius shadow="tableShadow" marginBottom={4}>
            {loading ? (
              <Box padding={8}>
                <Flex justifyContent="center">
                  <Typography>Loading opportunities...</Typography>
                </Flex>
              </Box>
            ) : opportunities.length === 0 ? (
              <Box padding={8}>
                <Flex justifyContent="center" direction="column" alignItems="center" gap={2}>
                  <Typography>No opportunities found</Typography>
                  <Button onClick={fetchOpportunities} variant="tertiary">
                    Refresh
                  </Button>
                </Flex>
              </Box>
            ) : (
              <Table colCount={7} rowCount={opportunities.length}>
                <Thead>
                  <Tr>
                    <Th style={{ width: '400px', maxWidth: '400px' }}>
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
                          <Typography variant="pi" textColor="neutral500">
                            Analyzed: {formatDate(opp.analyzed_at)}
                          </Typography>
                        </Flex>
                      </Td>
                      <Td>
                        <Badge {...getPriorityBadgeProps(opp.priority)}>
                          {opp.priority ? opp.priority.charAt(0).toUpperCase() + opp.priority.slice(1) : 'Unknown'}
                        </Badge>
                      </Td>
                      <Td>
                        <ScoreBar value={opp.opportunity_score || 0} color="success" />
                      </Td>
                      <Td>
                        <ScoreBar value={opp.risk_score || 0} color="danger" />
                      </Td>
                      <Td>
                        <Typography variant="omega" fontWeight="semiBold">
                          {formatRecommendation(opp.recommendation)}
                        </Typography>
                      </Td>
                      <Td>
                        <Badge active={opp.status === 'active'}>
                          {opp.status ? opp.status.charAt(0).toUpperCase() + opp.status.slice(1) : 'Unknown'}
                        </Badge>
                      </Td>
                      <Td>
                        <Flex gap={1}>
                          <IconButton
                            label="View details"
                            icon={<Eye />}
                            onClick={() => navigateToDetails(opp.id)}
                          />
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>

          {/* Simple Pagination */}
          {!loading && pagination.pageCount > 1 && (
            <Flex justifyContent="center" gap={2} alignItems="center">
              <Button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                variant="tertiary"
              >
                ← Previous
              </Button>
              
              <Typography variant="pi" textColor="neutral600">
                Page {pagination.page} of {pagination.pageCount}
              </Typography>
              
              <Button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pageCount}
                variant="tertiary"
              >
                Next →
              </Button>
            </Flex>
          )}

          {/* Pagination Info */}
          {!loading && pagination.total > 0 && (
            <Box paddingTop={2}>
              <Flex justifyContent="center">
                <Typography variant="pi" textColor="neutral600">
                  Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                  {pagination.total} opportunities
                </Typography>
              </Flex>
            </Box>
          )}
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
  return props[priority] || { backgroundColor: 'neutral100', textColor: 'neutral700' };
};

const formatRecommendation = (rec) => {
  if (!rec) return 'Unknown';
  return rec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
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
  } catch (error) {
    return 'Invalid date';
  }
};

export default OpportunitiesPage;