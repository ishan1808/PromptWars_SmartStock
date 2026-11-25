import React, { useState } from 'react';
import type { ForecastPoint } from '../shared/types.ts';
import { formatNumber } from '../utils/format.ts';

interface ForecastChartProps {
  series: ForecastPoint[];
  avgMonthlyDemand: number;
  currentStock: number;
  safetyStock: number;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  series,
  avgMonthlyDemand,
  currentStock,
  safetyStock,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-[#E2DDD1] bg-[#EEEAE0]/50 text-sm text-[#6B746E]">
        No historical or forecast data available for this SKU.
      </div>
    );
  }

  const width = 760;
  const height = 290;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allValues = series.flatMap((pt) => [
    pt.actual ?? 0,
    pt.p50,
    pt.p90,
    avgMonthlyDemand,
  ]);
  const maxY = Math.max(10, Math.ceil(Math.max(...allValues) * 1.12));

  const xAt = (idx: number) =>
    series.length === 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (series.length - 1)) * plotW;

  const yAt = (val: number) => padTop + plotH - (Math.max(0, val) / maxY) * plotH;

  const firstForecastIdx = series.findIndex((s) => s.isForecast);
  const splitIdx = firstForecastIdx > 0 ? firstForecastIdx - 1 : 0;

  const actualPoints = series
    .map((pt, i) => (pt.actual !== undefined ? { x: xAt(i), y: yAt(pt.actual) } : null))
    .filter((p): p is { x: number; y: number } => p !== null);

  const actualPath = actualPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const forecastStartIdx = firstForecastIdx > 0 ? firstForecastIdx - 1 : 0;
  const forecastSlice = series.slice(forecastStartIdx);

  const p50Path = forecastSlice
    .map((pt, i) => {
      const idx = forecastStartIdx + i;
      const val = i === 0 && pt.actual !== undefined ? pt.actual : pt.p50;
      return `${i === 0 ? 'M' : 'L'} ${xAt(idx).toFixed(1)} ${yAt(val).toFixed(1)}`;
    })
    .join(' ');

  const upperCone = forecastSlice.map((pt, i) => {
    const idx = forecastStartIdx + i;
    const val = i === 0 && pt.actual !== undefined ? pt.actual : pt.p90;
    return `${xAt(idx).toFixed(1)},${yAt(val).toFixed(1)}`;
  });
  const lowerCone = [...forecastSlice]
    .reverse()
    .map((pt, revI) => {
      const i = forecastSlice.length - 1 - revI;
      const idx = forecastStartIdx + i;
      const val = i === 0 && pt.actual !== undefined ? pt.actual : pt.p10;
      return `${xAt(idx).toFixed(1)},${yAt(val).toFixed(1)}`;
    });
  const conePoints = [...upperCone, ...lowerCone].join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxY * t));

  const hoveredPoint = hoveredIdx !== null ? series[hoveredIdx] : null;
  const avgY = yAt(avgMonthlyDemand);

  return (
    <div className="relative w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4 text-xs text-[#6B746E]">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 bg-[#145A43]" />
            Actual Sales
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#D99A32]" />
            Predicted Demand (P50)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-4 rounded-xs border border-[#38865B]/35 bg-[#38865B]/16" />
            P10–P90 Uncertainty Band
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-[#929A94]" />
            12-Mo Avg ({formatNumber(avgMonthlyDemand)} u/mo)
          </span>
        </div>
        <span className="font-mono tabular-nums text-[#6B746E]">
          On-Hand: {formatNumber(currentStock)} u · Safety Stock: {formatNumber(safetyStock)} u
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[540px] select-none"
          role="img"
          aria-label="Probabilistic demand forecast chart"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {yTicks.map((tick) => {
            const y = yAt(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E7E2D6"
                  strokeWidth="1"
                />
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

          {firstForecastIdx > 0 && (
            <rect
              x={xAt(splitIdx)}
              y={padTop}
              width={width - padRight - xAt(splitIdx)}
              height={plotH}
              fill="#EEEAE0"
              fillOpacity="0.45"
            />
          )}

          {firstForecastIdx > 0 && (
            <g>
              <line
                x1={xAt(splitIdx)}
                y1={padTop}
                x2={xAt(splitIdx)}
                y2={padTop + plotH}
                stroke="#D2CCB9"
                strokeDasharray="3 3"
                strokeWidth="1.2"
              />
              <text
                x={xAt(splitIdx) + 6}
                y={padTop + 12}
                className="fill-[#9A6714] font-sans text-[11px] font-semibold"
              >
                Forecast Horizon
              </text>
            </g>
          )}

          {forecastSlice.length > 1 && (
            <polygon points={conePoints} fill="#38865B" fillOpacity="0.16" />
          )}

          {avgMonthlyDemand <= maxY && (
            <line
              x1={padLeft}
              y1={avgY}
              x2={width - padRight}
              y2={avgY}
              stroke="#929A94"
              strokeDasharray="4 4"
              strokeWidth="1.1"
            />
          )}

          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="#145A43"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          )}

          {p50Path && (
            <path
              d={p50Path}
              fill="none"
              stroke="#D99A32"
              strokeWidth="2.4"
              strokeDasharray="6 3"
              strokeLinejoin="round"
            />
          )}

          {series.map((pt, i) => {
            const cx = xAt(i);
            const cy = yAt(pt.actual !== undefined ? pt.actual : pt.p50);
            const isHovered = hoveredIdx === i;
            const showLabel = series.length <= 14 || i % 2 === 0 || i === series.length - 1;

            return (
              <g key={pt.month}>
                {showLabel && (
                  <text
                    x={cx}
                    y={height - 12}
                    textAnchor="middle"
                    className={`font-mono text-[11px] ${
                      pt.isForecast ? 'fill-[#9A6714] font-medium' : 'fill-[#6B746E]'
                    }`}
                  >
                    {pt.label}
                  </text>
                )}

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
                  r={isHovered ? 5 : 3.2}
                  fill={pt.isForecast ? '#E6A23C' : '#145A43'}
                  stroke="#FFFEFA"
                  strokeWidth="1.6"
                />

                <rect
                  x={cx - plotW / (series.length * 2)}
                  y={padTop}
                  width={plotW / series.length}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onClick={() => setHoveredIdx((prev) => (prev === i ? null : i))}
                />
              </g>
            );
          })}
        </svg>

        {hoveredPoint && hoveredIdx !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-lg border border-[#E2DDD1] bg-[#FFFEFA] px-3 py-2 text-xs shadow-sm"
            style={{
              left: hoveredIdx > series.length / 2 ? '16px' : 'auto',
              right: hoveredIdx <= series.length / 2 ? '16px' : 'auto',
            }}
          >
            <div className="mb-1 flex items-center justify-between gap-4 font-semibold text-[#292F2C]">
              <span>{hoveredPoint.label}</span>
              <span className="font-mono text-[11px] font-normal text-[#6B746E]">
                Seasonality {hoveredPoint.seasonalIndex.toFixed(2)}x
              </span>
            </div>
            <div className="space-y-0.5 font-mono tabular-nums text-[#292F2C]">
              {hoveredPoint.actual !== undefined && (
                <div className="text-[#145A43]">Actual Sold: {formatNumber(hoveredPoint.actual)} u</div>
              )}
              <div className="font-semibold text-[#9A6714]">
                {hoveredPoint.isForecast ? 'Predicted (P50)' : 'Model Fit'}:{' '}
                {formatNumber(hoveredPoint.p50)} u
              </div>
              {hoveredPoint.isForecast && (
                <div className="text-[#6B746E]">
                  P10–P90 Range: {formatNumber(hoveredPoint.p10)} – {formatNumber(hoveredPoint.p90)} u
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
