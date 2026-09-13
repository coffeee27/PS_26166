import React from 'react';
import { useTranslation } from '../../../i18n';
import craterA from '../../../assets/layers/crater-a.webp';
import craterPx10 from '../../../assets/layers/crater-a-px10.png';
import craterPx40 from '../../../assets/layers/crater-a-px40.png';
import { ACCENT, AMBER, useInViewOnce, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/*
 * The same crater as each Chandrayaan-2 camera would resolve it. Pixelation is
 * relative and illustrative (the true OHRC-to-IIRS ratio is 320x, which would
 * reduce the crater to a couple of pixels).
 */

/** IIRS reflectance-style curve over 0.8-5.0 µm with a dip near 3 µm (OH / H2O). */
const SPECTRUM = (() => {
  const points: string[] = [];
  for (let i = 0; i <= 84; i++) {
    const um = 0.8 + (i / 84) * 4.2;
    const base = 0.55 + 0.18 * Math.sin(um * 1.3) - 0.05 * um;
    const dip = 0.32 * Math.exp(-Math.pow((um - 2.95) / 0.22, 2));
    const y = 60 - (base - dip) * 70;
    points.push(`${((i / 84) * 300).toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
})();
const DIP_X = ((2.95 - 0.8) / 4.2) * 300;

const SpectrumChart: React.FC = () => (
  <svg viewBox="0 0 300 76" className="w-full h-auto" role="img" aria-label="IIRS spectrum with an absorption dip near 3 micrometres">
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
    <line x1={DIP_X} y1="8" x2={DIP_X} y2="62" stroke="#fff" strokeOpacity="0.35" strokeDasharray="2 3" />
    <text x={DIP_X + 5} y="16" className="font-mono" fontSize="8" fontWeight="700" fill="#E6EDF3">~3 µm OH / H₂O</text>
    <text x="300" y="8" textAnchor="end" className="font-mono" fontSize="7" fill="#7A8794">ILLUSTRATIVE</text>
    <rect x="0" y="4" width="2" height="68" fill="#fff">
      <animate attributeName="x" values="0;298;0" dur="6s" repeatCount="indefinite" />
    </rect>
    <text x="0" y="75" className="font-mono" fontSize="7" fill="#7A8794" dy="0">0.8 µm</text>
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
      image: craterA,
      pixelated: false,
      tint: null as string | null,
    },
    {
      name: 'TMC-2',
      note: t('sensorTmcDesc'),
      resolution: '5',
      swathKm: 20,
      spectral: '0.5 – 0.8 µm',
      reference: 'SELENE TC (~10 m)',
      image: craterPx10,
      pixelated: true,
      tint: null,
    },
    {
      name: 'IIRS',
      note: t('sensorIirsDesc'),
      resolution: '80',
      swathKm: 20,
      spectral: '0.8 – 5.0 µm',
      reference: 'SELENE TC (~10 m)',
      image: craterPx40,
      pixelated: true,
      tint: 'linear-gradient(135deg, #7B5CFF, #5EB8D6 50%, #E3A93B)',
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
                {sensor.tint && (
                  <div className="absolute inset-0" style={{ background: sensor.tint, mixBlendMode: 'color' }} aria-hidden="true" />
                )}
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
