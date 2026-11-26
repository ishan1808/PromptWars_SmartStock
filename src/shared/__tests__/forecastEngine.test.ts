import { describe, expect, it } from 'vitest';
import {
  analyzePortfolio,
  analyzeSku,
  computeForecastSeries,
  DEFAULT_SCENARIO,
  normalQuantile,
} from '../forecastEngine.ts';
import { SAMPLE_DATASETS } from '../sampleData.ts';
import type { MonthlySale, SkuItem } from '../types.ts';

function makeSku(overrides: Partial<SkuItem> = {}): SkuItem {
  const baseMonths: MonthlySale[] = [
    { month: '2025-12', units: 100 },
    { month: '2026-01', units: 102 },
    { month: '2026-02', units: 98 },
    { month: '2026-03', units: 101 },
    { month: '2026-04', units: 99 },
    { month: '2026-05', units: 100 },
    { month: '2026-06', units: 103 },
    { month: '2026-07', units: 97 },
    { month: '2026-08', units: 101 },
    { month: '2026-09', units: 100 },
    { month: '2026-10', units: 102 },
    { month: '2026-11', units: 100 },
  ];

  return {
    id: 'sku-test-1',
    skuCode: 'TEST-01',
    name: 'Test Basmati Rice (5kg)',
    category: 'Rice and Grains',
    supplier: 'Test Agro Mills',
    unitCost: 400,
    unitPrice: 520,
    holdingCostRate: 0.22,
    orderFixedCost: 300,
    currentStock: 120,
    incomingStock: 0,
    leadTimeDays: 7,
    leadTimeStdDays: 2,
    minOrderQty: 20,
    serviceLevelTarget: 0.95,
    monthlySales: baseMonths,
    ...overrides,
  };
}

describe('SmartStock Forecast Engine', () => {
  describe('Demand Forecasting Logic', () => {
    it('handles empty monthly sales safely and returns valid zeroed forecast points', () => {
      const sku = makeSku({ monthlySales: [] });
      const res = computeForecastSeries(sku, 1.0, 6);

      expect(res.avgMonthlyDemand).toBe(0);
      expect(res.seasonalStrength).toBe(0);
      expect(res.peakMonthLabel).toBe('N/A');
      expect(res.troughMonthLabel).toBe('N/A');
      expect(res.series).toHaveLength(6);
      expect(res.series.every((pt) => pt.isForecast && pt.p50 === 0 && pt.p10 === 0 && pt.p90 === 0)).toBe(true);
    });

    it('produces ordered probabilistic bounds (0 <= p10 <= p50 <= p90) for custom horizons', () => {
      const sku = makeSku();
      const res3 = computeForecastSeries(sku, 1.0, 3);
      const res6 = computeForecastSeries(sku, 1.0, 6);

      const forecast3 = res3.series.filter((pt) => pt.isForecast);
      const forecast6 = res6.series.filter((pt) => pt.isForecast);

      expect(forecast3).toHaveLength(3);
      expect(forecast6).toHaveLength(6);
      expect(res6.series.filter((pt) => !pt.isForecast)).toHaveLength(12);

      for (const pt of res6.series) {
        expect(pt.p10).toBeGreaterThanOrEqual(0);
        expect(pt.p10).toBeLessThanOrEqual(pt.p50);
        expect(pt.p50).toBeLessThanOrEqual(pt.p90);
      }
    });

    it('captures upward demand trends and widens uncertainty intervals across longer horizons', () => {
      // 24 months of consistent YoY demand growth avoids confounding seasonality with trend
      const growingSales: MonthlySale[] = Array.from({ length: 24 }, (_, idx) => {
        const year = 2025 + Math.floor(idx / 12);
        const monthNum = (idx % 12) + 1;
        return {
          month: `${year}-${String(monthNum).padStart(2, '0')}`,
          units: 60 + idx * 8,
        };
      });
      const sku = makeSku({ monthlySales: growingSales });
      const res = computeForecastSeries(sku, 1.0, 6);
      const future = res.series.filter((pt) => pt.isForecast);
      const futureSum = future.reduce((acc, pt) => acc + pt.p50, 0);

      expect(future[0].p50).toBeGreaterThan(res.avgMonthlyDemand);
      expect(future[0].p50).toBeGreaterThan(growingSales[12].units);
      expect(futureSum).toBeGreaterThan(res.avgMonthlyDemand * 6);
      const spreadH1 = future[0].p90 - future[0].p10;
      const spreadH6 = future[5].p90 - future[5].p10;
      expect(spreadH6).toBeGreaterThan(spreadH1);
    });
  });

  describe('Seasonal Trend Calculation & Volatility Classification', () => {
    it('identifies seasonal peak/trough months and distinguishes seasonal vs steady demand', () => {
      const summerSales: MonthlySale[] = [
        { month: '2025-12', units: 60 },
        { month: '2026-01', units: 65 },
        { month: '2026-02', units: 80 },
        { month: '2026-03', units: 125 },
        { month: '2026-04', units: 165 },
        { month: '2026-05', units: 195 },
        { month: '2026-06', units: 150 },
        { month: '2026-07', units: 100 },
        { month: '2026-08', units: 90 },
        { month: '2026-09', units: 85 },
        { month: '2026-10', units: 70 },
        { month: '2026-11', units: 62 },
      ];

      const seasonalRes = computeForecastSeries(makeSku({ monthlySales: summerSales }));
      const flatRes = computeForecastSeries(makeSku());

      expect(seasonalRes.peakMonthLabel).toBe('May');
      expect(seasonalRes.troughMonthLabel).toBe('Dec');
      expect(seasonalRes.seasonalStrength).toBeGreaterThan(0.5);
      expect(flatRes.seasonalStrength).toBeLessThan(0.1);

      const meanIndex =
        seasonalRes.series
          .filter((p) => !p.isForecast)
          .reduce((acc, p) => acc + p.seasonalIndex, 0) / 12;
      expect(meanIndex).toBeCloseTo(1.0, 1);
    });

    it('down-weights promo spikes when estimating baseline seasonal indices', () => {
      const baseSales: MonthlySale[] = [
        { month: '2025-12', units: 100 },
        { month: '2026-01', units: 100 },
        { month: '2026-02', units: 100 },
        { month: '2026-03', units: 100 },
        { month: '2026-04', units: 100 },
        { month: '2026-05', units: 100 },
        { month: '2026-06', units: 100 },
        { month: '2026-07', units: 100 },
        { month: '2026-08', units: 100 },
        { month: '2026-09', units: 100 },
        { month: '2026-10', units: 220, promo: false },
        { month: '2026-11', units: 100 },
      ];
      const promoSales = baseSales.map((s) =>
        s.month === '2026-10' ? { ...s, promo: true } : s
      );

      const nonPromoOct = computeForecastSeries(makeSku({ monthlySales: baseSales })).series.find(
        (p) => p.month === '2026-10'
      )?.seasonalIndex;
      const promoOct = computeForecastSeries(makeSku({ monthlySales: promoSales })).series.find(
        (p) => p.month === '2026-10'
      )?.seasonalIndex;

      expect(nonPromoOct).toBeDefined();
      expect(promoOct).toBeDefined();
      expect(promoOct!).toBeLessThan(nonPromoOct!);
    });

    it('assigns XYZ demand volatility classes based on Coefficient of Variation (CV)', () => {
      const steady = analyzeSku(makeSku());
      const erraticSales: MonthlySale[] = [
        { month: '2025-12', units: 30 },
        { month: '2026-01', units: 240 },
        { month: '2026-02', units: 45 },
        { month: '2026-03', units: 210 },
        { month: '2026-04', units: 20 },
        { month: '2026-05', units: 190 },
      ];
      const volatile = analyzeSku(makeSku({ monthlySales: erraticSales }));

      expect(steady.xyzClass).toBe('X');
      expect(steady.coefficientOfVariation).toBeLessThan(0.2);
      expect(volatile.xyzClass).toBe('Z');
      expect(volatile.coefficientOfVariation).toBeGreaterThanOrEqual(0.42);
    });
  });

  describe('Reorder-Point, Safety Stock & Stock Status Detection', () => {
    it('detects Critical Stockout when on-hand stock falls below safety stock or lead-time cover', () => {
      const criticalSku = makeSku({
        currentStock: 8,
        incomingStock: 0,
        leadTimeDays: 10,
        minOrderQty: 25,
      });

      const analytics = analyzeSku(criticalSku, DEFAULT_SCENARIO);

      expect(analytics.status).toBe('Critical Stockout');
      expect(analytics.daysOfSupply).toBeLessThanOrEqual(analytics.effectiveLeadTimeDays);
      expect(analytics.recommendedOrderQty).toBeGreaterThanOrEqual(
        Math.max(analytics.eoq, criticalSku.minOrderQty)
      );
      expect(analytics.recommendedOrderCost).toBeCloseTo(
        analytics.recommendedOrderQty * criticalSku.unitCost,
        2
      );
    });

    it('detects Reorder Now when inventory position crosses ROP without immediate critical breach', () => {
      const baselineProbe = analyzeSku(makeSku({ currentStock: 80, leadTimeDays: 12 }), DEFAULT_SCENARIO);
      // Set on-hand right at ROP so inventoryPosition <= reorderPoint while cover > leadTimeDays & stockout risk < 30%
      const reorderSku = makeSku({
        currentStock: baselineProbe.reorderPoint,
        incomingStock: 0,
        leadTimeDays: 12,
        leadTimeStdDays: 2,
      });

      const analytics = analyzeSku(reorderSku, DEFAULT_SCENARIO);

      expect(analytics.inventoryPosition).toBeLessThanOrEqual(analytics.reorderPoint);
      expect(analytics.status).toBe('Reorder Now');
      expect(analytics.recommendedOrderQty).toBeGreaterThan(0);
    });

    it('credits incoming stock in inventory position and suppresses redundant reorders', () => {
      const lowOnHandNoPo = analyzeSku(
        makeSku({ currentStock: 20, incomingStock: 0, leadTimeDays: 7 }),
        DEFAULT_SCENARIO
      );
      const lowOnHandWithPo = analyzeSku(
        makeSku({ currentStock: 20, incomingStock: 140, leadTimeDays: 7 }),
        DEFAULT_SCENARIO
      );

      expect(lowOnHandNoPo.recommendedOrderQty).toBeGreaterThan(0);
      expect(lowOnHandWithPo.inventoryPosition).toBe(160);
      expect(lowOnHandWithPo.inventoryPosition).toBeGreaterThan(lowOnHandWithPo.reorderPoint);
      expect(lowOnHandWithPo.recommendedOrderQty).toBe(0);
    });

    it('identifies Overstock with trapped capital and ranks portfolio ABC classes accurately', () => {
      const topItem1 = makeSku({
        id: 'a-item-1',
        skuCode: 'A-01',
        unitCost: 260,
        unitPrice: 360,
        currentStock: 100,
      });
      const topItem2 = makeSku({
        id: 'a-item-2',
        skuCode: 'A-02',
        unitCost: 240,
        unitPrice: 340,
        currentStock: 100,
      });
      const midItem = makeSku({
        id: 'b-item',
        skuCode: 'B-01',
        unitCost: 140,
        unitPrice: 200,
        currentStock: 100,
      });
      const overstockLowRev = makeSku({
        id: 'c-overstock',
        skuCode: 'C-01',
        unitCost: 60,
        unitPrice: 100,
        currentStock: 900,
      });

      const { items, summary } = analyzePortfolio(
        [overstockLowRev, topItem1, midItem, topItem2],
        DEFAULT_SCENARIO
      );
      const overstocked = items.find((i) => i.sku.id === 'c-overstock')!;
      const topRevenue = items.find((i) => i.sku.id === 'a-item-1')!;
      const midRevenue = items.find((i) => i.sku.id === 'b-item')!;

      expect(overstocked.status).toBe('Overstock');
      expect(overstocked.daysOfSupply).toBeGreaterThan(105);
      expect(overstocked.trappedCapital).toBeGreaterThan(0);
      expect(topRevenue.abcClass).toBe('A');
      expect(midRevenue.abcClass).toBe('B');
      expect(overstocked.abcClass).toBe('C');
      expect(summary.overstockCount).toBe(1);
      expect(summary.totalTrappedCapital).toBe(overstocked.trappedCapital);

      // Verify full bundled Indian grocery dataset analyzes cleanly
      const bundled = analyzePortfolio(SAMPLE_DATASETS[0].skus, DEFAULT_SCENARIO);
      expect(bundled.items.length).toBeGreaterThan(100);
      expect(Number.isFinite(bundled.summary.totalInventoryValue)).toBe(true);
      expect(bundled.summary.totalInventoryValue).toBeGreaterThan(0);
    });
  });

  describe('Scenario Modeling & Uncertainty Stress Tests', () => {
    it('scales forecasted P50 demand, ROP, and reorder spend under demand surge scenarios', () => {
      const sku = makeSku({ currentStock: 35, leadTimeDays: 10 });
      const baseline = analyzeSku(sku, DEFAULT_SCENARIO);
      const surge = analyzeSku(sku, {
        ...DEFAULT_SCENARIO,
        demandMultiplier: 1.5,
      });

      expect(surge.nextMonthForecast).toBeGreaterThan(baseline.nextMonthForecast);
      expect(surge.reorderPoint).toBeGreaterThan(baseline.reorderPoint);
      expect(surge.recommendedOrderCost).toBeGreaterThanOrEqual(baseline.recommendedOrderCost);
    });

    it('increases safety stock and ROP under lead-time delays, volatility shocks, and stricter service levels', () => {
      const sku = makeSku({ currentStock: 80, leadTimeDays: 7, leadTimeStdDays: 2, serviceLevelTarget: 0.9 });
      const baseline = analyzeSku(sku, DEFAULT_SCENARIO);
      const delayShock = analyzeSku(sku, {
        ...DEFAULT_SCENARIO,
        leadTimeShockDays: 10,
        leadTimeVolatilityMultiplier: 2.0,
      });
      const highService = analyzeSku(sku, {
        ...DEFAULT_SCENARIO,
        serviceLevelOverride: 0.99,
      });

      expect(delayShock.effectiveLeadTimeDays).toBe(17);
      expect(delayShock.safetyStock).toBeGreaterThan(baseline.safetyStock);
      expect(delayShock.reorderPoint).toBeGreaterThan(baseline.reorderPoint);
      expect(normalQuantile(0.99)).toBeGreaterThan(normalQuantile(0.9));
      expect(highService.safetyStock).toBeGreaterThan(baseline.safetyStock);
    });
  });
});
