function Diya({ x }: { x: number }) {
  return (
    <g>
      <path
        d={`M${x - 15} 292 Q${x} 312 ${x + 15} 292 Z`}
        className="fill-marigold-deep"
      />
      <path
        d={`M${x} 270 C${x + 6} 279 ${x + 5} 287 ${x} 289 C${x - 5} 287 ${x - 6} 279 ${x} 270Z`}
        className="fill-marigold"
      />
    </g>
  );
}

/**
 * The log-in and sign-up illustration: a mandap with a kalash on top, two lit
 * diyas and the product's linked rings at its centre. Decorative.
 */
export function MandapScene({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 20 440 300"
      className={`block h-auto w-full ${className}`}
    >
      {/* Canopy and kalash */}
      <path d="M86 128 Q220 26 354 128 Z" className="fill-accent" />
      <path d="M86 128 H354" strokeWidth="6" className="stroke-accent" />
      <circle cx="220" cy="58" r="9" className="fill-marigold" />
      <path
        d="M220 49 V36"
        strokeWidth="2.5"
        className="stroke-marigold-deep"
      />

      {/* Pillars and the cusped arch between them */}
      <rect x="100" y="128" width="16" height="172" className="fill-accent" />
      <rect x="324" y="128" width="16" height="172" className="fill-accent" />
      <path
        d="M128 300 V178 Q128 150 154 144 Q192 136 220 108 Q248 136 286 144 Q312 150 312 178 V300 Z"
        strokeWidth="2"
        className="fill-accent-tint stroke-accent"
      />

      {/* Linked rings at the centre, with shine lines */}
      <g fill="none" strokeWidth="3.5" className="stroke-accent">
        <ellipse cx="206" cy="232" rx="20" ry="16" />
        <ellipse cx="234" cy="232" rx="20" ry="16" />
      </g>
      <path
        d="M220 186v10M204 190l4 8M236 190l-4 8"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-marigold-deep"
      />

      {/* Floor and diyas */}
      <path d="M60 300 H380" strokeWidth="2" className="stroke-border" />
      <Diya x={170} />
      <Diya x={270} />
    </svg>
  );
}
