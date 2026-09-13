import React, { useId } from 'react';
import craterA from '../../assets/layers/crater-a.webp';
import craterB from '../../assets/layers/crater-b.webp';
import earth from '../../assets/layers/earth.webp';
import moon from '../../assets/layers/moon.webp';

/*
 * Animated illustrations for the eight architecture layers on the landing page.
 * Imagery is cropped from the team's Blender render; the two crater tiles show
 * terrain under different lighting, which is exactly the matching problem.
 *
 * Every visual is a 400x250 SVG so overlays line up with the photos. CSS
 * animations live in index.css (.arch-*) and stop under prefers-reduced-motion;
 * SMIL animations are skipped in that case via `motion`.
 */

const W = 400;
const H = 250;
const ACCENT = '#5EB8D6';
const AMBER = '#E3A93B';
const RED = '#D0605E';

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
    { x: 18, img: craterA, label: 'REF / LRO NAC' },
    { x: 208, img: craterB, label: 'SRC / OHRC' },
  ];
  return (
    <Frame label="Reference and source frames being scanned">
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
      <Tag x={382} y={242} text="REGISTERING" color="#8B98A5" anchor="end" />
    </Frame>
  );
};

/* 4 --------------------------------------------------------------- Heatmap */
export const HeatmapVisual: React.FC = () => {
  const cols = 16;
  const rows = 10;
  const cw = W / cols;
  const ch = H / rows;
  const colorFor = (v: number) => (v > 0.8 ? '#176B87' : v > 0.6 ? AMBER : v > 0.38 ? '#3B82A0' : '#C4D0DC');
  return (
    <Frame label="Similarity heatmap over lunar terrain">
      <image href={craterA} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />
      <rect width={W} height={H} fill="#000" opacity="0.35" />
      {Array.from({ length: rows * cols }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const d = Math.hypot((c - 6.5) / 8, (r - 4.2) / 5);
        const v = Math.max(0, Math.min(1, 1 - d * 0.75 + (hash(i) - 0.5) * 0.35));
        return (
          <rect
            key={i}
            x={c * cw + 1}
            y={r * ch + 1}
            width={cw - 2}
            height={ch - 2}
            rx="2"
            fill={colorFor(v)}
            opacity={v < 0.38 ? 0.12 : 0.55}
            className={v >= 0.38 ? 'arch-shimmer' : undefined}
            style={{ animationDelay: `${(hash(i + 7) * 2.8).toFixed(2)}s` }}
          />
        );
      })}
      <rect x="262" y="222" width="124" height="18" rx="4" fill="#05080B" fillOpacity="0.85" />
      {['#C4D0DC', '#3B82A0', AMBER, '#176B87'].map((color, i) => (
        <rect key={color} x={296 + i * 21} y="228" width="19" height="6" fill={color} />
      ))}
      <text x="270" y="234" className="font-mono" fontSize="7" fill="#8B98A5">LOW</text>
      <text x="381" y="234" textAnchor="end" className="font-mono" fontSize="7" fill="#8B98A5">HI</text>
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
  const cells: Array<{ d: string; fill: string; opacity: number; pulse: boolean }> = [];
  for (let row = 0; row * stepY < H + r; row++) {
    for (let col = 0; col * hexW < W + hexW; col++) {
      const cx = col * hexW + (row % 2 ? hexW / 2 : 0);
      const cy = row * stepY;
      // Mostly matched cells, a few uncertain and rare mismatches: the layer's point is even coverage.
      const h = hash(row * 1009 + col * 131 + 17);
      const [fill, opacity] =
        h > 0.97 ? [RED, 0.55] : h > 0.89 ? [AMBER, 0.55] : h > 0.5 ? ['#3B82A0', 0.42] : h > 0.06 ? ['#176B87', 0.6] : ['#64748B', 0.18];
      cells.push({ d: hexPath(cx, cy), fill, opacity, pulse: h > 0.89 && h <= 0.97 });
    }
  }
  return (
    <Frame label="Hexagonal surface matching grid">
      <image href={craterB} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />
      <rect width={W} height={H} fill="#000" opacity="0.3" />
      {cells.map((cell, i) => (
        <path
          key={i}
          d={cell.d}
          fill={cell.fill}
          fillOpacity={cell.opacity}
          stroke="#fff"
          strokeOpacity="0.18"
          strokeWidth="0.8"
          className={cell.pulse ? 'arch-shimmer' : undefined}
          style={cell.pulse ? { animationDelay: `${(hash(i) * 2.8).toFixed(2)}s` } : undefined}
        />
      ))}
      <rect x="14" y="14" width="118" height="20" rx="4" fill="#05080B" fillOpacity="0.85" />
      <Tag x={22} y={27} text="UNIFORM COVERAGE" />
    </Frame>
  );
};

/* 6 ------------------------------------------------------ Feature correspondence */
export const CorrespondenceVisual: React.FC = () => {
  const left = { x: 12, y: 30, w: 176, h: 190 };
  const right = { x: 212, y: 30, w: 176, h: 190 };
  // Normalised keypoints inside each tile: [lx, ly, rx, ry, status]
  const pairs: Array<[number, number, number, number, 'match' | 'maybe' | 'reject']> = [
    [0.4, 0.34, 0.3, 0.46, 'match'],
    [0.78, 0.18, 0.84, 0.16, 'match'],
    [0.2, 0.7, 0.18, 0.78, 'match'],
    [0.62, 0.62, 0.66, 0.7, 'match'],
    [0.9, 0.52, 0.93, 0.58, 'match'],
    [0.48, 0.88, 0.5, 0.92, 'maybe'],
    [0.12, 0.2, 0.62, 0.3, 'reject'],
  ];
  const color = { match: ACCENT, maybe: AMBER, reject: RED } as const;
  return (
    <Frame label="Matched features joined across two images">
      <rect width={W} height={H} fill="#05080B" />
      <image href={craterA} x={left.x} y={left.y} width={left.w} height={left.h} preserveAspectRatio="xMidYMid slice" />
      <image href={craterB} x={right.x} y={right.y} width={right.w} height={right.h} preserveAspectRatio="xMidYMid slice" />
      <rect x={left.x} y={left.y} width={left.w} height={left.h} fill="none" stroke="#fff" strokeOpacity="0.15" />
      <rect x={right.x} y={right.y} width={right.w} height={right.h} fill="none" stroke="#fff" strokeOpacity="0.15" />
      {pairs.map(([lx, ly, rx, ry, status], i) => {
        const x1 = left.x + lx * left.w;
        const y1 = left.y + ly * left.h;
        const x2 = right.x + rx * right.w;
        const y2 = right.y + ry * right.h;
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color[status]}
              strokeWidth={status === 'match' ? 1.4 : 1}
              strokeOpacity={status === 'reject' ? 0.6 : 0.9}
              className={status === 'reject' ? undefined : 'arch-dash'}
              strokeDasharray={status === 'reject' ? '2 4' : undefined}
            />
            {[
              [x1, y1],
              [x2, y2],
            ].map(([cx, cy], k) => (
              <g key={k}>
                <circle cx={cx} cy={cy} r="4.5" fill="none" stroke={color[status]} strokeWidth="1.5" />
                {status === 'match' && i % 2 === 0 && (
                  <circle cx={cx} cy={cy} r="4.5" fill="none" stroke={color[status]} className="arch-ping" style={{ animationDelay: `${i * 0.3}s` }} />
                )}
              </g>
            ))}
          </g>
        );
      })}
      <Tag x={12} y={20} text="MATCHED" />
      <Tag x={76} y={20} text="POTENTIAL" color={AMBER} />
      <Tag x={146} y={20} text="REJECTED" color={RED} />
    </Frame>
  );
};

/* 7 ---------------------------------------------------- Geospatial verification */
export const GeoVisual: React.FC = () => {
  const id = useId();
  const cx = 190;
  const cy = 128;
  const R = 112;
  return (
    <Frame label="Target reticle on the lunar surface with coordinates">
      <rect width={W} height={H} fill="#000" />
      <Stars count={30} />
      <image href={moon} x={cx - 128} y={cy - 128} width="256" height="256" style={{ mixBlendMode: 'screen' }} />
      <clipPath id={`${id}-disc`}>
        <circle cx={cx} cy={cy} r={R} />
      </clipPath>
      <g clipPath={`url(#${id}-disc)`} stroke="#fff" strokeOpacity="0.14" fill="none" strokeWidth="0.8">
        {[0.25, 0.55, 0.85].map((f) => (
          <ellipse key={`m${f}`} cx={cx} cy={cy} rx={R * f} ry={R} />
        ))}
        {[-0.66, -0.33, 0, 0.33, 0.66].map((f) => (
          <line key={`p${f}`} x1={cx - R} y1={cy + R * f} x2={cx + R} y2={cy + R * f} />
        ))}
      </g>
      <g className="arch-spin">
        <circle cx="150" cy="150" r="20" fill="none" stroke={ACCENT} strokeWidth="1.2" strokeDasharray="10 6" />
      </g>
      <circle cx="150" cy="150" r="6" fill="none" stroke={ACCENT} className="arch-ping" />
      <path d="M150,122V140 M150,160V178 M122,150H140 M160,150H178" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="150" cy="150" r="2" fill="#fff" />
      <line x1="170" y1="138" x2="276" y2="70" stroke={ACCENT} strokeOpacity="0.5" strokeDasharray="2 3" />
      <g transform="translate(276, 40)">
        <rect width="112" height="72" rx="5" fill="#05080B" fillOpacity="0.9" stroke={ACCENT} strokeOpacity="0.4" />
        <Tag x={10} y={17} text="TARGET" color="#8B98A5" />
        <text x="10" y="34" className="font-mono" fontSize="10" fontWeight="700" fill="#E6EDF3">69.37° S</text>
        <text x="10" y="48" className="font-mono" fontSize="10" fontWeight="700" fill="#E6EDF3">32.35° E</text>
        <Tag x={10} y={63} text="POLAR STEREO" />
      </g>
    </Frame>
  );
};

/* 8 ------------------------------------------------------------ Analysis results */
export const ResultsVisual: React.FC = () => {
  const id = useId();
  const motion = !reducedMotion();
  const ringLength = 2 * Math.PI * 22;
  return (
    <Frame label="Registration report with metrics and exports">
      <rect width={W} height={H} fill="#05080B" />
      {/* Registered overlay thumbnail with a swipe divider */}
      <clipPath id={`${id}-thumb`}>
        <rect x="16" y="16" width="160" height="218" rx="4" />
      </clipPath>
      <g clipPath={`url(#${id}-thumb)`}>
        <image href={craterA} x="16" y="16" width="160" height="218" preserveAspectRatio="xMidYMid slice" />
        <clipPath id={`${id}-swipe`}>
          <rect x="16" y="16" width="80" height="218">
            {motion && <animate attributeName="width" values="30;140;30" dur="5s" repeatCount="indefinite" />}
          </rect>
        </clipPath>
        <image
          href={craterB}
          x="16"
          y="16"
          width="160"
          height="218"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${id}-swipe)`}
          opacity="0.9"
        />
        <rect x="95" y="16" width="2" height="218" fill="#fff">
          {motion && <animate attributeName="x" values="45;155;45" dur="5s" repeatCount="indefinite" />}
        </rect>
      </g>
      <rect x="16" y="16" width="160" height="218" rx="4" fill="none" stroke="#fff" strokeOpacity="0.15" />

      {/* Report card */}
      <Tag x={194} y={30} text="REGISTRATION REPORT" color="#E6EDF3" />
      {[
        { label: 'RMSE (HOLD-OUT)', y: 52 },
        { label: 'INLIER COUNT', y: 84 },
      ].map((row, i) => (
        <g key={row.label}>
          <Tag x={194} y={row.y} text={row.label} color="#8B98A5" />
          <rect x="194" y={row.y + 6} width="130" height="6" rx="3" fill="#fff" fillOpacity="0.08" />
          <rect
            x="194"
            y={row.y + 6}
            width={i === 0 ? 96 : 118}
            height="6"
            rx="3"
            fill={ACCENT}
            className="arch-fill"
            style={{ transformBox: 'fill-box', animationDelay: `${i * 0.4}s` }}
          />
        </g>
      ))}
      <g transform="translate(360, 72)">
        <circle r="22" fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="6" />
        <circle
          r="22"
          fill="none"
          stroke={AMBER}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={ringLength}
          strokeDashoffset={ringLength * 0.22}
          transform="rotate(-90)"
        >
          {motion && (
            <animate attributeName="stroke-dashoffset" values={`${ringLength};${ringLength * 0.22};${ringLength * 0.22}`} keyTimes="0;0.6;1" dur="3.6s" repeatCount="indefinite" />
          )}
        </circle>
        <text y="3" textAnchor="middle" className="font-mono" fontSize="7" fontWeight="700" fill="#8B98A5">RATIO</text>
      </g>
      {[0, 1, 2, 3].map((line) => (
        <rect
          key={line}
          x="194"
          y={120 + line * 13}
          width={[190, 160, 176, 120][line]}
          height="6"
          rx="2"
          fill="#fff"
          fillOpacity="0.12"
          className="arch-shimmer"
          style={{ animationDelay: `${line * 0.35}s` }}
        />
      ))}
      <Tag x={194} y={114} text="MATCH POINTS .CSV" color="#8B98A5" />
      {['GeoTIFF', 'CSV', 'REPORT'].map((name, i) => (
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
