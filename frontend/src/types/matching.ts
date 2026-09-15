export type SubpixelStatus = 'ACHIEVED' | 'NOT_ACHIEVED';
export type QualityStatus = 'ACCEPTED' | 'REJECTED';

export interface ImageMetadata {
  filename: string;
  fileSize: string;
  dimensions: string;
  format: string;
  sensor?: string;
}

/** A tie point in reference and source pixel coordinates, with its held-out error. */
export interface TiePoint {
  reference: [number, number];
  source: [number, number];
  errorPx: number | null;
}

/** Tie-point count and held-out RMSE of one cell of the engine's analysis grid. */
export interface GridCell {
  row: number;
  col: number;
  tiePoints: number;
  rmsePx: number | null;
}

export type ProveCheckId = 'subpixel' | 'agreement' | 'coverage' | 'evenness' | 'good_cells';
export type EvidenceLevel = 'STRONG' | 'MODERATE' | 'WEAK';

/** One measured PROVE check: a value the engine measured against a fixed limit. */
export interface ProveCheck {
  id: ProveCheckId;
  label: string;
  value: number | null;
  limit: number;
  comparison: '<=' | '>=';
  unit: 'px' | '%' | '';
  passed: boolean;
}

export interface ProveScore {
  passed: number;
  total: number;
  evidence: EvidenceLevel;
  checks: ProveCheck[];
  note: string;
}

export interface RegistrationImages {
  registered: string;
  overlay: string;
  errorHeatmap: string;
  tiePoints: string;
  referencePreview: string;
  sourcePreview: string;
  /** Float32 GeoTIFF on the reference grid, with the reference's georeferencing. */
  registeredGeotiff: string;
  tiePointsCsv: string;
}

export interface RegistrationResult {
  jobId: string;
  referenceFilename: string;
  sourceFilename: string;
  analyzedAt: string;
  processingTimeMs: number;

  /** Geometric model chosen by spatial-block hold-out, e.g. "polynomial-4". */
  model: string;
  /** Held-out RMSE of every candidate model, reference pixels. */
  modelRmsePx: Record<string, number>;
  holdoutRmsePx: number;
  holdoutRmseM: number | null;
  fitRmsePx: number;
  maxErrorPx: number | null;

  tiePointCount: number;
  inlierRatio: number;
  spatialCoverage: number;
  uniformityScore: number;

  subpixelAccuracy: SubpixelStatus;
  qualityStatus: QualityStatus;
  qualityReasons: string[];
  prove: ProveScore;

  referenceGsd: number | null;
  sourceGsd: number | null;
  referenceShape: [number, number]; // [height, width]
  sourceShape: [number, number];
  georeferenced: boolean;

  putativeMatches: number;
  coarseInliers: number;
  engineSeconds: number;

  cellGrid: [number, number]; // [rows, cols]
  cells: GridCell[];
  heatmapScalePx: [number, number];
  tiePoints: TiePoint[];
  /** Least-squares source -> reference homography, for display only. */
  transformation: number[][];
  images: RegistrationImages;
}

export interface SampleImage {
  label: string;
  filename: string;
  preview: string;
  shape: [number, number];
  sizeBytes: number;
}

/** A real image pair available on the backend machine. */
export interface SamplePair {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  reference: SampleImage;
  source: SampleImage;
}
