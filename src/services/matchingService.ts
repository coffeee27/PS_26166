import type { MatchResult, HexagonCell, FeaturePoint, GeospatialResult } from '../types/matching';

export class MatchingService {
  public async analyzeImages(
    _referenceImage: string,
    _queryImage: string,
    onProgressUpdate?: (stepIndex: number, progressPercent: number) => void
  ): Promise<MatchResult> {
    const steps = 6;
    
    for (let step = 0; step < steps; step++) {
      if (onProgressUpdate) {
        onProgressUpdate(step, Math.round(((step + 1) / steps) * 100));
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    const featurePoints: FeaturePoint[] = [
      { id: 'f1', x1: 22, y1: 30, x2: 23, y2: 31, confidence: 0.96, status: 'matched', label: 'Tycho Central Crater Rim' },
      { id: 'f2', x1: 45, y1: 25, x2: 44, y2: 26, confidence: 0.94, status: 'matched', label: 'South Wall Terrace' },
      { id: 'f3', x1: 68, y1: 38, x2: 67, y2: 39, confidence: 0.91, status: 'matched', label: 'Impact Ejecta Ridge Alpha' },
      { id: 'f4', x1: 35, y1: 58, x2: 36, y2: 57, confidence: 0.89, status: 'matched', label: 'Secondary Crater Cluster' },
      { id: 'f5', x1: 78, y1: 64, x2: 79, y2: 63, confidence: 0.93, status: 'matched', label: 'Permanently Shadowed Rim' },
      { id: 'f6', x1: 52, y1: 72, x2: 51, y2: 74, confidence: 0.87, status: 'matched', label: 'South Pole Basin Ridge' },
      { id: 'f7', x1: 15, y1: 65, x2: 18, y2: 62, confidence: 0.72, status: 'potential', label: 'Low-Sun Elevation Shadow' },
      { id: 'f8', x1: 85, y1: 22, x2: 82, y2: 28, confidence: 0.65, status: 'potential', label: 'Regolith Texture Boundary' },
      { id: 'f9', x1: 30, y1: 85, x2: 42, y2: 88, confidence: 0.48, status: 'unmatched', label: 'Sensor Flare Artifact' },
      { id: 'f10', x1: 60, y1: 18, x2: 61, y2: 19, confidence: 0.95, status: 'matched', label: 'Northern Ejecta Ray' },
    ];

    const hexagonGrid: HexagonCell[] = [];
    let matchedCount = 0;
    
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const id = row * 10 + col + 1;
        const seed = (row * 13 + col * 29) % 100;
        
        let status: HexagonCell['status'] = 'matched';
        let score = 0.88;

        if (seed > 85) {
          status = 'strong_match';
          score = 0.98;
          matchedCount++;
        } else if (seed > 15) {
          status = 'matched';
          score = 0.89 + (seed % 8) * 0.01;
          matchedCount++;
        } else if (seed > 6) {
          status = 'uncertain';
          score = 0.62;
        } else {
          status = 'mismatch';
          score = 0.35;
        }

        hexagonGrid.push({
          id,
          col,
          row,
          status,
          score: Math.round(score * 100) / 100,
          terrainType: (row + col) % 3 === 0 ? 'Crater Rim' : (row + col) % 3 === 1 ? 'Mare Regolith' : 'Highland Ejecta',
        });
      }
    }

    const geospatial: GeospatialResult = {
      latitude: '89.9142° S',
      longitude: '0.0028° E',
      elevation: '-3.842 km (South Pole-Aitken Rim)',
      terrainType: 'Highland Rim / Permanently Shadowed Region',
      craterDensity: '1,420 craters/1000 km²',
      solarAzimuth: '114.6°',
      sunElevationAngle: '14.2°',
      coordinateSystem: 'LRO LROC-NAC Selective Metric Grid (MOON_ME_2015)',
      isDemoData: true,
    };

    return {
      confidence: 92.7,
      status: 'HIGH_MATCH',
      locationVerification: 'LIKELY_SAME',
      matchedRegions: matchedCount,
      totalRegions: 100,
      terrainSimilarity: 'HIGH',
      featureCorrespondenceCount: 87,
      rmse: 1.63,
      maxError: 2.63,
      inlierCount: 16,
      inlierRatio: 0.16,
      spatialCoverage: 0.3125,
      uniformityScore: 0.344,
      subpixelAccuracy: 'NOT_ACHIEVED',
      qualityStatus: 'REJECTED',
      featurePoints,
      hexagonGrid,
      geospatial,
      processingTimeMs: 3600,
      isDemoAnalysis: true,
      analyzedAt: new Date().toISOString(),
    };
  }
}

export const matchingService = new MatchingService();
