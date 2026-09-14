import React, { useId } from 'react';
import earth from '../../assets/layers/earth.webp';
import moon from '../../assets/layers/moon.webp';
import { LUNAR, bandColour } from './lunarImages';
import { REAL } from './realData';

/*
 * Animated illustrations for the eight architecture layers on the landing page.
 * Layers 3-8 use real data: the Vikram landing-site pair (LRO NAC reference,
 * Chandrayaan-2 OHRC source) and the tie points, errors and outputs of a real
 * registration run (see realData.ts).
 *
 * Every visual is a 400x250 SVG so overlays line up with the photos. CSS
 * animations live in index.css (.arch-*) and stop under prefers-reduced-motion;
 * SMIL animations are skipped in that case via `motion`.
 */

const W = 400;
const H = 250;
const ACCENT = '#5EB8D6';
const AMBER = '#E3A93B';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Frame: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <svg
    viewBox={`0 0 ${W} ${H}`}
    preserveAspectRatio="xMidYMid slice"
    className="absolute inset-0 w-full h-full"
    role="img"
    aria-label={label}
  >
    {children}
  </svg>
);

/** Deterministic pseudo-random in [0, 1) so visuals are stable between renders. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const Stars: React.FC<{ count?: number }> = ({ count = 40 }) => (
  <g>
    {Array.from({ length: count }, (_, i) => (
      <circle
        key={i}
        cx={hash(i) * W}
        cy={hash(i + 100) * H}
        r={hash(i + 200) * 0.9 + 0.2}
        fill="#fff"
        opacity={hash(i + 300) * 0.5 + 0.1}
      />
    ))}
  </g>
);

const Corners: React.FC<{ x: number; y: number; w: number; h: number; color?: string }> = ({
  x,
  y,
  w,
  h,
  color = ACCENT,
}) => {
  const s = 12;
  return (
    <path
      d={`M${x},${y + s}V${y}H${x + s} M${x + w - s},${y}H${x + w}V${y + s} M${x + w},${y + h - s}V${y + h}H${x + w - s} M${x + s},${y + h}H${x}V${y + h - s}`}
      fill="none"
      stroke={color}
      strokeWidth="2"
    />
  );
};

const Tag: React.FC<{ x: number; y: number; text: string; color?: string; anchor?: 'start' | 'end' }> = ({
  x,
  y,
  text,
  color = ACCENT,
  anchor = 'start',
}) => (
  <text x={x} y={y} textAnchor={anchor} className="font-mono" fontSize="9" fontWeight="700" fill={color} letterSpacing="1">
    {text}
  </text>
);

/* 1 ------------------------------------------------------------ Mission briefing */
export const BriefingVisual: React.FC = () => {
  const motion = !reducedMotion();
  const path = 'M150,112 C215,20 285,22 330,72';
  return (
    <Frame label="Earth to Moon trajectory">
      <rect width={W} height={H} fill="#000" />
      <Stars count={55} />
      <image href={earth} x="-40" y="30" width="200" height="200" style={{ mixBlendMode: 'screen' }} />
      <image href={moon} x="300" y="42" width="80" height="80" style={{ mixBlendMode: 'screen' }} />
      <path d={path} fill="none" stroke={ACCENT} strokeOpacity="0.25" strokeWidth="6" />
      <path d={path} fill="none" stroke={ACCENT} strokeWidth="1.5" className="arch-dash" />
      <circle r="4" fill="#fff">
        {motion && <animateMotion dur="3.2s" repeatCount="indefinite" path={path} />}
      </circle>
      {['OHRC', 'TMC-2', 'IIRS'].map((name, i) => (
        <g key={name} transform={`translate(${196 + i * 66}, 200)`}>
          <rect width="58" height="22" rx="4" fill="#0C1218" stroke={ACCENT} strokeOpacity="0.5" />
          <text x="29" y="15" textAnchor="middle" className="font-mono" fontSize="9" fontWeight="700" fill="#E6EDF3">
            {name}
          </text>
        </g>
      ))}
      <Tag x={196} y={190} text="CHANDRAYAAN-2 PAYLOADS" color="#8B98A5" />
    </Frame>
  );
};

/* 2 ------------------------------------------------------ Mission overview + 3D */
export const OrbitVisual: React.FC = () => {
  const motion = !reducedMotion();
  const ring = (rx: number, ry: number) => `M${200 - rx},125 a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0`;
  return (
    <Frame label="Moon with orbit rings">
      <rect width={W} height={H} fill="#000" />
      <Stars count={45} />
      <image href={moon} x="115" y="40" width="170" height="170" style={{ mixBlendMode: 'screen' }} />
      <g transform="rotate(-14 200 125)">
        <path d={ring(165, 40)} fill="none" stroke={ACCENT} strokeOpacity="0.55" strokeWidth="1.2" />
        <circle r="4.5" fill={ACCENT}>
          {motion && <animateMotion dur="6s" repeatCount="indefinite" path={ring(165, 40)} />}
        </circle>
      </g>
      <g transform="rotate(22 200 125)">
        <path d={ring(125, 70)} fill="none" stroke={AMBER} strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 5" />
        <circle r="3.5" fill={AMBER}>
          {motion && <animateMotion dur="9s" repeatCount="indefinite" path={ring(125, 70)} />}
        </circle>
      </g>
      <Tag x={16} y={24} text="ORBIT ~100 KM" />
      <Tag x={16} y={38} text="POLAR" color="#8B98A5" />
      <Tag x={384} y={236} text="INTERACTIVE 3D" color="#8B98A5" anchor="end" />
    </Frame>
  );
};

/* 3 --------------------------------------------------------- Matching workstation */
export const WorkstationVisual: React.FC = () => {
  const motion = !reducedMotion();
  const id = useId();
  const panes = [
    { x: 18, img: LUNAR.nacCrater, label: 'REF / LRO NAC' },
    { x: 208, img: LUNAR.ohrcBrightCrater, label: 'SRC / OHRC' },
  ];
  return (
    <Frame label="Real reference and source frames of the same crater being scanned">
      <rect width={W} height={H} fill="#05080B" />
      {panes.map((pane, i) => (
        <g key={pane.label}>
          <clipPath id={`${id}-clip-${i}`}>
            <rect x={pane.x} y="34" width="174" height="170" rx="3" />
          </clipPath>
          <g clipPath={`url(#${id}-clip-${i})`}>
            <image href={pane.img} x={pane.x} y="34" width="174" height="170" preserveAspectRatio="xMidYMid slice" />
            <rect x={pane.x} y="34" width="174" height="2.5" fill={ACCENT}>
              {motion && <animate attributeName="y" values="34;204;34" dur="3.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />}
            </rect>
            <rect x={pane.x} y="34" width="174" height="26" fill={ACCENT} opacity="0.12">
              {motion && <animate attributeName="y" values="8;178;8" dur="3.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />}
            </rect>
          </g>
          <Corners x={pane.x - 4} y={30} w={182} h={178} />
          <Tag x={pane.x} y={22} text={pane.label} color={i === 0 ? '#C9D3DC' : ACCENT} />
        </g>
      ))}
      <rect x="18" y="222" width="364" height="5" rx="2.5" fill="#fff" fillOpacity="0.08" />
      <rect x="18" y="222" width="364" height="5" rx="2.5" fill={ACCENT} className="arch-fill" style={{ transformBox: 'fill-box' }} />
      <Tag x={18} y={242} text="VIKRAM LANDING SITE / REAL DATA" color="#8B98A5" />
      <Tag x={382} y={242} text="REGISTERING" color="#8B98A5" anchor="end" />
    </Frame>
  );
};

/* 4 --------------------------------------------------------------- Heatmap */
export const HeatmapVisual: React.FC = () => {
  // Real 8x8 hold-out error per cell over the 2 km site, drawn over the reference.
  const size = 214;
  const x0 = 16;
  const y0 = 18;
  const cell = size / 8;
  const legend: Array<[string, string]> = [
    ['UNDER 0.5 PX', '#176B87'],
    ['0.5 TO 1 PX', '#5FA8C2'],
    ['1 TO 2 PX', AMBER],
    ['NO DATA', '#64748B'],
  ];
  return (
    <Frame label="Measured error in each part of the image">
      <rect width={W} height={H} fill="#05080B" />
      <image href={LUNAR.nacSite} x={x0} y={y0} width={size} height={size} />
      {REAL.cells.map((rmse, i) => {
        const r = Math.floor(i / 8);
        const c = i % 8;
        return (
          <rect
            key={i}
            x={x0 + c * cell + 1}
            y={y0 + r * cell + 1}
            width={cell - 2}
            height={cell - 2}
            rx="2"
            fill={bandColour(rmse)}
            opacity={rmse === null ? 0.6 : 0.5}
            className={rmse !== null && rmse >= 1 ? 'arch-shimmer' : undefined}
            style={{ animationDelay: `${(hash(i + 7) * 2.8).toFixed(2)}s` }}
          />
        );
      })}
      <Tag x={248} y={36} text="MEASURED ERROR" color="#E6EDF3" />
      {legend.map(([label, color], i) => (
        <g key={label} transform={`translate(248, ${52 + i * 20})`}>
          <rect width="12" height="12" rx="2" fill={color} />
          <text x="20" y="10" className="font-mono" fontSize="9" fill="#8B98A5">
            {label}
          </text>
        </g>
      ))}
      <text x="248" y="176" className="font-mono" fontSize="22" fontWeight="700" fill="#fff">
        {REAL.metrics.holdoutRmsePx.toFixed(2)} px
      </text>
      <Tag x={248} y={192} text="WHOLE-IMAGE RMSE" color="#8B98A5" />
      <Tag x={248} y={228} text="REAL RUN / 2 KM SITE" />
    </Frame>
  );
};

/* 5 ------------------------------------------------------------ Hexagonal grid */
export const HexVisual: React.FC = () => {
  const r = 17;
  const hexW = Math.sqrt(3) * r;
  const stepY = r * 1.5;
  const hexPath = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 3) * k - Math.PI / 6;
      return `${k ? 'L' : 'M'}${(cx + (r - 1.5) * Math.cos(a)).toFixed(1)},${(cy + (r - 1.5) * Math.sin(a)).toFixed(1)}`;
    }).join('') + 'Z';
  // Bin a sample of the real tie points (reference frame) into the hexagons.
  const points = REAL.gridSample.map(([u, v]) => [u * W, v * H]);
  const cells: Array<{ d: string; count: number; key: string }> = [];
  for (let row = 0; row * stepY < H + r; row++) {
    for (let col = 0; col * hexW < W + hexW; col++) {
      const cx = col * hexW + (row % 2 ? hexW / 2 : 0);
      const cy = row * stepY;
      const count = points.filter(([x, y]) => Math.hypot(x - cx, y - cy) < r).length;
      cells.push({ d: hexPath(cx, cy), count, key: `${row}-${col}` });
    }
  }
  return (
    <Frame label="Tie points counted in hexagons across the image">
      <image href={LUNAR.overlaySite} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />
      <rect width={W} height={H} fill="#000" opacity="0.35" />
      {cells.map((cell, i) => (
        <path
          key={cell.key}
          d={cell.d}
          fill={cell.count === 0 ? '#64748B' : cell.count > 1 ? '#176B87' : '#5FA8C2'}
          fillOpacity={cell.count === 0 ? 0.15 : 0.5}
          stroke="#fff"
          strokeOpacity="0.18"
          strokeWidth="0.8"
          className={cell.count > 1 ? 'arch-shimmer' : undefined}
          style={cell.count > 1 ? { animationDelay: `${(hash(i) * 2.8).toFixed(2)}s` } : undefined}
        />
      ))}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.4" fill="#fff" opacity="0.8" />
      ))}
      <rect x="14" y="14" width="196" height="20" rx="4" fill="#05080B" fillOpacity="0.85" />
      <Tag x={22} y={27} text={`${REAL.metrics.tiePoints.toLocaleString('en-US')} TIE POINTS / ${Math.round(REAL.metrics.coverage * 100)}% COVERED`} />
    </Frame>
  );
};

/* 6 ------------------------------------------------------ Feature correspondence */
export const CorrespondenceVisual: React.FC = () => {
  const left = { x: 12, y: 30, w: 176, h: 190 };
  const right = { x: 212, y: 30, w: 176, h: 190 };
  // Every fourth real tie point, coloured by its measured hold-out error.
  const pairs = REAL.tiePoints.filter((_, i) => i % 4 === 1);
  return (
    <Frame label="Real tie points joined across the two images">
      <rect width={W} height={H} fill="#05080B" />
      <image href={LUNAR.nacSite} x={left.x} y={left.y} width={left.w} height={left.h} preserveAspectRatio="none" />
      <image href={LUNAR.ohrcSite} x={right.x} y={right.y} width={right.w} height={right.h} preserveAspectRatio="none" />
      <rect x={left.x} y={left.y} width={left.w} height={left.h} fill="none" stroke="#fff" strokeOpacity="0.15" />
      <rect x={right.x} y={right.y} width={right.w} height={right.h} fill="none" stroke="#fff" strokeOpacity="0.15" />
      {pairs.map((pair, i) => {
        const x1 = left.x + pair.ref[0] * left.w;
        const y1 = left.y + pair.ref[1] * left.h;
        const x2 = right.x + pair.src[0] * right.w;
        const y2 = right.y + pair.src[1] * right.h;
        const color = bandColour(pair.err);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.2" strokeOpacity="0.9" className="arch-dash" />
            {[
              [x1, y1],
              [x2, y2],
            ].map(([cx, cy], k) => (
              <g key={k}>
                <circle cx={cx} cy={cy} r="3.5" fill="none" stroke={color} strokeWidth="1.4" />
                {i % 3 === 0 && <circle cx={cx} cy={cy} r="3.5" fill="none" stroke={color} className="arch-ping" style={{ animationDelay: `${i * 0.3}s` }} />}
              </g>
            ))}
          </g>
        );
      })}
      <Tag x={12} y={20} text="LRO NAC" color="#C9D3DC" />
      <Tag x={212} y={20} text="CHANDRAYAAN-2 OHRC" />
      <Tag x={388} y={240} text="COLOUR = MEASURED ERROR" color="#8B98A5" anchor="end" />
    </Frame>
  );
};

/* 7 ---------------------------------------------------- Geometry and location */
export const GeoVisual: React.FC = () => {
  const id = useId();
  return (
    <Frame label="Map grid over the real reference image of the landing site">
      <rect width={W} height={H} fill="#000" />
      <clipPath id={`${id}-map`}>
        <rect x="16" y="16" width="218" height="218" rx="4" />
      </clipPath>
      <g clipPath={`url(#${id}-map)`}>
        <image href={LUNAR.nacBoulders} x="16" y="16" width="218" height="218" />
        <g stroke={ACCENT} strokeOpacity="0.35" strokeWidth="0.8">
          {[1, 2, 3, 4].map((k) => (
            <g key={k}>
              <line x1={16 + k * 43.6} y1="16" x2={16 + k * 43.6} y2="234" />
              <line x1="16" y1={16 + k * 43.6} x2="234" y2={16 + k * 43.6} />
            </g>
          ))}
        </g>
      </g>
      <rect x="16" y="16" width="218" height="218" rx="4" fill="none" stroke="#fff" strokeOpacity="0.2" />
      <g className="arch-spin">
        <circle cx="125" cy="125" r="20" fill="none" stroke={ACCENT} strokeWidth="1.2" strokeDasharray="10 6" />
      </g>
      <circle cx="125" cy="125" r="6" fill="none" stroke={ACCENT} className="arch-ping" />
      <path d="M125,97V115 M125,135V153 M97,125H115 M135,125H153" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="125" cy="125" r="2" fill="#fff" />
      <g transform="translate(250, 22)">
        <rect width="136" height="136" rx="5" fill="#05080B" fillOpacity="0.9" stroke={ACCENT} strokeOpacity="0.4" />
        <Tag x={10} y={18} text="PIXEL SIZE" color="#8B98A5" />
        <text x="10" y="36" className="font-mono" fontSize="11" fontWeight="700" fill="#E6EDF3">1.00 m</text>
        <Tag x={10} y={56} text="MAP PROJECTION" color="#8B98A5" />
        <text x="10" y="72" className="font-mono" fontSize="9.5" fontWeight="700" fill="#E6EDF3">POLAR STEREO</text>
        <Tag x={10} y={92} text="SITE" color="#8B98A5" />
        <text x="10" y="108" className="font-mono" fontSize="9.5" fontWeight="700" fill="#E6EDF3">69.4 S / 32.3 E</text>
        <Tag x={10} y={126} text="VIKRAM LANDER" />
      </g>
      <g transform="translate(250, 172)">
        <rect width="136" height="58" rx="5" fill="#E3A93B" fillOpacity="0.1" stroke={AMBER} strokeOpacity="0.5" strokeDasharray="3 3" />
        <Tag x={10} y={18} text="COMING NEXT" color={AMBER} />
        <text x="10" y="34" className="font-mono" fontSize="8.5" fill="#E6EDF3">Lat / long and sun</text>
        <text x="10" y="47" className="font-mono" fontSize="8.5" fill="#E6EDF3">angles for every file</text>
      </g>
    </Frame>
  );
};

/* 8 ------------------------------------------------------------ Analysis results */
export const ResultsVisual: React.FC = () => {
  const id = useId();
  const motion = !reducedMotion();
  const ringLength = 2 * Math.PI * 22;
  const m = REAL.metrics;
  const covered = ringLength * (1 - m.coverage);
  return (
    <Frame label="Registration report with real metrics and exports">
      <rect width={W} height={H} fill="#05080B" />
      {/* Before / after swipe: the reference alone versus the registered overlay */}
      <clipPath id={`${id}-thumb`}>
        <rect x="16" y="16" width="160" height="218" rx="4" />
      </clipPath>
      <g clipPath={`url(#${id}-thumb)`}>
        <image href={LUNAR.nacSite} x="16" y="16" width="160" height="218" preserveAspectRatio="xMidYMid slice" />
        <clipPath id={`${id}-swipe`}>
          <rect x="16" y="16" width="80" height="218">
            {motion && <animate attributeName="width" values="30;140;30" dur="5s" repeatCount="indefinite" />}
          </rect>
        </clipPath>
        <image href={LUNAR.overlaySite} x="16" y="16" width="160" height="218" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-swipe)`} />
        <rect x="95" y="16" width="2" height="218" fill="#fff">
          {motion && <animate attributeName="x" values="45;155;45" dur="5s" repeatCount="indefinite" />}
        </rect>
      </g>
      <rect x="16" y="16" width="160" height="218" rx="4" fill="none" stroke="#fff" strokeOpacity="0.15" />

      <Tag x={194} y={30} text="REGISTRATION REPORT" color="#E6EDF3" />
      {[
        { label: 'MEASURED RMSE', value: `${m.holdoutRmsePx.toFixed(2)} px`, y: 52, width: 130 * (1 - m.holdoutRmsePx / 2) },
        { label: 'TIE POINTS', value: m.tiePoints.toLocaleString('en-US'), y: 84, width: 130 * m.tiePointRatio },
      ].map((row, i) => (
        <g key={row.label}>
          <Tag x={194} y={row.y} text={row.label} color="#8B98A5" />
          <text x="324" y={row.y} textAnchor="end" className="font-mono" fontSize="9" fontWeight="700" fill="#E6EDF3">
            {row.value}
          </text>
          <rect x="194" y={row.y + 6} width="130" height="6" rx="3" fill="#fff" fillOpacity="0.08" />
          <rect x="194" y={row.y + 6} width={row.width} height="6" rx="3" fill={ACCENT} className="arch-fill" style={{ transformBox: 'fill-box', animationDelay: `${i * 0.4}s` }} />
        </g>
      ))}
      <g transform="translate(362, 72)">
        <circle r="22" fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="6" />
        <circle r="22" fill="none" stroke={AMBER} strokeWidth="6" strokeLinecap="round" strokeDasharray={ringLength} strokeDashoffset={covered} transform="rotate(-90)">
          {motion && <animate attributeName="stroke-dashoffset" values={`${ringLength};${covered};${covered}`} keyTimes="0;0.6;1" dur="3.6s" repeatCount="indefinite" />}
        </circle>
        <text y="3" textAnchor="middle" className="font-mono" fontSize="8" fontWeight="700" fill="#E6EDF3">
          {Math.round(m.coverage * 100)}%
        </text>
        <text y="36" textAnchor="middle" className="font-mono" fontSize="7" fontWeight="700" fill="#8B98A5">
          COVERED
        </text>
      </g>
      <Tag x={194} y={126} text="ACCEPTED / SUB-PIXEL" color="#6FCF97" />
      {[0, 1, 2].map((line) => (
        <rect key={line} x="194" y={136 + line * 13} width={[190, 160, 176][line]} height="6" rx="2" fill="#fff" fillOpacity="0.12" className="arch-shimmer" style={{ animationDelay: `${line * 0.35}s` }} />
      ))}
      {['GeoTIFF', 'CSV', 'JSON'].map((name, i) => (
        <g key={name} transform={`translate(${194 + i * 64}, 200)`}>
          <rect width="58" height="24" rx="4" fill={i === 0 ? '#176B87' : '#0C1218'} stroke={ACCENT} strokeOpacity="0.4" />
          <text x="29" y="16" textAnchor="middle" className="font-mono" fontSize="8.5" fontWeight="700" fill="#E6EDF3">
            {name}
          </text>
        </g>
      ))}
    </Frame>
  );
};
