import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Button } from '@strapi/design-system/Button';
import { Loader } from '@strapi/design-system/Loader';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Link } from '@strapi/design-system/Link';
import { ArrowLeft, Check } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
import PricingForm from '../../components/PricingForm';
import PricingCalculator from '../../components/PricingCalculator';

const CategoryPricingPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const { get, put } = useFetchClient();
  const toggleNotification = useNotification();

  const [category, setCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [platformConfigs, setPlatformConfigs] = useState({});

  // ── Νέο: category-level config ───────────────────────────
  const [categoryConfig, setCategoryConfig] = useState({
    customer_share_pct: 60
  });

  useEffect(() => {
    fetchCategory();
  }, [id]);

  const fetchCategory = async () => {
    setIsLoading(true);
    try {
      const { data } = await get(`/${pluginId}/categories/${id}`);
      setCategory(data);

      // Parse platform configurations
      const configs = {};
      if (data.cat_percentage) {
        data.cat_percentage.forEach((config) => {
          configs[config.name] = {
            platform_commission: config.platform_commission || 0,
            management_cost: config.platform_man_cost || 0,
            profit_margin: config.profit_margin || 0,
            packaging_cost: config.packaging_cost || 0,
            brand_perc: config.brand_perc || [],
          };
        });
      }
      setPlatformConfigs(configs);

      // ── Νέο: φόρτωσε category-level config ───────────────
      setCategoryConfig({
        customer_share_pct: data.customer_share_pct ?? 60
      });

    } catch (error) {
      console.error('Error fetching category:', error);
      toggleNotification({
        type: 'warning',
        message: 'Σφάλμα κατά τη φόρτωση της κατηγορίας',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (platform, field, value) => {
    setPlatformConfigs((prev) => ({
      ...prev,
      [platform]: {
        ...(prev[platform] || {}),
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  // ── Νέο: handler για category-level fields ────────────────
  const handleCategoryConfigChange = (field, value) => {
    setCategoryConfig((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleBrandConfigChange = (platform, action, data) => {
    setPlatformConfigs((prev) => {
      const platformConfig = prev[platform] || {};
      const brandPerc = platformConfig.brand_perc || [];

      let updatedBrandPerc;

      if (action === 'add') {
        updatedBrandPerc = [...brandPerc, data];
      } else if (action === 'remove') {
        updatedBrandPerc = brandPerc.filter((_, i) => i !== data);
      } else if (action === 'update') {
        updatedBrandPerc = brandPerc.map((item, i) => {
          if (i === data.index) {
            return { ...item, [data.field]: data.value };
          }
          return item;
        });
      }

      return {
        ...prev,
        [platform]: {
          ...platformConfig,
          brand_perc: updatedBrandPerc,
        },
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const catPercentage = Object.entries(platformConfigs).map(([name, config]) => ({
        name,
        platform_commission: config.platform_commission,
        platform_man_cost: config.management_cost,
        profit_margin: config.profit_margin,
        packaging_cost: config.packaging_cost,
        brand_perc: (config.brand_perc || []).map((bp) => ({
          brand: bp.brand?.id || bp.brand,
          profit_margin: bp.profit_margin,
        })),
      }));

      await put(`/${pluginId}/categories/${id}/pricing`, {
        cat_percentage: catPercentage,
        // ── Νέο: αποθήκευσε και το category-level config ──
        customer_share_pct: categoryConfig.customer_share_pct,
      });

      toggleNotification({
        type: 'success',
        message: 'Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς',
      });

      await fetchCategory();
    } catch (error) {
      console.error('Error saving pricing:', error);
      toggleNotification({
        type: 'warning',
        message: 'Σφάλμα κατά την αποθήκευση',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box padding={8}>
        <Flex justifyContent="center" alignItems="center" style={{ minHeight: '400px' }}>
          <Loader>Φόρτωση κατηγορίας...</Loader>
        </Flex>
      </Box>
    );
  }

  if (!category) {
    return (
      <Box padding={8}>
        <Typography>Η κατηγορία δεν βρέθηκε</Typography>
      </Box>
    );
  }

  return (
    <>
      <HeaderLayout
        title={`Τιμολόγηση: ${category.name}`}
        subtitle="Προσαρμογή ποσοστών και υπολογισμοί"
        navigationAction={
          <Link
            startIcon={<ArrowLeft />}
            onClick={() => history.push(`/plugins/${pluginId}`)}
          >
            Πίσω
          </Link>
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
            <GridItem col={6} s={12}>
              <PricingForm
                platformConfigs={platformConfigs}
                onConfigChange={handleConfigChange}
                onBrandConfigChange={handleBrandConfigChange}
                categoryConfig={categoryConfig}
                onCategoryConfigChange={handleCategoryConfigChange}
              />
            </GridItem>

            <GridItem col={6} s={12}>
              <PricingCalculator
                category={category}
                platformConfigs={platformConfigs}
                categoryConfig={categoryConfig}
              />
            </GridItem>
          </Grid>
        </Box>
      </ContentLayout>
    </>
  );
};

export default CategoryPricingPage;