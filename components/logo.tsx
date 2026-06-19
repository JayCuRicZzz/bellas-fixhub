'use client';

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: { w: 140, h: 36, fs: 14 }, md: { w: 180, h: 46, fs: 18 }, lg: { w: 260, h: 66, fs: 26 } }[size];

  return (
    <div className="inline-flex items-center gap-2" style={{ height: dims.h }}>
      {/* Logo icon: wrench + gear in warm orange */}
      <div className="flex-shrink-0 relative" style={{ width: dims.h, height: dims.h }}>
        <svg viewBox="0 0 80 80" width={dims.h} height={dims.h}>
          {/* Gear */}
          <g transform="translate(40,40)">
            <circle cx="0" cy="0" r="18" fill="none" stroke="#D96F3B" strokeWidth="3" />
            <circle cx="0" cy="0" r="10" fill="none" stroke="#D96F3B" strokeWidth="2" opacity="0.6" />
            {[0,60,120,180,240,300].map((angle,i) => (
              <rect key={i} x="-4" y="-30" width="8" height="10" rx="2" fill="#D96F3B"
                transform={`rotate(${angle})`} />
            ))}
            <circle cx="0" cy="0" r="5" fill="#643614" />
          </g>
          {/* Wrench crossing */}
          <g transform="translate(25,55) rotate(-30)">
            <rect x="0" y="-3" width="40" height="6" rx="3" fill="#643614" />
            <circle cx="40" cy="0" r="8" fill="none" stroke="#643614" strokeWidth="3" />
          </g>
        </svg>
      </div>
      {/* Text */}
      <div className="flex flex-col justify-center" style={{ lineHeight: 1.1 }}>
        <span className="font-bold tracking-tight" style={{ fontSize: dims.fs, color: '#643614' }}>
          Bellas
          <span style={{ color: '#D96F3B' }}> Fix</span>Hub
        </span>
        <span className="text-[10px] tracking-wider uppercase" style={{ color: '#643614', opacity: 0.6, fontSize: Math.max(dims.fs * 0.45, 8) }}>
          Maintenance Desk
        </span>
      </div>
    </div>
  );
}
