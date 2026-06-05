/**
 * BrandFlow logo mark — SVG recreation of the swirl+star icon
 * and the full wordmark lockup.
 */

export function BrandflowIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="swirl1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="swirl2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="swirl3" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {/* Outer swirl arcs */}
      <path d="M32 6 C50 6 58 18 58 32 C58 46 50 58 32 58" stroke="url(#swirl1)" strokeWidth="5" strokeLinecap="round" fill="none"/>
      <path d="M32 58 C14 58 6 46 6 32 C6 18 14 6 32 6" stroke="url(#swirl2)" strokeWidth="5" strokeLinecap="round" fill="none"/>
      {/* Inner swirl arc */}
      <path d="M32 14 C44 14 50 22 50 32 C50 42 44 50 32 50 C20 50 14 42 14 32" stroke="url(#swirl3)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Chat bubble tail */}
      <path d="M20 50 L14 60 L28 54" stroke="url(#swirl2)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Star */}
      <path
        d="M32 20 L33.8 26.2 L40.2 26.2 L35.2 30.1 L37 36.3 L32 32.4 L27 36.3 L28.8 30.1 L23.8 26.2 L30.2 26.2 Z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export function BrandflowWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">Brand</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400">flow</span>
    </span>
  );
}

export function DryvnWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight italic ${className}`}>
      <span className="text-[#1e3a5f]">DRYV</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#60a5fa] to-[#3b82f6]">N</span>
      <span className="text-[#60a5fa] text-[0.7em] not-italic">↑</span>
    </span>
  );
}
