import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n';

/* ------------------------------------------------------------------ */
/* Scroll-scrubbed hero animation.                                      */
/*                                                                      */
/* The video is pre-split into WebP frames (scripts/extract_hero_       */
/* frames.py) and drawn onto a canvas. Scroll position inside a tall    */
/* section picks the frame, so the animation plays forwards and         */
/* backwards with the user's scroll instead of on a timer. The HUD,     */
/* captions and the mismatch highlight are driven by the same eased     */
/* position, so everything scrubs together.                             */
/* ------------------------------------------------------------------ */

export const HERO_FRAME_COUNT = 260;

/**
 * How many viewport heights of scrolling the full animation spans. Longer means
 * fewer frames per wheel notch; below ~500vh a single notch skips several frames.
 */
const SCROLL_LENGTH_VH = 600;

/**
 * Fraction of the remaining distance the shown frame closes per 60 fps frame.
 * Lower is smoother but lags the scroll more.
 */
const FRAME_LERP = 0.1;

/**
 * Cross-fade the two neighbouring frames at fractional positions, so 71 -> 72
 * dissolves instead of snapping. Costs one extra drawImage per paint; turn on if
 * single-frame steps are still visible.
 */
const BLEND_ADJACENT_FRAMES = false;

/**
 * "Mismatch Detected" appears under the team card from this frame to the end and
 * does not move. Box is in source-video pixels (1920x1080), padded around the text
 * (measured at x 833-1072, y 729-752). Re-measure if the video is re-rendered.
 */
const MISMATCH_FIRST_FRAME = 243;
const MISMATCH_BOX = { x0: 815, y0: 717, x1: 1090, y1: 764 };
const SOURCE_W = 1920;
const SOURCE_H = 1080;
/** Frames over which the red rectangle draws itself on. */
const MISMATCH_DRAW_FRAMES = 6;

const LAST_FRAME = HERO_FRAME_COUNT - 1;
const MISMATCH_PROGRESS = MISMATCH_FIRST_FRAME / LAST_FRAME;

/** HUD chapters, by scroll progress. */
const CHAPTERS = [
  { name: 'DEPARTURE', start: 0 },
  { name: 'THREE EYES', start: 0.18 },
  { name: 'SHADOW PLAY', start: 0.42 },
  { name: 'TRANSMISSION', start: 0.68 },
  { name: 'MISMATCH', start: MISMATCH_PROGRESS },
];

/** Moon approach for the range readout: Earth-Moon distance down to a ~100 km orbit. */
const RANGE_START_KM = 384400;
const RANGE_END_KM = 100;
const RANGE_ARRIVAL_FRAME = 150;

/** Share of a caption's window spent revealing it, and fading it out. */
const CAPTION_IN = 0.06;
const CAPTION_OUT = 0.035;

const GLYPHS = '!<>-_\\/[]{}=+*^?#%&01';

const framePath = (width: number, index: number) =>
  `/hero/${width}/${String(index + 1).padStart(4, '0')}.webp`;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** `text` with the first `revealed` share of characters real and the rest random glyphs. */
const scrambled = (text: string, revealed: number) => {
  const chars = Array.from(text);
  const shown = Math.floor(revealed * chars.length);
  return chars
    .map((c, i) => (i < shown || c === ' ' ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
    .join('');
};

/* ------------------------------------------------------------------ */
/* Caption building blocks. Visual state is written imperatively each  */
/* animation frame; React only renders structure and text.             */
/* ------------------------------------------------------------------ */

/** Words that rise out of a blur one after another. */
const Words: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <span className={className}>
    {text.split(' ').map((word, i) => (
      <React.Fragment key={`${word}-${i}`}>
        {i > 0 && ' '}
        <span data-w className="inline-block will-change-transform">
          {word}
        </span>
      </React.Fragment>
    ))}
  </span>
);

/** Text that decodes out of random glyphs. React never renders its characters. */
const Scramble: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <>
    <span data-w data-scramble={text} className={`inline-block ${className ?? ''}`} aria-hidden="true" />
    <span className="sr-only">{text}</span>
  </>
);

/** Text that types itself out with a blinking cursor. */
const Typewriter: React.FC<{ text: string }> = ({ text }) => (
  <>
    <span data-type={text} aria-hidden="true" />
    <span className="hero-blink text-[#5EB8D6]" aria-hidden="true">
      ▌
    </span>
    <span className="sr-only">{text}</span>
  </>
);

const Caption: React.FC<{ start: number; end: number; children: React.ReactNode }> = ({ start, end, children }) => (
  <div
    data-cap
    data-start={start}
    data-end={end}
    className="absolute inset-x-0 bottom-[9vh] px-6 text-center"
    style={{ visibility: start === 0 ? 'visible' : 'hidden' }}
  >
    <div className="max-w-3xl mx-auto">{children}</div>
  </div>
);

/* ------------------------------------------------------------------ */

export const ScrollVideoHero: React.FC = () => {
  const { t, language } = useTranslation();

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mismatchRef = useRef<HTMLDivElement>(null);
  const chapterNumRef = useRef<HTMLSpanElement>(null);
  const chapterNameRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const rangeLabelRef = useRef<HTMLSpanElement>(null);
  const rangeRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const refreshRef = useRef<() => void>(() => undefined);

  const [loadedPercent, setLoadedPercent] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!section || !stage || !canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Small screens get the lighter 960px set.
    const longestSide = Math.max(window.innerWidth, window.innerHeight);
    const frameWidth = longestSide * Math.min(window.devicePixelRatio || 1, 2) > 1400 ? 1920 : 960;

    let cancelled = false;
    let loadedCount = 0;
    let rafId = 0;
    let lastTick = 0;
    // Positions are fractional frame indices (e.g. 71.4), never rounded early.
    let targetPos = 0;
    let shownPos = 0;
    let drawnFrame = -1;
    let drawnKey = -1;
    // Where the video frame sits on the canvas, in CSS pixels (for overlays).
    let fit = { x: 0, y: 0, w: 0, h: 0 };

    const frames: HTMLImageElement[] = [];
    const loaded: boolean[] = new Array(HERO_FRAME_COUNT).fill(false);

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      drawnKey = -1;
    };

    /** Nearest already-loaded frame at or before `index`, falling back forwards. */
    const nearestLoaded = (index: number) => {
      for (let i = index; i >= 0; i--) if (loaded[i]) return i;
      for (let i = index + 1; i < HERO_FRAME_COUNT; i++) if (loaded[i]) return i;
      return -1;
    };

    const paint = (pos: number) => {
      const base = Math.floor(pos);
      const next = Math.min(base + 1, LAST_FRAME);
      const mix = pos - base;

      let frame: number;
      let blendWith = -1;
      let blendAlpha = 0;
      if (BLEND_ADJACENT_FRAMES && mix > 0.01 && next !== base && loaded[base] && loaded[next]) {
        frame = base;
        blendWith = next;
        blendAlpha = mix;
      } else {
        frame = nearestLoaded(BLEND_ADJACENT_FRAMES ? base : Math.round(pos));
      }
      if (frame === -1) return;

      // Skip repaints that would put identical pixels on screen.
      const key = blendWith === -1 ? frame : frame + Math.round(blendAlpha * 64) / 64;
      if (key === drawnKey) return;
      const img = frames[frame];

      const cw = canvas.width;
      const ch = canvas.height;

      // Fit the whole frame (contain) on black, so nothing at the edges is cropped.
      const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const x = (cw - w) / 2;
      const y = (ch - h) / 2;
      const cssScale = canvas.clientWidth / cw;
      fit = { x: x * cssScale, y: y * cssScale, w: w * cssScale, h: h * cssScale };

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, x, y, w, h);
      if (blendWith !== -1) {
        ctx.globalAlpha = blendAlpha;
        ctx.drawImage(frames[blendWith], x, y, w, h);
        ctx.globalAlpha = 1;
      }

      // Glow in some frames is not pure black, which would show a hard seam where
      // the frame meets the letterbox. Feather the edges that border the bars.
      const feather = (x0: number, y0: number, x1: number, y1: number) => {
        const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || w, Math.abs(y1 - y0) || h);
      };
      if (y > 1) {
        const band = h * 0.08;
        feather(x, y, x, y + band);
        feather(x, y + h, x, y + h - band);
      }
      if (x > 1) {
        const band = w * 0.05;
        feather(x, y, x + band, y);
        feather(x + w, y, x + w - band, y);
      }
      drawnFrame = frame;
      drawnKey = key;
    };

    const scrollProgress = () => {
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return 0;
      const offset = window.scrollY - section.offsetTop;
      return Math.max(0, Math.min(1, offset / scrollable));
    };

    /* ---------------- captions ---------------- */
    type CaptionNodes = { el: HTMLElement; start: number; end: number; words: HTMLElement[]; typed: HTMLElement[] };
    let captionNodes: CaptionNodes[] = [];
    // Caption DOM changes only when the language switches, so query it then, not per frame.
    const collectCaptions = () => {
      captionNodes = Array.from(stage.querySelectorAll<HTMLElement>('[data-cap]')).map((el) => ({
        el,
        start: Number(el.dataset.start),
        end: Number(el.dataset.end),
        words: Array.from(el.querySelectorAll<HTMLElement>('[data-w]')),
        typed: Array.from(el.querySelectorAll<HTMLElement>('[data-type]')),
      }));
    };

    // Style writes are skipped when the value is unchanged, to avoid needless restyles.
    const lastStyle = new WeakMap<HTMLElement, string>();
    const setStyle = (el: HTMLElement, css: string) => {
      if (lastStyle.get(el) === css) return;
      lastStyle.set(el, css);
      el.style.cssText = css;
    };
    const setText = (el: HTMLElement, text: string) => {
      if (el.textContent !== text) el.textContent = text;
    };

    // Re-roll scramble glyphs at most ~20 times a second, plus whenever another
    // real character is revealed; re-rolling every paint re-lays out text needlessly.
    const lastScramble = new WeakMap<HTMLElement, { shown: number; at: number }>();
    const setScrambled = (el: HTMLElement, text: string, revealed: number) => {
      const shown = Math.floor(revealed * Array.from(text).length);
      const now = performance.now();
      const last = lastScramble.get(el);
      if (last && last.shown === shown && now - last.at < 50) return;
      lastScramble.set(el, { shown, at: now });
      setText(el, scrambled(text, revealed));
    };

    const updateCaptions = (p: number) => {
      captionNodes.forEach(({ el, start, end, words, typed }) => {
        const reveal = start === 0 ? 1 : clamp01((p - start) / CAPTION_IN);
        const fade = clamp01((end - p) / CAPTION_OUT);
        if (reveal <= 0 || fade <= 0) {
          setStyle(el, 'visibility:hidden');
          return;
        }
        setStyle(el, fade >= 1 ? 'visibility:visible' : `visibility:visible;opacity:${fade.toFixed(3)}`);

        words.forEach((word, i) => {
          // Each word starts a little after the previous one. Quantised to 5% steps
          // so most paints produce an identical style and skip the write.
          const raw = clamp01((reveal - (i / Math.max(words.length, 1)) * 0.55) / 0.45);
          const local = Math.round(raw * 20) / 20;
          setStyle(
            word,
            local >= 1
              ? ''
              : `opacity:${local};transform:translate3d(0,${((1 - local) * 0.55).toFixed(3)}em,0) scale(${(0.92 + local * 0.08).toFixed(3)});filter:blur(${((1 - local) * 7).toFixed(1)}px)`
          );

          const text = word.dataset.scramble;
          if (text !== undefined) {
            if (reduceMotion || raw >= 1) setText(word, text);
            else setScrambled(word, text, clamp01((raw - 0.2) / 0.8));
          }
        });

        typed.forEach((node) => {
          const chars = Array.from(node.dataset.type ?? '');
          setText(node, chars.slice(0, Math.round(reveal * chars.length)).join(''));
        });
      });
    };

    /* ---------------- HUD ---------------- */
    const updateHud = (pos: number) => {
      const p = pos / LAST_FRAME;
      const frame = Math.round(pos);

      let chapterIndex = 0;
      CHAPTERS.forEach((chapter, i) => {
        if (p >= chapter.start) chapterIndex = i;
      });
      const chapter = CHAPTERS[chapterIndex];
      const chapterReveal = chapter.start === 0 || reduceMotion ? 1 : clamp01((p - chapter.start) / 0.025);
      if (chapterNumRef.current) {
        setText(chapterNumRef.current, `CH ${String(chapterIndex + 1).padStart(2, '0')}/${String(CHAPTERS.length).padStart(2, '0')}`);
      }
      if (chapterNameRef.current) {
        if (chapterReveal >= 1) setText(chapterNameRef.current, chapter.name);
        else setScrambled(chapterNameRef.current, chapter.name, chapterReveal);
      }
      if (progressRef.current) setStyle(progressRef.current, `transform:scaleX(${p.toFixed(4)})`);

      if (rangeRef.current && rangeLabelRef.current) {
        const approach = clamp01(pos / RANGE_ARRIVAL_FRAME);
        const eased = approach < 0.5 ? 2 * approach * approach : 1 - Math.pow(-2 * approach + 2, 2) / 2;
        // Interpolate on a log scale so the countdown accelerates like an approach.
        const km = Math.exp(Math.log(RANGE_START_KM) + (Math.log(RANGE_END_KM) - Math.log(RANGE_START_KM)) * eased);
        setText(rangeLabelRef.current, approach >= 1 ? 'ORBIT' : 'RANGE');
        setText(rangeRef.current, `${Math.round(km).toLocaleString('en-US')} km`);
      }
      if (frameRef.current) {
        setText(frameRef.current, `${String(frame + 1).padStart(3, '0')}/${HERO_FRAME_COUNT}`);
      }
      if (statusRef.current) {
        const alert = frame >= MISMATCH_FIRST_FRAME;
        setText(statusRef.current, alert ? 'MISMATCH' : 'NOMINAL');
        if (statusRef.current.dataset.alert !== String(alert)) statusRef.current.dataset.alert = String(alert);
      }
    };

    /* ---------------- mismatch highlight ---------------- */
    const updateMismatch = (pos: number) => {
      const box = mismatchRef.current;
      if (!box || !fit.w) return;
      const visible = Math.round(pos) >= MISMATCH_FIRST_FRAME;
      box.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) return;

      const sx = fit.w / SOURCE_W;
      const sy = fit.h / SOURCE_H;
      const width = (MISMATCH_BOX.x1 - MISMATCH_BOX.x0) * sx;
      const height = (MISMATCH_BOX.y1 - MISMATCH_BOX.y0) * sy;
      box.style.left = `${fit.x + MISMATCH_BOX.x0 * sx}px`;
      box.style.top = `${fit.y + MISMATCH_BOX.y0 * sy}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;

      // Draw the outline on as the user scrolls into the mismatch frames. The SVG
      // works in real pixels so the dash length matches the actual perimeter.
      const drawn = reduceMotion ? 1 : clamp01((pos - (MISMATCH_FIRST_FRAME - 0.5)) / MISMATCH_DRAW_FRAMES);
      const svg = box.querySelector('svg');
      const rect = box.querySelector<SVGRectElement>('rect');
      if (svg && rect) {
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        rect.setAttribute('width', String(width));
        rect.setAttribute('height', String(height));
        const perimeter = 2 * (width + height);
        rect.style.strokeDasharray = drawn >= 1 ? 'none' : `${perimeter} ${perimeter}`;
        rect.style.strokeDashoffset = String(perimeter * (1 - drawn));
      }
      box.style.transform = `scale(${1.25 - 0.25 * drawn})`;
    };

    const updateOverlays = (pos: number) => {
      updateCaptions(pos / LAST_FRAME);
      updateHud(pos);
      updateMismatch(pos);
    };
    refreshRef.current = () => {
      collectCaptions();
      updateOverlays(shownPos);
    };

    // Ease the shown position toward the scroll target every animation frame, so a
    // wheel notch plays out across several paints instead of landing in one jump.
    const tick = (now: number) => {
      rafId = 0;
      const elapsed = lastTick ? Math.min(now - lastTick, 100) : 1000 / 60;
      lastTick = now;

      const delta = targetPos - shownPos;
      if (reduceMotion || Math.abs(delta) < 0.001) {
        shownPos = targetPos;
      } else {
        // FRAME_LERP is per 60 fps frame; scale by elapsed time so 120 Hz and
        // 60 Hz screens ease at the same speed.
        shownPos += delta * (1 - Math.pow(1 - FRAME_LERP, elapsed / (1000 / 60)));
      }

      paint(shownPos);
      // Overlays follow the eased position so they stay in sync with the picture.
      updateOverlays(shownPos);

      if (shownPos !== targetPos) {
        rafId = requestAnimationFrame(tick);
      } else {
        lastTick = 0;
      }
    };

    const onScroll = () => {
      targetPos = scrollProgress() * LAST_FRAME;
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const onResize = () => {
      sizeCanvas();
      drawnKey = -1;
      paint(shownPos);
      onScroll();
    };

    // Load frame 1 first so something appears immediately, then the rest.
    const loadFrame = (index: number) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = framePath(frameWidth, index);
      frames[index] = img;
      img
        .decode()
        .catch(() => undefined)
        .then(() => {
          if (cancelled || !img.naturalWidth) return;
          loaded[index] = true;
          loadedCount += 1;
          if (loadedCount % 13 === 0 || loadedCount === HERO_FRAME_COUNT) {
            setLoadedPercent(Math.round((loadedCount / HERO_FRAME_COUNT) * 100));
          }
          // Repaint if this frame is closer to the shown position than what is on screen.
          if (drawnFrame === -1 || Math.abs(index - shownPos) < Math.abs(drawnFrame - shownPos)) {
            drawnKey = -1;
            paint(shownPos);
            updateMismatch(shownPos);
          }
        });
    };

    sizeCanvas();
    // Start at the restored scroll position rather than easing in from frame 0.
    targetPos = scrollProgress() * LAST_FRAME;
    shownPos = targetPos;
    collectCaptions();
    updateOverlays(shownPos);
    loadFrame(0);
    for (let i = 1; i < HERO_FRAME_COUNT; i++) loadFrame(i);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Stop the HUD and caption CSS animations while the hero is out of view.
    const visibility = new IntersectionObserver(([entry]) => {
      stage.dataset.paused = String(!entry.isIntersecting);
    });
    visibility.observe(section);

    return () => {
      cancelled = true;
      visibility.disconnect();
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Switching language swaps caption text; redraw overlays without waiting for a scroll.
  useEffect(() => {
    refreshRef.current();
  }, [language]);

  const hudText = 'font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em]';
  // Wide letter-spacing breaks Devanagari conjuncts, so spaced-out labels only apply to English.
  const spaced = language === 'hi' ? 'tracking-normal' : 'tracking-[0.3em]';
  const corner = 'absolute w-6 h-6 sm:w-8 sm:h-8 border-white/25';

  return (
    <section
      ref={sectionRef}
      className="relative bg-black"
      style={{ height: `${SCROLL_LENGTH_VH}vh` }}
      aria-label={t('heroAria')}
    >
      <div ref={stageRef} className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />

        {/* Red highlight around "Mismatch Detected" in the final frames */}
        <div
          ref={mismatchRef}
          className="absolute pointer-events-none hero-alert-pulse"
          style={{ visibility: 'hidden', transformOrigin: 'center' }}
          aria-hidden="true"
        >
          <svg className="absolute inset-0 w-full h-full overflow-visible">
            <rect x="0" y="0" rx="3" fill="rgba(255,59,59,0.06)" stroke="#FF3B3B" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Viewfinder corners */}
        <div className="absolute inset-x-3 sm:inset-x-6 top-[72px] bottom-3 sm:bottom-6 pointer-events-none" aria-hidden="true">
          <span className={`${corner} left-0 top-0 border-l border-t`} />
          <span className={`${corner} right-0 top-0 border-r border-t`} />
          <span className={`${corner} left-0 bottom-0 border-l border-b`} />
          <span className={`${corner} right-0 bottom-0 border-r border-b`} />
        </div>

        {/* HUD: chapter + progress */}
        <div className={`absolute left-6 sm:left-12 top-[88px] sm:top-[100px] ${hudText} text-white/55 pointer-events-none`} aria-hidden="true">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B3B] hero-blink" />
            MISSION FEED
          </div>
          <div className="mt-1.5 text-white">
            <span ref={chapterNumRef}>CH 01/05</span>
            <span className="text-white/30"> · </span>
            <span ref={chapterNameRef} className="text-[#5EB8D6]">
              DEPARTURE
            </span>
          </div>
          <div className="relative mt-2 h-[2px] w-36 sm:w-56 bg-white/15">
            <div ref={progressRef} className="absolute inset-0 origin-left bg-[#5EB8D6]" style={{ transform: 'scaleX(0)' }} />
            {CHAPTERS.slice(1).map((chapter) => (
              <span
                key={chapter.name}
                className="absolute -top-[3px] w-px h-2 bg-white/40"
                style={{ left: `${chapter.start * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* HUD: telemetry */}
        <div
          className={`absolute right-6 sm:right-12 top-[88px] sm:top-[100px] ${hudText} text-white/55 text-right pointer-events-none space-y-1`}
          aria-hidden="true"
        >
          <div>
            <span ref={rangeLabelRef}>RANGE</span> <span ref={rangeRef} className="text-white tabular-nums">384,400 km</span>
          </div>
          <div>
            FRM <span ref={frameRef} className="text-white tabular-nums">001/260</span>
          </div>
          <div>
            STATUS <span ref={statusRef} data-alert="false" className="text-[#5EB8D6]">NOMINAL</span>
          </div>
        </div>

        {/* Captions live in the bottom band, which the animation leaves empty */}
        <Caption start={0} end={0.15}>
          <p className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] text-white">
            <Words text={t('heroC1a')} />
            <br />
            <Scramble text={t('heroC1b')} className="hero-sheen" />
          </p>
          <p className={`mt-4 text-[11px] sm:text-xs font-mono uppercase ${spaced} text-white/60`}>
            <Words text={t('heroC1Sub')} />
          </p>
          <ChevronDown className="mx-auto mt-2 w-5 h-5 text-white/60 animate-bounce" />
        </Caption>

        <Caption start={0.2} end={0.4}>
          <p className="text-lg sm:text-2xl font-medium text-white/80">
            <Words text={t('heroC2a')} />
          </p>
          <p className="mt-1 text-4xl sm:text-6xl font-bold tracking-tight">
            <Scramble text={t('heroC2b')} className="hero-sheen" />
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {['OHRC', 'TMC-2', 'IIRS'].map((name) => (
              <span
                key={name}
                data-w
                className="inline-block px-3 py-1 rounded border border-[#5EB8D6]/50 bg-[#5EB8D6]/10 text-[11px] font-mono font-bold tracking-widest text-[#5EB8D6]"
              >
                {name}
              </span>
            ))}
          </div>
        </Caption>

        <Caption start={0.44} end={0.64}>
          <p className="text-lg sm:text-2xl font-medium text-white/80">
            <Words text={t('heroC3a')} />
          </p>
          <p className="mt-2 text-2xl sm:text-4xl font-bold tracking-tight text-white flex flex-wrap justify-center gap-x-4 gap-y-1">
            {(['heroC3flip', 'heroC3jump', 'heroC3disagree'] as const).map((key, i) => (
              <span key={key} data-w className="inline-block">
                <span className="hero-glitch" style={{ animationDelay: `${i * 0.85}s` }}>
                  {t(key)}
                </span>
              </span>
            ))}
          </p>
        </Caption>

        <Caption start={0.72} end={0.9}>
          <p className={`text-sm sm:text-base font-mono uppercase ${spaced} text-[#5EB8D6]`}>
            <span className="text-white/40">&gt; </span>
            <Typewriter text={t('heroC4Type')} />
          </p>
        </Caption>

        {/* Last caption never fades inside the hero; it scrolls away with the section */}
        <Caption start={MISMATCH_PROGRESS} end={2}>
          <p className="text-lg sm:text-2xl font-medium text-white/80">
            <Words text={t('heroC5a')} />
          </p>
          <p className="mt-1 text-3xl sm:text-5xl font-bold tracking-tight text-[#FF4D4D] [text-shadow:0_0_24px_rgba(255,59,59,0.55)]">
            <Scramble text={t('heroC5b')} />
          </p>
          <p className={`mt-3 text-[11px] sm:text-xs font-mono uppercase ${spaced} text-white/60`}>
            <Words text={t('heroC5Sub')} />
          </p>
        </Caption>

        {loadedPercent < 100 && (
          <div className="absolute right-6 sm:right-12 bottom-6 text-[10px] font-mono uppercase tracking-wider text-white/50">
            {t('heroLoading')} {loadedPercent}%
          </div>
        )}
      </div>
    </section>
  );
};

export default ScrollVideoHero;
