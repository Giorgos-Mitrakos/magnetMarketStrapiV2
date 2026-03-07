import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Stack } from '@strapi/design-system/Stack';
import { Button } from '@strapi/design-system/Button';
import { Loader } from '@strapi/design-system/Loader';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Divider } from '@strapi/design-system/Divider';

import { NumberInput } from '@strapi/design-system/NumberInput';
import { TextInput } from '@strapi/design-system/TextInput';
import { ToggleInput } from '@strapi/design-system/ToggleInput';
import { Select, Option } from '@strapi/design-system/Select';
import { Field, FieldLabel, FieldHint } from '@strapi/design-system/Field';
import { Badge } from '@strapi/design-system/Badge';
import { ArrowLeft, Check } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
import ProductStatsPanel from '../../components/Productstatspanel';

const STATUS_OPTIONS = [
  'InStock', 'MediumStock', 'LowStock',
  'Backorder', 'IsExpected', 'AskForPrice',
  'OutOfStock', 'Discontinued',
];

const ProductPricingPage = () => {
  const { id }     = useParams();
  const history    = useHistory();
  const { get, put } = useFetchClient();
  const toggleNotification = useNotification();

  const [product,   setProduct]   = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);

  // ── Form state ────────────────────────────────────────────
  const [formData, setFormData] = useState({
    price:               '',
    sale_price:          '',
    is_sale:             false,
    is_hot:              false,
    inventory:           0,
    status:              'InStock',
    is_fixed_price:      false,
    is_in_house:         false,
    notice_if_available: false,
  });

  // ── Platforms state ───────────────────────────────────────
  const [platforms, setPlatforms] = useState([]);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const { data } = await get(`/${pluginId}/products/${id}`);
      setProduct(data);

      // Init form
      setFormData({
        price:               data.price               ?? '',
        sale_price:          data.sale_price           ?? '',
        is_sale:             data.is_sale              ?? false,
        is_hot:              data.is_hot               ?? false,
        inventory:           data.inventory            ?? 0,
        status:              data.status               ?? 'InStock',
        is_fixed_price:      data.is_fixed_price       ?? false,
        is_in_house:         data.is_in_house          ?? false,
        notice_if_available: data.notice_if_available  ?? false,
      });

      // Init platforms
      setPlatforms(
        (data.platforms || []).map(p => ({
          id:             p.id,
          platform:       p.platform,
          price:          p.price          ?? '',
          is_fixed_price: p.is_fixed_price ?? false,
        }))
      );

    } catch (error) {
      console.error('Error fetching product:', error);
      toggleNotification({ type: 'warning', message: 'Σφάλμα κατά τη φόρτωση' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlatformChange = (platformName, field, value) => {
    setPlatforms(prev =>
      prev.map(p =>
        p.platform === platformName ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        price:      parseFloat(formData.price)      || 0,
        sale_price: parseFloat(formData.sale_price) || null,
        inventory:  parseInt(formData.inventory)    || 0,
        platforms:  platforms.map(p => ({
          ...(p.id ? { id: p.id } : {}),
          platform:       p.platform,
          price:          parseFloat(p.price) || 0,
          is_fixed_price: p.is_fixed_price,
        })),
      };

      const { data } = await put(`/${pluginId}/products/${id}/pricing`, payload);

      // Refresh product για updated stats
      setProduct(data);

      toggleNotification({ type: 'success', message: 'Αποθηκεύτηκε επιτυχώς' });
    } catch (error) {
      console.error('Error saving product:', error);
      toggleNotification({ type: 'warning', message: 'Σφάλμα κατά την αποθήκευση' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box padding={8}>
        <Flex justifyContent="center" alignItems="center" style={{ minHeight: '400px' }}>
          <Loader>Φόρτωση προϊόντος...</Loader>
        </Flex>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box padding={8}>
        <Typography>Το προϊόν δεν βρέθηκε</Typography>
      </Box>
    );
  }

  return (
    <>
      <HeaderLayout
        title={product.name}
        subtitle={`SKU: ${product.sku || '—'} | ${product.brand?.name || '—'} | ${product.category?.name || '—'}`}
        navigationAction={
          <Button
            variant="tertiary"
            startIcon={<ArrowLeft />}
            onClick={() => history.goBack()}
          >
            Πίσω
          </Button>
        }
        primaryAction={
          <Button
            startIcon={<Check />}
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaving}
          >
            Αποθήκευση
          </Button>
        }
      />

      <ContentLayout>
        <Box padding={8}>
          <Grid gap={6}>

            {/* ── Αριστερά: Form ──────────────────────────── */}
            <GridItem col={6} s={12}>
              <Box padding={6} background="neutral0" hasRadius shadow="tableShadow">
                <Stack spacing={4}>

                  <Typography variant="beta" as="h2">Στοιχεία Τιμολόγησης</Typography>

                  <Divider />

                  {/* ── Τιμές ─────────────────────────────── */}
                  <Stack spacing={3}>
                    <Typography variant="sigma" textColor="neutral800">Τιμές</Typography>

                    <Field>
                      <FieldLabel>Τιμή (€)</FieldLabel>
                      <NumberInput
                        value={formData.price}
                        onValueChange={(v) => handleFieldChange('price', v)}
                        step={0.01}
                        min={0}
                        placeholder="0.00"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Τιμή Προσφοράς (€)</FieldLabel>
                      <NumberInput
                        value={formData.sale_price || ''}
                        onValueChange={(v) => handleFieldChange('sale_price', v)}
                        step={0.01}
                        min={0}
                        placeholder="0.00"
                      />
                      <FieldHint>Αφήστε κενό αν δεν υπάρχει προσφορά</FieldHint>
                    </Field>

                    <Flex gap={4}>
                      <Field>
                        <ToggleInput
                          label="Προσφορά"
                          checked={formData.is_sale}
                          onChange={(e) => handleFieldChange('is_sale', e.target.checked)}
                          onLabel="Ναι"
                          offLabel="Όχι"
                        />
                      </Field>

                      <Field>
                        <ToggleInput
                          label="Fixed Price"
                          checked={formData.is_fixed_price}
                          onChange={(e) => handleFieldChange('is_fixed_price', e.target.checked)}
                          onLabel="Ναι"
                          offLabel="Όχι"
                        />
                        <FieldHint>Κλειδώνει την τιμή από αυτόματες αλλαγές</FieldHint>
                      </Field>
                    </Flex>
                  </Stack>

                  <Divider />

                  {/* ── Πλατφόρμες ─────────────────────────── */}
                  <Stack spacing={3}>
                    <Typography variant="sigma" textColor="neutral800">Πλατφόρμες</Typography>

                    {platforms.length === 0 ? (
                      <Typography variant="pi" textColor="neutral500">
                        Δεν υπάρχουν καταχωρημένες πλατφόρμες
                      </Typography>
                    ) : (
                      platforms.map((platform) => (
                        <Box key={platform.platform} padding={3} background="neutral100" hasRadius>
                          <Stack spacing={2}>
                            <Flex justifyContent="space-between" alignItems="center">
                              <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                                {platform.platform}
                              </Typography>
                              {platform.is_fixed_price && (
                                <Badge backgroundColor="primary200" textColor="primary700">
                                  Fixed
                                </Badge>
                              )}
                            </Flex>

                            <Field>
                              <FieldLabel>Τιμή (€)</FieldLabel>
                              <NumberInput
                                value={platform.price}
                                onValueChange={(v) => handlePlatformChange(platform.platform, 'price', v)}
                                step={0.01}
                                min={0}
                              />
                            </Field>

                            <Field>
                              <ToggleInput
                                label="Fixed Price"
                                checked={platform.is_fixed_price}
                                onChange={(e) => handlePlatformChange(platform.platform, 'is_fixed_price', e.target.checked)}
                                onLabel="Ναι"
                                offLabel="Όχι"
                              />
                            </Field>
                          </Stack>
                        </Box>
                      ))
                    )}
                  </Stack>

                  <Divider />

                  {/* ── Διαθεσιμότητα ─────────────────────── */}
                  <Stack spacing={3}>
                    <Typography variant="sigma" textColor="neutral800">Διαθεσιμότητα</Typography>

                    <Field>
                      <FieldLabel>Status</FieldLabel>
                      <Select
                        value={formData.status}
                        onChange={(v) => handleFieldChange('status', v)}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <Option key={s} value={s}>{s}</Option>
                        ))}
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel>Απόθεμα</FieldLabel>
                      <NumberInput
                        value={formData.inventory}
                        onValueChange={(v) => handleFieldChange('inventory', v)}
                        step={1}
                        min={0}
                      />
                    </Field>
                  </Stack>

                  <Divider />

                  {/* ── Λοιπά ─────────────────────────────── */}
                  <Stack spacing={3}>
                    <Typography variant="sigma" textColor="neutral800">Λοιπά</Typography>

                    <Flex gap={4} wrap="wrap">
                      <Field>
                        <ToggleInput
                          label="Hot"
                          checked={formData.is_hot}
                          onChange={(e) => handleFieldChange('is_hot', e.target.checked)}
                          onLabel="Ναι"
                          offLabel="Όχι"
                        />
                      </Field>

                      <Field>
                        <ToggleInput
                          label="In House"
                          checked={formData.is_in_house}
                          onChange={(e) => handleFieldChange('is_in_house', e.target.checked)}
                          onLabel="Ναι"
                          offLabel="Όχι"
                        />
                      </Field>

                      <Field>
                        <ToggleInput
                          label="Ειδοποίηση Διαθεσιμότητας"
                          checked={formData.notice_if_available}
                          onChange={(e) => handleFieldChange('notice_if_available', e.target.checked)}
                          onLabel="Ναι"
                          offLabel="Όχι"
                        />
                      </Field>
                    </Flex>
                  </Stack>

                </Stack>
              </Box>
            </GridItem>

            {/* ── Δεξιά: Stats ─────────────────────────────── */}
            <GridItem col={6} s={12}>
              <ProductStatsPanel product={product} />
            </GridItem>

          </Grid>
        </Box>
      </ContentLayout>
    </>
  );
};

export default ProductPricingPage;