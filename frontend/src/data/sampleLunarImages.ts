import type { SamplePreset } from '../types/matching';

function createLunarSurfaceSvg(title: string, craterCount: number, variationSeed: number): string {
  const width = 600;
  const height = 450;

  let craters = '';
  for (let i = 0; i < craterCount; i++) {
    const cx = ( (i * 73 + variationSeed * 37) % 520 ) + 40;
    const cy = ( (i * 91 + variationSeed * 53) % 370 ) + 40;
    const r = ( (i * 13 + variationSeed * 17) % 35 ) + 10;
    const shadowOffset = r * 0.25;

    craters += `
      <g>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#2A3440" opacity="0.8" />
        <ellipse cx="${cx - shadowOffset}" cy="${cy - shadowOffset}" rx="${r * 0.85}" ry="${r * 0.8}" fill="#788898" opacity="0.9" />
        <ellipse cx="${cx - shadowOffset * 1.5}" cy="${cy - shadowOffset * 1.5}" rx="${r * 0.6}" ry="${r * 0.55}" fill="#404D5C" opacity="0.85" />
        <circle cx="${cx + shadowOffset * 0.5}" cy="${cy + shadowOffset * 0.5}" r="${r * 0.2}" fill="#B8C8D8" opacity="0.7" />
      </g>
    `;
  }

  let ridgeLines = '';
  for (let j = 0; j < 6; j++) {
    const y = 60 + j * 65 + (variationSeed * 11) % 20;
    ridgeLines += `<path d="M 0 ${y} Q 150 ${y - 20 + j * 5} 300 ${y + 15} T 600 ${y - 10}" stroke="#505F70" stroke-width="1.5" fill="none" opacity="0.4" />`;
  }

  const svgStr = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <radialGradient id="sunGrad${variationSeed}" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#8E9DAE" />
          <stop offset="50%" stop-color="#4B5867" />
          <stop offset="100%" stop-color="#212934" />
        </radialGradient>
      </defs>

      <rect width="100%" height="100%" fill="url(#sunGrad${variationSeed})" />
      ${ridgeLines}
      ${craters}

      <path d="M 0 150 L 600 150 M 0 300 L 600 300 M 200 0 L 200 450 M 400 0 L 400 450" stroke="#FFFFFF" stroke-width="0.5" stroke-dasharray="4 4" opacity="0.2" />
      <path d="M 20 40 L 20 20 L 40 20 M 560 20 L 580 20 L 580 40 M 20 410 L 20 430 L 40 430 M 560 430 L 580 430 L 580 410" stroke="#E3A93B" stroke-width="1.5" fill="none" opacity="0.6" />
      <text x="30" y="420" fill="#E9EEF3" font-family="monospace" font-size="12" letter-spacing="1.5" opacity="0.85">${title.toUpperCase()} [ORBITAL CAM-A]</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'tycho-south-pole',
    titleEn: 'Tycho Crater Rim (South Pole)',
    titleHi: 'टाइको क्रेटर रिम (दक्षिण ध्रुव)',
    locationEn: 'Lunar South Pole Rim (89.9° S, 0.0° E)',
    locationHi: 'चंद्र दक्षिण ध्रुव रिम (89.9° दक्षिण, 0.0° पूर्व)',
    refImage: createLunarSurfaceSvg('Tycho Crater Ref', 14, 1),
    queryImage: createLunarSurfaceSvg('Tycho Crater Query', 14, 2),
    refMetadata: {
      filename: 'LRO_NAC_TYCHO_REF_089S.TIFF',
      fileSize: '18.4 MB',
      dimensions: '4096 x 3072 px',
      format: 'TIFF (16-bit GeoTIFF)',
      captureDate: '2025-11-14 08:42:10 UTC',
      sensor: 'LRO Narrow Angle Camera',
      solarElevation: '14.2°',
    },
    queryMetadata: {
      filename: 'CH3_OHRC_TYCHO_QRY_089S.PNG',
      fileSize: '14.2 MB',
      dimensions: '4096 x 3072 px',
      format: 'PNG (Lossless)',
      captureDate: '2026-02-01 14:15:33 UTC',
      sensor: 'Orbiter High Res Camera',
      solarElevation: '15.8°',
    },
    expectedConfidence: 92.7,
  },
  {
    id: 'shackleton-ridge',
    titleEn: 'Shackleton Crater Ridge (PSR Region)',
    titleHi: 'शैकलटन क्रेटर रिज (PSR क्षेत्र)',
    locationEn: 'Shackleton Rim Permanently Shadowed Region',
    locationHi: 'शैकलटन रिम स्थायी रूप से छायांकित क्षेत्र',
    refImage: createLunarSurfaceSvg('Shackleton Ridge Ref', 18, 5),
    queryImage: createLunarSurfaceSvg('Shackleton Ridge Query', 18, 6),
    refMetadata: {
      filename: 'SHACKLETON_REF_POLAR_01.TIFF',
      fileSize: '21.0 MB',
      dimensions: '4096 x 3072 px',
      format: 'TIFF (GeoTIFF)',
      captureDate: '2025-12-01 11:20:00 UTC',
      sensor: 'LRO LROC-NAC',
      solarElevation: '4.1°',
    },
    queryMetadata: {
      filename: 'SHACKLETON_QUERY_POLAR_02.PNG',
      fileSize: '16.8 MB',
      dimensions: '4096 x 3072 px',
      format: 'PNG',
      captureDate: '2026-01-20 09:40:12 UTC',
      sensor: 'High Resolution Imager',
      solarElevation: '5.3°',
    },
    expectedConfidence: 86.4,
  },
  {
    id: 'mare-tranquillitatis',
    titleEn: 'Mare Tranquillitatis Plain',
    titleHi: 'मार ट्रांक्विलिटैटिस मैदानी क्षेत्र',
    locationEn: 'Equatorial Mare Plain (0.67° N, 23.47° E)',
    locationHi: 'भूमध्यरेखीय मार मैदान (0.67° उत्तर, 23.47° पूर्व)',
    refImage: createLunarSurfaceSvg('Tranquillitatis Ref', 10, 8),
    queryImage: createLunarSurfaceSvg('Tranquillitatis Query', 10, 9),
    refMetadata: {
      filename: 'TRANQUILLITATIS_EQUATOR_REF.PNG',
      fileSize: '12.5 MB',
      dimensions: '3840 x 2160 px',
      format: 'PNG',
      captureDate: '2025-08-19 16:00:00 UTC',
      sensor: 'Orbital Recon Camera',
      solarElevation: '42.0°',
    },
    queryMetadata: {
      filename: 'TRANQUILLITATIS_EQUATOR_QRY.JPG',
      fileSize: '8.9 MB',
      dimensions: '3840 x 2160 px',
      format: 'JPEG (High Quality)',
      captureDate: '2026-03-04 12:30:15 UTC',
      sensor: 'Surface Descent Camera',
      solarElevation: '44.5°',
    },
    expectedConfidence: 95.1,
  },
];
