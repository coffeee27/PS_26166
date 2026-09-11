import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { AnalysisSummary } from '../components/matching/AnalysisSummary';
import { FileCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ResultsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    referenceImage,
    queryImage,
    referenceMetadata,
    queryMetadata,
    matchResult,
  } = useMatchingContext();

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('resultsTitle')}
        subtitle={t('resultsDesc')}
        badge="FINAL VERIFICATION REPORT"
      />

      {referenceImage && queryImage ? (
        <AnalysisSummary
          result={
            matchResult || {
              confidence: 92.7,
              status: 'HIGH_MATCH',
              locationVerification: 'LIKELY_SAME',
              matchedRegions: 87,
              totalRegions: 100,
              terrainSimilarity: 'HIGH',
              featureCorrespondenceCount: 87,
              featurePoints: [],
              hexagonGrid: [],
              geospatial: {
                latitude: '89.9142° S',
                longitude: '0.0028° E',
                elevation: '-3.842 km',
                terrainType: 'Highland Rim',
                craterDensity: '1,420 craters/1000 km²',
                solarAzimuth: '114.6°',
                sunElevationAngle: '14.2°',
                coordinateSystem: 'LRO LROC-NAC Selective Metric Grid',
                isDemoData: true,
              },
              processingTimeMs: 3600,
              isDemoAnalysis: true,
              analyzedAt: new Date().toISOString(),
            }
          }
          refImage={referenceImage}
          queryImage={queryImage}
          refMeta={referenceMetadata}
          queryMeta={queryMetadata}
        />
      ) : (
        <div className="bg-white border border-[#D5DDE5] rounded-lg p-8 text-center font-mono space-y-4">
          <FileCheck className="w-12 h-12 text-[#176B87] mx-auto" />
          <h3 className="text-sm font-bold text-[#17212B] uppercase">NO ANALYSIS SUMMARY AVAILABLE</h3>
          <p className="text-xs text-[#5B6875] max-w-md mx-auto">
            Please run the image comparison pipeline on the Image Matching page to view the generated summary report.
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
