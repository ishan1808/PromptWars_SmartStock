import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  Layers,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import type {
  AbcClass,
  AiPortfolioAudit,
  PortfolioSummary,
  SkuAnalytics,
  StockStatus,
  XyzClass,
} from '../shared/types.ts';
import { formatCurrency, formatNumber, formatPct, inferSkuUnit } from '../utils/format.ts';
import { PortfolioChart } from './PortfolioChart.tsx';
import { ProductImage } from './ProductImage.tsx';
import { Button, StatusBadge } from './ui.tsx';

interface OverviewViewProps {
  businessName: string;
  items: SkuAnalytics[];
  summary: PortfolioSummary;
  audit: AiPortfolioAudit | null;
  auditLoading: boolean;
  auditError: string | null;
  onRunAudit: () => void;
  onInspectSku: (skuId: string) => void;
  onNavigateTab: (tab: 'forecast' | 'scenarios' | 'orders' | 'inventory') => void;
  onFilterByMatrix: (abc: AbcClass, xyz: XyzClass) => void;
  onFilterByCategory: (category: string) => void;
  onFilterByStatus: (status: StockStatus) => void;
}

type QueueTab = 'all' | StockStatus;

export const OverviewView: React.FC<OverviewViewProps> = ({
  businessName,
  items,
  summary,
  audit,
  auditLoading,
  auditError,
  onRunAudit,
  onInspectSku,
  onNavigateTab,
  onFilterByMatrix,
  onFilterByCategory,
  onFilterByStatus,
}) => {
  const [queueFilter, setQueueFilter] = useState<QueueTab>('all');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const categoryCount = useMemo(
    () => new Set(items.map((i) => i.sku.category)).size,
    [items]
  );

  // Aggregate real 6-month historical unit sales trend directly from portfolio SKUs
  const salesTrend = useMemo(() => {
    const monthTotals = new Map<string, { month: string; label: string; units: number }>();
    items.forEach((item) => {
      item.series
        .filter((pt) => !pt.isForecast && pt.actual !== undefined)
        .slice(-6)
        .forEach((pt) => {
          const existing = monthTotals.get(pt.month) ?? {
            month: pt.month,
            label: pt.label,
            units: 0,
          };
          existing.units += pt.actual ?? 0;
          monthTotals.set(pt.month, existing);
        });
    });
    return Array.from(monthTotals.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [items]);

  const maxTrendUnits = Math.max(1, ...salesTrend.map((m) => m.units));

  const priorityCandidates = useMemo(
    () =>
      items.filter((i) =>
        queueFilter === 'all'
          ? i.status === 'Critical Stockout' ||
            i.status === 'Reorder Now' ||
            i.status === 'Overstock'
          : i.status === queueFilter
      ),
    [items, queueFilter]
  );

  const alertItemsCount = summary.criticalCount + summary.reorderCount + summary.overstockCount;
  const priorityItems = priorityCandidates.slice(0, 8);
  const totalCount = Math.max(1, items.length);
  const activeTrendPoint =
    salesTrend.find((pt) => pt.month === hoveredMonth) ?? salesTrend[salesTrend.length - 1] ?? null;

  return (
    <div className="space-y-6">
      {/* Operational Overview Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] px-5 py-4 shadow-2xs">
        <div>
          <div className="text-xs font-medium text-[#6B746E]">
            {businessName} · {items.length} products across {categoryCount} categories
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[#292F2C]">
            Inventory &amp; Demand Command Center
          </h2>
          <p className="mt-0.5 text-xs text-[#6B746E]">
            {summary.criticalCount > 0
              ? `${summary.criticalCount} critical stockout alerts and ${summary.reorderCount} reorder recommendations active.`
              : `${summary.healthyCount} products operating within healthy stock cover targets.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" variant="secondary" onClick={() => onNavigateTab('inventory')}>
            <Layers className="h-3.5 w-3.5 text-[#6B746E]" />
            Browse Catalog
          </Button>
          <Button type="button" variant="primary" onClick={() => onNavigateTab('orders')}>
            <ShoppingBag className="h-3.5 w-3.5" />
            Review Reorders ({summary.criticalCount + summary.reorderCount})
          </Button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#6B746E]">On-Hand Inventory Value</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEEAE0] text-[#145A43]">
              <IndianRupee className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#292F2C]">
            {formatCurrency(summary.totalInventoryValue)}
          </div>
          <div className="mt-2 text-xs text-[#6B746E] tabular-nums">
            Incoming POs: {formatCurrency(summary.totalIncomingValue)} · 90d Rev:{' '}
            {formatCurrency(summary.projected90DayRevenue, true)}
          </div>
        </div>

        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#6B746E]">Immediate Reorder Spend</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#38865B]/12 text-[#38865B]">
              <ShoppingBag className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#145A43]">
            {formatCurrency(summary.totalRecommendedOrderCost)}
          </div>
          <div className="mt-2 text-xs text-[#6B746E] tabular-nums">
            {formatNumber(summary.totalRecommendedUnits)} units ·{' '}
            {summary.criticalCount + summary.reorderCount} SKUs below ROP
          </div>
        </div>

        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#6B746E]">Stockout Risk Exposure</span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                summary.criticalCount > 0
                  ? 'bg-[#C65353]/12 text-[#C65353]'
                  : 'bg-[#38865B]/12 text-[#38865B]'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-semibold tabular-nums ${
                summary.criticalCount > 0 ? 'text-[#B43F3F]' : 'text-[#38865B]'
              }`}
            >
              {summary.criticalCount} Critical
            </span>
            <span className="font-mono text-sm tabular-nums text-[#929A94]">
              / {items.length} SKUs
            </span>
          </div>
          <div className="mt-2 text-xs text-[#6B746E] tabular-nums">
            Avg lead-time stockout risk: {summary.avgStockoutRiskPct.toFixed(1)}%
          </div>
        </div>

        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#6B746E]">Trapped Overstock Capital</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6A23C]/16 text-[#9A6714]">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#9A6714]">
            {formatCurrency(summary.totalTrappedCapital)}
          </div>
          <div className="mt-2 text-xs text-[#6B746E] tabular-nums">
            {summary.overstockCount} overstocked · {summary.healthyCount} healthy SKUs
          </div>
        </div>
      </div>

      {/* Real Sales Movement & Stock Health Distribution Strip */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#292F2C]">
                Recent Portfolio Unit Sales Movement
              </h3>
              <p className="text-xs text-[#6B746E]">
                Aggregate monthly units sold across the last {salesTrend.length} recorded periods
              </p>
            </div>
            {activeTrendPoint && (
              <span className="font-mono text-xs font-semibold tabular-nums text-[#145A43]">
                {activeTrendPoint.label}: {formatNumber(activeTrendPoint.units)} units
              </span>
            )}
          </div>

          {salesTrend.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#6B746E]">
              No historical monthly sales recorded yet.
            </div>
          ) : (
            <div
              className="grid items-end gap-2.5 pt-2 sm:gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, salesTrend.length)}, minmax(0, 1fr))`,
              }}
            >
              {salesTrend.map((pt, idx) => {
                const heightPct = Math.max(14, Math.round((pt.units / maxTrendUnits) * 100));
                const isLatest = idx === salesTrend.length - 1;
                const isFocused = hoveredMonth ? hoveredMonth === pt.month : isLatest;
                return (
                  <button
                    key={pt.month}
                    type="button"
                    onMouseEnter={() => setHoveredMonth(pt.month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    onClick={() => setHoveredMonth(pt.month)}
                    className="flex flex-col items-center gap-1.5 text-center focus:outline-none"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-[#6B746E]">
                      {formatNumber(pt.units)}
                    </span>
                    <div className="flex h-28 w-full items-end rounded-md bg-[#EEEAE0]/60 p-1">
                      <div
                        className={`w-full rounded-sm transition-all duration-200 ${
                          isFocused ? 'bg-[#E6A23C]' : 'bg-[#145A43]'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-[#6B746E]">{pt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs lg:col-span-5">
          <div>
            <h3 className="text-base font-semibold text-[#292F2C]">Stock Posture Breakdown</h3>
            <p className="text-xs text-[#6B746E]">
              Distribution of all {items.length} SKUs against Reorder Point &amp; EOQ policy
            </p>

            {/* Stacked Progress Bar */}
            <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-[#EEEAE0]">
              <div
                style={{ width: `${(summary.criticalCount / totalCount) * 100}%` }}
                className="bg-[#C65353]"
                title={`Critical: ${summary.criticalCount}`}
              />
              <div
                style={{ width: `${(summary.reorderCount / totalCount) * 100}%` }}
                className="bg-[#D99A32]"
                title={`Reorder Now: ${summary.reorderCount}`}
              />
              <div
                style={{ width: `${(summary.healthyCount / totalCount) * 100}%` }}
                className="bg-[#38865B]"
                title={`Healthy: ${summary.healthyCount}`}
              />
              <div
                style={{ width: `${(summary.overstockCount / totalCount) * 100}%` }}
                className="bg-[#527A9B]"
                title={`Overstock: ${summary.overstockCount}`}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => onFilterByStatus('Critical Stockout')}
                className="flex items-center justify-between rounded-lg border border-transparent bg-[#EEEAE0]/55 px-3 py-2 text-left hover:border-[#C65353]/35 hover:bg-[#EEEAE0]"
              >
                <span className="inline-flex items-center gap-2 text-[#292F2C]">
                  <span className="h-2 w-2 rounded-full bg-[#C65353]" />
                  Critical
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#B43F3F]">
                  {summary.criticalCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onFilterByStatus('Reorder Now')}
                className="flex items-center justify-between rounded-lg border border-transparent bg-[#EEEAE0]/55 px-3 py-2 text-left hover:border-[#D99A32]/40 hover:bg-[#EEEAE0]"
              >
                <span className="inline-flex items-center gap-2 text-[#292F2C]">
                  <span className="h-2 w-2 rounded-full bg-[#D99A32]" />
                  Reorder Now
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#9A6714]">
                  {summary.reorderCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onFilterByStatus('Healthy')}
                className="flex items-center justify-between rounded-lg border border-transparent bg-[#EEEAE0]/55 px-3 py-2 text-left hover:border-[#38865B]/35 hover:bg-[#EEEAE0]"
              >
                <span className="inline-flex items-center gap-2 text-[#292F2C]">
                  <span className="h-2 w-2 rounded-full bg-[#38865B]" />
                  Healthy
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#2C6E49]">
                  {summary.healthyCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onFilterByStatus('Overstock')}
                className="flex items-center justify-between rounded-lg border border-transparent bg-[#EEEAE0]/55 px-3 py-2 text-left hover:border-[#527A9B]/35 hover:bg-[#EEEAE0]"
              >
                <span className="inline-flex items-center gap-2 text-[#292F2C]">
                  <span className="h-2 w-2 rounded-full bg-[#527A9B]" />
                  Overstock
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#3F6280]">
                  {summary.overstockCount}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#EEEAE0] pt-3 text-xs text-[#6B746E]">
            <span>Explore detailed SKU risk &amp; P10–P90 forecasts</span>
            <button
              type="button"
              onClick={() => onNavigateTab('forecast')}
              className="inline-flex items-center gap-1 font-medium text-[#145A43] hover:text-[#104735]"
            >
              Forecast View
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category & Matrix Charts */}
      <PortfolioChart
        items={items}
        onSelectAbcXyz={onFilterByMatrix}
        onSelectCategory={onFilterByCategory}
      />

      {/* Priority Purchasing & Risk Table + AI Executive Audit */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Priority Action Queue */}
        <div className="overflow-hidden rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-2xs xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD1] px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-[#292F2C]">
                Priority Stock &amp; Reorder Queue
              </h3>
              <p className="text-xs text-[#6B746E]">
                Ranked by lead-time stockout probability and capital impact
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#EEEAE0] p-1">
                {(
                  [
                    ['all', `All Alerts (${alertItemsCount})`],
                    ['Critical Stockout', `Critical (${summary.criticalCount})`],
                    ['Reorder Now', `Reorder (${summary.reorderCount})`],
                    ['Overstock', `Overstock (${summary.overstockCount})`],
                  ] as Array<[QueueTab, string]>
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setQueueFilter(tab)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
                      queueFilter === tab
                        ? 'bg-[#FFFEFA] text-[#292F2C] shadow-2xs'
                        : 'text-[#6B746E] hover:text-[#292F2C]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => onNavigateTab('orders')}>
                Purchase Builder
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {priorityItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-[#38865B]" />
              <p className="mt-3 text-sm font-medium text-[#292F2C]">
                No SKUs in this alert bucket
              </p>
              <p className="mt-1 text-xs text-[#6B746E]">
                Switch filter tabs or stress-test demand spikes inside Scenario Lab.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2DDD1] bg-[#EEEAE0]/60 text-[#6B746E]">
                    <th className="px-4 py-2.5 font-medium">Product / SKU</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">On Hand</th>
                    <th className="px-3 py-2.5 text-right font-medium">ROP</th>
                    <th className="px-3 py-2.5 text-right font-medium">Risk</th>
                    <th className="px-3 py-2.5 text-right font-medium">Order Qty</th>
                    <th className="px-4 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEAE0]">
                  {priorityItems.map((item) => {
                    const unit = inferSkuUnit(item.sku);
                    return (
                      <tr key={item.sku.id} className="hover:bg-[#EEEAE0]/35">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ProductImage
                              name={item.sku.name}
                              category={item.sku.category}
                              skuCode={item.sku.skuCode}
                              imageUrl={item.sku.imageUrl}
                              compact
                              className="h-9 w-9 rounded-lg border border-[#E2DDD1]"
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-[#292F2C]">{item.sku.name}</div>
                              <div className="mt-0.5 text-[11px] text-[#6B746E]">
                                <span className="font-mono">{item.sku.skuCode}</span> · Class{' '}
                                {item.abcClass}
                                {item.xyzClass} · {item.daysOfSupply}d supply
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <StatusBadge status={item.status} compact />
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[#292F2C]">
                          {formatNumber(item.sku.currentStock)}{' '}
                          <span className="text-[10px] text-[#929A94]">{unit}</span>
                          {item.sku.incomingStock > 0 && (
                            <span className="block text-[10px] text-[#38865B]">
                              +{item.sku.incomingStock} in
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[#6B746E]">
                          {formatNumber(item.reorderPoint)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[#292F2C]">
                          {formatPct(item.stockoutProbability)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-[#145A43]">
                          {item.recommendedOrderQty > 0 ? formatNumber(item.recommendedOrderQty) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onInspectSku(item.sku.id)}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-[#145A43] hover:bg-[#145A43]/10"
                          >
                            Forecast
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Executive Portfolio Audit */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-2xs xl:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-[#E2DDD1] px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-[#292F2C]">
                AI Procurement Briefing
              </h3>
              <p className="text-xs text-[#6B746E]">{businessName}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRunAudit}
              disabled={auditLoading || items.length === 0}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
              {auditLoading ? 'Analyzing...' : audit ? 'Refresh Brief' : 'Generate Brief'}
            </Button>
          </div>

          <div className="flex-1 p-5">
            {auditError && (
              <div className="mb-4 rounded-lg border border-[#C65353]/35 bg-[#C65353]/10 p-3.5 text-xs text-[#9E3535]">
                <div className="font-semibold">AI Briefing Unavailable</div>
                <p className="mt-1">{auditError}</p>
              </div>
            )}

            {auditLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-full rounded bg-[#EEEAE0]" />
                <div className="h-4 w-5/6 rounded bg-[#EEEAE0]" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-1/3 rounded bg-[#EEEAE0]" />
                  <div className="h-3 w-full rounded bg-[#EEEAE0]" />
                  <div className="h-3 w-11/12 rounded bg-[#EEEAE0]" />
                </div>
              </div>
            ) : audit ? (
              <div className="space-y-4 text-xs leading-relaxed text-[#292F2C]">
                <p className="text-sm leading-relaxed text-[#292F2C]">{audit.summary}</p>

                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-[#292F2C]">
                    Immediate Purchasing Actions
                  </h4>
                  <ul className="space-y-1.5 text-[#6B746E]">
                    {audit.urgentActions.map((act, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-mono font-semibold text-[#D99A32]">
                          0{idx + 1}.
                        </span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-[#292F2C]">
                    Working Capital Recovery
                  </h4>
                  <ul className="space-y-1.5 text-[#6B746E]">
                    {audit.workingCapitalOpportunities.map((opp, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-[#929A94]">·</span>
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-[#292F2C]">
                    Supplier &amp; Lead-Time Considerations
                  </h4>
                  <ul className="space-y-1.5 text-[#6B746E]">
                    {audit.supplierConcentrationRisks.map((risk, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-[#929A94]">·</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEEAE0] text-[#145A43]">
                  <Package className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-medium text-[#292F2C]">
                  Run an AI procurement audit across {items.length} SKUs
                </p>
                <p className="mt-1 max-w-xs text-xs text-[#6B746E]">
                  Synthesizes seasonal inflection points, safety stock gaps, and overstocked capital into an executive plan.
                </p>
                <Button type="button" variant="primary" className="mt-4" onClick={onRunAudit}>
                  Generate Executive Briefing
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
