import React from 'react';
import { MissionOverview } from '../components/overview/MissionOverview';
import { SolarSystem } from '../components/visualization/SolarSystem';
import { useTranslation } from '../i18n';

export const OverviewPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Top Mission Objective & Pipeline */}
      <MissionOverview />

      {/* Interactive 3D Solar System Canvas */}
      <div className="bg-white border border-[#D5DDE5] rounded-lg p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E9EEF3] font-mono text-xs">
          <span className="font-bold text-[#17212B] uppercase">
            {t('solarSystemTitle')}
          </span>
          <span className="text-[10px] text-[#176B87] bg-[#176B87]/10 px-2 py-0.5 rounded font-semibold">
            THREE.JS INTERACTIVE
          </span>
        </div>
        <p className="text-xs text-[#5B6875] font-mono">
          {t('solarSystemDesc')}
        </p>

        {/* 3D Viewport */}
        <SolarSystem />
      </div>
    </div>
  );
};
