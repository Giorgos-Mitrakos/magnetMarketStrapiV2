import React, { useState, useEffect } from 'react';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Divider } from '@strapi/design-system/Divider';
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import { Loader } from '@strapi/design-system/Loader';
import { Flex } from '@strapi/design-system/Flex';
import { Alert } from '@strapi/design-system/Alert';
import { Button } from '@strapi/design-system/Button';
import { useFetchClient } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

const VAT = 0.24;
const SHIPPING = 3;

// ══════════════════════════════════════════════════════════════
// HELPERS — ίδια λογική με το setPrice.js
// ══════════════════════════════════════════════════════════════

const calculateSkroutzPrice = (wholesale, recycleTax = 0, shippingCost, config) => {
  const managementCost = parseFloat(config.management_cost) || 0;
  const packagingCost = parseFloat(config.packaging_cost) || 0;
  const comm = parseFloat(config.platform_commission) || 0;
  const margin = parseFloat(config.profit_margin) || 0;
  const guaranteed = parseFloat(config.guaranteed_minimum_income) ?? 3;
  const recycle = parseFloat(recycleTax) || 0;

  const baseCost = wholesale + recycle + shippingCost + managementCost + packagingCost;
  const profit = baseCost * (margin / 100) + guaranteed;
  const priceWithProfit = baseCost + profit;
  const priceWithVAT = priceWithProfit * (1 + VAT);
  const commRate = comm / 100;
  const calculated = priceWithVAT / (1 - (1 + VAT) * commRate);
  const finalPrice = Math.round((Math.ceil(calculated * 10) / 10) * 100) / 100;

  // Κέρδος
  const netReceived = finalPrice * (1 - commRate);
  const netReceivedNoVAT = netReceived / (1 + VAT);
  const actualProfit = netReceivedNoVAT - baseCost;

  console.log("guaranteed:", guaranteed,
    "priceWithProfit:", priceWithProfit,
    "priceWithVAT:", priceWithVAT,
    "calculated:", calculated,
    "price:", finalPrice, "totalCost:", Math.round(baseCost * 100) / 100,
    "profit:", Math.round(actualProfit * 100) / 100,
    "commission:", Math.round(finalPrice * commRate * 100) / 100)

  return {
    price: finalPrice,
    totalCost: Math.round(baseCost * 100) / 100,
    profit: Math.round(actualProfit * 100) / 100,
    commission: Math.round(finalPrice * commRate * 100) / 100,
  };
};

// Αλγεβρική λύση circular reference — ίδια με setPrice.js
const calculateOptimalSitePrice = (skroutzPrice, skroutzCommission, siteCommission, customerSharePct) => {
  const siteCostPct = siteCommission / 100;
  const skroutzCostPct = skroutzCommission / 100;
  const customerShare = customerSharePct / 100;

  const skroutzCostEuros = skroutzPrice * skroutzCostPct;
  const numerator = skroutzPrice - (skroutzCostEuros * customerShare);
  const denominator = 1 - (siteCostPct * customerShare);
  const rawSitePrice = numerator / denominator;

  // Psychological ending
  return Math.round((Math.floor(rawSitePrice) + 0.90) * 100) / 100;
};

const calculateSiteProfit = (sitePrice, wholesale, shippingCost, config) => {
  const managementCost = parseFloat(config.management_cost) || 0;
  const packagingCost = parseFloat(config.packaging_cost) || 0;
  const platformCommission = parseFloat(config.platform_commission) || 0;

  const totalCost = wholesale + shippingCost + managementCost + packagingCost;
  const netReceived = sitePrice * (1 - platformCommission / 100);
  const netReceivedNoVAT = netReceived / (1 + VAT);
  const profit = netReceivedNoVAT - totalCost;
  const commission = sitePrice * platformCommission / 100;

  return {
    profit: Math.round(profit * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
};

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

const PricingCalculator = ({ category, platformConfigs, categoryConfig }) => {
  const { get } = useFetchClient();
  const [sampleProducts, setSampleProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch products μία φορά
  useEffect(() => {
    fetchSampleProducts();
  }, [category.id]);


  const fetchSampleProducts = async () => {
    setIsLoading(true);
    try {
      const { data } = await get(`/${pluginId}/categories/${category.id}`);
      const validProducts = (data.products || []).filter(product => {
        if (!product.supplierInfo || product.supplierInfo.length === 0) return false;
        return product.supplierInfo.some(s => s.in_stock === true && s.wholesale > 0);
      });
      setSampleProducts(validProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setSampleProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getMinWholesale = (product) => {
    const available = (product.supplierInfo || []).filter(s => s.in_stock === true && s.wholesale > 0);
    if (available.length === 0) return 0;
    return Math.min(...available.map(s => parseFloat(s.wholesale)));
  };

  const getRecycleTax = (product) => {
    const available = (product.supplierInfo || []).filter(s => s.in_stock === true && s.recycle_tax > 0);
    if (available.length === 0) return 0;
    return Math.max(...available.map(s => parseFloat(s.recycle_tax)));
  };

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      performAnalysis();
      setIsCalculating(false);
    }, 50);
  };

  const performAnalysis = () => {
    const skroutzConfig = platformConfigs.skroutz;
    const siteConfig = platformConfigs.general;
    if (!skroutzConfig || !siteConfig) return;

    const skroutzCommission = parseFloat(skroutzConfig.platform_commission) || 0;
    const siteCommission = parseFloat(siteConfig.platform_commission) || 0;
    const customerSharePct = categoryConfig?.customer_share_pct ?? 60;

    const productAnalyses = sampleProducts.map(product => {
      const wholesale = getMinWholesale(product);
      const recycleTax = getRecycleTax(product);
      if (wholesale <= 0) return null;

      // Skroutz τιμή
      const skroutz = calculateSkroutzPrice(wholesale, recycleTax, SHIPPING, skroutzConfig);

      // Site τιμή — από Skroutz price
      const sitePrice = calculateOptimalSitePrice(skroutz.price, skroutzCommission, siteCommission, customerSharePct);
      const sitePricing = calculateSiteProfit(sitePrice, wholesale, SHIPPING, siteConfig);

      const discount = ((skroutz.price - sitePrice) / skroutz.price * 100);
      const extraProfit = sitePricing.profit - skroutz.profit;

      return {
        name: product.name,
        wholesale,
        skroutzPrice: skroutz.price,
        skroutzProfit: skroutz.profit,
        skroutzCommission: skroutz.commission,
        sitePrice,
        siteProfit: sitePricing.profit,
        siteCommission: sitePricing.commission,
        discount: Math.round(discount * 100) / 100,
        extraProfit: Math.round(extraProfit * 100) / 100,
        totalCost: skroutz.totalCost,
      };
    }).filter(a => a !== null);

    if (productAnalyses.length === 0) { setAnalysis(null); return; }

    // ── Συνολικά στατιστικά ───────────────────────────────────
    const count = productAnalyses.length;
    const avg = (arr) => arr.reduce((s, v) => s + v, 0) / count;

    const avgSkroutzProfit = avg(productAnalyses.map(p => p.skroutzProfit));
    const avgSiteProfit = avg(productAnalyses.map(p => p.siteProfit));
    const avgExtraProfit = avg(productAnalyses.map(p => p.extraProfit));
    const avgDiscount = avg(productAnalyses.map(p => p.discount));
    const avgSkroutzPrice = avg(productAnalyses.map(p => p.skroutzPrice));
    const avgSitePrice = avg(productAnalyses.map(p => p.sitePrice));

    // ── Impact του customer_share_pct ─────────────────────────
    // Δείξε τι θα γινόταν με 50% και 70%
    const shareImpact = [40, 50, 60, 70, 80].map(share => {
      const analyses = sampleProducts.map(product => {
        const wholesale = getMinWholesale(product);
        const recycleTax = getRecycleTax(product);
        if (wholesale <= 0) return null;
        const skroutz = calculateSkroutzPrice(wholesale, recycleTax, SHIPPING, skroutzConfig);
        const sitePrice = calculateOptimalSitePrice(skroutz.price, skroutzCommission, siteCommission, share);
        const sitePricing = calculateSiteProfit(sitePrice, wholesale, SHIPPING, siteConfig);
        return {
          discount: (skroutz.price - sitePrice) / skroutz.price * 100,
          extraProfit: sitePricing.profit - skroutz.profit,
          siteProfit: sitePricing.profit,
        };
      }).filter(Boolean);

      if (analyses.length === 0) return null;
      return {
        share,
        avgDiscount: Math.round(avg(analyses.map(a => a.discount)) * 100) / 100,
        avgExtraProfit: Math.round(avg(analyses.map(a => a.extraProfit)) * 100) / 100,
        avgSiteProfit: Math.round(avg(analyses.map(a => a.siteProfit)) * 100) / 100,
        isCurrent: share === customerSharePct,
      };
    }).filter(Boolean);

    setAnalysis({
      count,
      avgSkroutzProfit: Math.round(avgSkroutzProfit * 100) / 100,
      avgSiteProfit: Math.round(avgSiteProfit * 100) / 100,
      avgExtraProfit: Math.round(avgExtraProfit * 100) / 100,
      avgDiscount: Math.round(avgDiscount * 100) / 100,
      avgSkroutzPrice: Math.round(avgSkroutzPrice * 100) / 100,
      avgSitePrice: Math.round(avgSitePrice * 100) / 100,
      customerSharePct,
      skroutzCommission,
      siteCommission,
      shareImpact,
      topProducts: productAnalyses.slice(0, 6),
    });
  };

  // ── Guards ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box padding={6} background="neutral0" hasRadius shadow="tableShadow">
        <Flex justifyContent="center" alignItems="center" style={{ minHeight: '300px' }}>
          <Loader>Φόρτωση υπολογισμών...</Loader>
        </Flex>
      </Box>
    );
  }

  if (!platformConfigs.general || !platformConfigs.skroutz) {
    return (
      <Box padding={6} background="neutral0" hasRadius shadow="tableShadow">
        <Alert variant="danger" title="Λείπουν ρυθμίσεις">
          Ρύθμισε τις πλατφόρμες "general" και "skroutz" για να δεις υπολογισμούς
        </Alert>
      </Box>
    );
  }

  if (sampleProducts.length === 0) {
    return (
      <Box padding={6} background="neutral0" hasRadius shadow="tableShadow">
        <Alert variant="warning" title="Δεν βρέθηκαν προϊόντα">
          Δεν υπάρχουν προϊόντα σε stock με έγκυρη χονδρική τιμή
        </Alert>
      </Box>
    );
  }

  return (
    <Box padding={6} background="neutral0" hasRadius shadow="tableShadow">
      <Stack spacing={4}>

        {/* Header */}
        <Flex justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="beta" as="h2">📊 Pricing Preview</Typography>
            <Box paddingTop={1}>
              <Typography variant="pi" textColor="neutral600">
                {category.name} — {sampleProducts.length} προϊόντα σε stock
              </Typography>
              {analysis && (
                <Typography variant="pi" textColor="neutral500">
                  Skroutz {analysis.skroutzCommission}% | Site {analysis.siteCommission}% | Share {analysis.customerSharePct}%
                </Typography>
              )}
            </Box>
          </Box>
          <Button
            onClick={handleCalculate}
            loading={isCalculating}
            disabled={isCalculating || sampleProducts.length === 0}
            size="S"
          >
            Υπολογισμός
          </Button>
        </Flex>

        {!analysis && (
          <Alert variant="default" title="Έτοιμο">
            Πάτα "Υπολογισμός" για να δεις τα αποτελέσματα με τις τρέχουσες ρυθμίσεις
          </Alert>
        )}

        {analysis && (
          <>
            <Divider />

            {/* ── Συνολικά Στατιστικά ───────────────────────────── */}
            <Stack spacing={2}>
              <Typography variant="sigma" textColor="neutral800">Μέσοι Όροι Κατηγορίας</Typography>

              <Flex gap={3} wrap="wrap">
                {/* Skroutz */}
                <Box padding={4} background="neutral100" hasRadius style={{ flex: 1, minWidth: '140px' }}>
                  <Typography variant="pi" textColor="neutral600">Skroutz Τιμή</Typography>
                  <Typography variant="beta" fontWeight="bold" textColor="neutral800">
                    {analysis.avgSkroutzPrice.toFixed(2)}€
                  </Typography>
                  <Typography variant="pi" textColor="neutral500">
                    Κέρδος: {analysis.avgSkroutzProfit.toFixed(2)}€
                  </Typography>
                </Box>

                {/* Site */}
                <Box padding={4} background="success100" hasRadius style={{ flex: 1, minWidth: '140px' }}>
                  <Typography variant="pi" textColor="success600">Site Τιμή</Typography>
                  <Typography variant="beta" fontWeight="bold" textColor="success700">
                    {analysis.avgSitePrice.toFixed(2)}€
                  </Typography>
                  <Typography variant="pi" textColor="success600">
                    Κέρδος: {analysis.avgSiteProfit.toFixed(2)}€
                  </Typography>
                </Box>

                {/* Έκπτωση */}
                <Box padding={4} background="primary100" hasRadius style={{ flex: 1, minWidth: '140px' }}>
                  <Typography variant="pi" textColor="primary600">Έκπτωση</Typography>
                  <Typography variant="beta" fontWeight="bold" textColor="primary700">
                    -{analysis.avgDiscount.toFixed(2)}%
                  </Typography>
                  <Typography variant="pi" textColor="primary600">
                    vs Skroutz
                  </Typography>
                </Box>

                {/* Extra κέρδος */}
                <Box padding={4} background="success100" hasRadius style={{ flex: 1, minWidth: '140px' }}>
                  <Typography variant="pi" textColor="success600">Extra Κέρδος</Typography>
                  <Typography variant="beta" fontWeight="bold" textColor="success700">
                    +{analysis.avgExtraProfit.toFixed(2)}€
                  </Typography>
                  <Typography variant="pi" textColor="success600">
                    ανά πώληση site
                  </Typography>
                </Box>
              </Flex>
            </Stack>

            <Divider />

            {/* ── Impact customer_share_pct ─────────────────────── */}
            <Box>
              <Typography variant="sigma" textColor="neutral800">
                Impact του Customer Share %
              </Typography>
              <Box paddingTop={1} paddingBottom={3}>
                <Typography variant="pi" textColor="neutral600">
                  Τι αλλάζει αν δώσεις διαφορετικό % των savings στον πελάτη
                </Typography>
              </Box>

              <Table colCount={4} rowCount={analysis.shareImpact.length}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">Share %</Typography></Th>
                    <Th><Typography variant="sigma">Avg Έκπτωση</Typography></Th>
                    <Th><Typography variant="sigma">Avg Site Κέρδος</Typography></Th>
                    <Th><Typography variant="sigma">Extra vs Skroutz</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {analysis.shareImpact.map((row, i) => (
                    <Tr key={i} style={row.isCurrent ? { background: '#e8f5e9' } : {}}>
                      <Td>
                        <Typography
                          fontWeight={row.isCurrent ? 'bold' : 'normal'}
                          textColor={row.isCurrent ? 'success700' : 'neutral800'}
                        >
                          {row.share}% {row.isCurrent ? '← τρέχον' : ''}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography textColor="primary700">-{row.avgDiscount.toFixed(2)}%</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="success700" fontWeight="bold">
                          {row.avgSiteProfit.toFixed(2)}€
                        </Typography>
                      </Td>
                      <Td>
                        <Typography
                          textColor={row.avgExtraProfit >= 0 ? 'success700' : 'danger700'}
                          fontWeight="bold"
                        >
                          {row.avgExtraProfit >= 0 ? '+' : ''}{row.avgExtraProfit.toFixed(2)}€
                        </Typography>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>

            <Divider />

            {/* ── Sample Προϊόντων ──────────────────────────────── */}
            <Box>
              <Typography variant="sigma" textColor="neutral800">
                Sample Προϊόντων
              </Typography>
              <Box paddingTop={1} paddingBottom={3}>
                <Typography variant="pi" textColor="neutral600">
                  Τιμές βάσει των τρεχουσών ρυθμίσεων — ενημερώνεται live
                </Typography>
              </Box>

              <Table colCount={6} rowCount={analysis.topProducts.length}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">Προϊόν</Typography></Th>
                    <Th><Typography variant="sigma">Wholesale</Typography></Th>
                    <Th><Typography variant="sigma">Skroutz</Typography></Th>
                    <Th><Typography variant="sigma">Site</Typography></Th>
                    <Th><Typography variant="sigma">Έκπτωση</Typography></Th>
                    <Th><Typography variant="sigma">Extra €</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {analysis.topProducts.map((p, i) => (
                    <Tr key={i}>
                      <Td>
                        <Typography variant="pi" textColor="neutral800"
                          style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {p.name}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography variant="pi" textColor="neutral600">
                          {p.wholesale.toFixed(2)}€
                        </Typography>
                      </Td>
                      <Td>
                        <Typography variant="pi" textColor="neutral800" fontWeight="bold">
                          {p.skroutzPrice.toFixed(2)}€
                        </Typography>
                        <Typography variant="pi" textColor="neutral500">
                          κέρδος: {p.skroutzProfit.toFixed(2)}€
                        </Typography>
                      </Td>
                      <Td>
                        <Typography variant="pi" textColor="success700" fontWeight="bold">
                          {p.sitePrice.toFixed(2)}€
                        </Typography>
                        <Typography variant="pi" textColor="success600">
                          κέρδος: {p.siteProfit.toFixed(2)}€
                        </Typography>
                      </Td>
                      <Td>
                        <Typography variant="pi" textColor="primary700">
                          -{p.discount.toFixed(2)}%
                        </Typography>
                      </Td>
                      <Td>
                        <Typography
                          variant="pi"
                          fontWeight="bold"
                          textColor={p.extraProfit >= 0 ? 'success700' : 'danger700'}
                        >
                          {p.extraProfit >= 0 ? '+' : ''}{p.extraProfit.toFixed(2)}€
                        </Typography>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>

          </>
        )}
      </Stack>
    </Box>
  );
};

export default PricingCalculator;