import React, { useState } from 'react';
import type { SkuAnalytics } from '../shared/types.ts';
import { formatNumber } from '../utils/format.ts';

interface InventoryRunwayChartProps {
  analytics: SkuAnalytics;
}

interface RunwayPoint {
  week: number;
  label: string;
  p50Stock: number;
  p10Stock: number;
  p90Stock: number;
  incomingArrived: boolean;
}

export const InventoryRunwayChart: React.FC<InventoryRunwayChartProps> = ({ analytics }) => {
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  const { sku, reorderPoint, safetyStock, effectiveLeadTimeDays, series } = analytics;
  const futureMonths = series.filter((s) => s.isForecast);

  const weeklyPoints: RunwayPoint[] = [];
  let stockP50 = sku.currentStock;
  let stockLowBurn = sku.currentStock;
  let stockHighBurn = sku.currentStock;
  const arrivalWeek = Math.max(1, Math.ceil(effectiveLeadTimeDays / 7));
  let incomingAdded = false;

  weeklyPoints.push({
    week: 0,
    label: 'Now',
    p50Stock: stockP50,
    p10Stock: stockLowBurn,
    p90Stock: stockHighBurn,
    incomingArrived: false,
  });

  for (let w = 1; w <= 12; w++) {
    const monthBucket = futureMonths[Math.min(futureMonths.length - 1, Math.floor((w - 1) / 4.33))];
    const weeklyP50 = (monthBucket?.p50 ?? analytics.nextMonthForecast) / 4.33;
    const weeklyP10 = (monthBucket?.p10 ?? analytics.nextMonthForecast * 0.8) / 4.33;
    const weeklyP90 = (monthBucket?.p90 ?? analytics.nextMonthForecast * 1.2) / 4.33;

    let arrivedNow = false;
    if (!incomingAdded && w === arrivalWeek && sku.incomingStock > 0) {
      stockP50 += sku.incomingStock;
      stockLowBurn += sku.incomingStock;
      stockHighBurn += sku.incomingStock;
      incomingAdded = true;
      arrivedNow = true;
    }

    stockP50 = Math.max(0, Math.round(stockP50 - weeklyP50));
    stockLowBurn = Math.max(0, Math.round(stockLowBurn - weeklyP10));
    stockHighBurn = Math.max(0, Math.round(stockHighBurn - weeklyP90));

    weeklyPoints.push({
      week: w,
      label: `Wk ${w}`,
      p50Stock: stockP50,
      p10Stock: stockLowBurn,
      p90Stock: stockHighBurn,
      incomingArrived: arrivedNow,
    });
  }

  const width = 760;
  const height = 270;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxY = Math.max(
    20,
    Math.ceil(
      Math.max(
        ...weeklyPoints.flatMap((p) => [p.p10Stock, p.p50Stock]),
        reorderPoint,
        safetyStock
      ) * 1.12
    )
  );

  const xAt = (idx: number) => padLeft + (idx / (weeklyPoints.length - 1)) * plotW;
  const yAt = (val: number) => padTop + plotH - (Math.max(0, val) / maxY) * plotH;

  const p50Path = weeklyPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.p50Stock).toFixed(1)}`)
    .join(' ');

  const p90Path = weeklyPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.p90Stock).toFixed(1)}`)
    .join(' ');

  const bandPoints = [
    ...weeklyPoints.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.p10Stock).toFixed(1)}`),
    ...[...weeklyPoints]
      .reverse()
      .map((p, revI) => {
        const i = weeklyPoints.length - 1 - revI;
        return `${xAt(i).toFixed(1)},${yAt(p.p90Stock).toFixed(1)}`;
      }),
  ].join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxY * t));
  const hovered = hoveredWeek !== null ? weeklyPoints[hoveredWeek] : null;

  return (
    <div className="relative w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4 text-xs text-[#6B746E]">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 bg-[#145A43]" />
            Expected Stock (P50 Burn)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-[#C65353]" />
            High-Demand Surge (P90)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-[#D99A32]" />
            Reorder Point ({formatNumber(reorderPoint)} u)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 border-t border-dotted border-[#C65353]" />
            Safety Stock ({formatNumber(safetyStock)} u)
          </span>
        </div>
        <span className="font-mono tabular-nums text-[#6B746E]">
          Runway: {analytics.daysOfSupply} days
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[540px] select-none"
          role="img"
          aria-label="12-week projected inventory runway chart"
          onMouseLeave={() => setHoveredWeek(null)}
        >
          {yTicks.map((tick) => {
            const y = yAt(tick);
            return (
              <g key={tick}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#E7E2D6" />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#929A94] font-mono text-[11px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <polygon points={bandPoints} fill="#EEEAE0" fillOpacity="0.7" />

          {reorderPoint <= maxY && (
            <line
              x1={padLeft}
              y1={yAt(reorderPoint)}
              x2={width - padRight}
              y2={yAt(reorderPoint)}
              stroke="#D99A32"
              strokeDasharray="5 4"
              strokeWidth="1.4"
            />
          )}

          {safetyStock <= maxY && (
            <line
              x1={padLeft}
              y1={yAt(safetyStock)}
              x2={width - padRight}
              y2={yAt(safetyStock)}
              stroke="#C65353"
              strokeDasharray="2 3"
              strokeWidth="1.3"
            />
          )}

          <path d={p90Path} fill="none" stroke="#C65353" strokeDasharray="4 3" strokeWidth="1.7" />
          <path d={p50Path} fill="none" stroke="#145A43" strokeWidth="2.4" />

          {weeklyPoints.map((pt, i) => {
            const cx = xAt(i);
            const cy = yAt(pt.p50Stock);
            const isHovered = hoveredWeek === i;
            return (
              <g key={pt.week}>
                <text
                  x={cx}
                  y={height - 12}
                  textAnchor="middle"
                  className="fill-[#6B746E] font-mono text-[11px]"
                >
                  {pt.label}
                </text>
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padTop}
                    x2={cx}
                    y2={padTop + plotH}
                    stroke="#6B746E"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : pt.incomingArrived ? 4.5 : 3.2}
                  fill={pt.incomingArrived ? '#38865B' : '#145A43'}
                  stroke="#FFFEFA"
                  strokeWidth="1.6"
                />
                <rect
                  x={cx - plotW / (weeklyPoints.length * 2)}
                  y={padTop}
                  width={plotW / weeklyPoints.length}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredWeek(i)}
                  onClick={() => setHoveredWeek((prev) => (prev === i ? null : i))}
                />
              </g>
            );
          })}
        </svg>

        {hovered && hoveredWeek !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-lg border border-[#E2DDD1] bg-[#FFFEFA] px-3 py-2 text-xs shadow-sm"
            style={{
              left: hoveredWeek > 6 ? '16px' : 'auto',
              right: hoveredWeek <= 6 ? '16px' : 'auto',
            }}
          >
            <div className="mb-1 font-semibold text-[#292F2C]">
              {hovered.label}
              {hovered.incomingArrived ? ` (+${sku.incomingStock} incoming PO arrived)` : ''}
            </div>
            <div className="space-y-0.5 font-mono tabular-nums text-[#292F2C]">
              <div className="text-[#145A43]">Expected Stock (P50): {formatNumber(hovered.p50Stock)} u</div>
              <div className="text-[#B43F3F]">Surge Burn (P90): {formatNumber(hovered.p90Stock)} u</div>
              <div className="text-[#6B746E]">Slow Burn (P10): {formatNumber(hovered.p10Stock)} u</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
