import React, { useState } from 'react';
import type { FeaturePoint } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { Layers, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface FeatureCorrespondenceProps {
  referenceImage: string;
  queryImage: string;
  featurePoints: FeaturePoint[];
}

export const FeatureCorrespondence: React.FC<FeatureCorrespondenceProps> = ({
  referenceImage,
  queryImage,
  featurePoints,
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'matched' | 'potential' | 'unmatched'>('all');
  const [selectedPoint, setSelectedPoint] = useState<FeaturePoint | null>(null);

  const filteredPoints = featurePoints.filter((pt) => {
    if (filter === 'all') return true;
    return pt.status === filter;
  });

  const getPointColor = (status: FeaturePoint['status']) => {
    switch (status) {
      case 'matched':
        return '#176B87';
      case 'potential':
        return '#E3A93B';
      case 'unmatched':
        return '#B94A48';
    }
  };

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E9EEF3] gap-2">
        <div className="font-mono text-xs">
          <span className="font-bold text-[#17212B] uppercase flex items-center">
            <Layers className="w-4 h-4 mr-1.5 text-[#176B87]" />
            {t('featureVectorLines')}
          </span>
          <span className="text-[11px] text-[#5B6875] block mt-0.5">
            ORBITAL CORRESPONDENCE VECTORS: {filteredPoints.length} FEATURES DETECTED
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-1 font-mono text-[11px]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              filter === 'all'
                ? 'bg-[#176B87] text-white border-[#176B87]'
                : 'bg-[#F4F7FA] text-[#5B6875] border-[#D5DDE5] hover:text-[#17212B]'
            }`}
          >
            All ({featurePoints.length})
          </button>
          <button
            onClick={() => setFilter('matched')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              filter === 'matched'
                ? 'bg-[#176B87] text-white border-[#176B87]'
                : 'bg-[#F4F7FA] text-[#5B6875] border-[#D5DDE5] hover:text-[#17212B]'
            }`}
          >
            Matched
          </button>
          <button
            onClick={() => setFilter('potential')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              filter === 'potential'
                ? 'bg-[#E3A93B] text-white border-[#E3A93B]'
                : 'bg-[#F4F7FA] text-[#5B6875] border-[#D5DDE5] hover:text-[#17212B]'
            }`}
          >
            Potential
          </button>
        </div>
      </div>

      {/* Side-by-side Feature Connector Canvas Viewport */}
      <div className="relative bg-[#17212B] rounded-lg overflow-hidden border border-[#D5DDE5] aspect-[21/9]">
        <div className="grid grid-cols-2 h-full">
          {/* Left Reference Frame */}
          <div className="relative border-r border-[#3B82A0]/30 overflow-hidden">
            <img src={referenceImage} alt="Reference" className="w-full h-full object-cover opacity-80" />
            <div className="absolute top-2 left-2 bg-black/70 text-white font-mono text-[10px] px-2 py-0.5 rounded border border-gray-600">
              REFERENCE FRAME
            </div>
          </div>

          {/* Right Query Frame */}
          <div className="relative overflow-hidden">
            <img src={queryImage} alt="Query" className="w-full h-full object-cover opacity-80" />
            <div className="absolute top-2 right-2 bg-black/70 text-white font-mono text-[10px] px-2 py-0.5 rounded border border-gray-600">
              QUERY FRAME
            </div>
          </div>
        </div>

        {/* SVG Connector Overlay Across Both Panels */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 420" preserveAspectRatio="none">
          {filteredPoints.map((pt) => {
            const x1 = (pt.x1 / 100) * 500;
            const y1 = (pt.y1 / 100) * 420;
            const x2 = 500 + (pt.x2 / 100) * 500;
            const y2 = (pt.y2 / 100) * 420;

            const color = getPointColor(pt.status);
            const isSelected = selectedPoint?.id === pt.id;

            return (
              <g key={pt.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedPoint(pt)}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.2}
                  strokeDasharray={pt.status === 'potential' ? '4 4' : 'none'}
                  opacity={isSelected ? 1 : 0.75}
                />
                <circle cx={x1} cy={y1} r={isSelected ? 6 : 4} fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx={x2} cy={y2} r={isSelected ? 6 : 4} fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Selected Point Inspector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-[#E9EEF3] font-mono text-xs gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#176B87]" />
            <span className="text-[#5B6875]">{t('matchedFeature')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#E3A93B]" />
            <span className="text-[#5B6875]">{t('potentialMatch')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <XCircle className="w-3.5 h-3.5 text-[#B94A48]" />
            <span className="text-[#5B6875]">{t('unmatchedFeature')}</span>
          </div>
        </div>

        {selectedPoint && (
          <div className="bg-[#F4F7FA] border border-[#D5DDE5] px-3 py-1.5 rounded text-[11px] text-[#17212B]">
            <span className="font-bold text-[#176B87]">FEATURE #{selectedPoint.id.toUpperCase()}:</span>{' '}
            {selectedPoint.label} (Confidence: {Math.round(selectedPoint.confidence * 100)}%)
          </div>
        )}
      </div>
    </div>
  );
};
