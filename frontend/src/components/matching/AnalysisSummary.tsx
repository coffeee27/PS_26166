import React from 'react';
import type { MatchResult, ImageMetadata } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { FileCheck, Download, Printer, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AnalysisSummaryProps {
  result: MatchResult;
  refImage: string;
  queryImage: string;
  refMeta: ImageMetadata | null;
  queryMeta: ImageMetadata | null;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  result,
  refImage,
  queryImage,
  refMeta,
  queryMeta,
}) => {
  const { t } = useTranslation();

  const handleDownloadReport = () => {
    const reportText = `
===================================================================
PS-166 LUNAR IMAGE MATCHING PLATFORM - GEOSPATIAL ANALYSIS REPORT
===================================================================
Timestamp: ${result.analyzedAt}
Pipeline Execution Time: ${result.processingTimeMs} ms
Analysis Type: DEMO SIMULATED ANALYSIS

MATCH VERIFICATION RESULTS:
-------------------------------------------------------------------
Match Confidence Score:        ${result.confidence}%
Location Assessment:            ${result.locationVerification} (LIKELY SAME LUNAR LOCATION)
Match Status:                   ${result.status}
Matched Surface Regions:        ${result.matchedRegions} / ${result.totalRegions}
Terrain Similarity Level:       ${result.terrainSimilarity}
Feature Correspondence Count:  ${result.featureCorrespondenceCount}

GEOSPATIAL COORDINATE VERIFICATION (DEMO DATA):
-------------------------------------------------------------------
Latitude:   ${result.geospatial.latitude}
Longitude:  ${result.geospatial.longitude}
Elevation:  ${result.geospatial.elevation}
Datum:      ${result.geospatial.coordinateSystem}

IMAGE METADATA:
-------------------------------------------------------------------
Reference File: ${refMeta?.filename || 'REF_FRAME'}
Query File:     ${queryMeta?.filename || 'QUERY_FRAME'}
Resolution:     ${refMeta?.dimensions || '4096 x 3072 px'}

===================================================================
PS-166 Lunar Remote Sensing Analysis Engine v1.0
===================================================================
    `;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PS166_LUNAR_MATCH_REPORT_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E9EEF3] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-[#176B87]" />
            <h2 className="text-base font-bold font-mono text-[#17212B] uppercase tracking-wider">
              {t('resultsTitle')}
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#EEF7F2] text-[#2E7D5B] border border-[#2E7D5B]/30 uppercase">
              COMPLETE
            </span>
          </div>
          <p className="text-xs text-[#5B6875] mt-1">{t('resultsDesc')}</p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={handleDownloadReport}
            className="px-3.5 py-2 rounded bg-[#176B87] hover:bg-[#3B82A0] text-white font-semibold transition-colors flex items-center space-x-1.5 shadow"
          >
            <Download className="w-4 h-4" />
            <span>{t('downloadReport')}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded bg-[#F4F7FA] hover:bg-[#E9EEF3] text-[#17212B] border border-[#D5DDE5] font-medium transition-colors flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{t('printSummary')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-[#D5DDE5] rounded p-2.5 bg-[#F8FAFC]">
          <span className="text-[10px] font-mono font-bold text-[#5B6875] block mb-1 uppercase">
            {t('referenceImageTitle')}
          </span>
          <div className="aspect-video bg-black rounded overflow-hidden border border-gray-300">
            <img src={refImage} alt="Reference" className="w-full h-full object-cover" />
          </div>
          {refMeta && (
            <div className="mt-2 text-[10px] font-mono text-[#5B6875] flex justify-between">
              <span>{refMeta.filename}</span>
              <span>{refMeta.dimensions}</span>
            </div>
          )}
        </div>

        <div className="border border-[#D5DDE5] rounded p-2.5 bg-[#F8FAFC]">
          <span className="text-[10px] font-mono font-bold text-[#176B87] block mb-1 uppercase">
            {t('queryImageTitle')}
          </span>
          <div className="aspect-video bg-black rounded overflow-hidden border border-gray-300">
            <img src={queryImage} alt="Query" className="w-full h-full object-cover" />
          </div>
          {queryMeta && (
            <div className="mt-2 text-[10px] font-mono text-[#5B6875] flex justify-between">
              <span>{queryMeta.filename}</span>
              <span>{queryMeta.dimensions}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 bg-[#EEF7F2] border border-[#2E7D5B]/30 rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1">
            {t('matchConfidence')}
          </span>
          <span className="text-xl font-bold text-[#2E7D5B]">{result.confidence}%</span>
        </div>

        <div className="p-3 bg-[#F0F6F9] border border-[#176B87]/30 rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1">
            {t('locationAssessment')}
          </span>
          <span className="text-xs font-bold text-[#176B87] flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            LIKELY SAME
          </span>
        </div>

        <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1">
            {t('matchedSurfaceRegions')}
          </span>
          <span className="text-xl font-bold text-[#17212B]">
            {result.matchedRegions} / {result.totalRegions}
          </span>
        </div>

        <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded">
          <span className="text-[10px] text-[#5B6875] uppercase block mb-1">
            {t('terrainSimilarity')}
          </span>
          <span className="text-xl font-bold text-[#17212B]">{result.terrainSimilarity}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <Link
          to="/heatmap"
          className="p-3 border border-[#D5DDE5] hover:border-[#176B87] rounded text-xs font-mono text-[#17212B] bg-[#F8FAFC] hover:bg-[#F0F6F9] transition-colors flex items-center justify-between group"
        >
          <span>{t('viewHeatmap')}</span>
          <ArrowRight className="w-4 h-4 text-[#176B87] group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/features"
          className="p-3 border border-[#D5DDE5] hover:border-[#176B87] rounded text-xs font-mono text-[#17212B] bg-[#F8FAFC] hover:bg-[#F0F6F9] transition-colors flex items-center justify-between group"
        >
          <span>{t('viewFeatures')}</span>
          <ArrowRight className="w-4 h-4 text-[#176B87] group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/geospatial"
          className="p-3 border border-[#D5DDE5] hover:border-[#176B87] rounded text-xs font-mono text-[#17212B] bg-[#F8FAFC] hover:bg-[#F0F6F9] transition-colors flex items-center justify-between group"
        >
          <span>{t('viewGeospatial')}</span>
          <ArrowRight className="w-4 h-4 text-[#176B87] group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="bg-[#F4F7FA] border border-[#D5DDE5] rounded p-4 text-xs font-mono space-y-1.5">
        <div className="flex items-center space-x-2 font-bold text-[#176B87] uppercase">
          <Cpu className="w-4 h-4" />
          <span>{t('backendNoteTitle')}</span>
        </div>
        <p className="text-[#5B6875] leading-relaxed">
          {t('backendNoteDesc')}
        </p>
      </div>
    </div>
  );
};
