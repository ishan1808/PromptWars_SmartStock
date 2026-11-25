import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, TrendingUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { AiForecastBrief, ScenarioParams, SkuAnalytics } from '../shared/types.ts';
import { formatCurrency, formatNumber, formatPct, getStatusStyle, inferSkuUnit } from '../utils/format.ts';
import { ForecastChart } from './ForecastChart.tsx';
import { InventoryRunwayChart } from './InventoryRunwayChart.tsx';
import { ProductImage } from './ProductImage.tsx';
import { Button, StatusBadge } from './ui.tsx';

interface DemandForecastViewProps {
  items: SkuAnalytics[];
  selectedSkuId: string;
  onSelectSku: (skuId: string) => void;
  scenario: ScenarioParams;
  briefMap: Record<string, AiForecastBrief>;
  briefLoadingId: string | null;
  briefError: string | null;
  onGenerateBrief: (item: SkuAnalytics) => void;
  onGoToOrders: () => void;
  onGoToInventory?: () => void;
}

export const DemandForecastView: React.FC<DemandForecastViewProps> = ({
  items,
  selectedSkuId,
  onSelectSku,
  scenario,
  briefMap,
  briefLoadingId,
  briefError,
  onGenerateBrief,
  onGoToOrders,
  onGoToInventory,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [chartTab, setChartTab] = useState<'demand' | 'runway'>('demand');
  const [horizonMonths, setHorizonMonths] = useState<3 | 6>(6);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.sku.category))).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryFilter !== 'ALL' && i.sku.category !== categoryFilter) return false;
      if (
        q &&
        !i.sku.name.toLowerCase().includes(q) &&
        !i.sku.skuCode.toLowerCase().includes(q) &&
        !i.sku.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [items, search, categoryFilter]);

  const selected = useMemo(
    () => items.find((i) => i.sku.id === selectedSkuId) ?? items[0] ?? null,
    [items, selectedSkuId]
  );

  const categoryBenchmark = useMemo(() => {
    if (!selected) return null;
    const peers = items.filter((i) => i.sku.category === selected.sku.category);
    const totalForecastNextMo = peers.reduce((acc, p) => acc + p.nextMonthForecast, 0);
    const totalNeededUnits = peers.reduce((acc, p) => acc + p.recommendedOrderQty, 0);
    return {
      peerCount: peers.length,
      totalForecastNextMo,
      totalNeededUnits,
    };
  }, [items, selected]);

  if (!selected) {
    return (
      <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-12 text-center text-sm text-[#6B746E]">
        No SKUs loaded. Import a CSV or add an item in Inventory to inspect demand forecasts.
      </div>
    );
  }

  const st = getStatusStyle(selected.status);
  const unit = inferSkuUnit(selected.sku);
  const brief = briefMap[selected.sku.id];
  const isBriefLoading = briefLoadingId === selected.sku.id;

  const historicalPoints = selected.series.filter((p) => !p.isForecast);
  const futureMonths = selected.series.filter((p) => p.isForecast).slice(0, horizonMonths);
  const displayedSeries = [...historicalPoints, ...futureMonths];
  const horizonDemandTotal = futureMonths.reduce((acc, pt) => acc + pt.p50, 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left SKU Selector Rail */}
      <div className="overflow-hidden rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-2xs lg:col-span-4 xl:col-span-3">
        <div className="space-y-2 border-b border-[#E2DDD1] p-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#6B746E]">
            <span>Select Product ({filteredItems.length})</span>
            <span className="font-mono">{categoryFilter === 'ALL' ? 'All' : categoryFilter}</span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#929A94]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or name..."
              aria-label="Filter SKUs"
              className="w-full rounded-lg border border-[#D2CCB9] bg-[#F5F1E8]/60 py-1.5 pr-3 pl-8 text-xs text-[#292F2C] placeholder:text-[#929A94] focus:border-[#145A43] focus:bg-[#FFFEFA] focus:outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter forecast SKUs by category"
            className="w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 text-xs text-[#292F2C] focus:border-[#145A43] focus:outline-none"
          >
            <option value="ALL">All Categories ({items.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-60 divide-y divide-[#EEEAE0] overflow-y-auto p-1.5 lg:max-h-[740px]">
          {filteredItems.map((item) => {
            const active = item.sku.id === selected.sku.id;
            const itemStyle = getStatusStyle(item.status);
            return (
              <button
                key={item.sku.id}
                type="button"
                onClick={() => onSelectSku(item.sku.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${
                  active ? 'bg-[#145A43] text-white shadow-2xs' : 'hover:bg-[#EEEAE0]/55'
                }`}
              >
                <ProductImage
                  name={item.sku.name}
                  category={item.sku.category}
                  skuCode={item.sku.skuCode}
                  imageUrl={item.sku.imageUrl}
                  compact
                  className={`h-9 w-9 rounded-md border ${
                    active ? 'border-[#E6A23C]/50' : 'border-[#E2DDD1]'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`truncate text-xs font-medium ${
                        active ? 'text-[#FFFEFA]' : 'text-[#292F2C]'
                      }`}
                    >
                      {item.sku.name}
                    </span>
                    <span
                      className={`font-mono text-[11px] tabular-nums shrink-0 ${
                        active ? 'text-[#E6A23C]' : 'text-[#929A94]'
                      }`}
                    >
                      {item.abcClass}
                      {item.xyzClass}
                    </span>
                  </div>
                  <div
                    className={`mt-0.5 flex items-center justify-between text-[11px] ${
                      active ? 'text-[#EEEAE0]/80' : 'text-[#6B746E]'
                    }`}
                  >
                    <span className="font-mono">{item.sku.skuCode}</span>
                    <span className={active ? 'font-medium text-[#FFFEFA]' : itemStyle.textClass}>
                      {itemStyle.shortLabel}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
          {filteredItems.length === 0 && (
            <div className="p-6 text-center text-xs text-[#6B746E]">No matching SKUs.</div>
          )}
        </div>
      </div>

      {/* Main Forecast & Analytical Workspace */}
      <div className="space-y-6 lg:col-span-8 xl:col-span-9">
        {/* Forecast Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-4 shadow-2xs">
            <div className="text-xs font-medium text-[#6B746E]">
              {horizonMonths}-Month Predicted Demand (P50)
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#145A43]">
              {formatNumber(horizonDemandTotal)} {unit}
            </div>
            <div className="mt-1 text-[11px] text-[#6B746E] tabular-nums">
              Next month: {formatNumber(selected.nextMonthForecast)} {unit} · 12-mo avg:{' '}
              {formatNumber(selected.avgMonthlyDemand)}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-4 shadow-2xs">
            <div className="text-xs font-medium text-[#6B746E]">
              Predicted Requirement &amp; Reorder Gap
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#292F2C]">
              {selected.recommendedOrderQty > 0
                ? `${formatNumber(selected.recommendedOrderQty)} ${unit}`
                : 'Adequate Cover'}
            </div>
            <div className="mt-1 text-[11px] text-[#6B746E] tabular-nums">
              {selected.recommendedOrderQty > 0
                ? `Est. cost ${formatCurrency(selected.recommendedOrderCost)} · MOQ ${selected.sku.minOrderQty}`
                : `Inventory position ${formatNumber(selected.inventoryPosition)} > ROP ${formatNumber(selected.reorderPoint)}`}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-4 shadow-2xs">
            <div className="text-xs font-medium text-[#6B746E]">
              Category Context ({selected.sku.category})
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#292F2C]">
              {categoryBenchmark ? formatNumber(categoryBenchmark.totalForecastNextMo) : '0'} u/mo
            </div>
            <div className="mt-1 text-[11px] text-[#6B746E] tabular-nums">
              {categoryBenchmark?.peerCount ?? 0} SKUs in category ·{' '}
              {formatNumber(categoryBenchmark?.totalNeededUnits ?? 0)} units queued
            </div>
          </div>
        </div>

        {/* Selected SKU Analytical Header */}
        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EEEAE0] pb-4">
            <div className="flex items-start gap-4">
              <ProductImage
                name={selected.sku.name}
                category={selected.sku.category}
                skuCode={selected.sku.skuCode}
                imageUrl={selected.sku.imageUrl}
                compact
                className="h-16 w-16 rounded-xl border border-[#E2DDD1]"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B746E]">
                  <span className="font-mono font-medium text-[#292F2C]">
                    {selected.sku.skuCode}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selected.sku.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Supplier: {selected.sku.supplier}</span>
                  <span aria-hidden="true">·</span>
                  <StatusBadge status={selected.status} compact />
                </div>
                <h2 className="mt-1.5 text-xl font-bold text-[#292F2C]">{selected.sku.name}</h2>
                {selected.sku.notes && (
                  <p className="mt-1 text-xs text-[#6B746E]">{selected.sku.notes}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onGoToInventory && (
                <Button type="button" variant="secondary" size="sm" onClick={onGoToInventory}>
                  View Catalog
                </Button>
              )}
              {selected.recommendedOrderQty > 0 && (
                <Button type="button" variant="primary" size="sm" onClick={onGoToOrders}>
                  Order {formatNumber(selected.recommendedOrderQty)} {unit} (
                  {formatCurrency(selected.recommendedOrderCost)})
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <div>
              <div className="text-[11px] text-[#6B746E]">On-Hand / Incoming</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[#292F2C]">
                {formatNumber(selected.sku.currentStock)}
                <span className="text-xs font-normal text-[#6B746E]">
                  {' '}
                  + {formatNumber(selected.sku.incomingStock)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#6B746E]">Next Month (P50)</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[#145A43]">
                {formatNumber(selected.nextMonthForecast)} {unit}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#6B746E]">Reorder Point (ROP)</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[#292F2C]">
                {formatNumber(selected.reorderPoint)} {unit}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#6B746E]">Safety Stock</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[#292F2C]">
                {formatNumber(selected.safetyStock)} {unit}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#6B746E]">Optimal Batch (EOQ)</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[#292F2C]">
                {formatNumber(selected.eoq)} {unit}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#6B746E]">Stockout Probability</div>
              <div className={`mt-1 font-mono text-base font-semibold tabular-nums ${st.textClass}`}>
                {formatPct(selected.stockoutProbability)}
              </div>
            </div>
          </div>
        </div>

        {/* Probabilistic Fan Chart & 12-Week Inventory Runway */}
        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#292F2C]">
                {chartTab === 'demand'
                  ? 'Historical Trends vs. Predicted Demand (P10–P90)'
                  : '12-Week Stock Runway vs. Reorder Point'}
              </h3>
              <p className="text-xs text-[#6B746E]">
                Peak Season: {selected.peakMonthLabel} · Trough: {selected.troughMonthLabel} ·
                Seasonality: {Math.round(selected.seasonalStrength * 100)}% · CV:{' '}
                {selected.coefficientOfVariation.toFixed(2)}
                {scenario.demandMultiplier !== 1 || scenario.leadTimeShockDays !== 0
                  ? ` · Scenario Active (${Math.round((scenario.demandMultiplier - 1) * 100)}% demand, ${scenario.leadTimeShockDays >= 0 ? '+' : ''}${scenario.leadTimeShockDays}d lead)`
                  : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {chartTab === 'demand' && (
                <div className="flex items-center gap-1 rounded-lg bg-[#EEEAE0] p-1">
                  {([3, 6] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setHorizonMonths(m)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                        horizonMonths === m
                          ? 'bg-[#FFFEFA] text-[#145A43] shadow-2xs'
                          : 'text-[#6B746E] hover:text-[#292F2C]'
                      }`}
                    >
                      {m}M Horizon
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1 rounded-lg bg-[#EEEAE0] p-1">
                <button
                  type="button"
                  onClick={() => setChartTab('demand')}
                  className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap ${
                    chartTab === 'demand'
                      ? 'bg-[#FFFEFA] text-[#292F2C] shadow-2xs'
                      : 'text-[#6B746E] hover:text-[#292F2C]'
                  }`}
                >
                  Demand Forecast
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab('runway')}
                  className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap ${
                    chartTab === 'runway'
                      ? 'bg-[#FFFEFA] text-[#292F2C] shadow-2xs'
                      : 'text-[#6B746E] hover:text-[#292F2C]'
                  }`}
                >
                  Stock Runway
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${selected.sku.id}-${chartTab}-${horizonMonths}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              {chartTab === 'demand' ? (
                <ForecastChart
                  series={displayedSeries}
                  avgMonthlyDemand={selected.avgMonthlyDemand}
                  safetyStock={selected.safetyStock}
                  currentStock={selected.sku.currentStock}
                />
              ) : (
                <InventoryRunwayChart analytics={selected} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Forecast Table Breakdown */}
          <div className="mt-5 overflow-x-auto border-t border-[#EEEAE0] pt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-[#292F2C]">
                Monthly Demand Forecast Breakdown ({horizonMonths}-Month Horizon)
              </span>
              <span className="font-mono text-[11px] text-[#6B746E]">Unit: {unit}</span>
            </div>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="text-[#6B746E]">
                  <th className="py-1.5 pr-3 font-medium">Forecast Period</th>
                  <th className="px-3 py-1.5 text-right font-medium">P10 Conservative</th>
                  <th className="px-3 py-1.5 text-right font-medium">P50 Predicted</th>
                  <th className="px-3 py-1.5 text-right font-medium">P90 Upside</th>
                  <th className="pl-3 py-1.5 text-right font-medium">Seasonal Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEAE0] font-mono tabular-nums">
                {futureMonths.map((pt) => (
                  <tr key={pt.month}>
                    <td className="py-2 pr-3 font-sans font-medium text-[#292F2C]">{pt.label}</td>
                    <td className="px-3 py-2 text-right text-[#6B746E]">{formatNumber(pt.p10)} u</td>
                    <td className="px-3 py-2 text-right font-semibold text-[#9A6714]">
                      {formatNumber(pt.p50)} u
                    </td>
                    <td className="px-3 py-2 text-right text-[#6B746E]">{formatNumber(pt.p90)} u</td>
                    <td className="pl-3 py-2 text-right text-[#292F2C]">
                      {pt.seasonalIndex.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gemini AI Reasoning Under Uncertainty Panel */}
        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEAE0] pb-4">
            <div>
              <h3 className="text-base font-semibold text-[#292F2C]">
                AI Demand &amp; Uncertainty Reasoning
              </h3>
              <p className="text-xs text-[#6B746E]">
                Explains seasonal drivers, P10–P90 spread, and supplier lead-time risk ({selected.effectiveLeadTimeDays}d ± {selected.effectiveLeadTimeStdDays}d)
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => onGenerateBrief(selected)}
              disabled={isBriefLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isBriefLoading ? 'animate-spin' : ''}`} />
              {isBriefLoading ? 'Reasoning...' : brief ? 'Re-Analyze SKU' : 'Analyze with AI'}
            </Button>
          </div>

          {briefError && (
            <div className="mt-4 rounded-lg border border-[#C65353]/35 bg-[#C65353]/10 p-3.5 text-xs text-[#9E3535]">
              {briefError}
            </div>
          )}

          {isBriefLoading ? (
            <div className="mt-4 space-y-3 animate-pulse">
              <div className="h-4 w-3/4 rounded bg-[#EEEAE0]" />
              <div className="h-3 w-full rounded bg-[#EEEAE0]" />
              <div className="h-3 w-5/6 rounded bg-[#EEEAE0]" />
              <div className="h-3 w-2/3 rounded bg-[#EEEAE0]" />
            </div>
          ) : brief ? (
            <div className="mt-4 space-y-4 text-xs leading-relaxed text-[#292F2C]">
              <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-[#EEEAE0]/60 p-3.5">
                <p className="text-sm font-medium text-[#292F2C]">{brief.headline}</p>
                <span className="font-mono text-[11px] font-semibold text-[#145A43]">
                  Confidence: {brief.confidenceLevel}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-1.5 font-semibold text-[#292F2C]">Demand Drivers</h4>
                  <ul className="space-y-1 text-[#6B746E]">
                    {brief.demandDrivers.map((d, idx) => (
                      <li key={idx}>· {d}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="mb-1.5 font-semibold text-[#292F2C]">Seasonality Dynamics</h4>
                  <p className="text-[#6B746E]">{brief.seasonalityInsight}</p>
                </div>

                <div>
                  <h4 className="mb-1.5 font-semibold text-[#292F2C]">
                    Reasoning Under Uncertainty
                  </h4>
                  <p className="text-[#6B746E]">{brief.uncertaintyAssessment}</p>
                </div>

                <div>
                  <h4 className="mb-1.5 font-semibold text-[#292F2C]">
                    Purchasing Recommendation
                  </h4>
                  <p className="text-[#6B746E]">{brief.purchasingRecommendation}</p>
                </div>
              </div>

              <div className="border-t border-[#EEEAE0] pt-3">
                <h4 className="mb-1.5 font-semibold text-[#292F2C]">Risk Mitigations</h4>
                <ul className="grid grid-cols-1 gap-1.5 text-[#6B746E] md:grid-cols-2">
                  {brief.riskMitigations.map((m, idx) => (
                    <li key={idx}>· {m}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center py-6 text-center text-xs text-[#6B746E]">
              <TrendingUp className="mb-2 h-5 w-5 text-[#929A94]" />
              <span>
                Click <strong className="text-[#292F2C]">Analyze with AI</strong> to generate a tailored procurement rationale and uncertainty breakdown for {selected.sku.skuCode}.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
