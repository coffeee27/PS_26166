import React from 'react';
import { useTranslation } from '../../../i18n';
import { LUNAR } from '../lunarImages';
import { REAL } from '../realData';
import { ACCENT, AMBER, useInViewOnce, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/*
 * Real frames where we have them: OHRC (Vikram landing site) and IIRS (a real
 * PDS4 cube, one band, detector stripes removed). No TMC-2 frame of the site is
 * available, so its card shows the OHRC view shrunk to 5 m per pixel.
 */

/** Raw signal of the IIRS frame across its bands (uncalibrated, normalised). */
const SPECTRUM_RANGE = [0.7, 5.0] as const;
const spectrumX = (um: number) => ((um - SPECTRUM_RANGE[0]) / (SPECTRUM_RANGE[1] - SPECTRUM_RANGE[0])) * 300;
const SPECTRUM = REAL.iirs.spectrum.map(([um, value]) => `${spectrumX(um).toFixed(1)},${(60 - value * 52).toFixed(1)}`).join(' ');

const SpectrumChart: React.FC = () => (
  <svg viewBox="0 0 300 76" className="w-full h-auto" role="img" aria-label="Raw signal of a real IIRS frame across its bands">
    <defs>
      <linearGradient id="iirs-band" x1="0" x2="1">
        <stop offset="0%" stopColor="#7B5CFF" />
        <stop offset="45%" stopColor={ACCENT} />
        <stop offset="100%" stopColor={AMBER} />
      </linearGradient>
    </defs>
    {Array.from({ length: 64 }, (_, i) => (
      <rect key={i} x={i * (300 / 64)} y="66" width={300 / 64 - 1} height="6" fill="url(#iirs-band)" opacity={0.35 + (i % 4) * 0.12} />
    ))}
    <polyline points={SPECTRUM} fill="none" stroke="url(#iirs-band)" strokeWidth="2" />
    <text x="0" y="8" className="font-mono" fontSize="7.5" fontWeight="700" fill="#E6EDF3">RAW SIGNAL · THIS FRAME</text>
    <text x="300" y="8" textAnchor="end" className="font-mono" fontSize="7" fill="#7A8794">UNCALIBRATED</text>
    <rect x="0" y="4" width="2" height="68" fill="#fff">
      <animate attributeName="x" values="0;298;0" dur="6s" repeatCount="indefinite" />
    </rect>
    <text x="0" y="75" className="font-mono" fontSize="7" fill="#7A8794" dy="0">0.7 µm</text>
    <text x="300" y="75" textAnchor="end" className="font-mono" fontSize="7" fill="#7A8794">5.0 µm</text>
  </svg>
);

export const PayloadsSection: React.FC = () => {
  const { t } = useTranslation();
  const pauseRef = usePauseOffscreen<HTMLElement>();
  const [barsRef, barsSeen] = useInViewOnce<HTMLDivElement>(0.3);

  const sensors = [
    {
      name: 'OHRC',
      note: t('sensorOhrcDesc'),
      resolution: '0.25',
      swathKm: 3,
      spectral: '0.45 – 0.80 µm',
      reference: 'LRO NAC (~0.5 m)',
      image: LUNAR.ohrcBrightCrater,
      pixelated: false,
      frame: 'realFrame' as const,
    },
    {
      name: 'TMC-2',
      note: t('sensorTmcDesc'),
      resolution: '5',
      swathKm: 20,
      spectral: '0.5 – 0.8 µm',
      reference: 'SELENE TC (~10 m)',
      image: LUNAR.ohrcAt5m,
      pixelated: true,
      frame: 'simulatedFrame' as const,
    },
    {
      name: 'IIRS',
      note: t('sensorIirsDesc'),
      resolution: '80',
      swathKm: 20,
      spectral: '0.8 – 5.0 µm',
      reference: 'SELENE / LRO maps',
      image: LUNAR.iirsPatch,
      pixelated: true,
      frame: 'realFrame' as const,
    },
  ];

  return (
    <section ref={pauseRef} id="payloads" className="scroll-mt-16 border-t border-white/10 bg-[#070B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <SectionHeading badge={t('landingSensorsTitle')} title={t('secPayloadsTitle')} desc={t('landingSensorsDesc')} />

        <div ref={barsRef} className="mt-12 grid md:grid-cols-3 gap-5">
          {sensors.map((sensor, i) => (
            <article
              key={sensor.name}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-[#0C1218] overflow-hidden hover:border-[#5EB8D6]/50 hover:shadow-[0_0_40px_rgba(94,184,214,0.15)] transition-all duration-300"
            >
              <div className="relative aspect-square overflow-hidden bg-black [container-type:size]">
                <img
                  src={sensor.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  style={sensor.pixelated ? { imageRendering: 'pixelated' } : undefined}
                />
                <span
                  className={`absolute right-3 top-3 font-mono text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-black/70 ${
                    sensor.frame === 'realFrame' ? 'text-[#5EB8D6]' : 'text-[#E3A93B]'
                  }`}
                >
                  {t(sensor.frame)}
                </span>
                {/* Pushbroom scan line */}
                <div
                  className="lp-scan absolute inset-x-0 top-0 h-[2px] bg-white shadow-[0_0_16px_4px_rgba(94,184,214,0.8)]"
                  style={{ '--scan': '100cqh', animationDelay: `${i * 0.5}s` } as React.CSSProperties}
                  aria-hidden="true"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" aria-hidden="true" />
                <div className="absolute left-4 bottom-4">
                  <div className="font-mono text-xs font-bold tracking-[0.25em] text-[#5EB8D6]">{sensor.name}</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-5xl font-bold font-mono tracking-tight text-white">{sensor.resolution}</span>
                    <span className="font-mono text-sm text-[#8B98A5]">m / px</span>
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <p className="text-xs text-[#8B98A5]">{sensor.note}</p>

                <div className="mt-4">
                  <div className="flex justify-between font-mono text-[10px] font-bold tracking-widest text-[#7A8794]">
                    <span>{t('payloadSwath')}</span>
                    <span className="text-[#E6EDF3]">~{sensor.swathKm} km</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#176B87] to-[#5EB8D6] origin-left transition-transform duration-[1400ms] ease-out"
                      style={{
                        width: `${(sensor.swathKm / 20) * 100}%`,
                        transform: `scaleX(${barsSeen ? 1 : 0})`,
                        transitionDelay: `${i * 200}ms`,
                      }}
                    />
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-y-2 font-mono text-[11px]">
                  <dt className="text-[#7A8794]">{t('colSpectral')}</dt>
                  <dd className="text-right text-[#E6EDF3]">{sensor.spectral}</dd>
                  <dt className="text-[#7A8794]">{t('colReference')}</dt>
                  <dd className="text-right text-[#5EB8D6]">{sensor.reference}</dd>
                </dl>

                {sensor.name === 'IIRS' && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <SpectrumChart />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="mt-5 font-mono text-[10px] tracking-wider text-[#7A8794]">{t('payloadRelative')}</p>
      </div>
    </section>
  );
};
