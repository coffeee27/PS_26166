import { useState, useCallback, useEffect, useRef } from 'react';
import type { RegistrationResult, ImageMetadata, SamplePair } from '../types/matching';
import { matchingService } from '../services/matchingService';

export interface UseMatchingReturn {
  /** Preview URLs shown before a result exists (object URLs for uploads, backend previews for samples). */
  referenceImage: string | null;
  queryImage: string | null;
  referenceMetadata: ImageMetadata | null;
  queryMetadata: ImageMetadata | null;
  samples: SamplePair[];
  backendOnline: boolean | null;
  selectedPresetId: string | null;
  /** A sample is selected, or both files are uploaded. */
  canRun: boolean;
  isProcessing: boolean;
  elapsedMs: number;
  matchResult: RegistrationResult | null;
  error: string | null;
  setReferenceFile: (file: File | null) => void;
  setQueryFile: (file: File | null) => void;
  loadPreset: (sampleId: string) => void;
  runAnalysis: () => Promise<void>;
  resetAnalysis: () => void;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fileMetadata(file: File, dimensions: string): ImageMetadata {
  const extension = file.name.split('.').pop()?.toUpperCase() ?? 'IMAGE';
  return { filename: file.name, fileSize: formatBytes(file.size), dimensions, format: extension };
}

/** Browsers cannot decode TIFF, so the preview may fail; dimensions then come from the backend result. */
function readDimensions(objectUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(`${image.naturalWidth} × ${image.naturalHeight} px`);
    image.onerror = () => resolve('—');
    image.src = objectUrl;
  });
}

export function useMatching(): UseMatchingReturn {
  const [referenceFile, setReferenceFileState] = useState<File | null>(null);
  const [queryFile, setQueryFileState] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const [referenceMetadata, setReferenceMetadata] = useState<ImageMetadata | null>(null);
  const [queryMetadata, setQueryMetadata] = useState<ImageMetadata | null>(null);

  const [samples, setSamples] = useState<SamplePair[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [matchResult, setMatchResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const createdUrls = objectUrls.current;
    let cancelled = false;
    (async () => {
      const online = await matchingService.isOnline();
      if (cancelled) return;
      setBackendOnline(online);
      if (!online) return;
      try {
        const available = await matchingService.listSamples();
        if (!cancelled) setSamples(available);
      } catch {
        // Samples are optional; uploads still work.
      }
    })();
    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  useEffect(() => {
    if (!isProcessing) return;
    const started = performance.now();
    const timer = window.setInterval(() => setElapsedMs(performance.now() - started), 200);
    return () => window.clearInterval(timer);
  }, [isProcessing]);

  const selectFile = useCallback(
    (
      file: File | null,
      setFile: (f: File | null) => void,
      setPreview: (u: string | null) => void,
      setMeta: (m: ImageMetadata | null) => void,
    ) => {
      if (selectedPresetId !== null) {
        // Leaving a sample: its previews are not uploads, so clear both sides.
        setReferenceImage(null);
        setQueryImage(null);
        setReferenceMetadata(null);
        setQueryMetadata(null);
        setSelectedPresetId(null);
      }
      setMatchResult(null);
      setError(null);
      setFile(file);
      if (!file) {
        setPreview(null);
        setMeta(null);
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      objectUrls.current.push(objectUrl);
      setPreview(objectUrl);
      setMeta(fileMetadata(file, '…'));
      readDimensions(objectUrl).then((dimensions) => setMeta(fileMetadata(file, dimensions)));
    },
    [selectedPresetId],
  );

  const setReferenceFile = useCallback(
    (file: File | null) => selectFile(file, setReferenceFileState, setReferenceImage, setReferenceMetadata),
    [selectFile],
  );
  const setQueryFile = useCallback(
    (file: File | null) => selectFile(file, setQueryFileState, setQueryImage, setQueryMetadata),
    [selectFile],
  );

  const loadPreset = useCallback(
    (sampleId: string) => {
      const sample = samples.find((s) => s.id === sampleId);
      if (!sample) return;
      const meta = (image: SamplePair['reference']): ImageMetadata => ({
        filename: image.filename,
        fileSize: formatBytes(image.sizeBytes),
        dimensions: `${image.shape[1]} × ${image.shape[0]} px`,
        format: image.filename.split('.').pop()?.toUpperCase() ?? 'IMAGE',
        sensor: image.label,
      });
      setReferenceFileState(null);
      setQueryFileState(null);
      setReferenceImage(sample.reference.preview);
      setQueryImage(sample.source.preview);
      setReferenceMetadata(meta(sample.reference));
      setQueryMetadata(meta(sample.source));
      setSelectedPresetId(sample.id);
      setMatchResult(null);
      setError(null);
    },
    [samples],
  );

  const runAnalysis = useCallback(async () => {
    const usingSample = selectedPresetId !== null;
    if (!usingSample && (!referenceFile || !queryFile)) return;

    setIsProcessing(true);
    setElapsedMs(0);
    setMatchResult(null);
    setError(null);
    try {
      const result = usingSample
        ? await matchingService.analyzeSample(selectedPresetId)
        : await matchingService.analyzeFiles(referenceFile!, queryFile!);
      setMatchResult(result);
      // Backend previews render TIFF and 16-bit inputs that the browser cannot show.
      setReferenceImage(result.images.referencePreview);
      setQueryImage(result.images.sourcePreview);
      const dims = (shape: [number, number]) => `${shape[1]} × ${shape[0]} px`;
      setReferenceMetadata((m) => (m ? { ...m, dimensions: dims(result.referenceShape) } : m));
      setQueryMetadata((m) => (m ? { ...m, dimensions: dims(result.sourceShape) } : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPresetId, referenceFile, queryFile]);

  const resetAnalysis = useCallback(() => {
    setReferenceFileState(null);
    setQueryFileState(null);
    setReferenceImage(null);
    setQueryImage(null);
    setReferenceMetadata(null);
    setQueryMetadata(null);
    setSelectedPresetId(null);
    setIsProcessing(false);
    setElapsedMs(0);
    setMatchResult(null);
    setError(null);
  }, []);

  return {
    referenceImage,
    queryImage,
    referenceMetadata,
    queryMetadata,
    samples,
    backendOnline,
    selectedPresetId,
    canRun: selectedPresetId !== null || (referenceFile !== null && queryFile !== null),
    isProcessing,
    elapsedMs,
    matchResult,
    error,
    setReferenceFile,
    setQueryFile,
    loadPreset,
    runAnalysis,
    resetAnalysis,
  };
}
