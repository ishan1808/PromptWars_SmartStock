import React, { useState } from 'react';
import type { AbcClass, SkuAnalytics, XyzClass } from '../shared/types.ts';
import { formatCurrency } from '../utils/format.ts';

interface PortfolioChartProps {
  items: SkuAnalytics[];
  onSelectAbcXyz?: (abc: AbcClass, xyz: XyzClass) => void;
  onSelectCategory?: (category: string) => void;
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  items,
  onSelectAbcXyz,
  onSelectCategory,
}) => {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const categoryMap = new Map<
    string,
    {
      category: string;
      skuCount: number;
      inventoryValue: number;
      reorderCost: number;
      trappedCapital: number;
    }
  >();

  items.forEach((item) => {
    const existing = categoryMap.get(item.sku.category) ?? {
      category: item.sku.category,
      skuCount: 0,
      inventoryValue: 0,
      reorderCost: 0,
      trappedCapital: 0,
    };
    existing.skuCount += 1;
    existing.inventoryValue += item.inventoryValue;
    existing.reorderCost += item.recommendedOrderCost;
    existing.trappedCapital += item.trappedCapital;
    categoryMap.set(item.sku.category, existing);
  });

  const categories = Array.from(categoryMap.values()).sort(
    (a, b) => b.inventoryValue + b.reorderCost - (a.inventoryValue + a.reorderCost)
  );
  const maxBar = Math.max(
    100,
    ...categories.map((c) => Math.max(c.inventoryValue, c.reorderCost))
  );

  const abcRows: AbcClass[] = ['A', 'B', 'C'];
  const xyzCols: XyzClass[] = ['X', 'Y', 'Z'];

  const cellData = (abc: AbcClass, xyz: XyzClass) => {
    const matched = items.filter((i) => i.abcClass === abc && i.xyzClass === xyz);
    const value = matched.reduce((acc, i) => acc + i.inventoryValue, 0);
    const critical = matched.filter((i) => i.status === 'Critical Stockout').length;
    return { count: matched.length, value, critical };
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Category Working Capital Allocation */}
      <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs lg:col-span-7">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-[#EEEAE0] pb-3.5">
          <div>
            <h3 className="text-base font-semibold text-[#292F2C]">
              Category Inventory &amp; Reorder Exposure
            </h3>
            <p className="mt-0.5 text-xs text-[#6B746E]">
              On-hand stock valuation vs. recommended purchase orders across {categories.length} categories
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#6B746E]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#145A43]" />
              On-Hand Value
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#E6A23C]" />
              Recommended PO
            </span>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B746E]">No category data available.</div>
        ) : (
          <div className="max-h-[330px] space-y-3 overflow-y-auto pr-1.5">
            {categories.map((cat) => {
              const invPct = Math.max(2, (cat.inventoryValue / maxBar) * 100);
              const poPct = cat.reorderCost > 0 ? Math.max(2, (cat.reorderCost / maxBar) * 100) : 0;
              const isHovered = hoveredCat === cat.category;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onMouseEnter={() => setHoveredCat(cat.category)}
                  onMouseLeave={() => setHoveredCat(null)}
                  onClick={() => onSelectCategory?.(cat.category)}
                  className={`block w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                    isHovered ? 'bg-[#EEEAE0]/60' : 'hover:bg-[#EEEAE0]/40'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-[#292F2C]">
                      {cat.category}{' '}
                      <span className="font-mono text-[11px] font-normal text-[#929A94]">
                        ({cat.skuCount})
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-[#6B746E]">
                      Stock {formatCurrency(cat.inventoryValue)}
                      {cat.reorderCost > 0 ? ` · PO ${formatCurrency(cat.reorderCost)}` : ''}
                      {cat.trappedCapital > 0
                        ? ` · Excess ${formatCurrency(cat.trappedCapital)}`
                        : ''}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEEAE0]">
                      <div
                        className="h-2 rounded-full bg-[#145A43] transition-all duration-200"
                        style={{ width: `${Math.min(100, invPct)}%` }}
                      />
                    </div>
                    {poPct > 0 && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEEAE0]">
                        <div
                          className="h-1.5 rounded-full bg-[#E6A23C] transition-all duration-200"
                          style={{ width: `${Math.min(100, poPct)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: ABC / XYZ Demand Volatility Matrix */}
      <div className="rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs lg:col-span-5">
        <div className="mb-4 border-b border-[#EEEAE0] pb-3.5">
          <h3 className="text-base font-semibold text-[#292F2C]">
            ABC / XYZ Risk Matrix
          </h3>
          <p className="mt-0.5 text-xs text-[#6B746E]">
            Click any cell to filter inventory by value share (A–C) and volatility (X–Z)
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <div />
          {xyzCols.map((x) => (
            <div key={x} className="pb-1 text-center font-medium text-[#6B746E]">
              {x}{' '}
              <span className="hidden sm:inline">
                ({x === 'X' ? 'Steady' : x === 'Y' ? 'Seasonal' : 'Volatile'})
              </span>
            </div>
          ))}

          {abcRows.map((abc) => (
            <React.Fragment key={abc}>
              <div className="flex flex-col justify-center font-medium text-[#292F2C]">
                <span>Class {abc}</span>
                <span className="text-[11px] font-normal text-[#929A94]">
                  {abc === 'A' ? '70% rev' : abc === 'B' ? '20% rev' : '10% rev'}
                </span>
              </div>
              {xyzCols.map((xyz) => {
                const cell = cellData(abc, xyz);
                const hasCritical = cell.critical > 0;
                return (
                  <button
                    key={`${abc}${xyz}`}
                    type="button"
                    onClick={() => onSelectAbcXyz?.(abc, xyz)}
                    disabled={cell.count === 0}
                    className={`flex flex-col items-start justify-between rounded-lg border p-2.5 text-left ${
                      cell.count === 0
                        ? 'cursor-default border-[#EEEAE0] bg-[#F5F1E8]/55 text-[#929A94]'
                        : hasCritical
                          ? 'border-[#C65353]/35 bg-[#C65353]/8 text-[#292F2C] hover:border-[#C65353]/60 hover:bg-[#C65353]/14'
                          : 'border-[#E2DDD1] bg-[#EEEAE0]/45 text-[#292F2C] hover:border-[#145A43]/45 hover:bg-[#38865B]/10'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold">
                        {abc}
                        {xyz}
                      </span>
                      <span className="font-mono tabular-nums text-xs font-semibold">
                        {cell.count}
                      </span>
                    </div>
                    <div className="mt-1 font-mono tabular-nums text-[11px] text-[#6B746E]">
                      {cell.count > 0 ? formatCurrency(cell.value, true) : '—'}
                    </div>
                    {hasCritical && (
                      <div className="mt-0.5 font-mono text-[10px] font-medium text-[#B43F3F]">
                        {cell.critical} critical
                      </div>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
