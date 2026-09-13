import React from 'react';
import { hash } from './utils';

/* Shared presentational pieces for the landing page sections. */

export const SectionHeading: React.FC<{ badge: string; title: string; desc?: string; center?: boolean }> = ({
  badge,
  title,
  desc,
  center,
}) => (
  <div className={center ? 'text-center mx-auto max-w-3xl' : 'max-w-3xl'}>
    <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#5EB8D6]/10 text-[#5EB8D6] border border-[#5EB8D6]/25">
      {badge}
    </span>
    <h2 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">{title}</h2>
    {desc && <p className="mt-4 text-sm sm:text-base text-[#8B98A5] leading-relaxed">{desc}</p>}
  </div>
);

/** Scattered twinkling stars for dark panels. */
export const StarField: React.FC<{ count?: number; className?: string }> = ({ count = 60, className }) => (
  <div className={`absolute inset-0 pointer-events-none ${className ?? ''}`} aria-hidden="true">
    {Array.from({ length: count }, (_, i) => (
      <span
        key={i}
        className="absolute rounded-full bg-white lp-twinkle"
        style={{
          left: `${hash(i) * 100}%`,
          top: `${hash(i + 50) * 100}%`,
          width: `${hash(i + 100) * 2 + 1}px`,
          height: `${hash(i + 100) * 2 + 1}px`,
          animationDelay: `${(hash(i + 150) * 3.5).toFixed(2)}s`,
          animationDuration: `${(2.5 + hash(i + 200) * 3).toFixed(2)}s`,
        }}
      />
    ))}
  </div>
);
