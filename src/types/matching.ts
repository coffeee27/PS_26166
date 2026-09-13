export type MatchStatusType = 'HIGH_MATCH' | 'POSSIBLE_MATCH' | 'LOW_MATCH' | 'NOT_STARTED';
export type LocationVerification = 'LIKELY_SAME' | 'LIKELY_DIFFERENT' | 'UNCERTAIN';

export interface ImageMetadata {
  filename: string;
  fileSize: string;
  dimensions: string;
  format: string;
  captureDate?: string;
  sensor?: string;
  solarElevation?: string;
}

export interface FeaturePoint {
  id: string;
  x1: number; // Percentage 0-100
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  status: 'matched' | 'potential' | 'unmatched';
  label?: string;
}

export type HexStatus = 'unprocessed' | 'matched' | 'strong_match' | 'uncertain' | 'mismatch';

export interface HexagonCell {
  id: number;
  col: number;
  row: number;
  status: HexStatus;
  score: number;
  terrainType: string;
}

export interface GeospatialResult {
  latitude: string;
  longitude: string;
  elevation: string;
  terrainType: string;
  craterDensity: string;
  solarAzimuth: string;
  sunElevationAngle: string;
  coordinateSystem: string;
  isDemoData: true;
}

export interface ProcessingStep {
  id: number;
  key: string;
  labelEn: string;
  labelHi: string;
  descriptionEn: string;
  descriptionHi: string;
}

export interface MatchResult {
  confidence: number; // e.g. 92.7
  status: MatchStatusType;
  locationVerification: LocationVerification;
  matchedRegions: number;
  totalRegions: number;
  terrainSimilarity: 'HIGH' | 'MEDIUM' | 'LOW';
  featureCorrespondenceCount: number;
  rmse: number;
  maxError: number;
  inlierCount: number;
  inlierRatio: number;
  spatialCoverage: number;
  uniformityScore: number;
  subpixelAccuracy: 'ACHIEVED' | 'NOT_ACHIEVED';
  qualityStatus: 'ACCEPTED' | 'REJECTED';
  featurePoints: FeaturePoint[];
  hexagonGrid: HexagonCell[];
  geospatial: GeospatialResult;
  processingTimeMs: number;
  isDemoAnalysis: true;
  analyzedAt: string;
}

export interface SamplePreset {
  id: string;
  titleEn: string;
  titleHi: string;
  locationEn: string;
  locationHi: string;
  refImage: string;
  queryImage: string;
  refMetadata: ImageMetadata;
  queryMetadata: ImageMetadata;
  expectedConfidence: number;
}
