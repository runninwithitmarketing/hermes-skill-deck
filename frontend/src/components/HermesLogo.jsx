import { useId } from "react";

export default function HermesLogo({ className = "", iconClassName = "h-7 w-10", showText = false, textClassName = "" }) {
  const glowId = `${useId().replace(/:/g, "")}-wing-glow`;

  return (
    <span className={`hermes-logo inline-flex items-center ${showText ? "gap-2" : ""} ${className}`}>
      <svg className={`shrink-0 ${iconClassName}`} viewBox="0 0 40 28" fill="none" aria-hidden="true">
        <defs>
          <filter id={glowId} x="-35%" y="-45%" width="170%" height="190%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#${glowId})`} stroke="var(--hermes-wing-left)" strokeWidth="1" fill="none" strokeLinecap="round">
          <path d="M10 6 Q6 3 2 2" />
          <path d="M10 9 Q6 6 1 5" />
          <path d="M10 12 Q6 9 0 8" />
          <path d="M10 15 Q6 12 1 11" />
          <path d="M10 18 Q6 15 2 14" />
        </g>
        <g filter={`url(#${glowId})`} stroke="var(--hermes-wing-right)" strokeWidth="1" fill="none" strokeLinecap="round">
          <path d="M30 6 Q34 3 38 2" />
          <path d="M30 9 Q34 6 39 5" />
          <path d="M30 12 Q34 9 40 8" />
          <path d="M30 15 Q34 12 39 11" />
          <path d="M30 18 Q34 15 38 14" />
        </g>
        <g filter={`url(#${glowId})`} stroke="var(--hermes-mark)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M15 5 L15 23" />
          <path d="M25 5 L25 23" />
          <path d="M15 14 L25 14" />
        </g>
      </svg>
      {showText && (
        <span className={`hermes-logo-text font-display font-bold text-white/90 ${textClassName}`}>
          Hermes Skill Deck
        </span>
      )}
    </span>
  );
}
