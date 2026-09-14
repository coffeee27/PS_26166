import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { NoResultState } from '../components/common/NoResultState';
import { AnalysisSummary } from '../components/matching/AnalysisSummary';
import { FileCheck } from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { t } = useTranslation();
  const { matchResult } = useMatchingContext();

  return (
    <div className="space-y-6">
      <SectionHeader title={t('resultsTitle')} subtitle={t('resultsDesc')} badge="REGISTRATION REPORT" />
      {matchResult ? <AnalysisSummary result={matchResult} /> : <NoResultState icon={<FileCheck className="w-12 h-12" />} />}
    </div>
  );
};
