import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md';
  variant?: 'dark' | 'light';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', variant = 'light' }) => {
  const iconSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const isDark = variant === 'dark';

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${iconSize} flex shrink-0 items-center justify-center rounded-lg ${
          isDark
            ? 'bg-[#104735] ring-1 ring-[#E6A23C]/35'
            : 'bg-[#145A43] shadow-xs'
        }`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 4.5L26.5 10.2V21.8L16 27.5L5.5 21.8V10.2L16 4.5Z"
            stroke="#FFFEFA"
            strokeOpacity="0.48"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 10.2L16 15.8L26.5 10.2"
            stroke="#FFFEFA"
            strokeOpacity="0.48"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M16 15.8V27.5"
            stroke="#FFFEFA"
            strokeOpacity="0.48"
            strokeWidth="1.6"
          />
          <path
            d="M8.5 19.5L13.2 15.2L17.4 17.4L23.5 11.2"
            stroke="#E6A23C"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.8 11.2H23.5V14.9"
            stroke="#E6A23C"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <div
          className={`font-display text-base font-bold tracking-tight leading-none ${
            isDark ? 'text-[#FFFEFA]' : 'text-[#292F2C]'
          }`}
        >
          SmartStock
        </div>
        <div
          className={`mt-1 text-[11px] font-medium leading-none ${
            isDark ? 'text-[#EEEAE0]/75' : 'text-[#6B746E]'
          }`}
        >
          Inventory &amp; Demand AI
        </div>
      </div>
    </div>
  );
};
