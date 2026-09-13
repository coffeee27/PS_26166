import { useEffect, useRef, useState } from 'react';

/* Shared helpers and hooks for the landing page sections. */

export const ACCENT = '#5EB8D6';
export const AMBER = '#E3A93B';
export const RED = '#FF4D4D';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Deterministic pseudo-random in [0, 1) so visuals are stable between renders. */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Pauses CSS and SMIL animations inside the element while it is offscreen, via
 * `data-paused` (see index.css) and SVGSVGElement.pauseAnimations().
 */
export function usePauseOffscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setPaused = (paused: boolean) => {
      el.dataset.paused = String(paused);
      el.querySelectorAll('svg').forEach((svg) => (paused ? svg.pauseAnimations() : svg.unpauseAnimations()));
    };
    setPaused(true);
    const observer = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting), {
      rootMargin: '200px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/** True once the element has scrolled into view (never resets). */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/**
 * Calls `onProgress` (0-1) as the element scrolls, throttled to animation frames
 * and only while the element is near the viewport.
 *  - `through`: 0 when the element's top enters the bottom of the viewport, 1 when
 *    its bottom leaves the top.
 *  - `sticky`: 0 when the element's top reaches the viewport top, 1 when its bottom
 *    reaches the viewport bottom (for tall sections with a sticky child).
 */
export function useScrollProgress<T extends HTMLElement>(
  onProgress: (progress: number) => void,
  mode: 'through' | 'sticky' = 'through'
) {
  const ref = useRef<T>(null);
  const callback = useRef(onProgress);
  useEffect(() => {
    callback.current = onProgress;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let active = false;

    const compute = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress =
        mode === 'sticky'
          ? clamp01(-rect.top / Math.max(1, rect.height - vh))
          : clamp01((vh - rect.top) / (vh + rect.height));
      callback.current(progress);
    };
    const schedule = () => {
      if (active && !raf) raf = requestAnimationFrame(compute);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        schedule();
      },
      { rootMargin: '150px 0px' }
    );
    observer.observe(el);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    compute();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [mode]);

  return ref;
}
