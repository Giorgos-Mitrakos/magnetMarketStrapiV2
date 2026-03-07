import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import { Searchbar } from '@strapi/design-system/Searchbar';
import { Button } from '@strapi/design-system/Button';
import { Loader } from '@strapi/design-system/Loader';
import { Flex } from '@strapi/design-system/Flex';
import { Badge } from '@strapi/design-system/Badge';
import { IconButton } from '@strapi/design-system/IconButton';
import { Pencil } from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

const STATUS_COLORS = {
  InStock:      'success',
  MediumStock:  'alternative',
  LowStock:     'warning',
  Backorder:    'secondary',
  IsExpected:   'secondary',
  OutOfStock:   'danger',
  Discontinued: 'danger',
  AskForPrice:  'neutral',
};

const ProductList = () => {
  const history    = useHistory();
  const { get }    = useFetchClient();

  const [products,    setProducts]    = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState({ pageCount: 1, total: 0 });

  const PAGE_SIZE = 20;

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        pageSize: PAGE_SIZE,
        ...(search && { search }),
      });

      const { data } = await get(`/${pluginId}/products?${params}`);
      setProducts(data.results || []);
      setPagination(data.pagination || { pageCount: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClear = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  return (
    <Box>
      {/* Search */}
      <Box paddingBottom={4}>
        <form onSubmit={handleSearch}>
          <Searchbar
            name="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClear={handleClear}
            placeholder="Αναζήτηση με όνομα, SKU, MPN..."
            size="S"
          >
            Αναζήτηση προϊόντων
          </Searchbar>
        </form>
      </Box>

      {isLoading ? (
        <Flex justifyContent="center" padding={8}>
          <Loader>Φόρτωση προϊόντων...</Loader>
        </Flex>
      ) : (
        <>
          <Box paddingBottom={2}>
            <Typography variant="pi" textColor="neutral600">
              {pagination.total} προϊόντα
            </Typography>
          </Box>

          <Table colCount={7} rowCount={products.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">Όνομα</Typography></Th>
                <Th><Typography variant="sigma">SKU</Typography></Th>
                <Th><Typography variant="sigma">Κατηγορία</Typography></Th>
                <Th><Typography variant="sigma">Τιμή</Typography></Th>
                <Th><Typography variant="sigma">Status</Typography></Th>
                <Th><Typography variant="sigma">Fixed</Typography></Th>
                <Th><Typography variant="sigma"></Typography></Th>
              </Tr>
            </Thead>
            <Tbody>
              {products.length === 0 ? (
                <Tr>
                  <Td colSpan={7}>
                    <Box padding={4}>
                      <Typography textColor="neutral600">Δεν βρέθηκαν προϊόντα</Typography>
                    </Box>
                  </Td>
                </Tr>
              ) : (
                products.map((product) => (
                  <Tr key={product.id}>
                    <Td>
                      <Typography
                        variant="omega"
                        fontWeight="semiBold"
                        textColor="neutral800"
                        style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {product.name}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography variant="pi" textColor="neutral600">
                        {product.sku || '—'}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography variant="pi" textColor="neutral600">
                        {product.category?.name || '—'}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                        {parseFloat(product.price).toFixed(2)}€
                      </Typography>
                      {product.is_sale && product.sale_price && (
                        <Typography variant="pi" textColor="danger600">
                          {parseFloat(product.sale_price).toFixed(2)}€
                        </Typography>
                      )}
                    </Td>
                    <Td>
                      <Badge
                        backgroundColor={`${STATUS_COLORS[product.status] || 'neutral'}200`}
                        textColor={`${STATUS_COLORS[product.status] || 'neutral'}700`}
                      >
                        {product.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Typography variant="pi" textColor={product.is_fixed_price ? 'success700' : 'neutral500'}>
                        {product.is_fixed_price ? '✓ Fixed' : '—'}
                      </Typography>
                    </Td>
                    <Td>
                      <IconButton
                        onClick={() => history.push(`/plugins/${pluginId}/products/${product.id}`)}
                        label="Επεξεργασία τιμολόγησης"
                        icon={<Pencil />}
                        noBorder
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>

          {/* Pagination */}
          {pagination.pageCount > 1 && (
            <Box paddingTop={4}>
              <Flex gap={2} alignItems="center">
                <Button
                  variant="tertiary"
                  size="S"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ← Προηγούμενο
                </Button>
                <Typography variant="pi" textColor="neutral600">
                  Σελίδα {page} / {pagination.pageCount}
                </Typography>
                <Button
                  variant="tertiary"
                  size="S"
                  disabled={page >= pagination.pageCount}
                  onClick={() => setPage(p => Math.min(pagination.pageCount, p + 1))}
                >
                  Επόμενο →
                </Button>
              </Flex>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ProductList;