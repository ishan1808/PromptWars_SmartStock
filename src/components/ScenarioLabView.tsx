import React, { useMemo, useState } from 'react';
import { RefreshCw, RotateCcw, Search } from 'lucide-react';
import { analyzePortfolio, DEFAULT_SCENARIO } from '../shared/forecastEngine.ts';
import type { AiScenarioBrief, ScenarioParams, SkuItem } from '../shared/types.ts';
import { formatCurrency, formatNumber, formatPct } from '../utils/format.ts';
import { ProductImage } from './ProductImage.tsx';
import { Button, StatusBadge } from './ui.tsx';

interface ScenarioLabViewProps {
  skus: SkuItem[];
  scenario: ScenarioParams;
  onChangeScenario: (next: ScenarioParams) => void;
  aiAnalysis: AiScenarioBrief | null;
  aiLoading: boolean;
  aiError: string | null;
  onRunAiScenario: (notes: string) => void;
  onApplyToOrders: () => void;
}

const PRESETS: Array<{ label: string; params: ScenarioParams }> = [
  { label: 'Baseline Plan', params: DEFAULT_SCENARIO },
  {
    label: 'Diwali Festive Surge (+35%)',
    params: {
      demandMultiplier: 1.35,
      leadTimeShockDays: 3,
      leadTimeVolatilityMultiplier: 1.25,
      serviceLevelOverride: 0.97,
      budgetCap: null,
    },
  },
  {
    label: 'Monsoon Transit Delay (+14d)',
    params: {
      demandMultiplier: 1.0,
      leadTimeShockDays: 14,
      leadTimeVolatilityMultiplier: 1.75,
      serviceLevelOverride: 0.96,
      budgetCap: null,
    },
  },
  {
    label: 'Off-Season Softness (-25%)',
    params: {
      demandMultiplier: 0.75,
      leadTimeShockDays: 0,
      leadTimeVolatilityMultiplier: 1.0,
      serviceLevelOverride: 0.92,
      budgetCap: null,
    },
  },
  {
    label: 'Peak Surge + Cash Cap (₹2.5L)',
    params: {
      demandMultiplier: 1.3,
      leadTimeShockDays: 7,
      leadTimeVolatilityMultiplier: 1.5,
      serviceLevelOverride: 0.95,
      budgetCap: 250000,
    },
  },
];

export const ScenarioLabView: React.FC<ScenarioLabViewProps> = ({
  skus,
  scenario,
  onChangeScenario,
  aiAnalysis,
  aiLoading,
  aiError,
  onRunAiScenario,
  onApplyToOrders,
}) => {
  const [notes, setNotes] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [tableScope, setTableScope] = useState<'all' | 'impacted'>('all');

  const baseline = useMemo(() => analyzePortfolio(skus, DEFAULT_SCENARIO), [skus]);
  const simulated = useMemo(() => analyzePortfolio(skus, scenario), [skus, scenario]);

  const baselineMap = useMemo(
    () => new Map(baseline.items.map((i) => [i.sku.id, i])),
    [baseline]
  );

  const visibleComparisonItems = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return simulated.items.filter((item) => {
      if (tableScope === 'impacted') {
        const base = baselineMap.get(item.sku.id);
        const qtyDelta = item.recommendedOrderQty - (base?.recommendedOrderQty ?? 0);
        const ssDelta = item.safetyStock - (base?.safetyStock ?? 0);
        const isRisk = item.status === 'Critical Stockout' || item.status === 'Reorder Now';
        if (qtyDelta === 0 && ssDelta === 0 && !isRisk) return false;
      }
      if (
        q &&
        !item.sku.name.toLowerCase().includes(q) &&
        !item.sku.skuCode.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [simulated.items, tableScope, tableSearch, baselineMap]);

  const deltaReorderCost =
    simulated.summary.totalRecommendedOrderCost - baseline.summary.totalRecommendedOrderCost;
  const deltaCritical = simulated.summary.criticalCount - baseline.summary.criticalCount;
  const deltaRisk = simulated.summary.avgStockoutRiskPct - baseline.summary.avgStockoutRiskPct;

  const isBudgetExceeded =
    scenario.budgetCap !== null &&
    simulated.summary.totalRecommendedOrderCost > scenario.budgetCap;

  return (
    <div className="space-y-6">
      {/* Controls & Presets */}
      <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEAE0] pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#292F2C]">
              Scenario Stress Test &amp; Uncertainty Lab
            </h2>
            <p className="mt-0.5 text-xs text-[#6B746E]">
              Adjust demand velocity, supplier lead-time shocks, and service targets to inspect safety stock and capital trade-offs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onChangeScenario(DEFAULT_SCENARIO)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Baseline
            </Button>
            <Button type="button" variant="primary" onClick={onApplyToOrders}>
              Build POs from Scenario
            </Button>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active =
              preset.params.demandMultiplier === scenario.demandMultiplier &&
              preset.params.leadTimeShockDays === scenario.leadTimeShockDays &&
              preset.params.leadTimeVolatilityMultiplier === scenario.leadTimeVolatilityMultiplier &&
              preset.params.serviceLevelOverride === scenario.serviceLevelOverride &&
              preset.params.budgetCap === scenario.budgetCap;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChangeScenario(preset.params)}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                  active
                    ? 'border-[#145A43] bg-[#145A43] text-white shadow-2xs'
                    : 'border-[#E2DDD1] bg-[#EEEAE0]/60 text-[#292F2C] hover:border-[#D2CCB9] hover:bg-[#EEEAE0]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Interactive Parameter Controls */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="demand-mult" className="font-medium text-[#292F2C]">
                Demand Shift
              </label>
              <span className="font-mono tabular-nums font-semibold text-[#145A43]">
                {scenario.demandMultiplier >= 1 ? '+' : ''}
                {Math.round((scenario.demandMultiplier - 1) * 100)}% ({scenario.demandMultiplier.toFixed(2)}x)
              </span>
            </div>
            <input
              id="demand-mult"
              type="range"
              min={0.6}
              max={1.8}
              step={0.05}
              value={scenario.demandMultiplier}
              onChange={(e) =>
                onChangeScenario({ ...scenario, demandMultiplier: Number(e.target.value) })
              }
              className="mt-2 w-full accent-[#145A43]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="lead-shock" className="font-medium text-[#292F2C]">
                Lead-Time Delay
              </label>
              <span className="font-mono tabular-nums font-semibold text-[#145A43]">
                {scenario.leadTimeShockDays >= 0 ? '+' : ''}
                {scenario.leadTimeShockDays} days
              </span>
            </div>
            <input
              id="lead-shock"
              type="range"
              min={-7}
              max={28}
              step={1}
              value={scenario.leadTimeShockDays}
              onChange={(e) =>
                onChangeScenario({ ...scenario, leadTimeShockDays: Number(e.target.value) })
              }
              className="mt-2 w-full accent-[#145A43]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="lead-vol" className="font-medium text-[#292F2C]">
                Supplier Volatility
              </label>
              <span className="font-mono tabular-nums font-semibold text-[#145A43]">
                {scenario.leadTimeVolatilityMultiplier.toFixed(2)}x std
              </span>
            </div>
            <input
              id="lead-vol"
              type="range"
              min={0.5}
              max={2.5}
              step={0.25}
              value={scenario.leadTimeVolatilityMultiplier}
              onChange={(e) =>
                onChangeScenario({
                  ...scenario,
                  leadTimeVolatilityMultiplier: Number(e.target.value),
                })
              }
              className="mt-2 w-full accent-[#145A43]"
            />
          </div>

          <div>
            <label htmlFor="sl-override" className="block text-xs font-medium text-[#292F2C]">
              Target Service Level
            </label>
            <select
              id="sl-override"
              value={scenario.serviceLevelOverride ?? 'sku'}
              onChange={(e) =>
                onChangeScenario({
                  ...scenario,
                  serviceLevelOverride: e.target.value === 'sku' ? null : Number(e.target.value),
                })
              }
              className="mt-1.5 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 text-xs text-[#292F2C] focus:border-[#145A43] focus:outline-none"
            >
              <option value="sku">Per-SKU Policy Target</option>
              <option value="0.9">90.0% Fill Rate (Lean)</option>
              <option value="0.95">95.0% Fill Rate (Standard)</option>
              <option value="0.98">98.0% Fill Rate (High)</option>
              <option value="0.99">99.0% Fill Rate (Zero-Out)</option>
            </select>
          </div>

          <div>
            <label htmlFor="budget-cap" className="block text-xs font-medium text-[#292F2C]">
              Purchasing Budget Cap (₹)
            </label>
            <input
              id="budget-cap"
              type="number"
              min={0}
              step={5000}
              placeholder="Unlimited"
              value={scenario.budgetCap ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                onChangeScenario({
                  ...scenario,
                  budgetCap: raw === '' ? null : Math.max(0, Number(raw)),
                });
              }}
              className="mt-1.5 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#292F2C] placeholder:text-[#929A94] focus:border-[#145A43] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Scenario Delta KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-4 shadow-2xs">
          <div className="text-xs text-[#6B746E]">Scenario Reorder Capital</div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#292F2C]">
            {formatCurrency(simulated.summary.totalRecommendedOrderCost)}
          </div>
          <div
            className={`mt-1 font-mono text-xs tabular-nums ${
              deltaReorderCost > 0 ? 'text-[#9A6714]' : 'text-[#38865B]'
            }`}
          >
            {deltaReorderCost >= 0 ? '+' : ''}
            {formatCurrency(deltaReorderCost)} vs baseline
          </div>
        </div>

        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-4 shadow-2xs">
          <div className="text-xs text-[#6B746E]">Critical Stockout SKUs</div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#292F2C]">
            {simulated.summary.criticalCount} SKUs
          </div>
          <div
            className={`mt-1 font-mono text-xs tabular-nums ${
              deltaCritical > 0 ? 'text-[#B43F3F]' : 'text-[#6B746E]'
            }`}
          >
            {deltaCritical >= 0 ? '+' : ''}
            {deltaCritical} vs baseline ({baseline.summary.criticalCount})
          </div>
        </div>

        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-4 shadow-2xs">
          <div className="text-xs text-[#6B746E]">Avg Lead-Time Stockout Risk</div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#292F2C]">
            {simulated.summary.avgStockoutRiskPct.toFixed(1)}%
          </div>
          <div
            className={`mt-1 font-mono text-xs tabular-nums ${
              deltaRisk > 0 ? 'text-[#B43F3F]' : 'text-[#38865B]'
            }`}
          >
            {deltaRisk >= 0 ? '+' : ''}
            {deltaRisk.toFixed(1)} pts vs baseline
          </div>
        </div>

        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-4 shadow-2xs">
          <div className="text-xs text-[#6B746E]">Budget Feasibility</div>
          <div
            className={`mt-1.5 font-mono text-xl font-semibold tabular-nums ${
              isBudgetExceeded ? 'text-[#B43F3F]' : 'text-[#38865B]'
            }`}
          >
            {scenario.budgetCap === null
              ? 'Unconstrained'
              : isBudgetExceeded
                ? `Shortfall ${formatCurrency(simulated.summary.totalRecommendedOrderCost - scenario.budgetCap)}`
                : 'Within Budget'}
          </div>
          <div className="mt-1 text-xs text-[#6B746E] tabular-nums">
            {scenario.budgetCap !== null
              ? `Cap: ${formatCurrency(scenario.budgetCap)}`
              : `Projected 90d Rev: ${formatCurrency(simulated.summary.projected90DayRevenue, true)}`}
          </div>
        </div>
      </div>

      {/* Side-by-Side Table + AI Strategist */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="overflow-hidden rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-2xs xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD1] px-5 py-3.5">
            <div>
              <h3 className="text-sm font-semibold text-[#292F2C]">
                SKU-Level Impact Comparison ({visibleComparisonItems.length})
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2 left-2.5 h-3.5 w-3.5 text-[#929A94]" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter SKU..."
                  aria-label="Filter scenario comparison SKUs"
                  className="h-8 w-40 rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] pr-2.5 pl-8 text-xs text-[#292F2C] placeholder:text-[#929A94] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-[#EEEAE0] p-1">
                <button
                  type="button"
                  onClick={() => setTableScope('all')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
                    tableScope === 'all'
                      ? 'bg-[#FFFEFA] text-[#292F2C] shadow-2xs'
                      : 'text-[#6B746E] hover:text-[#292F2C]'
                  }`}
                >
                  All SKUs
                </button>
                <button
                  type="button"
                  onClick={() => setTableScope('impacted')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
                    tableScope === 'impacted'
                      ? 'bg-[#FFFEFA] text-[#292F2C] shadow-2xs'
                      : 'text-[#6B746E] hover:text-[#292F2C]'
                  }`}
                >
                  Impacted / At-Risk
                </button>
              </div>
            </div>
          </div>

          {visibleComparisonItems.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#6B746E]">
              No SKUs match the current scenario filter.
            </div>
          ) : (
            <div className="max-h-[540px] overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[#E2DDD1] bg-[#EEEAE0]/90 text-[#6B746E] backdrop-blur-xs">
                    <th className="min-w-[200px] px-4 py-2.5 font-medium">Product / SKU</th>
                    <th className="px-3 py-2.5 font-medium">Scenario Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">Safety Stock</th>
                    <th className="px-3 py-2.5 text-right font-medium">Risk</th>
                    <th className="px-3 py-2.5 text-right font-medium">Order Qty</th>
                    <th className="px-4 py-2.5 text-right font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEAE0]">
                  {visibleComparisonItems.map((item) => {
                    const base = baselineMap.get(item.sku.id);
                    const qtyDelta = item.recommendedOrderQty - (base?.recommendedOrderQty ?? 0);
                    return (
                      <tr key={item.sku.id} className="hover:bg-[#EEEAE0]/35">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <ProductImage
                              name={item.sku.name}
                              category={item.sku.category}
                              skuCode={item.sku.skuCode}
                              imageUrl={item.sku.imageUrl}
                              compact
                              className="h-8 w-8 rounded-md border border-[#E2DDD1]"
                            />
                            <div>
                              <div className="font-medium text-[#292F2C]">{item.sku.name}</div>
                              <div className="font-mono text-[11px] text-[#6B746E]">
                                {item.sku.skuCode} · {item.effectiveLeadTimeDays}d lead
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <StatusBadge status={item.status} compact />
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#6B746E]">
                          {base?.safetyStock ?? 0} →{' '}
                          <span className="font-semibold text-[#292F2C]">{item.safetyStock}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#292F2C]">
                          {formatPct(item.stockoutProbability)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold text-[#292F2C]">
                          {formatNumber(item.recommendedOrderQty)}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-mono tabular-nums font-medium ${
                            qtyDelta > 0
                              ? 'text-[#9A6714]'
                              : qtyDelta < 0
                                ? 'text-[#38865B]'
                                : 'text-[#929A94]'
                          }`}
                        >
                          {qtyDelta > 0 ? `+${qtyDelta}` : qtyDelta < 0 ? `${qtyDelta}` : '0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Scenario Risk Strategist */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-2xs xl:col-span-5">
          <div className="border-b border-[#E2DDD1] px-5 py-3.5">
            <h3 className="text-sm font-semibold text-[#292F2C]">
              AI Scenario Contingency Strategist
            </h3>
            <p className="text-xs text-[#6B746E]">
              Evaluate budget trade-offs and vulnerable SKUs under this stress test
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label htmlFor="scenario-notes" className="block text-xs font-medium text-[#292F2C]">
                Operational Context (optional)
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="scenario-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Monsoon transit delay from Lasalgaon onion mandi..."
                  className="flex-1 rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-3 py-1.5 text-xs text-[#292F2C] placeholder:text-[#929A94] focus:border-[#145A43] focus:outline-none"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onRunAiScenario(notes)}
                  disabled={aiLoading || skus.length === 0}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                  {aiLoading ? 'Evaluating...' : 'Analyze Scenario'}
                </Button>
              </div>
            </div>

            {aiError && (
              <div className="rounded-lg border border-[#C65353]/35 bg-[#C65353]/10 p-3 text-xs text-[#9E3535]">
                {aiError}
              </div>
            )}

            {aiLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-full rounded bg-[#EEEAE0]" />
                <div className="h-4 w-4/5 rounded bg-[#EEEAE0]" />
                <div className="h-16 w-full rounded bg-[#EEEAE0]" />
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4 text-xs leading-relaxed text-[#292F2C]">
                <p className="text-sm text-[#292F2C]">{aiAnalysis.executiveSummary}</p>

                <div className="rounded-lg bg-[#EEEAE0]/60 p-3.5">
                  <h4 className="font-semibold text-[#292F2C]">Capital Allocation Strategy</h4>
                  <p className="mt-1 text-[#6B746E]">{aiAnalysis.capitalAllocationAdvice}</p>
                </div>

                {aiAnalysis.topVulnerableSkus.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold text-[#292F2C]">Highest-Risk SKUs</h4>
                    <div className="divide-y divide-[#EEEAE0] overflow-hidden rounded-lg border border-[#E2DDD1]">
                      {aiAnalysis.topVulnerableSkus.map((v, idx) => (
                        <div key={idx} className="p-2.5">
                          <div className="font-medium text-[#292F2C]">
                            <span className="font-mono text-[#6B746E]">{v.skuCode}</span> · {v.name}
                          </div>
                          <div className="mt-0.5 text-[#6B746E]">{v.riskSummary}</div>
                          <div className="mt-1 font-medium text-[#145A43]">Action: {v.action}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="mb-1.5 font-semibold text-[#292F2C]">Contingency Triggers</h4>
                  <ul className="space-y-1 text-[#6B746E]">
                    {aiAnalysis.contingencyTriggers.map((t, idx) => (
                      <li key={idx}>· {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#6B746E]">
                Adjust parameters above and click <strong className="text-[#292F2C]">Analyze Scenario</strong> to get prioritized purchasing trade-offs under uncertainty.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
