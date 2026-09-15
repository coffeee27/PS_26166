import type { ProveScore, RegistrationResult, SamplePair, SampleImage } from '../types/matching';

// Empty base = same origin; the Vite dev server proxies /api and /data to the backend.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const url = (path: string) => `${API_BASE}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url(path), init);
  } catch {
    throw new ApiError(0, 'Cannot reach the registration backend. Start it with: cd backend && uvicorn app.main:app');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status === 'error') {
    throw new ApiError(response.status, body?.message ?? `Request failed (${response.status})`);
  }
  return body as T;
}

/* ----------------------------------------------------------------- API payloads (snake_case) */

interface ApiCell {
  row: number;
  col: number;
  tie_points: number;
  rmse_px: number | null;
}

interface ApiAnalyzeResponse {
  job_id: string;
  source_filename: string;
  reference_filename: string;
  result: {
    matches: { source: [number, number]; reference: [number, number]; distance: number | null }[];
    transformation: number[][];
    metrics: {
      rmse: number;
      max_error: number | null;
      inlier_count: number;
      inlier_ratio: number;
      spatial_coverage: number;
      uniformity_score: number;
    };
    quality_assessment: { status: 'ACCEPTED' | 'REJECTED'; subpixel_accuracy: 'ACHIEVED' | 'NOT_ACHIEVED'; reasons: string[] };
    prove: ProveScore;
    registered_image: string;
    overlay_image: string;
    error_heatmap_image: string;
    inlier_matches_image: string;
    reference_preview_image: string;
    source_preview_image: string;
    registered_geotiff: string;
    tie_points_csv: string;
    engine: {
      model: string;
      model_rmse_px: Record<string, number>;
      holdout_rmse_m: number | null;
      fit_rmse_px: number;
      putative_matches: number;
      coarse_inliers: number;
      total_seconds: number;
      reference_gsd: number | null;
      source_gsd: number | null;
      reference_shape: [number, number];
      source_shape: [number, number];
      georeferenced: boolean;
      cell_grid: [number, number];
      cells: ApiCell[];
      error_heatmap_scale_px: [number, number];
    };
  };
}

interface ApiSampleImage {
  label: string;
  filename: string;
  preview: string;
  shape: [number, number];
  size_bytes: number;
}

interface ApiSample {
  id: string;
  title: string;
  title_hi: string;
  description: string;
  reference: ApiSampleImage;
  source: ApiSampleImage;
}

/* ----------------------------------------------------------------- mapping */

function toResult(response: ApiAnalyzeResponse, processingTimeMs: number): RegistrationResult {
  const { result } = response;
  const { engine, metrics, quality_assessment: quality } = result;
  return {
    jobId: response.job_id,
    referenceFilename: response.reference_filename,
    sourceFilename: response.source_filename,
    analyzedAt: new Date().toISOString(),
    processingTimeMs,
    model: engine.model,
    modelRmsePx: engine.model_rmse_px,
    holdoutRmsePx: metrics.rmse,
    holdoutRmseM: engine.holdout_rmse_m,
    fitRmsePx: engine.fit_rmse_px,
    maxErrorPx: metrics.max_error,
    tiePointCount: metrics.inlier_count,
    inlierRatio: metrics.inlier_ratio,
    spatialCoverage: metrics.spatial_coverage,
    uniformityScore: metrics.uniformity_score,
    subpixelAccuracy: quality.subpixel_accuracy,
    qualityStatus: quality.status,
    qualityReasons: quality.reasons,
    prove: result.prove,
    referenceGsd: engine.reference_gsd,
    sourceGsd: engine.source_gsd,
    referenceShape: engine.reference_shape,
    sourceShape: engine.source_shape,
    georeferenced: engine.georeferenced,
    putativeMatches: engine.putative_matches,
    coarseInliers: engine.coarse_inliers,
    engineSeconds: engine.total_seconds,
    cellGrid: engine.cell_grid,
    cells: engine.cells.map((cell) => ({ row: cell.row, col: cell.col, tiePoints: cell.tie_points, rmsePx: cell.rmse_px })),
    heatmapScalePx: engine.error_heatmap_scale_px,
    tiePoints: result.matches.map((m) => ({ reference: m.reference, source: m.source, errorPx: m.distance })),
    transformation: result.transformation,
    images: {
      registered: url(result.registered_image),
      overlay: url(result.overlay_image),
      errorHeatmap: url(result.error_heatmap_image),
      tiePoints: url(result.inlier_matches_image),
      referencePreview: url(result.reference_preview_image),
      sourcePreview: url(result.source_preview_image),
      registeredGeotiff: url(result.registered_geotiff),
      tiePointsCsv: url(result.tie_points_csv),
    },
  };
}

const toSampleImage = (image: ApiSampleImage): SampleImage => ({
  label: image.label,
  filename: image.filename,
  preview: url(image.preview),
  shape: image.shape,
  sizeBytes: image.size_bytes,
});

async function timed(run: () => Promise<ApiAnalyzeResponse>): Promise<RegistrationResult> {
  const started = performance.now();
  const response = await run();
  return toResult(response, Math.round(performance.now() - started));
}

/* ----------------------------------------------------------------- public API */

export const matchingService = {
  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(url('/health'));
      return response.ok;
    } catch {
      return false;
    }
  },

  async listSamples(): Promise<SamplePair[]> {
    const body = await request<{ samples: ApiSample[] }>('/api/samples');
    return body.samples.map((s) => ({
      id: s.id,
      title: s.title,
      titleHi: s.title_hi,
      description: s.description,
      reference: toSampleImage(s.reference),
      source: toSampleImage(s.source),
    }));
  },

  analyzeFiles(reference: File, source: File): Promise<RegistrationResult> {
    const form = new FormData();
    form.append('reference', reference);
    form.append('source', source);
    return timed(() => request<ApiAnalyzeResponse>('/api/registration/analyze', { method: 'POST', body: form }));
  },

  analyzeSample(sampleId: string): Promise<RegistrationResult> {
    const form = new FormData();
    form.append('sample_id', sampleId);
    return timed(() => request<ApiAnalyzeResponse>('/api/registration/analyze-sample', { method: 'POST', body: form }));
  },
};
