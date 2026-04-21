import React, { useMemo, useState, useEffect } from 'react';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Divider } from '@strapi/design-system/Divider';
import { Flex } from '@strapi/design-system/Flex';
import { Badge } from '@strapi/design-system/Badge';
import { Alert } from '@strapi/design-system/Alert';
import { Loader } from '@strapi/design-system/Loader';
import { useFetchClient } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

// ══════════════════════════════════════════════════════════════
// HELPERS — ίδια λογική με setPrice.js (backend)
// TAX_RATE / SHIPPING φορτώνονται από /settings endpoint
// ══════════════════════════════════════════════════════════════

const getPlatformConfig = (category, platformName, brandId, defaults) => {
  const catPercentage = category?.cat_percentage || [];
  const platformCfg = catPercentage.find(c => c.name?.toLowerCase() === platformName.toLowerCase());

  // Όταν δεν υπάρχει config, επιστρέφουμε με τα ΣΩΣΤΑ keys που περιμένουν οι calc συναρτήσεις
  if (!platformCfg) return {
    platform_commission: defaults.commission,
    management_cost: defaults.managementCost,
    profit_margin: defaults.profitMargin,
    packaging_cost: defaults.packagingCost,
    guaranteed_minimum_income: defaults.guaranteedMinIncome,
  };

  let config = {
    platform_commission: platformCfg.platform_commission ?? defaults.commission,
    management_cost: platformCfg.platform_man_cost ?? defaults.managementCost,
    profit_margin: platformCfg.profit_margin ?? defaults.profitMargin,
    packaging_cost: platformCfg.packaging_cost ?? defaults.packagingCost,
    guaranteed_minimum_income: platformCfg.add_to_price ?? defaults.guaranteedMinIncome, // ✅ προστέθηκε
  };

  if (brandId && platformCfg.brand_perc?.length > 0) {
    const brandCfg = platformCfg.brand_perc.find(b => b.brand?.id === brandId);
    if (brandCfg?.profit_margin !== undefined) config.profit_margin = brandCfg.profit_margin;
  }

  return config;
};

const calcPlatformPrice = (wholesale, recycleTax, shippingCost, config, TAX_RATE) => {
  if (!config || !wholesale) return null;

  const vat = TAX_RATE / 100;
  const mgmt = config.management_cost ?? 2;   // ✅ ?? παντού
  const pkg = config.packaging_cost ?? 1;
  const commission = config.platform_commission ?? 20;
  const margin = config.profit_margin ?? 10;
  const recycle = recycleTax ?? 0;
  const guaranteed = config.guaranteed_minimum_income ?? 3;
  const comm = commission / 100;

  // Φάση 1: Σχηματισμός τιμής
  const baseCost = wholesale + recycle + shippingCost + mgmt + pkg;
  const profit = wholesale * (margin / 100) + guaranteed;
  const priceWithProfit = baseCost + profit;
  const priceWithVAT = priceWithProfit * (1 + vat);
  const calculated = priceWithVAT / (1 - (1 + vat) * comm);
  const finalPrice = Math.round((Math.ceil(calculated * 10) / 10) * 100) / 100;

  // ✅ Φάση 2: Σωστή ανάλυση ΦΠΑ
  // Πληρώνεις ΦΠΑ στην εφορία για ΟΛΟΚΛΗΡΗ την τιμή πώλησης
  const outputVAT = Math.round(finalPrice * vat / (1 + vat) * 100) / 100;
  const finalPriceExVAT = Math.round(finalPrice / (1 + vat) * 100) / 100;

  // Η commission υπολογίζεται στη τελική τιμή (χωρίς ΦΠΑ)
  const commissionAmount = Math.round(finalPrice * comm * 100) / 100;

  // Καθαρά έσοδα εκτός ΦΠΑ = τιμή εκτός ΦΠΑ - commission
  // (μαθηματικά ίδιο με: finalPrice * (1-comm) / (1+vat))
  const netReceivedNoVAT = Math.round((finalPriceExVAT - commissionAmount) * 100) / 100;
  const netReceived = Math.round((finalPrice * (1 - comm * (1 + vat)) - (1 + vat) * mgmt) * 100) / 100;

  const actualProfit = Math.round((netReceivedNoVAT - baseCost) * 100) / 100;
  const profitPct = baseCost > 0 ? Math.round(actualProfit / baseCost * 10000) / 100 : 0;

  return {
    price: finalPrice,
    profit: actualProfit,
    profitPct,
    breakdown: {
      // Κόστη
      wholesale: Math.round(wholesale * 100) / 100,
      recycleTax: Math.round(recycle * 100) / 100,
      shipping: Math.round(shippingCost * 100) / 100,
      management: Math.round(mgmt * 100) / 100,
      packaging: Math.round(pkg * 100) / 100,
      guaranteed: Math.round(guaranteed * 100) / 100,
      baseCost: Math.round(baseCost * 100) / 100,
      profitAmount: Math.round(profit * 100) / 100,
      priceNoVAT: Math.round(priceWithProfit * 100) / 100,
      vatAmount: Math.round((priceWithVAT - priceWithProfit) * 100) / 100,
      priceWithVAT: Math.round(priceWithVAT * 100) / 100,
      // ✅ Νέα VAT ανάλυση
      outputVAT,        // ΦΠΑ που οφείλεις στην εφορία (επί όλης της τιμής)
      finalPriceExVAT,  // Τιμή πώλησης εκτός ΦΠΑ
      commissionAmount,  // Commission που κρατάει η πλατφόρμα (χωρίς ΦΠΑ)
      netReceived,
      netReceivedNoVAT
    },
  };
};

// ίδιο με roundUpToFirstDecimal του backend
const roundUpToFirstDecimal = (price) => Math.ceil(price * 10) / 10;

// ίδιο με calculateOptimalSitePrice του backend (με mgmtCostDiff)
const calcOptimalSitePrice = (skroutzPrice, skroutzCommission, siteCommission, minSitePrice, customerSharePct, mgmtCostDiff = 0) => {
  const siteCostPct = siteCommission / 100;
  const skroutzCostPct = skroutzCommission / 100;
  const share = customerSharePct / 100;
  const D = mgmtCostDiff;

  const numerator = skroutzPrice * (1 - skroutzCostPct * share) + D * share;
  const denominator = 1 - (siteCostPct * share);
  const rawSitePrice = numerator / denominator;
  const sitePrice = roundUpToFirstDecimal(rawSitePrice);

  if (sitePrice < minSitePrice) return Math.round(roundUpToFirstDecimal(minSitePrice) * 100) / 100;
  return Math.round(sitePrice * 100) / 100;
};

const calcSiteProfit = (sitePrice, wholesale, recycleTax, shippingCost, config, TAX_RATE) => {
  const vat = TAX_RATE / 100;
  const mgmt = config.management_cost ?? 2;   // ✅
  const pkg = config.packaging_cost ?? 1;
  const commission = config.platform_commission ?? 20;
  const recycle = recycleTax ?? 0;
  const guaranteed = config.guaranteed_minimum_income ?? 3;
  const comm = commission / 100;

  const totalCost = wholesale + recycle + shippingCost + mgmt + pkg + guaranteed;
  const outputVAT = Math.round(sitePrice * vat / (1 + vat) * 100) / 100;
  const sitePriceExVAT = Math.round(sitePrice / (1 + vat) * 100) / 100;
  const commissionGross = Math.round(sitePrice * comm * 100) / 100;
  const vatOnCommission = Math.round(commissionGross * vat / (1 + vat) * 100) / 100;
  const netReceivedNoVAT = Math.round((sitePriceExVAT - commissionGross + vatOnCommission) * 100) / 100;
  const netReceived = Math.round(sitePrice * (1 - comm) * 100) / 100;
  const profit = Math.round((netReceivedNoVAT - totalCost) * 100) / 100;
  const profitPct = totalCost > 0 ? Math.round(profit / totalCost * 10000) / 100 : 0;

  return {
    profit,
    profitPct,
    breakdown: {
      wholesale: Math.round(wholesale * 100) / 100,
      recycleTax: Math.round(recycle * 100) / 100,
      shipping: Math.round(shippingCost * 100) / 100,
      management: Math.round(mgmt * 100) / 100,
      packaging: Math.round(pkg * 100) / 100,
      guaranteed: Math.round(guaranteed * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      outputVAT,
      commissionGross,
      vatOnCommission,
      netReceived,
      netReceivedNoVAT
    },
  };
};

const calcBreakEven = (wholesale, recycleTax, shippingCost, config, TAX_RATE) => {
  if (!config || !wholesale) return null;
  const vat = TAX_RATE / 100;
  const mgmt = config.management_cost ?? 2;
  const pkg = config.packaging_cost ?? 1;
  const commission = config.platform_commission ?? 20;
  const recycle = recycleTax ?? 0;
  const comm = commission / 100;

  const totalCost = wholesale + recycle + shippingCost + mgmt + pkg;

  // ✅ Ίδιος τύπος gross-up με calcPlatformPrice
  return Math.round(
    (totalCost * (1 + vat)) / (1 - (1 + vat) * comm) * 100
  ) / 100;
};

// ── Reusable row ──────────────────────────────────────────────
const BRow = ({ label, value, color = 'neutral600', bold, neg, border, suffix = '€' }) => (
  <Flex
    justifyContent="space-between"
    style={border ? { borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 4, marginTop: 4 } : {}}
  >
    <Typography variant="pi" textColor={color}>{label}</Typography>
    <Typography variant="pi" textColor={color} fontWeight={bold ? 'bold' : 'normal'}>
      {neg ? '-' : ''}{value?.toFixed(2)}{suffix}
    </Typography>
  </Flex>
);

// ── Platform Breakdown Card ───────────────────────────────────
const PlatformCard = ({ title, data, commission, bg = 'neutral100', tc = 'neutral700', taxRate }) => {
  if (!data) return null;
  return (
    <Box padding={3} background={bg} hasRadius>
      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
        <Typography variant="omega" fontWeight="bold" textColor={tc}>{title}</Typography>
        <Flex gap={2}>
          <Badge backgroundColor="neutral200" textColor="neutral700">{data.price.toFixed(2)}€</Badge>
          <Badge backgroundColor="success100" textColor="success700">+{data.profitPct?.toFixed(1)}% κέρδος</Badge>
        </Flex>
      </Flex>

      {/* Φάση 1: Σχηματισμός Τιμής */}
      <Typography variant="pi" textColor="neutral400" style={{ fontStyle: 'italic' }}>
        Φάση 1 — Σχηματισμός Τιμής Πώλησης
      </Typography>
      <BRow label="Χονδρική" value={data.breakdown.wholesale} color={tc} />
      {data.breakdown.recycleTax > 0 &&
        <BRow label="Ανακύκλωση" value={data.breakdown.recycleTax} color={tc} />}
      <BRow label="Μεταφορικά" value={data.breakdown.shipping} color={tc} />
      <BRow label="Διαχείριση" value={data.breakdown.management} color={tc} />
      <BRow label="Συσκευασία" value={data.breakdown.packaging} color={tc} />
      <BRow label="Εγγυημένο κέρδος" value={data.breakdown.guaranteed} color={tc} />
      <BRow label="= Βάση Κόστους" value={data.breakdown.baseCost} color={tc} bold />
      <BRow label="+ Κέρδος (margin %)" value={data.breakdown.profitAmount} color="success600" />
      <BRow label="= Τιμή χωρίς ΦΠΑ" value={data.breakdown.priceNoVAT} color={tc} />
      <BRow label={`+ ΦΠΑ ${taxRate}%`} value={data.breakdown.vatAmount} color={tc} />
      <BRow label="= Τιμή + ΦΠΑ (βάση gross-up)" value={data.breakdown.priceWithVAT} color="neutral400" />
      <BRow label={`Τιμή Πώλησης`} value={data.price} color={tc} bold border />

      {/* Φάση 2: Ανάλυση Εσόδων & ΦΠΑ */}
      <Box paddingTop={2}>
        <Typography variant="pi" textColor="neutral400" style={{ fontStyle: 'italic' }}>
          Φάση 2 — Έσοδα & Συμψηφισμός ΦΠΑ
        </Typography>
        <BRow label="Τιμή Πώλησης" value={data.price} color={tc} />
        <BRow label={`- Commission ${commission}% (καθαρή)`} value={data.breakdown.commissionAmount} color="danger600" neg />
        <BRow label={`- ΦΠΑ ${taxRate}% (→ εφορία)`} value={data.breakdown.outputVAT} color="danger600" neg />
        <BRow label="= Καθαρά Έσοδα" value={data.breakdown.netReceivedNoVAT} color={tc} bold border />
        <BRow label="- Βάση Κόστους" value={data.breakdown.baseCost} color={tc} neg />
        <BRow label="= Κέρδος €" value={data.profit} color="success700" bold border />
        <BRow label="= Κέρδος % επί κόστους" value={data.profitPct} suffix={%}></BRow>
      </Box>
    </Box>
  );
};

// ══════════════════════════════════════════════════════════════
const ProductStatsPanel = ({ product }) => {
  const { get } = useFetchClient();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    get(`/${pluginId}/settings`).then(({ data }) => setSettings(data)).catch(console.error);
  }, []);

  const stats = useMemo(() => {
    if (!product || !settings) return null;

    const TAX_RATE = settings.taxRate;
    const SHIPPING = settings.shippingPrice;
    const defaults = {
      commission: settings.commission,
      managementCost: settings.managementCost,
      profitMargin: settings.profitMargin,
      packagingCost: settings.packagingCost,
      guaranteedMinIncome: settings.guaranteedMinIncome,
    };

    const category = product.category;
    const customerSharePct = category?.customer_share_pct ?? settings.customerSharePct;
    const brandId = product.brand?.id;

    const skroutzConfig = getPlatformConfig(category, 'skroutz', brandId, defaults);
    const siteConfig = getPlatformConfig(category, 'general', brandId, defaults);
    const shopflixConfig = getPlatformConfig(category, 'shopflix', brandId, defaults);

    const suppliers = product.supplierInfo || [];
    const inStockSups = suppliers.filter(s => s.in_stock && parseFloat(s.wholesale) > 0);
    const minSupplier = inStockSups.length > 0
      ? inStockSups.reduce((p, c) => parseFloat(p.wholesale) < parseFloat(c.wholesale) ? p : c)
      : null;

    const wholesale = minSupplier ? parseFloat(minSupplier.wholesale) : null;
    const recycleTax = parseFloat(minSupplier?.recycle_tax) ?? 0;
    // shipping από τον supplier (ίδιο με backend: supplier?.shipping || GENERAL_SHIPPING_PRICE)
    const shippingCost = parseFloat(minSupplier?.shipping) ?? SHIPPING;

    const skroutz = wholesale ? calcPlatformPrice(wholesale, recycleTax, shippingCost, skroutzConfig, TAX_RATE) : null;
    const shopflix = wholesale ? calcPlatformPrice(wholesale, recycleTax, shippingCost, shopflixConfig, TAX_RATE) : null;

    const skroutzCommission = skroutzConfig?.platform_commission ?? defaults.commission;
    const siteCommission = siteConfig?.platform_commission ?? defaults.commission;
    const shopflixCommission = shopflixConfig?.platform_commission ?? defaults.commission;

    // Safety floor: wholesale + recycle + shipping + mgmt + pkg + guaranteed + ΦΠΑ (ίδιο με backend)
    const minSitePrice = wholesale
      ? (wholesale + recycleTax + shippingCost
        + (siteConfig?.management_cost ?? 2)
        + (siteConfig?.packaging_cost ?? 1)
        + (siteConfig?.guaranteed_minimum_income ?? 3)
      ) * (1 + TAX_RATE / 100)
      : null;

    // Διαφορά management+packaging costs: site vs skroutz
    // Χρησιμοποιείται για να μοιραστεί η ΠΡΑΓΜΑΤΙΚΗ εξοικονόμηση (ίδιο με backend)
    const mgmtCostDiff = wholesale
      ? (siteConfig.management_cost + siteConfig.packaging_cost) -
      (skroutzConfig.management_cost + skroutzConfig.packaging_cost)
      : 0;

    const sitePrice = skroutz && minSitePrice
      ? calcOptimalSitePrice(skroutz.price, skroutzCommission, siteCommission, minSitePrice, customerSharePct, mgmtCostDiff)
      : null;

    const siteStats = sitePrice && wholesale
      ? calcSiteProfit(sitePrice, wholesale, recycleTax, shippingCost, siteConfig, TAX_RATE)
      : null;

    const breakEvenSkroutz = wholesale ? calcBreakEven(wholesale, recycleTax, shippingCost, skroutzConfig, TAX_RATE) : null;
    const breakEvenSite = wholesale ? calcBreakEven(wholesale, recycleTax, shippingCost, siteConfig, TAX_RATE) : null;
    const breakEvenShopflix = wholesale ? calcBreakEven(wholesale, recycleTax, shippingCost, shopflixConfig, TAX_RATE) : null;

    const skroutzPlatform = product.platforms?.find(p => p.platform === 'Skroutz');
    const shopflixPlatform = product.platforms?.find(p => p.platform === 'Shopflix');

    return {
      TAX_RATE, wholesale, recycleTax, shippingCost, minSupplier, inStockSups, suppliers,
      skroutz, shopflix, sitePrice, siteStats,
      skroutzCommission, siteCommission, shopflixCommission,
      customerSharePct, skroutzPlatform, shopflixPlatform,
      discount: skroutz && sitePrice ? Math.round((skroutz.price - sitePrice) / skroutz.price * 10000) / 100 : null,
      discountEuros: skroutz && sitePrice ? Math.round((skroutz.price - sitePrice) * 100) / 100 : null,
      extraProfit: skroutz && siteStats ? Math.round((siteStats.profit - skroutz.profit) * 100) / 100 : null,
      breakEvenSkroutz, breakEvenSite, breakEvenShopflix,
    };
  }, [product, settings]);

  if (!product) return null;

  if (!settings) return (
    <Box padding={6} background="neutral0" hasRadius shadow="tableShadow">
      <Flex justifyContent="center"><Loader>Φόρτωση ρυθμίσεων...</Loader></Flex>
    </Box>
  );

  if (!stats) return null;

  return (
    <Box padding={6} background="neutral0" hasRadius shadow="tableShadow">
      <Stack spacing={4}>

        <Typography variant="beta" as="h2">📊 Στατιστικά</Typography>

        <Divider />

        {/* ── Suppliers ─────────────────────────────────────── */}
        <Stack spacing={2}>
          <Typography variant="sigma" textColor="neutral800">Προμηθευτές</Typography>

          {stats.suppliers.length === 0 ? (
            <Alert variant="warning" title="Κανένας προμηθευτής" />
          ) : (
            stats.suppliers.map((s, i) => (
              <Box key={i} padding={3} background="neutral100" hasRadius>
                <Flex justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="omega" fontWeight="semiBold" textColor="neutral800">{s.name}</Typography>
                    <Typography variant="pi" textColor="neutral500">Κωδικός: {s.supplierProductId || '—'}</Typography>
                  </Box>
                  <Box style={{ textAlign: 'right' }}>
                    <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                      {parseFloat(s.wholesale).toFixed(2)}€
                    </Typography>
                    <Badge
                      backgroundColor={s.in_stock ? 'success200' : 'danger200'}
                      textColor={s.in_stock ? 'success700' : 'danger700'}
                    >
                      {s.in_stock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </Box>
                </Flex>
              </Box>
            ))
          )}

          {stats.minSupplier && (
            <Box padding={3} background="success100" hasRadius>
              <Flex justifyContent="space-between">
                <Typography variant="pi" textColor="success700" fontWeight="bold">Φθηνότερος in-stock</Typography>
                <Typography variant="pi" textColor="success700" fontWeight="bold">
                  {stats.minSupplier.name} — {parseFloat(stats.minSupplier.wholesale).toFixed(2)}€
                  {stats.recycleTax > 0 && ` (+${stats.recycleTax.toFixed(2)}€ ανακύκλωση)`}
                  {' | Μεταφορικά: '}{stats.shippingCost.toFixed(2)}€
                </Typography>
              </Flex>
            </Box>
          )}
        </Stack>

        <Divider />

        {/* ── Τρέχουσες Τιμές ───────────────────────────────── */}
        <Stack spacing={2}>
          <Typography variant="sigma" textColor="neutral800">Τρέχουσες Τιμές</Typography>

          {[
            { label: 'Skroutz', platform: stats.skroutzPlatform },
            { label: 'Shopflix', platform: stats.shopflixPlatform },
          ].map(({ label, platform }) => platform ? (
            <Box key={label} padding={3} background="neutral100" hasRadius>
              <Flex justifyContent="space-between" alignItems="center">
                <Typography variant="omega" textColor="neutral700">{label}</Typography>
                <Box style={{ textAlign: 'right' }}>
                  <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                    {parseFloat(platform.price).toFixed(2)}€
                  </Typography>
                  {platform.is_fixed_price && <Typography variant="pi" textColor="primary600">Fixed</Typography>}
                </Box>
              </Flex>
            </Box>
          ) : null)}

          {!stats.skroutzPlatform && !stats.shopflixPlatform && (
            <Typography variant="pi" textColor="neutral500">Δεν υπάρχουν καταχωρημένες πλατφόρμες</Typography>
          )}
        </Stack>

        <Divider />

        {/* ── Υπολογισμοί ───────────────────────────────────── */}
        {!stats.wholesale ? (
          <Alert variant="warning" title="Δεν υπάρχει διαθέσιμη χονδρική">
            Δεν βρέθηκε in-stock supplier
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Typography variant="sigma" textColor="neutral800">
              Υπολογισμοί (ΦΠΑ: {stats.TAX_RATE}%)
            </Typography>

            <PlatformCard
              title="Skroutz (υπολογισμένο)"
              data={stats.skroutz}
              commission={stats.skroutzCommission}
              taxRate={stats.TAX_RATE}
            />

            <PlatformCard
              title="Shopflix (υπολογισμένο)"
              data={stats.shopflix}
              commission={stats.shopflixCommission}
              taxRate={stats.TAX_RATE}
            />

            {/* Site */}
            {stats.sitePrice && stats.siteStats && (
              <Box padding={3} background="success100" hasRadius>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                  <Typography variant="omega" fontWeight="bold" textColor="success700">Site (βέλτιστο)</Typography>
                  <Flex gap={2}>
                    <Badge backgroundColor="success200" textColor="success700">{stats.sitePrice.toFixed(2)}€</Badge>
                    <Badge backgroundColor="success100" textColor="success700">+{stats.siteStats.profitPct?.toFixed(1)}% κέρδος</Badge>
                  </Flex>
                </Flex>

                <BRow label="Χονδρική" value={stats.siteStats.breakdown.wholesale} color="success600" />
                {stats.siteStats.breakdown.recycleTax > 0 &&
                  <BRow label="Ανακύκλωση" value={stats.siteStats.breakdown.recycleTax} color="success600" />}
                <BRow label="Μεταφορικά" value={stats.siteStats.breakdown.shipping} color="success600" />
                <BRow label="Διαχείριση" value={stats.siteStats.breakdown.management} color="success600" />
                <BRow label="Συσκευασία" value={stats.siteStats.breakdown.packaging} color="success600" />
                <BRow label="Εγγυημένο κέρδος" value={stats.siteStats.breakdown.guaranteed} color="success600" />
                <BRow label="= Κόστος" value={stats.siteStats.breakdown.totalCost} color="success700" bold />
                <Box paddingTop={2} paddingBottom={1}>
                  <Typography variant="pi" textColor="success400" style={{ fontStyle: 'italic' }}>Συμψηφισμός ΦΠΑ</Typography>
                </Box>
                <BRow label="Τιμή Πώλησης" value={stats.sitePrice} color="success600" />
                <BRow label={`- ΦΠΑ ${stats.TAX_RATE}% εξερχόμενο (→ εφορία)`} value={stats.siteStats.breakdown.outputVAT} color="danger600" neg />
                <BRow label="= Τιμή εκτός ΦΠΑ" value={stats.siteStats.breakdown.netReceivedNoVAT + stats.siteStats.breakdown.commissionGross - stats.siteStats.breakdown.vatOnCommission} color="success600" />
                <BRow label={`- Commission (${stats.siteCommission}%)`} value={stats.siteStats.breakdown.commissionGross} color="danger600" neg />
                <BRow label="+ ΦΠΑ Commission (συμψηφισμός)" value={stats.siteStats.breakdown.vatOnCommission} color="success500" />
                <BRow label="= Καθαρά Έσοδα εκτός ΦΠΑ" value={stats.siteStats.breakdown.netReceivedNoVAT} color="success700" bold border />
                <BRow label="- Κόστος" value={stats.siteStats.breakdown.totalCost} color="success600" neg />
                <BRow label="= Κέρδος €" value={stats.siteStats.profit} color="success700" bold border />
                <BRow label="= Κέρδος % επί κόστους" value={stats.siteStats.profitPct} color="success700" bold suffix="%" />
              </Box>
            )}

            {/* Summary */}
            {stats.discount !== null && (
              <Box padding={3} background="primary100" hasRadius>
                <Flex justifyContent="space-between">
                  <Typography variant="pi" textColor="primary700">Έκπτωση vs Skroutz</Typography>
                  <Typography variant="pi" fontWeight="bold" textColor="primary700">
                    -{stats.discount.toFixed(2)}% ({stats.discountEuros.toFixed(2)}€)
                  </Typography>
                </Flex>
                <Flex justifyContent="space-between">
                  <Typography variant="pi" textColor="primary700">Extra κέρδος site</Typography>
                  <Typography variant="pi" fontWeight="bold" textColor={stats.extraProfit >= 0 ? 'success700' : 'danger700'}>
                    {stats.extraProfit >= 0 ? '+' : ''}{stats.extraProfit.toFixed(2)}€
                  </Typography>
                </Flex>
                <Flex justifyContent="space-between">
                  <Typography variant="pi" textColor="primary700">Customer Share</Typography>
                  <Typography variant="pi" fontWeight="bold" textColor="primary700">{stats.customerSharePct}%</Typography>
                </Flex>
              </Box>
            )}
          </Stack>
        )}

        <Divider />

        {/* ── Break-even ────────────────────────────────────── */}
        <Stack spacing={2}>
          <Typography variant="sigma" textColor="neutral800">🔴 Break-even (Κέρδος = 0€)</Typography>
          <Typography variant="pi" textColor="neutral500">Κατώτατη τιμή πώλησης για να μην έχεις ζημία</Typography>

          {[
            { label: 'Skroutz', value: stats.breakEvenSkroutz, current: stats.skroutzPlatform ? parseFloat(stats.skroutzPlatform.price) : null },
            { label: 'Site', value: stats.breakEvenSite, current: stats.sitePrice },
            { label: 'Shopflix', value: stats.breakEvenShopflix, current: stats.shopflixPlatform ? parseFloat(stats.shopflixPlatform.price) : null },
          ].map(({ label, value, current }) => (
            <Flex key={label} justifyContent="space-between" alignItems="center"
              padding={3} background="danger100" style={{ borderRadius: 4 }}
            >
              <Typography variant="omega" textColor="danger700">{label}</Typography>
              <Box style={{ textAlign: 'right' }}>
                {value ? (
                  <>
                    <Typography variant="omega" fontWeight="bold" textColor="danger700">
                      {value.toFixed(2)}€
                    </Typography>
                    {current !== null && (
                      <Typography variant="pi" textColor={current > value ? 'success600' : 'danger600'}>
                        {current > value
                          ? `+${(current - value).toFixed(2)}€ περιθώριο`
                          : `${(current - value).toFixed(2)}€ κάτω από όριο!`
                        }
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography variant="pi" textColor="neutral500">—</Typography>
                )}
              </Box>
            </Flex>
          ))}
        </Stack>

      </Stack>
    </Box>
  );
};

export default ProductStatsPanel;