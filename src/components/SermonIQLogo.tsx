import React from 'react';

interface SermonIQLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  theme?: 'dark' | 'light' | 'original';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  id?: string;
}

export function SermonIQLogo({
  variant = 'full',
  theme = 'dark',
  className = '',
  size = 'md',
  id = 'sermoniq-logo'
}: SermonIQLogoProps) {
  // Size classes
  const sizeMap = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-11',
    xl: 'h-14',
    custom: ''
  };

  const primaryFill = theme === 'dark' ? '#FFFFFF' : '#182B49';
  const accentFill = '#BD8825'; // Golden Amber from original logo
  const subtitleFill = theme === 'dark' ? 'rgba(255, 255, 255, 0.55)' : '#718096';
  const iconNavyFill = theme === 'dark' ? '#FFFFFF' : '#182B49';

  // Render the distinctive 5-bar waveform icon with the integrated Golden Cross
  const renderIcon = (extraClasses = '') => (
    <svg
      viewBox="0 0 112 132"
      className={`${sizeMap[size]} w-auto shrink-0 ${extraClasses}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SermonIQ Cross Icon"
    >
      {/* Outer Left Navy Bar */}
      <rect x="0" y="38" width="14" height="54" rx="7" fill={iconNavyFill} />
      {/* Inner Left Navy Bar */}
      <rect x="24" y="16" width="14" height="98" rx="7" fill={iconNavyFill} />
      {/* Inner Right Navy Bar */}
      <rect x="72" y="16" width="14" height="98" rx="7" fill={iconNavyFill} />
      {/* Outer Right Navy Bar */}
      <rect x="96" y="38" width="14" height="54" rx="7" fill={iconNavyFill} />

      {/* Center Golden Latin Cross */}
      {/* Vertical Beam */}
      <rect x="48" y="0" width="14" height="130" rx="7" fill={accentFill} />
      {/* Horizontal Crossbar */}
      <rect x="20" y="28" width="70" height="14" rx="7" fill={accentFill} />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div id={id} className={`inline-block shrink-0 ${className}`}>
        {renderIcon()}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div id={id} className={`flex items-center gap-2.5 select-none ${className}`}>
        {renderIcon()}
        <div className="flex items-baseline leading-none">
          <span
            className="font-serif font-bold text-lg sm:text-xl tracking-tight"
            style={{ color: primaryFill, fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}
          >
            Sermon
          </span>
          <span
            className="font-sans font-extrabold text-lg sm:text-xl tracking-normal ml-0.5"
            style={{ color: accentFill }}
          >
            IQ
          </span>
        </div>
      </div>
    );
  }

  // Full variant matching SermonIQ_logo (1).jpg layout
  return (
    <div id={id} className={`flex items-center gap-3 select-none ${className}`}>
      {/* 5-bar Waveform with Integrated Golden Cross */}
      {renderIcon()}

      {/* Typography: "SermonIQ" and "MINISTRY INTELLIGENCE" */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline leading-none">
          <span
            className="font-serif font-bold text-lg sm:text-2xl tracking-tight"
            style={{ color: primaryFill, fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}
          >
            Sermon
          </span>
          <span
            className="font-sans font-extrabold text-lg sm:text-2xl tracking-normal ml-0.5"
            style={{ color: accentFill }}
          >
            IQ
          </span>
        </div>
        <span
          className="text-[8px] sm:text-[9px] uppercase font-semibold font-mono tracking-[0.26em] sm:tracking-[0.3em] leading-tight mt-0.5"
          style={{ color: subtitleFill }}
        >
          MINISTRY INTELLIGENCE
        </span>
      </div>
    </div>
  );
}
