import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { HexagonalMatchViewer } from '../components/visualization/HexagonalMatchViewer';
import { FeatureCorrespondence } from '../components/visualization/FeatureCorrespondence';
import { Grid, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FeaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const { referenceImage, queryImage, matchResult } = useMatchingContext();

  // Fallback demo feature data if direct navigation
  const demoGrid = matchResult?.hexagonGrid || [];
  const demoMatchedCount = matchResult?.matchedRegions || 87;
  const demoPoints = matchResult?.featurePoints || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('hexagonalTitle')}
        subtitle={t('hexagonalDesc')}
        badge="SPATIAL BINNING & VECTORS"
      />

      {referenceImage && queryImage ? (
        <div className="space-y-8">
          {/* Hexagonal Grid Overlay Section */}
          <HexagonalMatchViewer
            image={referenceImage}
            grid={demoGrid}
            matchedCount={demoMatchedCount}
            totalCount={100}
          />

          {/* Side-by-side Vector Connector Section */}
          <FeatureCorrespondence
            referenceImage={referenceImage}
            queryImage={queryImage}
            featurePoints={demoPoints}
          />
        </div>
      ) : (
        <div className="bg-white border border-[#D5DDE5] rounded-lg p-8 text-center font-mono space-y-4">
          <Grid className="w-12 h-12 text-[#176B87] mx-auto" />
          <h3 className="text-sm font-bold text-[#17212B] uppercase">NO FEATURE DATA LOADED</h3>
          <p className="text-xs text-[#5B6875] max-w-md mx-auto">
            Please navigate to the Image Matching workstation to run feature extraction on a pair of lunar surface frames.
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
