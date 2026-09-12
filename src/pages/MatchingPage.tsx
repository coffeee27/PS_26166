import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { ImageUploader } from '../components/matching/ImageUploader';
import { AnalysisProgress } from '../components/matching/AnalysisProgress';
import { MatchScore } from '../components/matching/MatchScore';
import { MatchStatus } from '../components/matching/MatchStatus';
import { GeospatialPanel } from '../components/matching/GeospatialPanel';
import { SAMPLE_PRESETS } from '../data/sampleLunarImages';
import { Play, ArrowRight, Layers, Database, Activity, Grid, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MatchingPage: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    referenceImage,
    queryImage,
    referenceMetadata,
    queryMetadata,
    isProcessing,
    currentStep,
    progressPercent,
    matchResult,
    selectedPresetId,
    setReferenceImage,
    setQueryImage,
    loadPreset,
    runAnalysis,
  } = useMatchingContext();

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('verificationHeader')}
        subtitle="Compare reference and query lunar surface images using feature point extraction, spatial alignment, and geospatial verification."
        badge="WORKSTATION CORE"
      />

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-xs font-mono text-[#5B6875]">
          <Database className="w-4 h-4 text-[#176B87]" />
          <span className="font-bold text-[#17212B] uppercase">{t('selectPreset')}</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
          {SAMPLE_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadPreset(preset.id)}
                className={`px-3 py-1.5 rounded border transition-colors flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#176B87] text-white border-[#176B87] font-semibold shadow-sm'
                    : 'bg-[#F4F7FA] text-[#17212B] border-[#D5DDE5] hover:bg-[#E9EEF3]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#E3A93B]' : 'bg-[#176B87]'}`} />
                <span>{language === 'hi' ? preset.titleHi : preset.titleEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImageUploader
          title={t('referenceImageTitle')}
          subtitle={t('referenceImageSub')}
          image={referenceImage}
          metadata={referenceMetadata}
          onImageSelected={(url, meta) => setReferenceImage(url, meta)}
          onImageRemoved={() => setReferenceImage(null)}
          badgeLabel="REF-01"
        />

        <ImageUploader
          title={t('queryImageTitle')}
          subtitle={t('queryImageSub')}
          image={queryImage}
          metadata={queryMetadata}
          onImageSelected={(url, meta) => setQueryImage(url, meta)}
          onImageRemoved={() => setQueryImage(null)}
          badgeLabel="QRY-02"
        />
      </div>

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs font-mono text-[#5B6875]">
          {!referenceImage || !queryImage ? (
            <span className="text-[#C48A24] font-semibold">
              {t('uploadTwoToBegin')}
            </span>
          ) : (
            <span className="text-[#2E7D5B] font-semibold flex items-center">
              <Layers className="w-4 h-4 mr-1.5" />
              Two lunar frames loaded and ready for spatial comparison.
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={!referenceImage || !queryImage || isProcessing}
          onClick={runAnalysis}
          className={`px-6 py-3 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 shadow ${
            !referenceImage || !queryImage || isProcessing
              ? 'bg-[#CBD5E1] text-[#94A3B8] cursor-not-allowed border border-[#CBD5E1]'
              : 'bg-[#176B87] hover:bg-[#3B82A0] text-white border border-[#176B87] active:scale-[0.98]'
          }`}
        >
          <Play className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{t('compareImages')}</span>
        </button>
      </div>

      {isProcessing && (
        <AnalysisProgress
          currentStep={currentStep}
          progressPercent={progressPercent}
        />
      )}

      {matchResult && !isProcessing && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MatchScore confidence={matchResult.confidence} />
            <MatchStatus
              status={matchResult.status}
              verification={matchResult.locationVerification}
            />
          </div>

          <GeospatialPanel
            geospatial={matchResult.geospatial}
            confidence={matchResult.confidence}
          />

          <div className="bg-white border border-[#D5DDE5] rounded-lg p-5 shadow-sm space-y-3">
            <span className="text-xs font-mono font-bold text-[#17212B] uppercase tracking-wider block">
              EXPLORE DETAILED ANALYSIS VIEWS
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <Link
                to="/heatmap"
                className="p-3 border border-[#D5DDE5] hover:border-[#176B87] rounded bg-[#F8FAFC] hover:bg-[#F0F6F9] transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#176B87]" />
                  <span>{t('viewHeatmap')}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#176B87] group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/features"
                className="p-3 border border-[#D5DDE5] hover:border-[#176B87] rounded bg-[#F8FAFC] hover:bg-[#F0F6F9] transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2">
                  <Grid className="w-4 h-4 text-[#176B87]" />
                  <span>{t('viewFeatures')}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#176B87] group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/results"
                className="p-3 border border-[#D5DDE5] hover:border-[#176B87] rounded bg-[#F8FAFC] hover:bg-[#F0F6F9] transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-[#176B87]" />
                  <span>{t('viewResults')}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#176B87] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
