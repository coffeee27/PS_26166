import React, { useMemo, useState } from 'react';
import type { RegistrationResult } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { Grid, Info } from 'lucide-react';
import { formatPercent, formatPx } from '../../utils/registration';

type HexStatus = 'empty' | 'strong' | 'good' | 'uncertain' | 'poor';

interface Hexagon {
  id: number;
  row: number;
  col: number;
  cx: number;
  cy: number;
  count: number;
  rmsePx: number | null;
  status: HexStatus;
}

const COLUMNS = 10;

const STATUS_STYLE: Record<HexStatus, { fill: string; opacity: number }> = {
  empty: { fill: '#64748B', opacity: 0.45 },
  strong: { fill: '#176B87', opacity: 0.55 },
  good: { fill: '#5FA8C2', opacity: 0.45 },
  uncertain: { fill: '#E3A93B', opacity: 0.55 },
  poor: { fill: '#B94A48', opacity: 0.6 },
};

/** Bin tie points into a pointy-top hexagon grid laid over the reference image. */
function buildHexagons(result: RegistrationResult): { hexagons: Hexagon[]; radius: number } {
  const [height, width] = result.referenceShape;
  const hexWidth = width / COLUMNS;
  const radius = hexWidth / Math.sqrt(3);
  const rowStep = 1.5 * radius;
  const rows = Math.ceil(height / rowStep) + 1;

  const centre = (row: number, col: number) => ({ cx: col * hexWidth + (row % 2 ? hexWidth / 2 : 0), cy: row * rowStep });
  const sums = new Map<string, { count: number; squared: number; withError: number }>();

  for (const point of result.tiePoints) {
    const [x, y] = point.reference;
    const approxRow = Math.round(y / rowStep);
    let best = { key: '', distance: Infinity };
    for (let row = approxRow - 1; row <= approxRow + 1; row++) {
      if (row < 0 || row >= rows) continue;
      const approxCol = Math.round((x - (row % 2 ? hexWidth / 2 : 0)) / hexWidth);
      for (let col = approxCol - 1; col <= approxCol + 1; col++) {
        const { cx, cy } = centre(row, col);
        const distance = (x - cx) ** 2 + (y - cy) ** 2;
        if (distance < best.distance) best = { key: `${row}:${col}`, distance };
      }
    }
    const entry = sums.get(best.key) ?? { count: 0, squared: 0, withError: 0 };
    entry.count += 1;
    if (point.errorPx !== null) {
      entry.squared += point.errorPx ** 2;
      entry.withError += 1;
    }
    sums.set(best.key, entry);
  }

  const occupied = [...sums.values()].map((s) => s.count).sort((a, b) => a - b);
  const medianCount = occupied.length ? occupied[Math.floor(occupied.length / 2)] : 0;

  const hexagons: Hexagon[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= COLUMNS; col++) {
      const { cx, cy } = centre(row, col);
      if (cx > width + hexWidth / 2 || cy > height + radius) continue;
      const entry = sums.get(`${row}:${col}`);
      const count = entry?.count ?? 0;
      const rmsePx = entry && entry.withError ? Math.sqrt(entry.squared / entry.withError) : null;
      let status: HexStatus = 'empty';
      if (count > 0 && rmsePx !== null) {
        if (rmsePx >= 2) status = 'poor';
        else if (rmsePx >= 1 || count < medianCount * 0.35) status = 'uncertain';
        else if (rmsePx < 0.5 && count >= medianCount * 0.5) status = 'strong';
        else status = 'good';
      }
      hexagons.push({ id: hexagons.length + 1, row, col, cx, cy, count, rmsePx, status });
    }
  }
  return { hexagons, radius };
}

export const HexagonalMatchViewer: React.FC<{ result: RegistrationResult }> = ({ result }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Hexagon | null>(null);
  const { hexagons, radius } = useMemo(() => buildHexagons(result), [result]);
  const [height, width] = result.referenceShape;

  // Only hexagons whose centre lies on the image count towards coverage.
  const inside = hexagons.filter((h) => h.cx >= 0 && h.cx <= width && h.cy >= 0 && h.cy <= height);
  const withPoints = inside.filter((h) => h.count > 0).length;

  const legend: { status: HexStatus; label: string }[] = [
    { status: 'empty', label: t('hexGray') },
    { status: 'strong', label: t('hexDarkTeal') },
    { status: 'good', label: t('hexTeal') },
    { status: 'uncertain', label: t('hexAmber') },
    { status: 'poor', label: t('hexRed') },
  ];

  const polygon = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${cx + radius * 0.96 * Math.cos(angle)},${cy + radius * 0.96 * Math.sin(angle)}`;
    }).join(' ');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-[#D5DDE5] p-4 rounded-lg flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-[#5B6875] uppercase font-semibold">{t('matchedRegionsMetric')}</span>
            <div className="text-2xl font-bold font-mono text-[#176B87] mt-0.5">
              {withPoints} <span className="text-sm font-normal text-[#5B6875]">/ {inside.length}</span>
            </div>
          </div>
          <Grid className="w-8 h-8 text-[#176B87]/30" />
        </div>
        <div className="bg-white border border-[#D5DDE5] p-4 rounded-lg flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-[#5B6875] uppercase font-semibold">{t('matchRateMetric')}</span>
            <div className="text-2xl font-bold font-mono text-[#2E7D5B] mt-0.5">{formatPercent(inside.length ? withPoints / inside.length : 0)}</div>
          </div>
          <div className="text-right font-mono text-[11px] text-[#5B6875]">
            <div>
              {t('tiePoints')}: <span className="font-bold text-[#17212B]">{result.tiePointCount.toLocaleString()}</span>
            </div>
            <div>
              {t('uniformity')}: <span className="font-bold text-[#17212B]">{result.uniformityScore.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm">
        <div className="relative bg-[#17212B] rounded-lg overflow-hidden border border-[#D5DDE5] mx-auto" style={{ aspectRatio: `${width} / ${height}`, width: `min(100%, ${Math.round((640 * width) / height)}px)` }}>
          <img src={result.images.referencePreview} alt={t('hexagonalTitle')} className="absolute inset-0 w-full h-full object-fill" />
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {hexagons.map((hex) => {
              const style = STATUS_STYLE[hex.status];
              const isSelected = selected?.id === hex.id;
              return (
                <polygon
                  key={hex.id}
                  points={polygon(hex.cx, hex.cy)}
                  fill={style.fill}
                  fillOpacity={isSelected ? 0.85 : style.opacity}
                  stroke={isSelected ? '#FFFFFF' : style.fill}
                  strokeWidth={isSelected ? width / 300 : width / 900}
                  className="cursor-pointer"
                  onClick={() => setSelected(hex)}
                />
              );
            })}
          </svg>
        </div>

        <div className="mt-4 pt-3 border-t border-[#E9EEF3] grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          {legend.map(({ status, label }) => (
            <div key={status} className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_STYLE[status].fill }} />
              <span className="text-[#5B6875]">{label}</span>
            </div>
          ))}
        </div>

        {selected && (
          <div className="mt-4 p-3 bg-[#F4F7FA] border border-[#D5DDE5] rounded text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Info className="w-4 h-4 text-[#176B87]" />
              <span className="font-bold text-[#17212B]">HEX #{selected.id}</span>
              <span className="text-[#5B6875]">(row {selected.row + 1}, col {selected.col + 1})</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-[#176B87]">
                {selected.count} {t('hexCellPoints')}
              </span>
              <span className="block text-[10px] text-[#5B6875]">
                {t('hexCellRmse')}: {formatPx(selected.rmsePx)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
