import { useState } from 'react';

export interface ChartPoint {
  id: string;
  label: string;
  shortLabel: string;
  value: number;
}

interface EditorialTrendChartProps {
  points: ChartPoint[];
  height?: number;
  accentColor?: string;
  yMin?: number;
  yMax?: number;
  ariaLabel: string;
  compact?: boolean;
}

export function EditorialTrendChart({
  points,
  height = 180,
  accentColor = '#1B4332',
  yMin = 0,
  yMax = 100,
  ariaLabel,
  compact = false,
}: EditorialTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center border border-[#E2DCD0] bg-[#F4F0E8]/40 text-xs text-[#686259]"
        style={{ height }}
      >
        No periods recorded yet.
      </div>
    );
  }

  const width = compact ? 300 : 620;
  const padLeft = compact ? 28 : 38;
  const padRight = compact ? 14 : 20;
  const padTop = compact ? 14 : 18;
  const padBottom = compact ? 24 : 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) => {
    if (points.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (points.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    const ratio = (val - yMin) / Math.max(1, yMax - yMin);
    const clamped = Math.min(1, Math.max(0, ratio));
    return padTop + plotH - clamped * plotH;
  };

  const coords = points.map((p, i) => ({
    ...p,
    x: getX(i),
    y: getY(p.value),
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  const yTicks = compact ? [0, 50, 100] : [0, 25, 50, 75, 100];
  const activePoint = hoveredIdx !== null ? coords[hoveredIdx] : coords[coords.length - 1];

  return (
    <div className="w-full">
      {!compact && activePoint && (
        <div className="mb-1.5 flex items-baseline justify-between text-xs text-[#686259]">
          <span>{activePoint.label}</span>
          <span className="font-mono font-semibold tabular-nums text-[#1C1917]">
            {activePoint.value} / 100
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Horizontal hairline grid */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="#E2DCD0"
                strokeWidth="1"
                strokeDasharray={tick === 0 ? undefined : '2 3'}
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-[#686259] font-mono text-[9px]"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Subtle paper wash under line */}
        {areaPath && <path d={areaPath} fill={accentColor} fillOpacity="0.06" />}

        {/* Main line */}
        {coords.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke={accentColor}
            strokeWidth={compact ? 1.75 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points & x labels */}
        {coords.map((c, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g key={c.id}>
              <circle
                cx={c.x}
                cy={c.y}
                r={isHovered ? 4.5 : compact ? 2.8 : 3.5}
                fill="#FBF9F5"
                stroke={accentColor}
                strokeWidth={isHovered ? 2.2 : 1.75}
              />
              {/* Wide transparent hover target */}
              <rect
                x={c.x - 18}
                y={padTop}
                width={36}
                height={plotH + padBottom}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
              />
              <text
                x={c.x}
                y={height - 6}
                textAnchor="middle"
                className="fill-[#686259] font-mono text-[9px]"
              >
                {c.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
