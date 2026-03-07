import React, { useState, useEffect } from 'react';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { NumberInput } from '@strapi/design-system/NumberInput';
import { Divider } from '@strapi/design-system/Divider';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { Field, FieldLabel, FieldHint } from '@strapi/design-system/Field';
import { Loader } from '@strapi/design-system/Loader';
import { Flex } from '@strapi/design-system/Flex';
import { useFetchClient } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
import BrandPricingSection from './BrandPricingSection';

const PLATFORM_LABELS = {
  general:  'General (Site)',
  skroutz:  'Skroutz',
  shopflix: 'Shopflix',
};

const PricingForm = ({
  platformConfigs,
  onConfigChange,
  onBrandConfigChange,
  categoryConfig,       // ← νέο: { customer_share_pct }
  onCategoryConfigChange // ← νέο: (field, value) => void
}) => {
  const { get } = useFetchClient();
  const [availablePlatforms, setAvailablePlatforms] = useState([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [expandedId, setExpandedId] = useState('general');

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    setIsLoadingPlatforms(true);
    try {
      const { data } = await get(`/${pluginId}/platforms`);
      const platforms = data.map((platform) => ({
        value: platform.value,
        label: PLATFORM_LABELS[platform.value] || platform.label,
      }));
      setAvailablePlatforms(platforms);
    } catch (error) {
      console.error('Error fetching platforms:', error);
      setAvailablePlatforms([
        { value: 'general',  label: 'General (Site)' },
        { value: 'skroutz',  label: 'Skroutz' },
        { value: 'shopflix', label: 'Shopflix' },
      ]);
    } finally {
      setIsLoadingPlatforms(false);
    }
  };

  const handleToggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (isLoadingPlatforms) {
    return (
      <Box padding={6} background="neutral0" hasRadius shadow="tableShadow">
        <Flex justifyContent="center" alignItems="center" style={{ minHeight: '200px' }}>
          <Loader>Φόρτωση πλατφορμών...</Loader>
        </Flex>
      </Box>
    );
  }

  return (
    <Box padding={6} background="neutral0" hasRadius shadow="tableShadow">
      <Stack spacing={4}>

        {/* Header */}
        <Box>
          <Typography variant="beta" as="h2">
            Ρυθμίσεις Τιμολόγησης
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="neutral600">
              Προσάρμοσε τα ποσοστά για κάθε πλατφόρμα και τη στρατηγική site τιμής
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* ══════════════════════════════════════════════════
            CATEGORY-LEVEL ΡΥΘΜΙΣΕΙΣ
            Αφορά τη σχέση Site vs Skroutz — όχι μια πλατφόρμα
        ══════════════════════════════════════════════════ */}
        <Box padding={4} background="primary100" hasRadius>
          <Stack spacing={3}>
            <Box>
              <Typography variant="sigma" textColor="primary700">
                Στρατηγική Τιμής Site
              </Typography>
              <Box paddingTop={1}>
                <Typography variant="pi" textColor="primary600">
                  Η τιμή του site υπολογίζεται αυτόματα από την τιμή Skroutz
                </Typography>
              </Box>
            </Box>

            <Field>
              <FieldLabel>
                Ποσοστό Savings προς Πελάτη (%)
              </FieldLabel>
              <NumberInput
                placeholder="π.χ. 60"
                value={categoryConfig?.customer_share_pct ?? 60}
                onValueChange={(value) =>
                  onCategoryConfigChange('customer_share_pct', value)
                }
                step={5}
                min={0}
                max={100}
              />
              <FieldHint>
                Το % της διαφοράς commission (Skroutz - Site) που δίνεις ως έκπτωση στον πελάτη.
                Το υπόλοιπο είναι extra κέρδος σου. Default: 60%
              </FieldHint>
            </Field>

            {/* Live preview της λογικής */}
            <Box padding={3} background="primary200" hasRadius>
              <Typography variant="pi" textColor="primary700">
                💡 Παράδειγμα με τις τρέχουσες ρυθμίσεις:
              </Typography>
              <Typography variant="pi" textColor="primary700">
                Skroutz commission {platformConfigs?.skroutz?.platform_commission ?? '—'}% vs
                Site commission {platformConfigs?.general?.platform_commission ?? '—'}% →
                Savings μοιράζονται {categoryConfig?.customer_share_pct ?? 60}% πελάτης /
                {' '}{100 - (categoryConfig?.customer_share_pct ?? 60)}% εσύ
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider />

        {/* ══════════════════════════════════════════════════
            PLATFORM-LEVEL ΡΥΘΜΙΣΕΙΣ
        ══════════════════════════════════════════════════ */}
        <Box>
          <Typography variant="sigma" textColor="neutral800">
            Ρυθμίσεις Πλατφορμών
          </Typography>
          <Box paddingTop={1} paddingBottom={3}>
            <Typography variant="pi" textColor="neutral600">
              General = κόστος site (payment + CPC) | Skroutz/Shopflix = commission πλατφόρμας
            </Typography>
          </Box>

          <Stack spacing={2}>
            {availablePlatforms.map((platform) => {
              const config = platformConfigs[platform.value] || {
                platform_commission: 0,
                management_cost: 0,
                profit_margin: 0,
                packaging_cost: 0,
                brand_perc: [],
              };

              return (
                <Accordion
                  key={platform.value}
                  expanded={expandedId === platform.value}
                  onToggle={() => handleToggle(platform.value)}
                  id={platform.value}
                  size="S"
                >
                  <AccordionToggle
                    title={platform.label}
                    description={`Commission: ${config.platform_commission}% | Margin: ${config.profit_margin}%`}
                    togglePosition="left"
                  />
                  <AccordionContent>
                    <Box padding={4}>
                      <Stack spacing={4}>

                        {/* Platform Commission */}
                        <Field>
                          <FieldLabel>
                            {platform.value === 'general'
                              ? 'Κόστος Site (%) — payment + CPC'
                              : 'Προμήθεια Πλατφόρμας (%)'}
                          </FieldLabel>
                          <NumberInput
                            placeholder="π.χ. 10"
                            value={config.platform_commission}
                            onValueChange={(value) =>
                              onConfigChange(platform.value, 'platform_commission', value)
                            }
                            step={0.1}
                            min={0}
                            max={100}
                          />
                          <FieldHint>
                            {platform.value === 'general'
                              ? 'Συνολικό κόστος site: payment gateway (~1%) + BestPrice CPC (~1%)'
                              : 'Το ποσοστό που κρατάει η πλατφόρμα'}
                          </FieldHint>
                        </Field>

                        {/* Profit Margin */}
                        <Field>
                          <FieldLabel>Margin Κέρδους (%)</FieldLabel>
                          <NumberInput
                            placeholder="π.χ. 2.5"
                            value={config.profit_margin}
                            onValueChange={(value) =>
                              onConfigChange(platform.value, 'profit_margin', value)
                            }
                            step={0.1}
                            min={0}
                            max={100}
                          />
                          <FieldHint>
                            {platform.value === 'general'
                              ? 'Δεν χρησιμοποιείται — η site τιμή υπολογίζεται από Skroutz'
                              : 'Το ποσοστό κέρδους πάνω στο κόστος (χωρίς ΦΠΑ)'}
                          </FieldHint>
                        </Field>

                        <Divider />

                        {/* Management Cost */}
                        <Field>
                          <FieldLabel>Κόστος Διαχείρισης (€)</FieldLabel>
                          <NumberInput
                            placeholder="π.χ. 3"
                            value={config.management_cost}
                            onValueChange={(value) =>
                              onConfigChange(platform.value, 'management_cost', value)
                            }
                            step={0.1}
                            min={0}
                          />
                        </Field>

                        {/* Packaging Cost */}
                        <Field>
                          <FieldLabel>Κόστος Συσκευασίας (€)</FieldLabel>
                          <NumberInput
                            placeholder="π.χ. 1"
                            value={config.packaging_cost}
                            onValueChange={(value) =>
                              onConfigChange(platform.value, 'packaging_cost', value)
                            }
                            step={0.1}
                            min={0}
                          />
                        </Field>

                        <Divider />

                        {/* Brand-specific pricing */}
                        <BrandPricingSection
                          platformValue={platform.value}
                          brandConfigs={config.brand_perc || []}
                          onBrandConfigChange={onBrandConfigChange}
                        />

                      </Stack>
                    </Box>
                  </AccordionContent>
                </Accordion>
              );
            })}
          </Stack>
        </Box>

      </Stack>
    </Box>
  );
};

export default PricingForm;