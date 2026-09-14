import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { NoResultState } from '../components/common/NoResultState';
import { GeospatialPanel } from '../components/matching/GeospatialPanel';
import { MapPin } from 'lucide-react';

export const GeospatialPage: React.FC = () => {
  const { t } = useTranslation();
  const { matchResult } = useMatchingContext();

  return (
    <div className="space-y-6">
      <SectionHeader title={t('geospatialTitle')} subtitle={t('geospatialDesc')} badge="GEOMETRY" />
      {matchResult ? <GeospatialPanel result={matchResult} /> : <NoResultState icon={<MapPin className="w-12 h-12" />} />}
    </div>
  );
};
