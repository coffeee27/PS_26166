import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { NoResultState } from '../components/common/NoResultState';
import { HeatmapViewer } from '../components/visualization/HeatmapViewer';
import { Activity } from 'lucide-react';

export const HeatmapPage: React.FC = () => {
  const { t } = useTranslation();
  const { matchResult } = useMatchingContext();

  return (
    <div className="space-y-6">
      <SectionHeader title={t('heatmapTitle')} subtitle={t('heatmapDesc')} badge="RELIABILITY MAP" />
      {matchResult ? <HeatmapViewer result={matchResult} /> : <NoResultState icon={<Activity className="w-12 h-12" />} />}
    </div>
  );
};
