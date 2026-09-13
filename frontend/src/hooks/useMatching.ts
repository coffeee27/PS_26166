import { useState, useCallback } from 'react';
import type { MatchResult, ImageMetadata } from '../types/matching';
import { matchingService } from '../services/matchingService';
import { SAMPLE_PRESETS } from '../data/sampleLunarImages';

export interface UseMatchingReturn {
  referenceImage: string | null;
  queryImage: string | null;
  referenceMetadata: ImageMetadata | null;
  queryMetadata: ImageMetadata | null;
  isProcessing: boolean;
  currentStep: number;
  progressPercent: number;
  matchResult: MatchResult | null;
  selectedPresetId: string | null;
  setReferenceImage: (url: string | null, meta?: ImageMetadata) => void;
  setQueryImage: (url: string | null, meta?: ImageMetadata) => void;
  loadPreset: (presetId: string) => void;
  runAnalysis: () => Promise<void>;
  resetAnalysis: () => void;
}

export function useMatching(): UseMatchingReturn {
  const defaultPreset = SAMPLE_PRESETS[0];

  const [referenceImage, setRefImgState] = useState<string | null>(defaultPreset.refImage);
  const [queryImage, setQueryImgState] = useState<string | null>(defaultPreset.queryImage);
  const [referenceMetadata, setRefMetaState] = useState<ImageMetadata | null>(defaultPreset.refMetadata);
  const [queryMetadata, setQueryMetaState] = useState<ImageMetadata | null>(defaultPreset.queryMetadata);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(defaultPreset.id);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const setReferenceImage = useCallback((url: string | null, meta?: ImageMetadata) => {
    setRefImgState(url);
    if (meta) setRefMetaState(meta);
    else if (!url) setRefMetaState(null);
    setSelectedPresetId(null);
    setMatchResult(null);
  }, []);

  const setQueryImage = useCallback((url: string | null, meta?: ImageMetadata) => {
    setQueryImgState(url);
    if (meta) setQueryMetaState(meta);
    else if (!url) setQueryMetaState(null);
    setSelectedPresetId(null);
    setMatchResult(null);
  }, []);

  const loadPreset = useCallback((presetId: string) => {
    const preset = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setRefImgState(preset.refImage);
      setQueryImgState(preset.queryImage);
      setRefMetaState(preset.refMetadata);
      setQueryMetaState(preset.queryMetadata);
      setSelectedPresetId(preset.id);
      setMatchResult(null);
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!referenceImage || !queryImage) return;

    setIsProcessing(true);
    setCurrentStep(0);
    setProgressPercent(0);
    setMatchResult(null);

    try {
      const result = await matchingService.analyzeImages(
        referenceImage,
        queryImage,
        (stepIndex, progress) => {
          setCurrentStep(stepIndex);
          setProgressPercent(progress);
        }
      );

      setMatchResult(result);
    } catch (err) {
      console.error('Matching analysis error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [referenceImage, queryImage]);

  const resetAnalysis = useCallback(() => {
    setRefImgState(null);
    setQueryImgState(null);
    setRefMetaState(null);
    setQueryMetaState(null);
    setSelectedPresetId(null);
    setIsProcessing(false);
    setCurrentStep(0);
    setProgressPercent(0);
    setMatchResult(null);
  }, []);

  return {
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
    resetAnalysis,
  };
}
