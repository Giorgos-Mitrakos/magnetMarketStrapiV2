import React, { useState, useEffect } from 'react';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Button } from '@strapi/design-system/Button';
import { IconButton } from '@strapi/design-system/IconButton';
import { Flex } from '@strapi/design-system/Flex';
import { NumberInput } from '@strapi/design-system/NumberInput';
import { Select, Option } from '@strapi/design-system/Select';
import { Field, FieldLabel } from '@strapi/design-system/Field';
import { Plus, Trash } from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

const BrandPricingSection = ({ platformValue, brandConfigs, onBrandConfigChange }) => {
  const { get } = useFetchClient();
  const [brands, setBrands] = useState([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setIsLoadingBrands(true);
    try {
      const { data } = await get(`/${pluginId}/brands`);
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      setBrands([]);
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const handleAddBrand = () => {
    onBrandConfigChange(platformValue, 'add', {
      brand: null,
      profit_margin: 0,
    });
  };

  const handleRemoveBrand = (index) => {
    onBrandConfigChange(platformValue, 'remove', index);
  };

  const handleUpdateBrand = (index, field, value) => {
    onBrandConfigChange(platformValue, 'update', { index, field, value });
  };

  // Filter out already selected brands
  const getAvailableBrands = (currentBrandId) => {
    const selectedBrandIds = brandConfigs
      .map((bc) => bc.brand?.id)
      .filter((id) => id && id !== currentBrandId);
    
    return brands.filter((brand) => !selectedBrandIds.includes(brand.id));
  };

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center">
        <Typography variant="sigma" textColor="neutral600">
          Ειδικά Ποσοστά ανά Brand
        </Typography>
        <Button
          startIcon={<Plus />}
          variant="secondary"
          size="S"
          onClick={handleAddBrand}
        >
          Προσθήκη Brand
        </Button>
      </Flex>

      {brandConfigs.length > 0 && (
        <Box paddingTop={4}>
          <Stack spacing={3}>
            {brandConfigs.map((brandConfig, index) => (
              <Box
                key={index}
                padding={3}
                background="neutral100"
                hasRadius
              >
                <Stack spacing={2}>
                  <Flex justifyContent="space-between" alignItems="center">
                    <Typography variant="pi" fontWeight="bold">
                      Brand #{index + 1}
                    </Typography>
                    <IconButton
                      onClick={() => handleRemoveBrand(index)}
                      label="Διαγραφή"
                      icon={<Trash />}
                      noBorder
                    />
                  </Flex>

                  {/* Brand Selection */}
                  <Field>
                    <FieldLabel>Brand</FieldLabel>
                    <Select
                      value={brandConfig.brand?.id?.toString() || ''}
                      onChange={(value) => {
                        const selectedBrand = brands.find((b) => b.id === parseInt(value));
                        handleUpdateBrand(index, 'brand', selectedBrand);
                      }}
                      placeholder="Επίλεξε brand"
                      disabled={isLoadingBrands}
                    >
                      {getAvailableBrands(brandConfig.brand?.id).map((brand) => (
                        <Option key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </Option>
                      ))}
                    </Select>
                  </Field>

                  {/* Profit Margin */}
                  <Field>
                    <FieldLabel>Profit Margin (%)</FieldLabel>
                    <NumberInput
                      placeholder="π.χ. 5"
                      value={brandConfig.profit_margin}
                      onValueChange={(value) => 
                        handleUpdateBrand(index, 'profit_margin', value)
                      }
                      step={0.1}
                      min={0}
                      max={100}
                    />
                  </Field>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {brandConfigs.length === 0 && (
        <Box paddingTop={2}>
          <Typography variant="pi" textColor="neutral600">
            Δεν υπάρχουν ειδικά ποσοστά για brands. Πάτησε "Προσθήκη Brand" για να προσθέσεις.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BrandPricingSection;