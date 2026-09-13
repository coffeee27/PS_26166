import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { GeospatialPanel } from '../components/matching/GeospatialPanel';

export const GeospatialPage: React.FC = () => {
  const { t } = useTranslation();
  const { matchResult } = useMatchingContext();

  const demoGeospatial = matchResult?.geospatial || {
    latitude: '89.9142° S',
    longitude: '0.0028° E',
    elevation: '-3.842 km (South Pole-Aitken Rim)',
    terrainType: 'Highland Rim / Permanently Shadowed Region',
    craterDensity: '1,420 craters/1000 km²',
    solarAzimuth: '114.6°',
    sunElevationAngle: '14.2°',
    coordinateSystem: 'LRO LROC-NAC Selective Metric Grid (MOON_ME_2015)',
    isDemoData: true as const,
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('geospatialTitle')}
        subtitle={t('geospatialDesc')}
        badge="GIS LOCATION TELEMETRY"
      />

      <GeospatialPanel
        geospatial={demoGeospatial}
        confidence={matchResult ? matchResult.confidence : 92.7}
      />
    </div>
  );
};
