import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { HeatmapViewer } from '../components/visualization/HeatmapViewer';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight } from 'lucide-react';

export const HeatmapPage: React.FC = () => {
  const { t } = useTranslation();
  const { referenceImage, queryImage, matchResult } = useMatchingContext();

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('heatmapTitle')}
        subtitle={t('heatmapDesc')}
        badge="SCIENTIFIC HEATMAP"
      />

      {referenceImage && queryImage ? (
        <div className="space-y-6">
          <HeatmapViewer
            referenceImage={referenceImage}
            queryImage={queryImage}
            confidence={matchResult ? matchResult.confidence : 92.7}
          />
        </div>
      ) : (
        <div className="bg-white border border-[#D5DDE5] rounded-lg p-8 text-center font-mono space-y-4">
          <Activity className="w-12 h-12 text-[#176B87] mx-auto" />
          <h3 className="text-sm font-bold text-[#17212B] uppercase">NO IMAGE PAIR LOADED</h3>
          <p className="text-xs text-[#5B6875] max-w-md mx-auto">
            Please navigate to the Image Matching workstation to select a sample dataset or upload reference and query lunar images.
          </p>
          <Link
            to="/matching"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#176B87] text-white text-xs font-bold rounded hover:bg-[#3B82A0] transition-colors"
          >
            <span>GO TO IMAGE MATCHING</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};
