import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n';

/* ------------------------------------------------------------------ */
/* Scroll-scrubbed hero animation.                                      */
/*                                                                      */
/* The video is pre-split into WebP frames (scripts/extract_hero_       */
/* frames.py) and drawn onto a canvas. Scroll position inside a tall    */
/* section picks the frame, so the animation plays forwards and         */
/* backwards with the user's scroll instead of on a timer.              */
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

/** Captions fade in and out over these slices of scroll progress (0-1). */
const CAPTIONS = [
  { key: 'intro', start: 0, end: 0.14 },
  { key: 'eyes', start: 0.2, end: 0.4 },
  { key: 'change', start: 0.44, end: 0.64 },
  { key: 'outro', start: 0.88, end: 1.01 },
] as const;

const FADE = 0.04;

const framePath = (width: number, index: number) =>
  `/hero/${width}/${String(index + 1).padStart(4, '0')}.webp`;

/** Opacity for a caption: ramps up over FADE at `start`, down over FADE at `end`. */
const captionOpacity = (progress: number, start: number, end: number) => {
  const fadeIn = start === 0 ? 1 : (progress - start) / FADE;
  const fadeOut = (end - progress) / FADE;
  return Math.max(0, Math.min(1, fadeIn, fadeOut));
};

export const ScrollVideoHero: React.FC = () => {
  const { t } = useTranslation();

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [loadedPercent, setLoadedPercent] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!section || !canvas || !ctx) return;

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
      const next = Math.min(base + 1, HERO_FRAME_COUNT - 1);
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

    const updateCaptions = (progress: number) => {
      CAPTIONS.forEach((caption, i) => {
        const el = captionRefs.current[i];
        if (!el) return;
        const opacity = captionOpacity(progress, caption.start, caption.end);
        el.style.opacity = String(opacity);
        el.style.transform = `translate3d(0, ${(1 - opacity) * 16}px, 0)`;
        el.style.visibility = opacity === 0 ? 'hidden' : 'visible';
      });
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
      // Captions follow the eased position so they stay in sync with the picture.
      updateCaptions(shownPos / (HERO_FRAME_COUNT - 1));

      if (shownPos !== targetPos) {
        rafId = requestAnimationFrame(tick);
      } else {
        lastTick = 0;
      }
    };

    const onScroll = () => {
      targetPos = scrollProgress() * (HERO_FRAME_COUNT - 1);
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const onResize = () => {
      sizeCanvas();
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
          }
        });
    };

    sizeCanvas();
    // Start at the restored scroll position rather than easing in from frame 0.
    targetPos = scrollProgress() * (HERO_FRAME_COUNT - 1);
    shownPos = targetPos;
    updateCaptions(scrollProgress());
    loadFrame(0);
    for (let i = 1; i < HERO_FRAME_COUNT; i++) loadFrame(i);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const captionBody: Record<(typeof CAPTIONS)[number]['key'], React.ReactNode> = {
    intro: (
      <>
        <p className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
          {t('heroCapIntroTitle')}
        </p>
        <p className="mt-3 text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-white/60">
          {t('heroCapIntroSub')}
        </p>
        <ChevronDown className="mx-auto mt-4 w-5 h-5 text-white/60 animate-bounce" />
      </>
    ),
    eyes: (
      <p className="text-lg sm:text-2xl font-semibold text-white leading-snug">
        {t('heroCapEyes')}
      </p>
    ),
    change: (
      <p className="text-lg sm:text-2xl font-semibold text-white leading-snug">
        {t('heroCapChange')}
      </p>
    ),
    outro: (
      <>
        <p className="text-lg sm:text-2xl font-semibold text-white leading-snug">
          {t('heroCapOutro')}
        </p>
        <ChevronDown className="mx-auto mt-3 w-5 h-5 text-white/60 animate-bounce" />
      </>
    ),
  };

  return (
    <section
      ref={sectionRef}
      className="relative bg-black"
      style={{ height: `${SCROLL_LENGTH_VH}vh` }}
      aria-label={t('heroCapIntroTitle')}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />

        {/* Captions live in the bottom band, which the animation leaves empty */}
        {CAPTIONS.map((caption, i) => (
          <div
            key={caption.key}
            ref={(el) => {
              captionRefs.current[i] = el;
            }}
            className="absolute inset-x-0 bottom-[8vh] px-6 text-center will-change-transform"
            style={{ opacity: caption.start === 0 ? 1 : 0 }}
          >
            <div className="max-w-2xl mx-auto [text-shadow:0_2px_16px_rgba(0,0,0,0.8)]">
              {captionBody[caption.key]}
            </div>
          </div>
        ))}

        {loadedPercent < 100 && (
          <div className="absolute right-4 bottom-4 text-[10px] font-mono uppercase tracking-wider text-white/50">
            {t('heroLoading')} {loadedPercent}%
          </div>
        )}
      </div>
    </section>
  );
};

export default ScrollVideoHero;
