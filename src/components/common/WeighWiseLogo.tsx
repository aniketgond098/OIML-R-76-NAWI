import React from 'react';

interface WeighWiseLogoProps {
  variant?: 'icon' | 'horizontal' | 'stacked';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  theme?: 'default' | 'light' | 'monochrome';
  className?: string;
  showSubtitle?: boolean;
}

export const WeighWiseLogo: React.FC<WeighWiseLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  theme = 'default',
  className = '',
  showSubtitle = true,
}) => {
  // Resolve pixel sizes for emblem
  const getEmblemDimension = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs':
        return 22;
      case 'sm':
        return 28;
      case 'md':
        return 36;
      case 'lg':
        return 48;
      case 'xl':
        return 72;
      default:
        return 36;
    }
  };

  const emblemSize = getEmblemDimension();

  // Color configurations based on theme
  const isLight = theme === 'light';
  const idSuffix = React.useId().replace(/:/g, '');
  const gradId = `ww-grad-${idSuffix}`;
  const weightGradId = `ww-weight-${idSuffix}`;

  const textColorPrimary = isLight ? 'text-white' : 'text-slate-900';
  const textColorSecondary = isLight ? 'text-slate-300' : 'text-teal-900';

  const emblemSvg = (
    <svg
      width={emblemSize}
      height={emblemSize}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-xs select-none"
      aria-hidden="true"
    >
      <defs>
        {isLight ? (
          <linearGradient id={gradId} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        ) : (
          <linearGradient id={gradId} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#0D9488" />
            <stop offset="35%" stopColor="#0E7490" />
            <stop offset="70%" stopColor="#0F4C81" />
            <stop offset="100%" stopColor="#0E3860" />
          </linearGradient>
        )}

        {isLight ? (
          <linearGradient id={weightGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        ) : (
          <linearGradient id={weightGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0E7490" />
            <stop offset="100%" stopColor="#0A2D48" />
          </linearGradient>
        )}
      </defs>

      {/* Outer Metrology Circle */}
      <circle
        cx="100"
        cy="100"
        r="78"
        stroke={`url(#${gradId})`}
        strokeWidth="13"
        strokeLinecap="round"
      />

      {/* Top Vertical Plumb Stem (T-Axis) */}
      <line
        x1="100"
        y1="23"
        x2="100"
        y2="76"
        stroke={`url(#${gradId})`}
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* Interlocking Double-W Curved Ribbon System */}
      {/* Left W Wing */}
      <path
        d="M 52 70 
           C 50 94, 60 120, 78 126 
           C 90 130, 99 116, 107 100 
           C 116 82, 126 62, 142 66 
           C 152 69, 153 84, 149 98"
        stroke={`url(#${gradId})`}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Right W Wing (Intertwined) */}
      <path
        d="M 148 70 
           C 150 94, 140 120, 122 126 
           C 110 130, 101 116, 93 100 
           C 84 82, 74 62, 58 66 
           C 48 69, 47 84, 51 98"
        stroke={`url(#${gradId})`}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Lower Central Ribbon Bridge */}
      <path
        d="M 64 120 
           C 78 136, 122 136, 136 120"
        stroke={`url(#${gradId})`}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />

      {/* OIML Calibration Standard Weight (Silhouette at 6 o'clock) */}
      <rect x="94" y="140" width="12" height="6" rx="2" fill={`url(#${weightGradId})`} />
      <rect x="96" y="146" width="8" height="4" fill={`url(#${weightGradId})`} />
      <path
        d="M 91 150 
           L 109 150 
           L 112 154 
           L 112 178 
           L 88 178 
           L 88 154 
           Z"
        fill={`url(#${weightGradId})`}
      />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{emblemSvg}</div>;
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {emblemSvg}
        <div className="mt-2.5 space-y-0.5">
          <span
            className={`block font-black tracking-wider uppercase font-sans ${textColorPrimary}`}
            style={{ fontSize: Math.max(14, emblemSize * 0.42) }}
          >
            WEIGHWISE
          </span>
          {showSubtitle && (
            <span
              className={`block text-[10px] font-bold tracking-[0.25em] uppercase font-sans ${textColorSecondary}`}
              style={{ fontSize: Math.max(8, emblemSize * 0.17) }}
            >
              METROLOGY COMPLIANCE
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default: Horizontal layout
  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {emblemSvg}
      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-tight leading-none uppercase font-sans truncate ${textColorPrimary}`}
            style={{ fontSize: Math.max(14, emblemSize * 0.44) }}
          >
            WEIGHWISE
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase font-sans mt-0.5 truncate leading-none ${textColorSecondary}`}
          >
            METROLOGY COMPLIANCE
          </span>
        )}
      </div>
    </div>
  );
};
