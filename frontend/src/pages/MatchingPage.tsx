import React from 'react';
import { useMatchingContext } from '../context/MatchingContext';
import { useTranslation } from '../i18n';
import { SectionHeader } from '../components/common/SectionHeader';
import { ImageUploader } from '../components/matching/ImageUploader';
import { AnalysisProgress } from '../components/matching/AnalysisProgress';
import { RegistrationSummary } from '../components/matching/RegistrationSummary';
import { Play, ArrowRight, Layers, Database, Activity, Grid, FileCheck, AlertTriangle, PlugZap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MatchingPage: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    referenceImage,
    queryImage,
    referenceMetadata,
    queryMetadata,
    samples,
    backendOnline,
    selectedPresetId,
    canRun: ready,
    isProcessing,
    elapsedMs,
    matchResult,
    error,
    setReferenceFile,
    setQueryFile,
    loadPreset,
    runAnalysis,
  } = useMatchingContext();

  const canRun = ready && !isProcessing && backendOnline !== false;

  return (
    <div className="space-y-6">
      <SectionHeader title={t('verificationHeader')} subtitle={t('verificationSub')} badge="WORKSTATION CORE" />

      {backendOnline === false && (
        <div className="bg-[#FDF5F5] border border-[#B94A48]/40 rounded-lg p-4 flex items-start space-x-3 font-mono text-xs">
          <PlugZap className="w-5 h-5 text-[#B94A48] shrink-0" />
          <div>
            <span className="font-bold text-[#B94A48] block">{t('backendOfflineTitle')}</span>
            <span className="text-[#5B6875]">{t('backendOfflineDesc')}</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-xs font-mono text-[#5B6875]">
          <Database className="w-4 h-4 text-[#176B87]" />
          <span className="font-bold text-[#17212B] uppercase">{t('selectPreset')}</span>
        </div>
        {samples.length === 0 ? (
          <p className="text-[11px] font-mono text-[#7E8B9B]">{t('noSamples')}</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
            {samples.map((sample) => {
              const isSelected = selectedPresetId === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadPreset(sample.id)}
                  title={sample.description}
                  className={`px-3 py-1.5 rounded border transition-colors flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-[#176B87] text-white border-[#176B87] font-semibold shadow-sm'
                      : 'bg-[#F4F7FA] text-[#17212B] border-[#D5DDE5] hover:bg-[#E9EEF3]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#E3A93B]' : 'bg-[#176B87]'}`} />
                  <span>{language === 'hi' ? sample.titleHi : sample.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImageUploader
          title={t('referenceImageTitle')}
          subtitle={t('referenceImageSub')}
          image={referenceImage}
          metadata={referenceMetadata}
          onFileSelected={setReferenceFile}
          onImageRemoved={() => setReferenceFile(null)}
          badgeLabel="REF"
        />
        <ImageUploader
          title={t('queryImageTitle')}
          subtitle={t('queryImageSub')}
          image={queryImage}
          metadata={queryMetadata}
          onFileSelected={setQueryFile}
          onImageRemoved={() => setQueryFile(null)}
          badgeLabel="SRC"
        />
      </div>

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs font-mono text-[#5B6875]">
          {!ready ? (
            <span className="text-[#C48A24] font-semibold">{t('uploadTwoToBegin')}</span>
          ) : (
            <span className="text-[#2E7D5B] font-semibold flex items-center">
              <Layers className="w-4 h-4 mr-1.5" />
              {t('pairReady')}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={!canRun}
          onClick={runAnalysis}
          className={`px-6 py-3 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 shadow ${
            !canRun
              ? 'bg-[#CBD5E1] text-[#94A3B8] cursor-not-allowed border border-[#CBD5E1]'
              : 'bg-[#176B87] hover:bg-[#3B82A0] text-white border border-[#176B87] active:scale-[0.98]'
          }`}
        >
          <Play className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{t('compareImages')}</span>
        </button>
      </div>

      {isProcessing && <AnalysisProgress elapsedMs={elapsedMs} />}

      {error && !isProcessing && (
        <div className="bg-[#FDF5F5] border border-[#B94A48]/40 rounded-lg p-4 flex items-start space-x-3 font-mono text-xs" role="alert">
          <AlertTriangle className="w-5 h-5 text-[#B94A48] shrink-0" />
          <div>
            <span className="font-bold text-[#B94A48] block">{t('registrationFailed')}</span>
            <span className="text-[#5B6875]">{error}</span>
          </div>
        </div>
      )}

      {matchResult && !isProcessing && (
        <div className="space-y-6 animate-fadeIn">
          <RegistrationSummary result={matchResult} />

          <div className="bg-white border border-[#D5DDE5] rounded-lg p-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              {[
                { to: '/heatmap', label: t('viewHeatmap'), icon: <Activity className="w-4 h-4 text-[#176B87]" /> },
                { to: '/features', label: t('viewFeatures'), icon: <Grid className="w-4 h-4 text-[#176B87]" /> },
                { to: '/results', label: t('viewResults'), icon: <FileCheck className="w-4 h-4 text-[#176B87]" /> },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="p-3 border border-[#D5DDE5] hover:border-[#176B87] rounded bg-[#F8FAFC] hover:bg-[#F0F6F9] transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2">
                    {link.icon}
                    <span>{link.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#176B87] group-hover:translate-x-1 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
