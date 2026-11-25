import type {
  AbcClass,
  ForecastPoint,
  PortfolioSummary,
  ScenarioParams,
  SkuAnalytics,
  SkuItem,
  StockStatus,
  XyzClass,
} from './types.ts';

export const DEFAULT_SCENARIO: ScenarioParams = {
  demandMultiplier: 1.0,
  leadTimeShockDays: 0,
  leadTimeVolatilityMultiplier: 1.0,
  serviceLevelOverride: null,
  budgetCap: null,
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return yyyyMm;
  return `${MONTH_NAMES[m - 1]} '${String(y).slice(-2)}`;
}

export function addMonths(yyyyMm: string, offset: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + offset, 1));
  const ny = date.getUTCFullYear();
  const nm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

/**
 * Inverse standard normal CDF (Acklam's rational approximation).
 */
export function normalQuantile(p: number): number {
  const clamped = Math.min(0.9995, Math.max(0.5, p));
  if (clamped === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416,
  ];

  const pHigh = 1 - 0.02425;
  if (clamped <= pHigh) {
    const q = clamped - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - clamped));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 7.1.26).
 */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t) *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function getMonthNumber(yyyyMm: string): number {
  const parts = yyyyMm.split('-');
  const m = Number(parts[1]);
  return m >= 1 && m <= 12 ? m - 1 : 0; // 0..11
}

/**
 * Computes seasonal decomposition, damped Holt trend, and P10/P50/P90 probabilistic
 * demand projections over a 6-month forward horizon.
 */
export function computeForecastSeries(
  sku: SkuItem,
  demandMultiplier = 1.0,
  horizonMonths = 6
): {
  series: ForecastPoint[];
  avgMonthlyDemand: number;
  residualStd: number;
  seasonalStrength: number;
  peakMonthLabel: string;
  troughMonthLabel: string;
  coefficientOfVariation: number;
} {
  const sales = [...sku.monthlySales].sort((a, b) => a.month.localeCompare(b.month));
  const n = sales.length;

  if (n === 0) {
    const fallbackMonth = '2026-12';
    const emptySeries: ForecastPoint[] = Array.from({ length: horizonMonths }, (_, i) => {
      const m = addMonths(fallbackMonth, i + 1);
      return {
        month: m,
        label: formatMonthLabel(m),
        p50: 0,
        p10: 0,
        p90: 0,
        seasonalIndex: 1,
        isForecast: true,
      };
    });
    return {
      series: emptySeries,
      avgMonthlyDemand: 0,
      residualStd: 1,
      seasonalStrength: 0,
      peakMonthLabel: 'N/A',
      troughMonthLabel: 'N/A',
      coefficientOfVariation: 0,
    };
  }

  const values = sales.map((s) => Math.max(0, s.units));
  const mean = values.reduce((acc, v) => acc + v, 0) / n;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / Math.max(1, n - 1);
  const rawStd = Math.sqrt(variance);
  const cv = mean > 0 ? rawStd / mean : 0;

  // Estimate 12-month seasonal indices with shrinkage when < 24 observations
  const monthBuckets: number[][] = Array.from({ length: 12 }, () => []);
  sales.forEach((s) => {
    const idx = getMonthNumber(s.month);
    // Down-weight promo spikes slightly when estimating baseline seasonality
    const adjusted = s.promo ? s.units * 0.85 : s.units;
    monthBuckets[idx].push(adjusted);
  });

  const rawSeasonal = Array.from({ length: 12 }, (_, m) => {
    const bucket = monthBuckets[m];
    if (bucket.length === 0 || mean <= 0) return 1.0;
    const bucketAvg = bucket.reduce((a, b) => a + b, 0) / bucket.length;
    // Shrink toward 1.0 based on sample size
    const shrinkage = Math.min(0.85, bucket.length / (bucket.length + 0.6));
    const ratio = bucketAvg / mean;
    return Math.max(0.45, Math.min(2.2, 1.0 + shrinkage * (ratio - 1.0)));
  });

  // Normalize seasonal indices so average is 1.0
  const seasonalMean = rawSeasonal.reduce((a, b) => a + b, 0) / 12;
  const seasonalIndices = rawSeasonal.map((s) => s / (seasonalMean || 1));

  // Deseasonalize historical series
  const deseasonalized = sales.map((s) => {
    const mIdx = getMonthNumber(s.month);
    return s.units / (seasonalIndices[mIdx] || 1);
  });

  // Damped Holt exponential smoothing on deseasonalized series
  const alpha = 0.38;
  const beta = 0.16;
  const phi = 0.86; // damping factor prevents runaway trend extrapolation

  let level = deseasonalized[0];
  let trend =
    n >= 3 ? (deseasonalized[Math.min(2, n - 1)] - deseasonalized[0]) / Math.min(2, n - 1) : 0;

  const fitted: number[] = [];
  const residuals: number[] = [];

  for (let t = 0; t < n; t++) {
    const mIdx = getMonthNumber(sales[t].month);
    const sIdx = seasonalIndices[mIdx] || 1;
    const oneStepForecast = Math.max(0, (level + phi * trend) * sIdx);
    fitted.push(oneStepForecast);
    residuals.push(sales[t].units - oneStepForecast);

    const prevLevel = level;
    level = alpha * deseasonalized[t] + (1 - alpha) * (level + phi * trend);
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
  }

  // Empirical residual std (bounded below by Poisson floor)
  const sqErr = residuals.slice(Math.min(2, n - 1)).reduce((acc, r) => acc + r * r, 0);
  const denom = Math.max(1, residuals.length - Math.min(2, n - 1));
  const empiricalStd = Math.sqrt(sqErr / denom);
  const residualStd = Math.max(Math.sqrt(Math.max(1, mean)), empiricalStd);

  const z80 = 1.2816; // P10 / P90 (80% prediction interval)
  const historyPoints: ForecastPoint[] = sales.map((s, idx) => {
    const mIdx = getMonthNumber(s.month);
    const baseFit = Math.max(0, Math.round(fitted[idx]));
    return {
      month: s.month,
      label: formatMonthLabel(s.month),
      actual: s.units,
      p50: baseFit,
      p10: Math.max(0, Math.round(baseFit - z80 * residualStd * 0.7)),
      p90: Math.round(baseFit + z80 * residualStd * 0.7),
      seasonalIndex: Number(seasonalIndices[mIdx].toFixed(2)),
      isForecast: false,
    };
  });

  const lastMonth = sales[n - 1].month;
  const forecastPoints: ForecastPoint[] = [];
  let phiSum = 0;

  for (let h = 1; h <= horizonMonths; h++) {
    phiSum += Math.pow(phi, h);
    const fMonth = addMonths(lastMonth, h);
    const mIdx = getMonthNumber(fMonth);
    const sIdx = seasonalIndices[mIdx] || 1;

    const baseLevelTrend = Math.max(mean * 0.25, level + phiSum * trend);
    const expected = Math.max(0, baseLevelTrend * sIdx * demandMultiplier);
    // Uncertainty grows with sqrt(h) and scales with demand scenario multiplier
    const horizonSigma = residualStd * Math.sqrt(1 + (h - 1) * 0.35) * sIdx * Math.max(1, demandMultiplier);

    forecastPoints.push({
      month: fMonth,
      label: formatMonthLabel(fMonth),
      p50: Math.round(expected),
      p10: Math.max(0, Math.round(expected - z80 * horizonSigma)),
      p90: Math.round(expected + z80 * horizonSigma),
      seasonalIndex: Number(sIdx.toFixed(2)),
      isForecast: true,
    });
  }

  // Seasonal strength (0..1)
  const sMax = Math.max(...seasonalIndices);
  const sMin = Math.min(...seasonalIndices);
  const seasonalStrength = Math.min(1, Number(((sMax - sMin) / 1.2).toFixed(2)));

  const peakIdx = seasonalIndices.indexOf(sMax);
  const troughIdx = seasonalIndices.indexOf(sMin);

  return {
    series: [...historyPoints, ...forecastPoints],
    avgMonthlyDemand: Math.round(mean),
    residualStd,
    seasonalStrength,
    peakMonthLabel: MONTH_NAMES[peakIdx] ?? 'N/A',
    troughMonthLabel: MONTH_NAMES[troughIdx] ?? 'N/A',
    coefficientOfVariation: Number(cv.toFixed(2)),
  };
}

export function analyzeSku(
  sku: SkuItem,
  scenario: ScenarioParams = DEFAULT_SCENARIO
): SkuAnalytics {
  const {
    series,
    avgMonthlyDemand,
    residualStd,
    seasonalStrength,
    peakMonthLabel,
    troughMonthLabel,
    coefficientOfVariation,
  } = computeForecastSeries(sku, scenario.demandMultiplier, 6);

  const futurePoints = series.filter((pt) => pt.isForecast);
  const nextMonthForecast = futurePoints[0]?.p50 ?? Math.round(avgMonthlyDemand * scenario.demandMultiplier);
  const next3MonthsForecast = futurePoints
    .slice(0, 3)
    .reduce((acc, pt) => acc + pt.p50, 0);

  // Use weighted blend of next 2 forecast months for near-term replenishment velocity
  const nearTermMonthlyRate =
    futurePoints.length >= 2
      ? futurePoints[0].p50 * 0.6 + futurePoints[1].p50 * 0.4
      : nextMonthForecast;

  const dailyDemandMean = Math.max(0.05, nearTermMonthlyRate / 30);
  const dailyDemandStd = Math.max(
    0.05,
    (residualStd * Math.max(1, scenario.demandMultiplier)) / Math.sqrt(30)
  );

  const effectiveLeadTimeDays = Math.max(1, sku.leadTimeDays + scenario.leadTimeShockDays);
  const effectiveLeadTimeStdDays = Math.max(
    0.25,
    sku.leadTimeStdDays * scenario.leadTimeVolatilityMultiplier
  );

  const targetSL = scenario.serviceLevelOverride ?? sku.serviceLevelTarget;
  const z = normalQuantile(targetSL);

  // Joint demand + lead-time uncertainty formula
  const ltdMean = dailyDemandMean * effectiveLeadTimeDays;
  const ltdStd = Math.sqrt(
    effectiveLeadTimeDays * dailyDemandStd ** 2 +
      dailyDemandMean ** 2 * effectiveLeadTimeStdDays ** 2
  );

  const safetyStock = Math.max(1, Math.ceil(z * ltdStd));
  const reorderPoint = Math.ceil(ltdMean + safetyStock);

  const annualDemand = Math.max(12, nearTermMonthlyRate * 12);
  const annualHoldingCostPerUnit = Math.max(0.25, sku.unitCost * sku.holdingCostRate);
  const rawEoq = Math.sqrt((2 * annualDemand * sku.orderFixedCost) / annualHoldingCostPerUnit);
  const eoq = Math.max(sku.minOrderQty, Math.ceil(rawEoq));

  const inventoryPosition = sku.currentStock + sku.incomingStock;

  let recommendedOrderQty = 0;
  if (inventoryPosition <= reorderPoint) {
    // Cover reorder deficit + economic batch, respecting minimum order quantity floor
    const targetUpTo = reorderPoint + Math.max(eoq, Math.ceil(dailyDemandMean * 21));
    const needed = Math.max(sku.minOrderQty, targetUpTo - inventoryPosition);
    recommendedOrderQty = Math.max(eoq, needed);
  }

  const recommendedOrderCost = Number((recommendedOrderQty * sku.unitCost).toFixed(2));
  const stockoutZ = (inventoryPosition - ltdMean) / Math.max(0.1, ltdStd);
  const stockoutProbability = Number((1 - normalCdf(stockoutZ)).toFixed(3));
  const daysOfSupply = Math.round(sku.currentStock / dailyDemandMean);
  const inventoryValue = Number((sku.currentStock * sku.unitCost).toFixed(2));

  const optimalCeiling = reorderPoint + eoq * 1.25;
  const excessStockUnits = Math.max(0, Math.round(sku.currentStock - optimalCeiling));
  const trappedCapital = Number((excessStockUnits * sku.unitCost).toFixed(2));
  const annualHoldingCost = Number((sku.currentStock * annualHoldingCostPerUnit).toFixed(2));
  const expectedGrossMarginPct =
    sku.unitPrice > 0
      ? Number((((sku.unitPrice - sku.unitCost) / sku.unitPrice) * 100).toFixed(1))
      : 0;

  let status: StockStatus = 'Healthy';
  if (
    sku.currentStock <= safetyStock ||
    daysOfSupply <= effectiveLeadTimeDays ||
    (inventoryPosition <= reorderPoint && stockoutProbability >= 0.3)
  ) {
    status = 'Critical Stockout';
  } else if (inventoryPosition <= reorderPoint) {
    status = 'Reorder Now';
  } else if (daysOfSupply > 105 && excessStockUnits > Math.max(5, eoq * 0.35)) {
    status = 'Overstock';
  }

  // Priority score ranks urgency * financial revenue at risk
  const marginPerUnit = Math.max(1, sku.unitPrice - sku.unitCost);
  const priorityScore =
    (status === 'Critical Stockout' ? 1000 : status === 'Reorder Now' ? 400 : 0) +
    stockoutProbability * 500 +
    (dailyDemandMean * marginPerUnit) / 2;

  return {
    sku,
    series,
    avgMonthlyDemand,
    nextMonthForecast,
    next3MonthsForecast,
    dailyDemandMean: Number(dailyDemandMean.toFixed(2)),
    dailyDemandStd: Number(dailyDemandStd.toFixed(2)),
    effectiveLeadTimeDays,
    effectiveLeadTimeStdDays: Number(effectiveLeadTimeStdDays.toFixed(1)),
    safetyStock,
    reorderPoint,
    eoq,
    inventoryPosition,
    recommendedOrderQty,
    recommendedOrderCost,
    stockoutProbability,
    daysOfSupply,
    inventoryValue,
    excessStockUnits,
    trappedCapital,
    annualHoldingCost,
    expectedGrossMarginPct,
    coefficientOfVariation,
    seasonalStrength,
    peakMonthLabel,
    troughMonthLabel,
    status,
    abcClass: 'B',
    xyzClass: coefficientOfVariation < 0.2 ? 'X' : coefficientOfVariation < 0.42 ? 'Y' : 'Z',
    priorityScore,
  };
}

export function analyzePortfolio(
  skus: SkuItem[],
  scenario: ScenarioParams = DEFAULT_SCENARIO
): { items: SkuAnalytics[]; summary: PortfolioSummary } {
  const items = skus.map((sku) => analyzeSku(sku, scenario));

  // Assign ABC classification based on annual forecasted revenue contribution
  const withRevenue = items.map((item) => ({
    id: item.sku.id,
    annualRev: item.nextMonthForecast * 12 * item.sku.unitPrice,
  }));
  withRevenue.sort((a, b) => b.annualRev - a.annualRev);
  const totalRev = withRevenue.reduce((acc, r) => acc + r.annualRev, 0) || 1;

  let cumulative = 0;
  const abcMap = new Map<string, AbcClass>();
  for (const row of withRevenue) {
    cumulative += row.annualRev;
    const share = cumulative / totalRev;
    if (share <= 0.72) abcMap.set(row.id, 'A');
    else if (share <= 0.92) abcMap.set(row.id, 'B');
    else abcMap.set(row.id, 'C');
  }

  items.forEach((item) => {
    item.abcClass = abcMap.get(item.sku.id) ?? 'C';
  });

  // Sort default priority: Critical -> Reorder -> Overstock -> Healthy
  const statusWeight: Record<StockStatus, number> = {
    'Critical Stockout': 0,
    'Reorder Now': 1,
    Overstock: 2,
    Healthy: 3,
  };
  items.sort((a, b) => {
    const sw = statusWeight[a.status] - statusWeight[b.status];
    if (sw !== 0) return sw;
    return b.priorityScore - a.priorityScore;
  });

  const summary: PortfolioSummary = {
    totalInventoryValue: Number(
      items.reduce((acc, i) => acc + i.inventoryValue, 0).toFixed(2)
    ),
    totalIncomingValue: Number(
      items.reduce((acc, i) => acc + i.sku.incomingStock * i.sku.unitCost, 0).toFixed(2)
    ),
    criticalCount: items.filter((i) => i.status === 'Critical Stockout').length,
    reorderCount: items.filter((i) => i.status === 'Reorder Now').length,
    overstockCount: items.filter((i) => i.status === 'Overstock').length,
    healthyCount: items.filter((i) => i.status === 'Healthy').length,
    totalRecommendedOrderCost: Number(
      items.reduce((acc, i) => acc + i.recommendedOrderCost, 0).toFixed(2)
    ),
    totalRecommendedUnits: items.reduce((acc, i) => acc + i.recommendedOrderQty, 0),
    totalTrappedCapital: Number(
      items.reduce((acc, i) => acc + i.trappedCapital, 0).toFixed(2)
    ),
    avgStockoutRiskPct: items.length
      ? Number(
          (
            (items.reduce((acc, i) => acc + i.stockoutProbability, 0) / items.length) *
            100
          ).toFixed(1)
        )
      : 0,
    projected90DayRevenue: Number(
      items.reduce((acc, i) => acc + i.next3MonthsForecast * i.sku.unitPrice, 0).toFixed(2)
    ),
  };

  return { items, summary };
}
