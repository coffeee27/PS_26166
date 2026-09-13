import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { en } from '../../i18n/en';
import craterA from '../../assets/layers/crater-a.webp';
import {
  BriefingVisual,
  OrbitVisual,
  WorkstationVisual,
  HeatmapVisual,
  HexVisual,
  CorrespondenceVisual,
  GeoVisual,
  ResultsVisual,
} from './LayerVisuals';

type Key = keyof typeof en;

interface Layer {
  title: Key;
  desc: Key;
  tag: Key;
  /** Route that opens this layer; omitted for the landing page itself. */
  to?: string;
  Visual: React.FC;
}

const LAYERS: Layer[] = [
  { title: 'arch1Title', desc: 'arch1Desc', tag: 'arch1Tag', Visual: BriefingVisual },
  { title: 'arch2Title', desc: 'arch2Desc', tag: 'arch2Tag', to: '/overview', Visual: OrbitVisual },
  { title: 'arch3Title', desc: 'arch3Desc', tag: 'arch3Tag', to: '/matching', Visual: WorkstationVisual },
  { title: 'arch4Title', desc: 'arch4Desc', tag: 'arch4Tag', to: '/heatmap', Visual: HeatmapVisual },
  { title: 'arch5Title', desc: 'arch5Desc', tag: 'arch5Tag', to: '/features', Visual: HexVisual },
  { title: 'arch6Title', desc: 'arch6Desc', tag: 'arch6Tag', to: '/features', Visual: CorrespondenceVisual },
  { title: 'arch7Title', desc: 'arch7Desc', tag: 'arch7Tag', to: '/geospatial', Visual: GeoVisual },
  { title: 'arch8Title', desc: 'arch8Desc', tag: 'arch8Tag', to: '/results', Visual: ResultsVisual },
];

const pad = (n: number) => String(n + 1).padStart(2, '0');

/* ------------------------------------------------------------------ */
/* Isometric stack: eight planes, the active one lifts out and glows.  */
/* ------------------------------------------------------------------ */

const STACK_TOP = 60;
const STACK_GAP = 50;
const PLANE_HALF_W = 108;
const PLANE_HALF_H = 40;
const PLANE_CX = 130;

const LayerStack: React.FC<{ active: number; onSelect: (index: number) => void }> = ({ active, onSelect }) => {
  const { t } = useTranslation();
  const plane = (cy: number) =>
    `${PLANE_CX - PLANE_HALF_W},${cy} ${PLANE_CX},${cy - PLANE_HALF_H} ${PLANE_CX + PLANE_HALF_W},${cy} ${PLANE_CX},${cy + PLANE_HALF_H}`;
  const bottom = STACK_TOP + STACK_GAP * (LAYERS.length - 1);

  return (
    <svg viewBox={`0 0 480 ${bottom + 70}`} className="w-full h-auto" role="img" aria-label={t('archTitle')}>
      <defs>
        {/* Crater texture sheared onto the isometric plane */}
        <pattern
          id="arch-plane-texture"
          patternUnits="userSpaceOnUse"
          width="220"
          height="220"
          // Maps the 220px tile's x axis onto the plane's upper edge and y onto its lower edge.
          patternTransform={`matrix(${PLANE_HALF_W / 220} ${-PLANE_HALF_H / 220} ${PLANE_HALF_W / 220} ${PLANE_HALF_H / 220} ${PLANE_CX - PLANE_HALF_W} 0)`}
        >
          <image href={craterA} width="220" height="220" preserveAspectRatio="xMidYMid slice" />
        </pattern>
      </defs>

      {/* Data-flow spine through the stack */}
      <line
        x1={PLANE_CX}
        y1={STACK_TOP - 30}
        x2={PLANE_CX}
        y2={bottom + 30}
        stroke="#5EB8D6"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        className="arch-dash"
      />

      {/* Draw bottom-up so upper layers overlap lower ones */}
      {[...LAYERS].reverse().map((layer, reversedIndex) => {
        const index = LAYERS.length - 1 - reversedIndex;
        const cy = STACK_TOP + STACK_GAP * index;
        const isActive = index === active;
        return (
          <g
            key={layer.title}
            onClick={() => onSelect(index)}
            className="cursor-pointer"
            style={{
              transform: isActive ? 'translate(-22px, -8px)' : 'translate(0, 0)',
              transition: 'transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            {/* Plane edge thickness */}
            <polygon
              points={`${PLANE_CX - PLANE_HALF_W},${cy} ${PLANE_CX},${cy + PLANE_HALF_H} ${PLANE_CX + PLANE_HALF_W},${cy} ${PLANE_CX + PLANE_HALF_W},${cy + 6} ${PLANE_CX},${cy + PLANE_HALF_H + 6} ${PLANE_CX - PLANE_HALF_W},${cy + 6}`}
              fill={isActive ? '#176B87' : '#0A1016'}
              stroke={isActive ? '#5EB8D6' : 'rgba(255,255,255,0.12)'}
              strokeWidth="1"
            />
            <polygon
              points={plane(cy)}
              fill={isActive ? 'url(#arch-plane-texture)' : '#0C1218'}
              stroke={isActive ? '#5EB8D6' : 'rgba(255,255,255,0.18)'}
              strokeWidth={isActive ? 2 : 1}
              style={{ transition: 'stroke 300ms' }}
            />
            {isActive && <polygon points={plane(cy)} fill="#5EB8D6" fillOpacity="0.18" />}
            <text
              x={PLANE_CX + PLANE_HALF_W + 26}
              y={cy + 4}
              className="font-mono"
              fontSize="11"
              fontWeight="700"
              letterSpacing="1"
              fill={isActive ? '#5EB8D6' : '#7A8794'}
              style={{ transition: 'fill 300ms' }}
            >
              {pad(index)} {t(layer.title).toUpperCase()}
            </text>
            <line
              x1={PLANE_CX + PLANE_HALF_W + 4}
              y1={cy}
              x2={PLANE_CX + PLANE_HALF_W + 20}
              y2={cy}
              stroke={isActive ? '#5EB8D6' : 'rgba(255,255,255,0.2)'}
            />
          </g>
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */

export const ArchitectureLayers: React.FC = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const blockRefs = useRef<Array<HTMLElement | null>>([]);

  // The layer whose block crosses the middle band of the viewport is active.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index));
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    blockRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToLayer = (index: number) => {
    blockRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section id="architecture" className="scroll-mt-16 border-t border-white/10 bg-[#070B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#5EB8D6]/10 text-[#5EB8D6] border border-[#5EB8D6]/25">
          {t('archBadge')}
        </span>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">{t('archTitle')}</h2>
        <p className="mt-3 text-sm text-[#8B98A5] max-w-2xl leading-relaxed">{t('archDesc')}</p>

        <div className="mt-12 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16">
          {/* Sticky stack (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <LayerStack active={active} onSelect={scrollToLayer} />
            </div>
          </div>

          {/* Layer blocks */}
          <ol className="space-y-10 lg:space-y-24">
            {LAYERS.map((layer, index) => {
              const { Visual } = layer;
              const isActive = index === active;
              return (
                <li
                  key={layer.title}
                  ref={(el) => {
                    blockRefs.current[index] = el;
                  }}
                  data-index={index}
                  className={`transition-opacity duration-500 ${isActive ? 'lg:opacity-100' : 'lg:opacity-45'}`}
                >
                  <div
                    className={`relative aspect-[8/5] overflow-hidden rounded-xl border bg-black transition-colors duration-500 ${
                      isActive ? 'border-[#5EB8D6]/50' : 'border-white/10'
                    }`}
                  >
                    <Visual />
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-[#5EB8D6]">
                          {t('archLayerLabel')} {pad(index)}
                        </span>
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-white/15 text-[#8B98A5]">
                          {t(layer.tag)}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-bold text-white">{t(layer.title)}</h3>
                      <p className="mt-1.5 text-sm text-[#8B98A5] leading-relaxed max-w-xl">{t(layer.desc)}</p>
                    </div>
                    {layer.to ? (
                      <Link
                        to={layer.to}
                        className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#5EB8D6] hover:text-white transition-colors"
                      >
                        {t('archOpen')}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="shrink-0 text-[11px] font-mono font-bold uppercase tracking-wider text-[#7A8794]">
                        {t('archHere')}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default ArchitectureLayers;
