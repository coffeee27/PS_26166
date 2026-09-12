import React, { useState } from 'react';
import type { HexagonCell } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { Grid, Info } from 'lucide-react';

interface HexagonalMatchViewerProps {
  image: string;
  grid: HexagonCell[];
  matchedCount: number;
  totalCount: number;
}

export const HexagonalMatchViewer: React.FC<HexagonalMatchViewerProps> = ({
  image,
  grid,
  matchedCount,
  totalCount,
}) => {
  const { t } = useTranslation();
  const [selectedHex, setSelectedHex] = useState<HexagonCell | null>(null);

  const getCellColor = (status: HexagonCell['status']) => {
    switch (status) {
      case 'strong_match':
        return 'fill-[#176B87]/80 stroke-[#176B87]';
      case 'matched':
        return 'fill-[#3B82A0]/65 stroke-[#3B82A0]';
      case 'uncertain':
        return 'fill-[#E3A93B]/70 stroke-[#E3A93B]';
      case 'mismatch':
        return 'fill-[#B94A48]/70 stroke-[#B94A48]';
      case 'unprocessed':
      default:
        return 'fill-[#64748B]/40 stroke-[#64748B]';
    }
  };

  const matchRate = Math.round((matchedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-[#D5DDE5] p-4 rounded-lg flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-[#5B6875] uppercase font-semibold">
              {t('matchedRegionsMetric')}
            </span>
            <div className="text-2xl font-bold font-mono text-[#176B87] mt-0.5">
              {matchedCount} <span className="text-sm font-normal text-[#5B6875]">/ {totalCount}</span>
            </div>
          </div>
          <Grid className="w-8 h-8 text-[#176B87]/30" />
        </div>

        <div className="bg-white border border-[#D5DDE5] p-4 rounded-lg flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-[#5B6875] uppercase font-semibold">
              {t('matchRateMetric')}
            </span>
            <div className="text-2xl font-bold font-mono text-[#2E7D5B] mt-0.5">
              {matchRate}%
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-[#2E7D5B]/30 border-t-[#2E7D5B] flex items-center justify-center font-mono text-xs font-bold text-[#2E7D5B]">
            {matchRate}%
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#E9EEF3] mb-4 font-mono text-xs">
          <span className="font-bold text-[#17212B] uppercase flex items-center">
            <Grid className="w-4 h-4 mr-1.5 text-[#176B87]" />
            GEOSPATIAL SPATIAL BINNING GRID (10x10 TERRAIN CELLS)
          </span>
          <span className="text-[10px] text-[#5B6875] bg-[#E9EEF3] px-2 py-0.5 rounded">
            CELL SIZE: 400m x 400m
          </span>
        </div>

        <div className="relative aspect-video bg-[#17212B] rounded-lg overflow-hidden border border-[#D5DDE5]">
          <img src={image} alt="Lunar Surface Hex Grid" className="w-full h-full object-cover" />

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
            {grid.map((cell) => {
              const hexWidth = 90;
              const hexRadius = hexWidth / Math.sqrt(3);
              const xOffset = cell.col * 95 + (cell.row % 2 === 1 ? 47 : 0) + 40;
              const yOffset = cell.row * 52 + 35;

              const points = [
                `${xOffset},${yOffset - hexRadius}`,
                `${xOffset + hexWidth / 2},${yOffset - hexRadius / 2}`,
                `${xOffset + hexWidth / 2},${yOffset + hexRadius / 2}`,
                `${xOffset},${yOffset + hexRadius}`,
                `${xOffset - hexWidth / 2},${yOffset + hexRadius / 2}`,
                `${xOffset - hexWidth / 2},${yOffset - hexRadius / 2}`,
              ].join(' ');

              return (
                <polygon
                  key={cell.id}
                  points={points}
                  className={`${getCellColor(cell.status)} cursor-pointer stroke-[1.5] transition-all hover:opacity-100 opacity-75`}
                  onClick={() => setSelectedHex(cell)}
                />
              );
            })}
          </svg>
        </div>

        <div className="mt-4 pt-3 border-t border-[#E9EEF3] grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#64748B]" />
            <span className="text-[#5B6875]">{t('hexGray')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#3B82A0]" />
            <span className="text-[#5B6875]">{t('hexTeal')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#176B87]" />
            <span className="text-[#5B6875]">{t('hexDarkTeal')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#E3A93B]" />
            <span className="text-[#5B6875]">{t('hexAmber')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#B94A48]" />
            <span className="text-[#5B6875]">{t('hexRed')}</span>
          </div>
        </div>

        {selectedHex && (
          <div className="mt-4 p-3 bg-[#F4F7FA] border border-[#D5DDE5] rounded text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Info className="w-4 h-4 text-[#176B87]" />
              <div>
                <span className="font-bold text-[#17212B]">HEX CELL #{selectedHex.id}</span>
                <span className="text-[#5B6875] ml-2">(Col {selectedHex.col}, Row {selectedHex.row})</span>
                <div className="text-[11px] text-[#5B6875]">Terrain: {selectedHex.terrainType}</div>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-[#176B87]">{selectedHex.score * 100}% SCORE</span>
              <span className="block text-[10px] uppercase text-[#5B6875]">{selectedHex.status}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
