import type { RegistrationResult, TiePoint } from '../types/matching';

export const formatPx = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)} px`;

export const formatMetres = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)} m`;

export const formatPercent = (fraction: number, digits = 0) => `${(fraction * 100).toFixed(digits)}%`;

/** "polynomial-4" -> "Polynomial, degree 4"; "polynomial-4+local" -> "Polynomial, degree 4 + local grid" */
export function modelLabel(model: string): string {
  const local = model.endsWith('+local');
  const [kind, degree] = model.replace('+local', '').split('-');
  const name = kind.charAt(0).toUpperCase() + kind.slice(1);
  const base = degree ? `${name}, degree ${degree}` : name;
  return local ? `${base} + local grid` : base;
}

export type ErrorBand = 'excellent' | 'subpixel' | 'caution' | 'poor' | 'none';

export const ERROR_BANDS: Exclude<ErrorBand, 'none'>[] = ['excellent', 'subpixel', 'caution', 'poor'];

/** Held-out error bands shared by every visual layer, anchored on the sub-pixel target. */
export function errorBand(errorPx: number | null | undefined): ErrorBand {
  if (errorPx === null || errorPx === undefined || !Number.isFinite(errorPx)) return 'none';
  if (errorPx < 0.5) return 'excellent';
  if (errorPx < 1) return 'subpixel';
  if (errorPx < 2) return 'caution';
  return 'poor';
}

export const BAND_COLOURS: Record<ErrorBand, string> = {
  excellent: '#176B87',
  subpixel: '#5FA8C2',
  caution: '#E3A93B',
  poor: '#B94A48',
  none: '#64748B',
};

/** Evenly spread subset of tie points (keeps the engine's grid order). */
export function sampleTiePoints(points: TiePoint[], count: number): TiePoint[] {
  if (points.length <= count) return points;
  const step = points.length / count;
  return Array.from({ length: count }, (_, i) => points[Math.floor(i * step)]);
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function downloadReport(result: RegistrationResult) {
  const { tiePoints, cells, ...summary } = result;
  const report = { ...summary, cells, tiePointCount: tiePoints.length };
  download(`registration_report_${result.jobId}.json`, JSON.stringify(report, null, 2), 'application/json');
}
