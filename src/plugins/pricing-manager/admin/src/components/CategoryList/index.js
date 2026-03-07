import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
} from '@strapi/design-system/Table';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { TextInput } from '@strapi/design-system/TextInput';
import { Flex } from '@strapi/design-system/Flex';
import { Loader } from '@strapi/design-system/Loader';
import { EmptyStateLayout } from '@strapi/design-system/EmptyStateLayout';
import { IconButton } from '@strapi/design-system/IconButton';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { Pencil, Search, Cross } from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

const CategoryList = () => {
  const history = useHistory();
  const { get } = useFetchClient();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, [page, searchQuery]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const { data } = await get(`/${pluginId}/categories?${params.toString()}`);

      setCategories(data?.results || []);
      setPageCount(data?.pagination?.pageCount || 0);
      setTotal(data?.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const handleEditCategory = (categoryId) => {
    history.push(`/plugins/${pluginId}/category/${categoryId}`);
  };

  if (isLoading && categories.length === 0) {
    return (
      <Box padding={8} background="neutral0">
        <Flex justifyContent="center" alignItems="center" style={{ minHeight: '400px' }}>
          <Loader>Φόρτωση κατηγοριών...</Loader>
        </Flex>
      </Box>
    );
  }

  if (categories.length === 0 && !searchQuery && !isLoading) {
    return (
      <EmptyStateLayout
        content="Δεν βρέθηκαν κατηγορίες"
        action={null}
      />
    );
  }

  return (
    <Box padding={8} background="neutral0">
      {/* Search Bar */}
      <Box paddingBottom={4}>
        <Flex gap={2}>
          <Box style={{ flex: 1 }}>
            <TextInput
              placeholder="Αναζήτηση κατηγορίας..."
              aria-label="Αναζήτηση"
              name="search"
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyPress}
              value={searchInput}
              endAction={
                searchInput ? (
                  <IconButton
                    onClick={handleClearSearch}
                    label="Καθαρισμός"
                    noBorder
                    icon={<Cross />}
                  />
                ) : null
              }
            />
          </Box>
          <Button
            startIcon={<Search />}
            onClick={handleSearchSubmit}
            disabled={isLoading}
          >
            Αναζήτηση
          </Button>
        </Flex>
      </Box>

      {/* Results count */}
      {total > 0 && (
        <Box paddingBottom={2}>
          <Typography variant="pi" textColor="neutral600">
            {total} {total === 1 ? 'κατηγορία' : 'κατηγορίες'}
          </Typography>
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box paddingBottom={2}>
          <Flex alignItems="center" gap={2}>
            <Loader small>Φόρτωση...</Loader>
          </Flex>
        </Box>
      )}

      {/* Table */}
      {categories.length === 0 && !isLoading ? (
        <Box padding={8} background="neutral100" hasRadius>
          <Typography textAlign="center">
            Δεν βρέθηκαν κατηγορίες με τα κριτήρια αναζήτησης
          </Typography>
        </Box>
      ) : (
        <Table colCount={4} rowCount={categories.length}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">Όνομα</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Όνομα</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Προϊόντα</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Πλατφόρμες</Typography>
              </Th>
              <Th>
                <VisuallyHidden>Ενέργειες</VisuallyHidden>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {categories.map((category) => (
              <Tr key={category.id}>
                <Td>
                  <Typography textColor="neutral800" fontWeight="bold">
                    {category.id}
                  </Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800" fontWeight="bold">
                    {category.name}
                  </Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral600">
                    {category.products?.count || 0}
                  </Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral600">
                    {category.cat_percentage?.length || 0}
                  </Typography>
                </Td>
                <Td>
                  <Flex justifyContent="flex-end">
                    <IconButton
                      onClick={() => handleEditCategory(category.id)}
                      label="Επεξεργασία"
                      noBorder
                      icon={<Pencil />}
                    />
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <Box paddingTop={4}>
          <Flex justifyContent="space-between" alignItems="center">
            <Button
              variant="tertiary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Προηγούμενο
            </Button>
            <Typography variant="pi" textColor="neutral600">
              Σελίδα {page} από {pageCount}
            </Typography>
            <Button
              variant="tertiary"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount || isLoading}
            >
              Επόμενο
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export default CategoryList;