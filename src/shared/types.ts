export interface MonthlySale {
  month: string; // YYYY-MM
  units: number;
  promo?: boolean;
}

export interface SkuItem {
  id: string;
  skuCode: string;
  name: string;
  category: string;
  supplier: string;
  unitCost: number;
  unitPrice: number;
  holdingCostRate: number; // annual fraction, e.g. 0.24
  orderFixedCost: number; // ₹ per PO
  currentStock: number;
  incomingStock: number;
  leadTimeDays: number;
  leadTimeStdDays: number;
  minOrderQty: number;
  serviceLevelTarget: number; // 0.85 - 0.995
  monthlySales: MonthlySale[];
  unit?: string;
  notes?: string;
  imageUrl?: string;
}

export interface BusinessDataset {
  id: string;
  businessName: string;
  industry: string;
  currency: string;
  skus: SkuItem[];
}

export interface ScenarioParams {
  demandMultiplier: number; // e.g. 1.0 = baseline, 1.35 = +35% surge
  leadTimeShockDays: number; // e.g. +7 days supplier delay
  leadTimeVolatilityMultiplier: number; // e.g. 1.5x variance
  serviceLevelOverride: number | null; // null = use SKU target, or 0.90..0.99
  budgetCap: number | null; // optional working capital cap for PO queue
}

export interface ForecastPoint {
  month: string;
  label: string;
  actual?: number;
  p50: number;
  p10: number;
  p90: number;
  seasonalIndex: number;
  isForecast: boolean;
}

export type StockStatus = 'Critical Stockout' | 'Reorder Now' | 'Healthy' | 'Overstock';
export type AbcClass = 'A' | 'B' | 'C';
export type XyzClass = 'X' | 'Y' | 'Z';

export interface SkuAnalytics {
  sku: SkuItem;
  series: ForecastPoint[];
  avgMonthlyDemand: number;
  nextMonthForecast: number;
  next3MonthsForecast: number;
  dailyDemandMean: number;
  dailyDemandStd: number;
  effectiveLeadTimeDays: number;
  effectiveLeadTimeStdDays: number;
  safetyStock: number;
  reorderPoint: number;
  eoq: number;
  inventoryPosition: number;
  recommendedOrderQty: number;
  recommendedOrderCost: number;
  stockoutProbability: number; // 0..1
  daysOfSupply: number;
  inventoryValue: number;
  excessStockUnits: number;
  trappedCapital: number;
  annualHoldingCost: number;
  expectedGrossMarginPct: number;
  coefficientOfVariation: number;
  seasonalStrength: number; // 0..1
  peakMonthLabel: string;
  troughMonthLabel: string;
  status: StockStatus;
  abcClass: AbcClass;
  xyzClass: XyzClass;
  priorityScore: number; // for budget-constrained ranking
}

export interface PortfolioSummary {
  totalInventoryValue: number;
  totalIncomingValue: number;
  criticalCount: number;
  reorderCount: number;
  overstockCount: number;
  healthyCount: number;
  totalRecommendedOrderCost: number;
  totalRecommendedUnits: number;
  totalTrappedCapital: number;
  avgStockoutRiskPct: number;
  projected90DayRevenue: number;
}

export interface AiForecastBrief {
  headline: string;
  demandDrivers: string[];
  seasonalityInsight: string;
  uncertaintyAssessment: string;
  purchasingRecommendation: string;
  riskMitigations: string[];
  confidenceLevel: 'High' | 'Moderate' | 'Low';
}

export interface AiScenarioBrief {
  executiveSummary: string;
  capitalAllocationAdvice: string;
  topVulnerableSkus: Array<{
    skuCode: string;
    name: string;
    riskSummary: string;
    action: string;
  }>;
  contingencyTriggers: string[];
}

export interface AiPortfolioAudit {
  summary: string;
  urgentActions: string[];
  workingCapitalOpportunities: string[];
  supplierConcentrationRisks: string[];
}

export interface PurchaseOrderRecord {
  id: string;
  createdAt: string;
  supplier: string;
  items: Array<{
    skuCode: string;
    name: string;
    qty: number;
    unitCost: number;
    lineTotal: number;
  }>;
  totalCost: number;
  status: 'Submitted' | 'Draft';
}
