import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { NoResultState } from '../components/common/NoResultState';
import { HexagonalMatchViewer } from '../components/visualization/HexagonalMatchViewer';
import { FeatureCorrespondence } from '../components/visualization/FeatureCorrespondence';
import { Grid } from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const { matchResult } = useMatchingContext();

  return (
    <div className="space-y-6">
      <SectionHeader title={t('hexagonalTitle')} subtitle={t('hexagonalDesc')} badge="UNIFORM DISTRIBUTION" />
      {matchResult ? (
        <div className="space-y-8">
          <HexagonalMatchViewer result={matchResult} />
          <FeatureCorrespondence result={matchResult} />
        </div>
      ) : (
        <NoResultState icon={<Grid className="w-12 h-12" />} />
      )}
    </div>
  );
};
