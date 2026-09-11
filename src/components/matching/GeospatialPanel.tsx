import React from 'react';
import type { GeospatialResult } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { MapPin, AlertTriangle, Layers, ShieldCheck, Mountain, Sun } from 'lucide-react';

interface GeospatialPanelProps {
  geospatial: GeospatialResult;
  confidence: number;
}

export const GeospatialPanel: React.FC<GeospatialPanelProps> = ({
  geospatial,
  confidence,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E9EEF3] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-[#176B87]" />
            <h2 className="text-sm font-bold font-mono text-[#17212B] uppercase tracking-wider">
              {t('geospatialTitle')}
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E3A93B]/10 text-[#C48A24] border border-[#E3A93B]/30 uppercase">
              {t('demoDataTag')}
            </span>
          </div>
          <p className="text-xs text-[#5B6875] mt-1">{t('geospatialDesc')}</p>
        </div>
      </div>

      <div className="bg-[#FFFDF5] border border-[#E3A93B]/40 rounded-md p-3 flex items-start space-x-3 text-xs font-mono">
        <AlertTriangle className="w-4 h-4 text-[#C48A24] shrink-0 mt-0.5" />
        <span className="text-[#5B6875] leading-relaxed">
          {t('demoDataWarning')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1">
            {t('locationMatchField')}
          </span>
          <span className="font-bold text-[#176B87] text-sm block flex items-center">
            <ShieldCheck className="w-4 h-4 mr-1 text-[#2E7D5B]" />
            LIKELY SAME
          </span>
        </div>

        <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1">
            {t('matchConfidence')}
          </span>
          <span className="font-bold text-[#17212B] text-sm block">
            {confidence}%
          </span>
        </div>

        <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1">
            {t('latitudeField')}
          </span>
          <span className="font-bold text-[#17212B] text-sm block">
            {geospatial.latitude}
          </span>
          <span className="text-[9px] text-[#C48A24] uppercase">[DEMO VALUE]</span>
        </div>

        <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1">
            {t('longitudeField')}
          </span>
          <span className="font-bold text-[#17212B] text-sm block">
            {geospatial.longitude}
          </span>
          <span className="text-[9px] text-[#C48A24] uppercase">[DEMO VALUE]</span>
        </div>

        <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded sm:col-span-2">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1 flex items-center">
            <Mountain className="w-3 h-3 mr-1 text-[#176B87]" />
            {t('elevationField')}
          </span>
          <span className="font-bold text-[#17212B] text-xs block truncate">
            {geospatial.elevation}
          </span>
          <span className="text-[9px] text-[#C48A24] uppercase">[DEMO VALUE]</span>
        </div>

        <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1 flex items-center">
            <Layers className="w-3 h-3 mr-1 text-[#176B87]" />
            {t('craterDensityField')}
          </span>
          <span className="font-bold text-[#17212B] text-xs block">
            {geospatial.craterDensity}
          </span>
          <span className="text-[9px] text-[#C48A24] uppercase">[DEMO VALUE]</span>
        </div>

        <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1 flex items-center">
            <Sun className="w-3 h-3 mr-1 text-[#176B87]" />
            {t('solarAzimuthField')}
          </span>
          <span className="font-bold text-[#17212B] text-xs block">
            {geospatial.solarAzimuth}
          </span>
          <span className="text-[9px] text-[#C48A24] uppercase">[DEMO VALUE]</span>
        </div>
      </div>

      <div className="p-3 bg-[#F0F6F9] border border-[#176B87]/20 rounded text-xs font-mono flex items-center justify-between">
        <span className="text-[#5B6875]">{t('coordSystemField')}:</span>
        <span className="font-bold text-[#176B87]">{geospatial.coordinateSystem}</span>
      </div>
    </div>
  );
};
