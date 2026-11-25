import React, { useId } from 'react';

interface ProductArtworkProps {
  name: string;
  category: string;
  skuCode?: string;
  compact?: boolean;
  className?: string;
}

type ArtworkRenderer = (uid: string, compact: boolean) => React.ReactNode;

interface ProductSpec {
  bgFrom: string;
  bgTo: string;
  label?: string;
  accent?: string;
  secondary?: string;
  render: ArtworkRenderer;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ---------- SHARED VISUAL HELPERS ----------

function PedestalShadow({ uid, y = 198, rx = 74, ry = 13 }: { uid: string; y?: number; rx?: number; ry?: number }) {
  return (
    <ellipse cx="160" cy={y} rx={rx} ry={ry} fill={`url(#${uid}-shd)`} />
  );
}

// Bowl with custom seed / grain / lentil / powder particles
function IngredientBowl({
  uid,
  bowlFill,
  bowlRim,
  pileMain,
  pileLight,
  pileDark,
  style = 'grains',
  tag,
  compact,
}: {
  uid: string;
  bowlFill: string;
  bowlRim: string;
  pileMain: string;
  pileLight: string;
  pileDark: string;
  style?: 'long-rice' | 'short-rice' | 'flakes' | 'puffs' | 'grains' | 'flour' | 'split-dal' | 'kidney' | 'chickpea' | 'chunks' | 'powder' | 'seeds' | 'sev' | 'mixture';
  tag?: string;
  compact: boolean;
}) {
  const particleSeeds = [
    [118, 126, -15], [134, 118, 18], [150, 113, -8], [166, 114, 22], [184, 119, -20], [198, 127, 12],
    [110, 136, 25], [126, 130, -12], [142, 124, 10], [158, 122, -24], [174, 124, 14], [190, 131, -6], [206, 138, 20],
    [120, 140, 8], [138, 135, -18], [156, 133, 6], [174, 135, -14], [192, 140, 16],
  ];

  return (
    <g>
      <PedestalShadow uid={uid} y={196} rx={78} ry={14} />

      {/* Mound behind rim */}
      <path
        d="M 92 142 Q 160 88 228 142 Z"
        fill={pileMain}
      />
      <path
        d="M 104 140 Q 158 98 206 136 Q 160 118 104 140 Z"
        fill={pileLight}
        opacity="0.7"
      />

      {/* Particle texture */}
      {style === 'long-rice' &&
        particleSeeds.map(([x, y, r], i) => (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={6.5}
            ry={2.1}
            transform={`rotate(${r} ${x} ${y})`}
            fill={i % 3 === 0 ? pileLight : i % 3 === 1 ? '#FFFFFF' : pileDark}
            opacity="0.92"
          />
        ))}

      {style === 'short-rice' &&
        particleSeeds.map(([x, y, r], i) => (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={4.2}
            ry={2.7}
            transform={`rotate(${r} ${x} ${y})`}
            fill={i % 2 === 0 ? pileLight : '#FFFDF8'}
            opacity="0.95"
          />
        ))}

      {style === 'flakes' &&
        particleSeeds.map(([x, y, r], i) => (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={7}
            ry={4.2}
            transform={`rotate(${r * 1.4} ${x} ${y})`}
            fill={i % 2 === 0 ? pileLight : pileDark}
            stroke={pileMain}
            strokeWidth="0.6"
          />
        ))}

      {style === 'puffs' &&
        particleSeeds.map(([x, y, r], i) => (
          <ellipse
            key={i}
            cx={x}
            cy={y - 3}
            rx={6.4}
            ry={4.6}
            transform={`rotate(${r} ${x} ${y})`}
            fill={i % 2 === 0 ? '#FFFFFF' : pileLight}
            stroke={pileDark}
            strokeWidth="0.5"
          />
        ))}

      {(style === 'grains' || style === 'seeds') &&
        particleSeeds.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={style === 'seeds' ? 2.8 : 3.6}
            fill={i % 3 === 0 ? pileLight : i % 3 === 1 ? pileDark : pileMain}
          />
        ))}

      {style === 'split-dal' &&
        particleSeeds.map(([x, y, r], i) => (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={4.5}
            ry={3.4}
            transform={`rotate(${r} ${x} ${y})`}
            fill={i % 2 === 0 ? pileLight : pileDark}
          />
        ))}

      {style === 'kidney' &&
        particleSeeds.slice(0, 14).map(([x, y, r], i) => (
          <path
            key={i}
            d={`M ${x - 6} ${y} C ${x - 4} ${y - 5}, ${x + 4} ${y - 5}, ${x + 6} ${y} C ${x + 3} ${y + 3}, ${x - 3} ${y + 3}, ${x - 6} ${y} Z`}
            transform={`rotate(${r} ${x} ${y})`}
            fill={i % 2 === 0 ? pileMain : pileDark}
            stroke={pileLight}
            strokeWidth="0.5"
          />
        ))}

      {style === 'chickpea' &&
        particleSeeds.slice(0, 15).map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={5.4} fill={i % 2 === 0 ? pileLight : pileMain} />
            <circle cx={x - 1.5} cy={y - 1.5} r={1.6} fill="#FFFFFF" opacity="0.35" />
          </g>
        ))}

      {style === 'chunks' &&
        particleSeeds.slice(0, 12).map(([x, y, r], i) => (
          <rect
            key={i}
            x={x - 6}
            y={y - 5}
            width={12}
            height={10}
            rx={4}
            transform={`rotate(${r} ${x} ${y})`}
            fill={i % 2 === 0 ? pileLight : pileMain}
            stroke={pileDark}
            strokeWidth="0.8"
          />
        ))}

      {(style === 'flour' || style === 'powder') && (
        <g>
          <path d="M 96 142 Q 160 76 224 142 Z" fill={pileMain} />
          <path d="M 112 138 Q 160 88 202 138 Z" fill={pileLight} opacity="0.55" />
          <circle cx="144" cy="112" r="1.5" fill={pileDark} opacity="0.5" />
          <circle cx="172" cy="118" r="1.5" fill={pileDark} opacity="0.5" />
          <circle cx="158" cy="102" r="1.2" fill="#FFFFFF" opacity="0.7" />
        </g>
      )}

      {style === 'sev' &&
        Array.from({ length: 14 }).map((_, i) => (
          <path
            key={i}
            d={`M ${106 + (i % 7) * 16} ${116 + Math.floor(i / 7) * 12} q 8 -6 16 2 t 14 -2`}
            fill="none"
            stroke={i % 2 === 0 ? pileLight : pileDark}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        ))}

      {style === 'mixture' && (
        <g>
          {Array.from({ length: 10 }).map((_, i) => (
            <path
              key={`s${i}`}
              d={`M ${106 + (i % 5) * 20} ${118 + Math.floor(i / 5) * 11} q 7 -5 14 2`}
              fill="none"
              stroke={pileLight}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          ))}
          <circle cx="136" cy="122" r="4" fill="#15803D" />
          <circle cx="164" cy="116" r="4.5" fill="#B45309" />
          <circle cx="184" cy="126" r="4" fill="#DC2626" />
          <ellipse cx="150" cy="129" rx="5" ry="3.2" fill="#FDE68A" />
        </g>
      )}

      {/* Bowl body */}
      <path
        d="M 86 140 Q 88 196 160 196 Q 232 196 234 140 Z"
        fill={bowlFill}
      />
      <path
        d="M 96 146 Q 100 186 150 190 Q 118 176 112 146 Z"
        fill="#FFFFFF"
        opacity="0.16"
      />
      {/* Bowl foot */}
      <rect x="130" y="191" width="60" height="7" rx="3" fill={bowlRim} />
      {/* Bowl rim */}
      <ellipse cx="160" cy="140" rx="75" ry="11" fill="none" stroke={bowlRim} strokeWidth="5" />

      {!compact && tag && (
        <g>
          <rect x="122" y="159" width="76" height="19" rx="9.5" fill="#FFFFFF" fillOpacity="0.9" />
          <text
            x="160"
            y="172"
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fill="#1C1917"
            letterSpacing="0.5"
          >
            {tag}
          </text>
        </g>
      )}
    </g>
  );
}

// Woven / kraft pouch or sack with badge & visible grain window
function GrainPouch({
  uid,
  bagBody,
  bagFold,
  bandColor,
  grainColor,
  badgeText,
  motif = 'wheat',
  compact,
}: {
  uid: string;
  bagBody: string;
  bagFold: string;
  bandColor: string;
  grainColor: string;
  badgeText: string;
  motif?: 'wheat' | 'rice' | 'flour' | 'baking' | 'spice';
  compact: boolean;
}) {
  return (
    <g>
      <PedestalShadow uid={uid} y={202} rx={68} ry={12} />
      {/* Top crimped seal */}
      <path d="M 110 48 L 210 48 L 204 62 L 116 62 Z" fill={bagFold} />
      <line x1="112" y1="53" x2="208" y2="53" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Main standing pouch */}
      <rect x="104" y="60" width="112" height="140" rx="14" fill={bagBody} />
      {/* Left specular highlight */}
      <path d="M 112 72 L 126 72 L 122 192 L 110 188 Z" fill="#FFFFFF" opacity="0.2" />
      {/* Decorative top band */}
      <rect x="104" y="76" width="112" height="24" fill={bandColor} />
      {/* Center emblem card */}
      <rect x="118" y="108" width="84" height="58" rx="8" fill="#FFFDF8" stroke={bandColor} strokeWidth="2" />
      {/* Grain preview window */}
      <rect x="126" y="144" width="68" height="14" rx="7" fill={grainColor} />
      <circle cx="138" cy="151" r="2.2" fill="#FFFFFF" opacity="0.55" />
      <circle cx="152" cy="150" r="2.2" fill="#FFFFFF" opacity="0.55" />
      <circle cx="168" cy="152" r="2.2" fill="#FFFFFF" opacity="0.55" />
      <circle cx="182" cy="150" r="2.2" fill="#FFFFFF" opacity="0.55" />

      {/* Botanical / category icon inside card */}
      {motif === 'wheat' && (
        <g stroke={bandColor} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M 160 136 L 160 115" />
          <path d="M 160 129 L 152 123 M 160 123 L 153 117" />
          <path d="M 160 129 L 168 123 M 160 123 L 167 117" />
        </g>
      )}
      {motif === 'rice' && (
        <g fill={bandColor}>
          <ellipse cx="152" cy="126" rx="5.5" ry="2.2" transform="rotate(-25 152 126)" />
          <ellipse cx="160" cy="122" rx="5.5" ry="2.2" transform="rotate(15 160 122)" />
          <ellipse cx="168" cy="127" rx="5.5" ry="2.2" transform="rotate(-15 168 127)" />
        </g>
      )}
      {motif === 'flour' && (
        <path d="M 142 135 Q 160 114 178 135 Z" fill={bandColor} opacity="0.85" />
      )}
      {motif === 'baking' && (
        <circle cx="160" cy="125" r="9" fill={bandColor} opacity="0.88" />
      )}
      {motif === 'spice' && (
        <polygon points="160,115 169,133 151,133" fill={bandColor} />
      )}

      {!compact && (
        <text
          x="160"
          y="92"
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#FFFFFF"
          letterSpacing="0.8"
        >
          {badgeText}
        </text>
      )}
    </g>
  );
}

// Oil Bottle
function OilBottle({
  uid,
  liquidColor,
  liquidHighlight,
  capColor,
  labelBg,
  labelText,
  shape = 'tall',
  emblemColor,
  compact,
}: {
  uid: string;
  liquidColor: string;
  liquidHighlight: string;
  capColor: string;
  labelBg: string;
  labelText: string;
  shape?: 'tall' | 'faceted' | 'wide';
  emblemColor: string;
  compact: boolean;
}) {
  const bodyX = shape === 'wide' ? 114 : 124;
  const bodyW = shape === 'wide' ? 92 : 72;
  return (
    <g>
      <PedestalShadow uid={uid} y={204} rx={54} ry={11} />
      {/* Cap */}
      <rect x="145" y="34" width="30" height="16" rx="4" fill={capColor} />
      <rect x="148" y="50" width="24" height="16" fill="#E7E5E4" opacity="0.7" />
      {/* Shoulders */}
      <path
        d={`M 148 64 Q ${bodyX + 4} 78 ${bodyX} 92 L ${bodyX + bodyW} 92 Q ${bodyX + bodyW - 4} 78 172 64 Z`}
        fill={liquidColor}
      />
      {/* Main Bottle */}
      <rect x={bodyX} y="90" width={bodyW} height="110" rx={shape === 'wide' ? 18 : 12} fill={liquidColor} />
      {/* Specular glass reflection */}
      <rect x={bodyX + 8} y="94" width="11" height="98" rx="5" fill={liquidHighlight} opacity="0.45" />
      {shape === 'faceted' && (
        <g stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="1.5">
          <line x1={bodyX} y1="112" x2={bodyX + bodyW} y2="112" />
          <line x1={bodyX} y1="176" x2={bodyX + bodyW} y2="176" />
        </g>
      )}
      {/* Wrap-around Label */}
      <rect x={bodyX + 3} y="114" width={bodyW - 6} height="56" rx="6" fill={labelBg} />
      <circle cx="160" cy="133" r="10" fill={emblemColor} />
      <circle cx="160" cy="133" r="4" fill="#FFFBEB" />
      {!compact && (
        <text
          x="160"
          y="160"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#1C1917"
          letterSpacing="0.5"
        >
          {labelText}
        </text>
      )}
    </g>
  );
}

// Glass Jar (Ghee, Honey, Pickle, Coffee, Dalia)
function GlassJar({
  uid,
  fillMain,
  fillTop,
  lidColor,
  labelBg,
  labelText,
  accent,
  compact,
}: {
  uid: string;
  fillMain: string;
  fillTop: string;
  lidColor: string;
  labelBg: string;
  labelText: string;
  accent: string;
  compact: boolean;
}) {
  return (
    <g>
      <PedestalShadow uid={uid} y={200} rx={62} ry={12} />
      {/* Jar Lid */}
      <rect x="116" y="48" width="88" height="22" rx="6" fill={lidColor} />
      <rect x="122" y="51" width="76" height="4" rx="2" fill="#FFFFFF" opacity="0.28" />
      {/* Glass body */}
      <rect x="108" y="70" width="104" height="126" rx="20" fill={fillMain} stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.7" />
      {/* Top surface swirl */}
      <ellipse cx="160" cy="84" rx="44" ry="8" fill={fillTop} />
      {/* Glass sheen */}
      <rect x="117" y="84" width="12" height="100" rx="6" fill="#FFFFFF" opacity="0.32" />
      {/* Label */}
      <rect x="118" y="108" width="84" height="58" rx="8" fill={labelBg} />
      <rect x="118" y="108" width="84" height="10" rx="4" fill={accent} />
      {!compact && (
        <text
          x="160"
          y="144"
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#1C1917"
          letterSpacing="0.6"
        >
          {labelText}
        </text>
      )}
    </g>
  );
}

// Masala / Tea / Baking Box Carton
function SpiceBox({
  uid,
  boxColor,
  topBand,
  accent,
  title,
  compact,
}: {
  uid: string;
  boxColor: string;
  topBand: string;
  accent: string;
  title: string;
  compact: boolean;
}) {
  return (
    <g>
      <PedestalShadow uid={uid} y={202} rx={64} ry={12} />
      {/* 3D Side depth */}
      <polygon points="204,54 224,66 224,188 204,198" fill={topBand} />
      {/* Front Carton */}
      <rect x="100" y="54" width="104" height="144" rx="6" fill={boxColor} />
      <rect x="100" y="54" width="104" height="26" rx="4" fill={topBand} />
      {/* Emblem Medallion */}
      <circle cx="152" cy="122" r="28" fill="#FFFDF8" stroke={accent} strokeWidth="3" />
      <circle cx="152" cy="122" r="18" fill={accent} opacity="0.2" />
      <polygon points="152,107 164,129 140,129" fill={accent} />
      {!compact && (
        <text
          x="152"
          y="174"
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#FFFFFF"
          letterSpacing="0.8"
        >
          {title}
        </text>
      )}
    </g>
  );
}

// Bottle for Personal Care & Household Cleaners
function CareBottle({
  uid,
  bottleColor,
  capType = 'flip',
  capColor = '#FFFFFF',
  labelBg = '#FFFFFF',
  labelAccent,
  title,
  compact,
}: {
  uid: string;
  bottleColor: string;
  capType?: 'flip' | 'pump' | 'spray' | 'angled' | 'squeeze';
  capColor?: string;
  labelBg?: string;
  labelAccent: string;
  title: string;
  compact: boolean;
}) {
  return (
    <g>
      <PedestalShadow uid={uid} y={204} rx={54} ry={11} />
      {capType === 'flip' && (
        <rect x="142" y="38" width="36" height="22" rx="5" fill={capColor} />
      )}
      {capType === 'pump' && (
        <g>
          <rect x="152" y="46" width="16" height="16" fill={capColor} />
          <path d="M 142 40 L 184 40 L 186 48 L 146 48 Z" fill={capColor} />
          <path d="M 184 44 L 194 49" stroke={capColor} strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {capType === 'spray' && (
        <g>
          <rect x="148" y="48" width="24" height="14" fill={capColor} />
          <path d="M 138 34 L 190 38 L 186 50 L 142 50 Z" fill={capColor} />
          <path d="M 176 48 L 182 62" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {capType === 'angled' && (
        <path d="M 146 36 L 178 44 L 172 64 L 146 64 Z" fill={capColor} />
      )}
      {capType === 'squeeze' && (
        <g>
          <polygon points="155,34 165,34 168,52 152,52" fill={capColor} />
          <rect x="145" y="52" width="30" height="10" rx="3" fill={capColor} />
        </g>
      )}

      {/* Bottle Silhouette */}
      <path
        d="M 142 62 Q 116 74 116 96 L 116 188 Q 116 200 128 200 L 192 200 Q 204 200 204 188 L 204 96 Q 204 74 178 62 Z"
        fill={bottleColor}
      />
      <rect x="124" y="88" width="10" height="98" rx="5" fill="#FFFFFF" opacity="0.28" />
      <rect x="126" y="106" width="68" height="66" rx="8" fill={labelBg} />
      <circle cx="160" cy="130" r="12" fill={labelAccent} opacity="0.22" />
      <circle cx="160" cy="130" r="6" fill={labelAccent} />
      {!compact && (
        <text
          x="160"
          y="158"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#1C1917"
          letterSpacing="0.5"
        >
          {title}
        </text>
      )}
    </g>
  );
}

// ---------- COMPLETE 146-PRODUCT CATALOG MAP ----------

const PRODUCT_SPECS: Record<string, ProductSpec> = {
  // ===== 1. RICE AND GRAINS (14) =====
  'basmati rice': {
    bgFrom: '#F7F5EE',
    bgTo: '#E7E4D6',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#F6F1E4" bagFold="#DED4BE" bandColor="#0F5132" grainColor="#FFFDF9" badgeText="BASMATI" motif="rice" compact={c} />
    ),
  },
  'gobindobhog rice': {
    bgFrom: '#FDF6EC',
    bgTo: '#EFE2CE',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#9A3412" bowlRim="#7C2D12" pileMain="#FEF9EC" pileLight="#FFFFFF" pileDark="#F3E8D2" style="short-rice" tag="GOBINDOBHOG" compact={c} />
    ),
  },
  'sona masoori rice': {
    bgFrom: '#FEF9EC',
    bgTo: '#F1E5C8',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#E9C46A" bagFold="#D4A94B" bandColor="#92400E" grainColor="#FFFDF7" badgeText="SONA MASOORI" motif="rice" compact={c} />
    ),
  },
  'swarna rice': {
    bgFrom: '#FAF4EC',
    bgTo: '#EAE0D0',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#D6B892" bagFold="#BC9B72" bandColor="#78350F" grainColor="#F5E6C8" badgeText="SWARNA" motif="rice" compact={c} />
    ),
  },
  'miniket rice': {
    bgFrom: '#F0F7F5',
    bgTo: '#DCEAE6',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#E2EFEA" bagFold="#C5DDD5" bandColor="#0F766E" grainColor="#FFFFFF" badgeText="MINIKET" motif="rice" compact={c} />
    ),
  },
  'brown rice': {
    bgFrom: '#F6EFE6',
    bgTo: '#E4D7C5',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#C8A985" bagFold="#AE8D67" bandColor="#43302B" grainColor="#A67C52" badgeText="BROWN RICE" motif="rice" compact={c} />
    ),
  },
  'flattened rice': {
    bgFrom: '#F3F7F2',
    bgTo: '#E1EAE0',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#2D6A4F" bowlRim="#1B4332" pileMain="#F8F5EA" pileLight="#FFFFFF" pileDark="#E6DEC8" style="flakes" tag="POHA" compact={c} />
    ),
  },
  'puffed rice': {
    bgFrom: '#FAF6EE',
    bgTo: '#EDE4D3',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#B45309" bowlRim="#92400E" pileMain="#FFFDF6" pileLight="#FFFFFF" pileDark="#EFE5CE" style="puffs" tag="MURMURA" compact={c} />
    ),
  },
  wheat: {
    bgFrom: '#FEF7E6',
    bgTo: '#F3E3BD',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#D9A84E" bagFold="#BC8C35" bandColor="#5C3D11" grainColor="#C68B2C" badgeText="WHOLE WHEAT" motif="wheat" compact={c} />
    ),
  },
  dalia: {
    bgFrom: '#FAF3E7',
    bgTo: '#EADBC3',
    render: (uid, c) => (
      <GlassJar uid={uid} fillMain="#D9A05B" fillTop="#ECC185" lidColor="#78350F" labelBg="#FFFBEB" labelText="DALIA" accent="#B45309" compact={c} />
    ),
  },
  ragi: {
    bgFrom: '#FAF0EE',
    bgTo: '#ECD8D4',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#D6C4B0" bowlRim="#A89078" pileMain="#7F1D1D" pileLight="#991B1B" pileDark="#450A0A" style="seeds" tag="RAGI" compact={c} />
    ),
  },
  bajra: {
    bgFrom: '#F1F5F3',
    bgTo: '#DEE6E1',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#334155" bowlRim="#1E293B" pileMain="#8B9B82" pileLight="#A3B18A" pileDark="#586952" style="seeds" tag="BAJRA" compact={c} />
    ),
  },
  jowar: {
    bgFrom: '#F8F5EE',
    bgTo: '#EAE2D2',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#78350F" bowlRim="#451A03" pileMain="#E7D8BE" pileLight="#F5ECD9" pileDark="#CBB896" style="grains" tag="JOWAR" compact={c} />
    ),
  },
  quinoa: {
    bgFrom: '#F2F6F5',
    bgTo: '#DFEAE6',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#F3EFE6" bagFold="#DED5C5" bandColor="#115E59" grainColor="#D4A373" badgeText="QUINOA" motif="rice" compact={c} />
    ),
  },

  // ===== 2. FLOUR AND BAKING PRODUCTS (10) =====
  'wheat flour': {
    bgFrom: '#FAF4EA',
    bgTo: '#EBDEC8',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#D2B48C" bagFold="#B8966C" bandColor="#7C2D12" grainColor="#F9F3E6" badgeText="CHAKKI ATTA" motif="flour" compact={c} />
    ),
  },
  'refined flour': {
    bgFrom: '#F4F7F8',
    bgTo: '#E2E9EC',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#FFFFFF" bagFold="#E2E8F0" bandColor="#0F766E" grainColor="#F8FAFC" badgeText="MAIDA" motif="flour" compact={c} />
    ),
  },
  'gram flour': {
    bgFrom: '#FEF8E6',
    bgTo: '#F5E7BC',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#1E3A2F" bowlRim="#0F2922" pileMain="#FBBF24" pileLight="#FDE68A" pileDark="#D97706" style="flour" tag="BESAN" compact={c} />
    ),
  },
  semolina: {
    bgFrom: '#FDF7EC',
    bgTo: '#F0E3CA',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#B45309" bowlRim="#92400E" pileMain="#F6E2B3" pileLight="#FDF3D7" pileDark="#D9BE82" style="flour" tag="SUJI" compact={c} />
    ),
  },
  'rice flour': {
    bgFrom: '#F2F7F4',
    bgTo: '#DFECE4',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#F8FAF8" bagFold="#DFE7E2" bandColor="#15803D" grainColor="#FFFFFF" badgeText="RICE FLOUR" motif="flour" compact={c} />
    ),
  },
  'corn flour': {
    bgFrom: '#FEFBE8',
    bgTo: '#F7EFA8',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#EAB308" topBand="#CA8A04" accent="#FEF08A" title="CORN FLOUR" compact={c} />
    ),
  },
  'ragi flour': {
    bgFrom: '#F9F0EE',
    bgTo: '#EAD5D1',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#881337" bagFold="#6B0F2B" bandColor="#D97706" grainColor="#9F4A4A" badgeText="RAGI FLOUR" motif="flour" compact={c} />
    ),
  },
  'baking powder': {
    bgFrom: '#FEF2F2',
    bgTo: '#F5D6D6',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#DC2626" topBand="#991B1B" accent="#FDE68A" title="BAKING PWDR" compact={c} />
    ),
  },
  'baking soda': {
    bgFrom: '#EFF7F6',
    bgTo: '#D7EAE7',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#0F766E" topBand="#115E59" accent="#F59E0B" title="BAKING SODA" compact={c} />
    ),
  },
  yeast: {
    bgFrom: '#FAF4E8',
    bgTo: '#EADBC0',
    render: (uid, c) => (
      <GlassJar uid={uid} fillMain="#C28E4E" fillTop="#DDB47C" lidColor="#78350F" labelBg="#FFFDF8" labelText="DRY YEAST" accent="#D97706" compact={c} />
    ),
  },

  // ===== 3. PULSES AND LENTILS (12) =====
  'toor dal': {
    bgFrom: '#FEF9E7',
    bgTo: '#F3E7BA',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#92400E" bowlRim="#78350F" pileMain="#F59E0B" pileLight="#FCD34D" pileDark="#D97706" style="split-dal" tag="TOOR DAL" compact={c} />
    ),
  },
  'moong dal': {
    bgFrom: '#FBFCEB',
    bgTo: '#EDF0C2',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#0F766E" bowlRim="#115E59" pileMain="#FACC15" pileLight="#FEF08A" pileDark="#CA8A04" style="split-dal" tag="MOONG DAL" compact={c} />
    ),
  },
  'masoor dal': {
    bgFrom: '#FFF3EE',
    bgTo: '#F7DDD2',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#334155" bowlRim="#1E293B" pileMain="#EA580C" pileLight="#FB923C" pileDark="#C2410C" style="split-dal" tag="MASOOR DAL" compact={c} />
    ),
  },
  'chana dal': {
    bgFrom: '#FEF6E4',
    bgTo: '#F3E1B9',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#7C2D12" bowlRim="#5A1E0A" pileMain="#D97706" pileLight="#F59E0B" pileDark="#B45309" style="split-dal" tag="CHANA DAL" compact={c} />
    ),
  },
  'urad dal': {
    bgFrom: '#F4F4F1',
    bgTo: '#E4E3DC',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#1E293B" bowlRim="#0F172A" pileMain="#F5F5F4" pileLight="#FFFFFF" pileDark="#D6D3D1" style="split-dal" tag="URAD DAL" compact={c} />
    ),
  },
  'kabuli chana': {
    bgFrom: '#FAF5EB',
    bgTo: '#EBE1CE',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#78350F" bowlRim="#451A03" pileMain="#E8D2A6" pileLight="#F7E9CA" pileDark="#C4A874" style="chickpea" tag="KABULI" compact={c} />
    ),
  },
  'kala chana': {
    bgFrom: '#F5EFEA',
    bgTo: '#E4D8CE',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#D6C7B2" bowlRim="#B49F84" pileMain="#5C3A21" pileLight="#7C5335" pileDark="#3B2312" style="chickpea" tag="KALA CHANA" compact={c} />
    ),
  },
  rajma: {
    bgFrom: '#FBF0F0',
    bgTo: '#EED6D6',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#E7E5E4" bowlRim="#A8A29E" pileMain="#7F1D1D" pileLight="#991B1B" pileDark="#450A0A" style="kidney" tag="RAJMA" compact={c} />
    ),
  },
  'green moong': {
    bgFrom: '#EFF7F1',
    bgTo: '#D9EAD8',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#D6C7B2" bowlRim="#A8947A" pileMain="#2E6F40" pileLight="#4D9A5E" pileDark="#1A4726" style="chickpea" tag="GREEN MOONG" compact={c} />
    ),
  },
  'white peas': {
    bgFrom: '#F3F6F8',
    bgTo: '#E0E7EC',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#0F5132" bowlRim="#093621" pileMain="#EAE2C6" pileLight="#FAF5E4" pileDark="#CABF9B" style="chickpea" tag="WHITE PEAS" compact={c} />
    ),
  },
  'black eyed beans': {
    bgFrom: '#F6F4EF',
    bgTo: '#E6E1D5',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#57534E" bowlRim="#44403C" pileMain="#F5EFE0" pileLight="#FFFDF8" pileDark="#292524" style="kidney" tag="LOBIA" compact={c} />
    ),
  },
  'soya chunks': {
    bgFrom: '#FAF5EB',
    bgTo: '#EAE0CD',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#0F766E" bowlRim="#115E59" pileMain="#D4A359" pileLight="#E9C182" pileDark="#A47432" style="chunks" tag="SOYA CHUNKS" compact={c} />
    ),
  },

  // ===== 4. OILS AND GHEE (9) =====
  'mustard oil': {
    bgFrom: '#FEF7E0',
    bgTo: '#F5E4B2',
    render: (uid, c) => (
      <OilBottle uid={uid} liquidColor="#B45309" liquidHighlight="#FCD34D" capColor="#B91C1C" labelBg="#FFFBEB" labelText="MUSTARD OIL" shape="tall" emblemColor="#EAB308" compact={c} />
    ),
  },
  'sunflower oil': {
    bgFrom: '#FEFBE8',
    bgTo: '#F8EEB4',
    render: (uid, c) => (
      <OilBottle uid={uid} liquidColor="#FBBF24" liquidHighlight="#FEF9C3" capColor="#EA580C" labelBg="#FFFFFF" labelText="SUNFLOWER" shape="faceted" emblemColor="#F59E0B" compact={c} />
    ),
  },
  'soybean oil': {
    bgFrom: '#F4F9F0',
    bgTo: '#DFECD5',
    render: (uid, c) => (
      <OilBottle uid={uid} liquidColor="#EAB308" liquidHighlight="#FEF08A" capColor="#15803D" labelBg="#F0FDF4" labelText="SOYBEAN OIL" shape="tall" emblemColor="#16A34A" compact={c} />
    ),
  },
  'rice bran oil': {
    bgFrom: '#F7F5EE',
    bgTo: '#E8E3D3',
    render: (uid, c) => (
      <OilBottle uid={uid} liquidColor="#D97706" liquidHighlight="#FDE68A" capColor="#0F766E" labelBg="#FFFDF8" labelText="RICE BRAN" shape="faceted" emblemColor="#0D9488" compact={c} />
    ),
  },
  'groundnut oil': {
    bgFrom: '#FDF4E7',
    bgTo: '#F0DEC0',
    render: (uid, c) => (
      <OilBottle uid={uid} liquidColor="#C27803" liquidHighlight="#FCD34D" capColor="#78350F" labelBg="#FFFBEB" labelText="GROUNDNUT" shape="wide" emblemColor="#92400E" compact={c} />
    ),
  },
  'coconut oil': {
    bgFrom: '#EEF8F7',
    bgTo: '#D5EBE8',
    render: (uid, c) => (
      <OilBottle uid={uid} liquidColor="#0D9488" liquidHighlight="#99F6E4" capColor="#0F2922" labelBg="#FFFFFF" labelText="COCONUT OIL" shape="wide" emblemColor="#0F766E" compact={c} />
    ),
  },
  'sesame oil': {
    bgFrom: '#F7EFE7',
    bgTo: '#E7D6C5',
    render: (uid, c) => (
      <OilBottle uid={uid} liquidColor="#7C2D12" liquidHighlight="#FDBA74" capColor="#451A03" labelBg="#FFF7ED" labelText="SESAME OIL" shape="tall" emblemColor="#9A3412" compact={c} />
    ),
  },
  'cow ghee': {
    bgFrom: '#FEF8E3',
    bgTo: '#F5E7B8',
    render: (uid, c) => (
      <GlassJar uid={uid} fillMain="#F59E0B" fillTop="#FDE047" lidColor="#B45309" labelBg="#FFFBEB" labelText="COW GHEE" accent="#0F766E" compact={c} />
    ),
  },
  'buffalo ghee': {
    bgFrom: '#FAF8F2',
    bgTo: '#ECE6D6',
    render: (uid, c) => (
      <GlassJar uid={uid} fillMain="#F3E8C8" fillTop="#FFFDF5" lidColor="#475569" labelBg="#FFFFFF" labelText="BUFFALO GHEE" accent="#1E293B" compact={c} />
    ),
  },

  // ===== 5. SPICES AND MASALAS (20) =====
  'turmeric powder': {
    bgFrom: '#FEF7DF',
    bgTo: '#F7E3A1',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#44403C" bowlRim="#292524" pileMain="#EAB308" pileLight="#FACC15" pileDark="#CA8A04" style="powder" tag="HALDI" compact={c} />
    ),
  },
  'red chilli powder': {
    bgFrom: '#FEF0EE',
    bgTo: '#F6D1CC',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#292524" bowlRim="#1C1917" pileMain="#DC2626" pileLight="#EF4444" pileDark="#991B1B" style="powder" tag="MIRCHI" compact={c} />
    ),
  },
  'coriander powder': {
    bgFrom: '#F5F6EC',
    bgTo: '#E3E6CE',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#78350F" bowlRim="#451A03" pileMain="#A39E60" pileLight="#C2BD7E" pileDark="#7B7641" style="powder" tag="DHANIA" compact={c} />
    ),
  },
  'cumin powder': {
    bgFrom: '#F7F1EA',
    bgTo: '#E8D9C8',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#D6D3D1" bowlRim="#A8A29E" pileMain="#926239" pileLight="#B07D52" pileDark="#694322" style="powder" tag="JEERA PWDR" compact={c} />
    ),
  },
  'black pepper': {
    bgFrom: '#F4F4F2',
    bgTo: '#E1E0DB',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#B45309" bowlRim="#78350F" pileMain="#292524" pileLight="#57534E" pileDark="#0C0A09" style="seeds" tag="KALI MIRCH" compact={c} />
    ),
  },
  'garam masala': {
    bgFrom: '#F1F6F3',
    bgTo: '#DBE7DF',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#14532D" topBand="#052E16" accent="#F59E0B" title="GARAM MASALA" compact={c} />
    ),
  },
  'chicken masala': {
    bgFrom: '#FEF1EE',
    bgTo: '#F5D5CE',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#B91C1C" topBand="#7F1D1D" accent="#FBBF24" title="CHICKEN MSL" compact={c} />
    ),
  },
  'fish masala': {
    bgFrom: '#EFF7F6',
    bgTo: '#D7EAE8',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#0F766E" topBand="#134E4A" accent="#F97316" title="FISH MASALA" compact={c} />
    ),
  },
  'biryani masala': {
    bgFrom: '#FAF1EC',
    bgTo: '#ECD8CE',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#881337" topBand="#4C0519" accent="#FACC15" title="BIRYANI MSL" compact={c} />
    ),
  },
  'chaat masala': {
    bgFrom: '#F6F8EC',
    bgTo: '#E4EAD0',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#CA8A04" topBand="#854D0E" accent="#16A34A" title="CHAAT MASALA" compact={c} />
    ),
  },
  'cumin seeds': {
    bgFrom: '#F7F2EA',
    bgTo: '#E8DDD0',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#44403C" bowlRim="#292524" pileMain="#785233" pileLight="#9C6F49" pileDark="#52341C" style="long-rice" tag="JEERA" compact={c} />
    ),
  },
  'mustard seeds': {
    bgFrom: '#F7F3EE',
    bgTo: '#E7DFD3',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#E7E5E4" bowlRim="#A8A29E" pileMain="#451A03" pileLight="#78350F" pileDark="#1C1917" style="seeds" tag="RAI" compact={c} />
    ),
  },
  'fenugreek seeds': {
    bgFrom: '#FEF6E4',
    bgTo: '#F1DFBA',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#57534E" bowlRim="#292524" pileMain="#C2812B" pileLight="#DDA04A" pileDark="#8A5612" style="seeds" tag="METHI" compact={c} />
    ),
  },
  'fennel seeds': {
    bgFrom: '#EFF8F1',
    bgTo: '#D7ECD9',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#FFFDF8" bowlRim="#D6D3D1" pileMain="#65A30D" pileLight="#84CC16" pileDark="#3F6212" style="long-rice" tag="SAUNF" compact={c} />
    ),
  },
  cardamom: {
    bgFrom: '#EFF7F2',
    bgTo: '#D9EAE0',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={72} ry={13} />
        <ellipse cx="160" cy="150" rx="70" ry="28" fill="#E7E5E4" />
        <ellipse cx="160" cy="146" rx="64" ry="22" fill="#F5F5F4" />
        {[
          [125, 136, -20], [156, 126, 12], [188, 138, -14], [140, 152, 24], [174, 150, -8],
        ].map(([x, y, r], i) => (
          <g key={i} transform={`rotate(${r} ${x} ${y})`}>
            <ellipse cx={x} cy={y} rx="18" ry="10" fill={i % 2 === 0 ? '#65A30D' : '#84CC16'} stroke="#3F6212" strokeWidth="1.5" />
            <line x1={x - 14} y1={y} x2={x + 14} y2={y} stroke="#BEF264" strokeWidth="1.2" />
          </g>
        ))}
      </g>
    ),
  },
  cloves: {
    bgFrom: '#F7EFEA',
    bgTo: '#E8D8CE',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={68} ry={12} />
        <ellipse cx="160" cy="152" rx="66" ry="26" fill="#E7E5E4" />
        {[
          [124, 140, -35], [150, 128, 15], [178, 134, -20], [192, 152, 42], [142, 156, 70], [168, 154, -55],
        ].map(([x, y, r], i) => (
          <g key={i} transform={`rotate(${r} ${x} ${y})`}>
            <rect x={x - 3} y={y - 12} width="6" height="24" rx="2.5" fill="#451A03" />
            <circle cx={x} cy={y - 13} r="5.5" fill="#78350F" />
          </g>
        ))}
      </g>
    ),
  },
  cinnamon: {
    bgFrom: '#FAF1EA',
    bgTo: '#EAD7C8',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={76} ry={13} />
        {[
          [94, 118, -12, '#9A3412'],
          [92, 138, 4, '#B45309'],
          [98, 156, -4, '#7C2D12'],
        ].map(([x, y, rot, col], i) => (
          <g key={i} transform={`rotate(${rot as number} 160 ${y as number})`}>
            <rect x={x as number} y={(y as number) - 10} width="128" height="20" rx="10" fill={col as string} />
            <circle cx={(x as number) + 122} cy={y as number} r="8" fill="#451A03" />
            <circle cx={(x as number) + 122} cy={y as number} r="4" fill="#D97706" />
          </g>
        ))}
        {/* Twine */}
        <rect x="152" y="102" width="14" height="68" rx="4" fill="#D6C7B2" stroke="#A89078" strokeWidth="1.5" />
      </g>
    ),
  },
  'bay leaves': {
    bgFrom: '#F2F6EE',
    bgTo: '#E0E8D6',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={74} ry={13} />
        {[
          [130, 126, -28, '#6B7F4E'],
          [174, 124, 22, '#7D925B'],
          [156, 148, -6, '#55693B'],
        ].map(([x, y, r, col], i) => (
          <g key={i} transform={`rotate(${r as number} ${x as number} ${y as number})`}>
            <path d={`M ${(x as number) - 44} ${y as number} Q ${x as number} ${(y as number) - 34} ${(x as number) + 46} ${y as number} Q ${x as number} ${(y as number) + 34} ${(x as number) - 44} ${y as number} Z`} fill={col as string} />
            <line x1={(x as number) - 42} y1={y as number} x2={(x as number) + 42} y2={y as number} stroke="#A3B18A" strokeWidth="1.6" />
          </g>
        ))}
      </g>
    ),
  },
  asafoetida: {
    bgFrom: '#FEF6E4',
    bgTo: '#F2E0BA',
    render: (uid, c) => (
      <GlassJar uid={uid} fillMain="#D97706" fillTop="#FBBF24" lidColor="#B91C1C" labelBg="#FEF9C3" labelText="HING" accent="#991B1B" compact={c} />
    ),
  },
  'dry red chillies': {
    bgFrom: '#FEF0EE',
    bgTo: '#F5D4CE',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={74} ry={13} />
        {[
          [110, 118, 22, '#991B1B'],
          [148, 108, -14, '#B91C1C'],
          [134, 148, 10, '#DC2626'],
          [172, 138, -28, '#7F1D1D'],
        ].map(([x, y, r, col], i) => (
          <g key={i} transform={`rotate(${r as number} ${x as number} ${y as number})`}>
            <path d={`M ${x as number} ${y as number} Q ${(x as number) + 42} ${(y as number) - 18} ${(x as number) + 74} ${(y as number) + 12} Q ${(x as number) + 32} ${(y as number) + 18} ${x as number} ${y as number} Z`} fill={col as string} />
            <path d={`M ${(x as number) - 10} ${(y as number) - 4} L ${x as number} ${y as number}`} stroke="#3F6212" strokeWidth="3" strokeLinecap="round" />
          </g>
        ))}
      </g>
    ),
  },

  // ===== 6. SALT AND SWEETENERS (8) =====
  'iodised salt': {
    bgFrom: '#EFF7F8',
    bgTo: '#D9EAEE',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#FFFFFF" bagFold="#E2E8F0" bandColor="#0284C7" grainColor="#F8FAFC" badgeText="IODISED SALT" motif="baking" compact={c} />
    ),
  },
  'rock salt': {
    bgFrom: '#FDF1F3',
    bgTo: '#F3D9DE',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={70} ry={12} />
        <polygon points="106,174 128,118 164,132 152,180" fill="#FDA4AF" stroke="#FFE4E6" strokeWidth="1.5" />
        <polygon points="148,176 168,94 206,120 198,178" fill="#FB7185" stroke="#FFE4E6" strokeWidth="1.5" />
        <polygon points="178,182 204,132 228,162 210,188" fill="#FECDD3" stroke="#FFF1F2" strokeWidth="1.5" />
      </g>
    ),
  },
  'black salt': {
    bgFrom: '#F4F1F5',
    bgTo: '#E1DAE4',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={70} ry={12} />
        <polygon points="104,174 126,118 164,132 152,180" fill="#581C87" stroke="#A855F7" strokeWidth="1.2" />
        <polygon points="148,176 168,96 206,122 198,178" fill="#3B0764" stroke="#9333EA" strokeWidth="1.2" />
        <polygon points="178,182 204,134 226,162 208,188" fill="#7E22CE" stroke="#C084FC" strokeWidth="1.2" />
      </g>
    ),
  },
  sugar: {
    bgFrom: '#F3F7FA',
    bgTo: '#E1EBF2',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#0F766E" bowlRim="#115E59" pileMain="#F8FAFC" pileLight="#FFFFFF" pileDark="#CBD5E1" style="flour" tag="SUGAR" compact={c} />
    ),
  },
  'brown sugar': {
    bgFrom: '#F8F0E8',
    bgTo: '#E7D5C3',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#F5F5F4" bowlRim="#D6D3D1" pileMain="#92400E" pileLight="#B45309" pileDark="#78350F" style="flour" tag="BROWN SUGAR" compact={c} />
    ),
  },
  jaggery: {
    bgFrom: '#FDF3E4',
    bgTo: '#EFE0C2',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={198} rx={76} ry={13} />
        {/* Two stacked golden kolhapuri gur blocks */}
        <path d="M 96 144 Q 100 124 148 124 Q 196 124 200 144 L 200 184 Q 148 192 96 184 Z" fill="#B45309" />
        <ellipse cx="148" cy="144" rx="52" ry="12" fill="#D97706" />
        <path d="M 134 106 Q 138 90 178 90 Q 218 90 222 106 L 222 146 Q 178 154 134 146 Z" fill="#92400E" />
        <ellipse cx="178" cy="106" rx="44" ry="10" fill="#F59E0B" />
      </g>
    ),
  },
  mishri: {
    bgFrom: '#F2F8FB',
    bgTo: '#DDEBF2',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={70} ry={12} />
        <polygon points="108,168 124,118 156,126 150,174" fill="#E0F2FE" stroke="#FFFFFF" strokeWidth="2" />
        <polygon points="148,172 164,98 202,118 194,174" fill="#BAE6FD" stroke="#FFFFFF" strokeWidth="2" />
        <polygon points="184,176 206,134 226,156 212,182" fill="#F0F9FF" stroke="#FFFFFF" strokeWidth="2" />
      </g>
    ),
  },
  honey: {
    bgFrom: '#FEF7E0',
    bgTo: '#F5E4AE',
    render: (uid, c) => (
      <g>
        <GlassJar uid={uid} fillMain="#D97706" fillTop="#FBBF24" lidColor="#78350F" labelBg="#FFFBEB" labelText="PURE HONEY" accent="#B45309" compact={c} />
        {/* Wooden dipper stick */}
        <line x1="210" y1="68" x2="246" y2="122" stroke="#92400E" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="206" cy="64" rx="11" ry="8" fill="#B45309" />
      </g>
    ),
  },

  // ===== 7. DAIRY PRODUCTS (7) =====
  milk: {
    bgFrom: '#EFF7FA',
    bgTo: '#DCEAF2',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={204} rx={52} ry={11} />
        <rect x="138" y="34" width="44" height="16" rx="4" fill="#0F766E" />
        <path d="M 142 50 L 122 92 L 122 188 Q 122 200 134 200 L 186 200 Q 198 200 198 188 L 198 92 L 178 50 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="122" y="122" width="76" height="40" fill="#0F766E" />
        {!c && (
          <text x="160" y="147" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">FRESH MILK</text>
        )}
      </g>
    ),
  },
  curd: {
    bgFrom: '#FAF4EC',
    bgTo: '#EDE0CE',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#B45309" bowlRim="#92400E" pileMain="#FFFFFF" pileLight="#F8FAFC" pileDark="#E2E8F0" style="flour" tag="DAHI" compact={c} />
    ),
  },
  paneer: {
    bgFrom: '#F1F5F3',
    bgTo: '#DFE7E2',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={198} rx={82} ry={12} />
        {/* Dark slate platter */}
        <ellipse cx="160" cy="178" rx="82" ry="18" fill="#334155" />
        {/* Crisp white paneer cubes */}
        <rect x="108" y="130" width="44" height="40" rx="5" fill="#FFFDF8" stroke="#E2E8F0" strokeWidth="1.5" />
        <rect x="156" y="132" width="44" height="38" rx="5" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
        <rect x="132" y="96" width="46" height="40" rx="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        {/* Mint sprig */}
        <ellipse cx="192" cy="112" rx="10" ry="6" transform="rotate(-25 192 112)" fill="#16A34A" />
      </g>
    ),
  },
  butter: {
    bgFrom: '#FEF9E3',
    bgTo: '#F5EAB9',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={78} ry={13} />
        <polygon points="88,162 232,162 216,184 76,184" fill="#F5F5F4" stroke="#D6D3D1" strokeWidth="1.5" />
        <polygon points="104,116 206,116 218,132 116,132" fill="#FDE047" />
        <rect x="104" y="132" width="102" height="42" rx="3" fill="#FACC15" />
        <polygon points="206,116 218,132 218,174 206,174" fill="#EAB308" />
      </g>
    ),
  },
  cheese: {
    bgFrom: '#FEF6DA',
    bgTo: '#F7E3A0',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={76} ry={12} />
        {/* Cheese wedge */}
        <polygon points="94,142 222,102 222,134 94,174" fill="#FBBF24" />
        <polygon points="94,142 162,74 222,102" fill="#FDE047" />
        <polygon points="94,142 222,134 222,174 94,174" fill="#F59E0B" />
        <circle cx="144" cy="152" r="8" fill="#D97706" />
        <circle cx="182" cy="138" r="10" fill="#D97706" />
        <circle cx="204" cy="158" r="6" fill="#D97706" />
      </g>
    ),
  },
  'fresh cream': {
    bgFrom: '#F5F7FA',
    bgTo: '#E3E9F0',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#2563EB" topBand="#1D4ED8" accent="#FFFFFF" title="FRESH CREAM" compact={c} />
    ),
  },
  buttermilk: {
    bgFrom: '#F3F8F4',
    bgTo: '#DFECE1',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={202} rx={48} ry={11} />
        <polygon points="122,68 198,68 186,196 134,196" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2.5" />
        <polygon points="125,92 195,92 185,192 135,192" fill="#F8FAFC" />
        <ellipse cx="160" cy="92" rx="35" ry="7" fill="#E2E8F0" />
        {/* Mint leaf & jeera flecks */}
        <ellipse cx="160" cy="86" rx="11" ry="5.5" transform="rotate(-18 160 86)" fill="#16A34A" />
        <circle cx="148" cy="91" r="1.5" fill="#78350F" />
        <circle cx="170" cy="93" r="1.5" fill="#78350F" />
      </g>
    ),
  },

  // ===== 8. SNACKS AND PACKAGED FOODS (13) =====
  'potato chips': {
    bgFrom: '#FEF2EE',
    bgTo: '#F6D6CC',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#DC2626" bagFold="#991B1B" bandColor="#FACC15" grainColor="#FDE047" badgeText="CHIPS" motif="spice" compact={c} />
    ),
  },
  bhujia: {
    bgFrom: '#FEF5E6',
    bgTo: '#F5DFBA',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#991B1B" bowlRim="#7F1D1D" pileMain="#F59E0B" pileLight="#FBBF24" pileDark="#D97706" style="sev" tag="BHUJIA" compact={c} />
    ),
  },
  mixture: {
    bgFrom: '#F3F8F1',
    bgTo: '#DFEAD8',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#0F766E" bowlRim="#115E59" pileMain="#D97706" pileLight="#FBBF24" pileDark="#92400E" style="mixture" tag="MIXTURE" compact={c} />
    ),
  },
  peanuts: {
    bgFrom: '#FAF2E6',
    bgTo: '#EAD9C0',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#78350F" bowlRim="#451A03" pileMain="#C2814B" pileLight="#DDA06B" pileDark="#925627" style="chickpea" tag="PEANUTS" compact={c} />
    ),
  },
  popcorn: {
    bgFrom: '#FEF3F2',
    bgTo: '#F7D9D6',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#DC2626" bowlRim="#FFFFFF" pileMain="#FEF9C3" pileLight="#FFFFFF" pileDark="#FDE047" style="puffs" tag="POPCORN" compact={c} />
    ),
  },
  biscuits: {
    bgFrom: '#FEF7E8',
    bgTo: '#F3E2BE',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={72} ry={13} />
        <ellipse cx="144" cy="166" rx="44" ry="20" fill="#D97706" />
        <ellipse cx="144" cy="152" rx="44" ry="20" fill="#F59E0B" />
        <ellipse cx="176" cy="138" rx="44" ry="20" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
        <circle cx="164" cy="136" r="2" fill="#92400E" />
        <circle cx="178" cy="132" r="2" fill="#92400E" />
        <circle cx="190" cy="140" r="2" fill="#92400E" />
      </g>
    ),
  },
  cookies: {
    bgFrom: '#FAF2E8',
    bgTo: '#EADBC8',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={72} ry={13} />
        <circle cx="136" cy="148" r="38" fill="#B45309" />
        <circle cx="176" cy="126" r="38" fill="#D97706" stroke="#92400E" strokeWidth="1.5" />
        <circle cx="164" cy="116" r="5" fill="#451A03" />
        <circle cx="188" cy="122" r="4.5" fill="#451A03" />
        <circle cx="172" cy="138" r="5.5" fill="#451A03" />
        <circle cx="128" cy="154" r="5" fill="#451A03" />
      </g>
    ),
  },
  rusk: {
    bgFrom: '#FDF5E6',
    bgTo: '#EFE0C2',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={74} ry={13} />
        <rect x="96" y="106" width="66" height="82" rx="14" transform="rotate(-12 129 147)" fill="#D97706" stroke="#92400E" strokeWidth="2" />
        <rect x="148" y="96" width="66" height="82" rx="14" transform="rotate(8 181 137)" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
        <rect x="158" y="106" width="46" height="62" rx="10" transform="rotate(8 181 137)" fill="#FDE68A" opacity="0.5" />
      </g>
    ),
  },
  'instant noodles': {
    bgFrom: '#FEF6E4',
    bgTo: '#F6E0B3',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#F59E0B" bagFold="#D97706" bandColor="#B91C1C" grainColor="#FEF08A" badgeText="NOODLES" motif="wheat" compact={c} />
    ),
  },
  pasta: {
    bgFrom: '#F1F7F5',
    bgTo: '#DCEAE5',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#0F766E" topBand="#115E59" accent="#FBBF24" title="PENNE PASTA" compact={c} />
    ),
  },
  vermicelli: {
    bgFrom: '#FAF5EC',
    bgTo: '#ECE0CA',
    render: (uid, c) => (
      <IngredientBowl uid={uid} bowlFill="#44403C" bowlRim="#292524" pileMain="#E5B96F" pileLight="#F6D59B" pileDark="#B8893E" style="sev" tag="SEVIYAN" compact={c} />
    ),
  },
  papad: {
    bgFrom: '#FAF6EB',
    bgTo: '#ECE3C8',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={74} ry={13} />
        <circle cx="148" cy="136" r="56" fill="#FDE68A" stroke="#D97706" strokeWidth="2" />
        <circle cx="172" cy="126" r="56" fill="#FEF3C7" stroke="#EAB308" strokeWidth="2" />
        <circle cx="152" cy="112" r="2" fill="#451A03" />
        <circle cx="182" cy="120" r="2.2" fill="#451A03" />
        <circle cx="166" cy="142" r="1.8" fill="#451A03" />
        <circle cx="194" cy="144" r="2" fill="#451A03" />
      </g>
    ),
  },
  pickle: {
    bgFrom: '#FEF1EB',
    bgTo: '#F5D6C8',
    render: (uid, c) => (
      <GlassJar uid={uid} fillMain="#B91C1C" fillTop="#EA580C" lidColor="#1E293B" labelBg="#FEF9C3" labelText="ACHAR" accent="#991B1B" compact={c} />
    ),
  },

  // ===== 9. BEVERAGES (7) =====
  tea: {
    bgFrom: '#EFF6F2',
    bgTo: '#D8E8DF',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#065F46" topBand="#064E3B" accent="#F59E0B" title="ASSAM TEA" compact={c} />
    ),
  },
  'green tea': {
    bgFrom: '#F0F9F2',
    bgTo: '#D7EEDB',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#16A34A" topBand="#15803D" accent="#BEF264" title="GREEN TEA" compact={c} />
    ),
  },
  coffee: {
    bgFrom: '#F6EFEA',
    bgTo: '#E6D8CE',
    render: (uid, c) => (
      <GlassJar uid={uid} fillMain="#451A03" fillTop="#78350F" lidColor="#1C1917" labelBg="#FEF3C7" labelText="COFFEE" accent="#78350F" compact={c} />
    ),
  },
  'drinking chocolate': {
    bgFrom: '#F7EFEF',
    bgTo: '#E8D5D5',
    render: (uid, c) => (
      <GlassJar uid={uid} fillMain="#6D2818" fillTop="#9A3412" lidColor="#7C2D12" labelBg="#FFFBEB" labelText="CHOCOLATE" accent="#B45309" compact={c} />
    ),
  },
  'soft drinks': {
    bgFrom: '#EFF7F6',
    bgTo: '#D6EBE8',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#0F766E" capType="flip" capColor="#DC2626" labelBg="#FFFBEB" labelAccent="#DC2626" title="SPARKLING" compact={c} />
    ),
  },
  'fruit juice': {
    bgFrom: '#FEF6E4',
    bgTo: '#F6E1B4',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#EA580C" topBand="#C2410C" accent="#FACC15" title="MANGO JUICE" compact={c} />
    ),
  },
  'coconut water': {
    bgFrom: '#EEF8F2',
    bgTo: '#D6ECD9',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={200} rx={60} ry={12} />
        <ellipse cx="160" cy="140" rx="52" ry="56" fill="#16A34A" />
        <ellipse cx="160" cy="96" rx="34" ry="12" fill="#ECFDF5" stroke="#15803D" strokeWidth="3" />
        <path d="M 164 96 L 184 44 L 204 40" fill="none" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },

  // ===== 10. PERSONAL CARE PRODUCTS (10) =====
  'bathing soap': {
    bgFrom: '#FEF5EE',
    bgTo: '#F3DFD0',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={72} ry={13} />
        <rect x="96" y="114" width="128" height="66" rx="28" fill="#E9C496" stroke="#C28E58" strokeWidth="2" />
        <rect x="114" y="128" width="92" height="36" rx="16" fill="#F5DFC0" />
        {/* Soap bubbles */}
        <circle cx="218" cy="96" r="12" fill="#FFFFFF" fillOpacity="0.85" stroke="#CBD5E1" />
        <circle cx="234" cy="116" r="7" fill="#FFFFFF" fillOpacity="0.85" stroke="#CBD5E1" />
        <circle cx="96" cy="108" r="9" fill="#FFFFFF" fillOpacity="0.85" stroke="#CBD5E1" />
      </g>
    ),
  },
  shampoo: {
    bgFrom: '#EFF7F6',
    bgTo: '#D7EAE8',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#0F766E" capType="pump" capColor="#1C1917" labelBg="#FFFFFF" labelAccent="#F59E0B" title="SHAMPOO" compact={c} />
    ),
  },
  conditioner: {
    bgFrom: '#F7F5EE',
    bgTo: '#E8E3D5',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#F5F5F4" capType="flip" capColor="#0F766E" labelBg="#FFFFFF" labelAccent="#16A34A" title="CONDITIONER" compact={c} />
    ),
  },
  toothpaste: {
    bgFrom: '#EFF8F8',
    bgTo: '#D7ECEC',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={182} rx={84} ry={12} />
        <polygon points="78,108 214,122 214,158 78,172" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
        <polygon points="78,108 214,122 214,136 78,130" fill="#0D9488" />
        <rect x="214" y="126" width="22" height="28" rx="4" fill="#DC2626" />
        {!c && <text x="144" y="153" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#0F2922">HERBAL PASTE</text>}
      </g>
    ),
  },
  toothbrush: {
    bgFrom: '#F1F7F5',
    bgTo: '#DCEAE4',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={186} rx={86} ry={11} />
        <rect x="74" y="136" width="172" height="12" rx="6" transform="rotate(-14 160 142)" fill="#0F766E" />
        <rect x="192" y="102" width="40" height="16" rx="4" transform="rotate(-14 212 110)" fill="#FFFFFF" stroke="#CBD5E1" />
        <rect x="76" y="152" width="168" height="11" rx="5.5" transform="rotate(8 160 158)" fill="#F59E0B" />
        <rect x="198" y="140" width="38" height="15" rx="4" transform="rotate(8 217 148)" fill="#FFFFFF" stroke="#CBD5E1" />
      </g>
    ),
  },
  'hair oil': {
    bgFrom: '#EFF7F0',
    bgTo: '#D8EAD9',
    render: (uid, c) => (
      <OilBottle uid={uid} liquidColor="#15803D" liquidHighlight="#86EFAC" capColor="#052E16" labelBg="#F0FDF4" labelText="HERBAL OIL" shape="tall" emblemColor="#22C55E" compact={c} />
    ),
  },
  'face wash': {
    bgFrom: '#FEF3F2',
    bgTo: '#F6DCD9',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#FB7185" capType="flip" capColor="#FFFFFF" labelBg="#FFF1F2" labelAccent="#E11D48" title="FACE WASH" compact={c} />
    ),
  },
  handwash: {
    bgFrom: '#FEF7E8',
    bgTo: '#F4E3BE',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#F59E0B" capType="pump" capColor="#FFFFFF" labelBg="#FFFBEB" labelAccent="#0F766E" title="HANDWASH" compact={c} />
    ),
  },
  'sanitary pads': {
    bgFrom: '#FAF1F7',
    bgTo: '#ECD9E6',
    render: (uid, c) => (
      <SpiceBox uid={uid} boxColor="#DB2777" topBand="#9D174D" accent="#FBCFE8" title="CARE PACK" compact={c} />
    ),
  },
  'toilet paper': {
    bgFrom: '#F5F6F7',
    bgTo: '#E3E6E8',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={200} rx={76} ry={13} />
        <rect x="92" y="114" width="76" height="74" rx="10" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
        <ellipse cx="130" cy="114" rx="38" ry="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
        <ellipse cx="130" cy="114" rx="12" ry="4" fill="#94A3B8" />
        <rect x="156" y="92" width="76" height="86" rx="10" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
        <ellipse cx="194" cy="92" rx="38" ry="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
        <ellipse cx="194" cy="92" rx="12" ry="4" fill="#94A3B8" />
      </g>
    ),
  },

  // ===== 11. HOUSEHOLD CLEANING PRODUCTS (10) =====
  'detergent powder': {
    bgFrom: '#EFF7F8',
    bgTo: '#D7EAEF',
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#0284C7" bagFold="#0369A1" bandColor="#FACC15" grainColor="#FFFFFF" badgeText="DETERGENT" motif="baking" compact={c} />
    ),
  },
  'detergent bar': {
    bgFrom: '#EEF6FA',
    bgTo: '#D6E8F2',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={192} rx={76} ry={13} />
        <rect x="92" y="118" width="136" height="62" rx="10" fill="#0284C7" />
        <path d="M 92 142 Q 160 124 228 142 L 228 158 Q 160 140 92 158 Z" fill="#38BDF8" />
      </g>
    ),
  },
  'fabric softener': {
    bgFrom: '#F6F2FA',
    bgTo: '#E6DCF0',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#9333EA" capType="flip" capColor="#F3E8FF" labelBg="#FFFFFF" labelAccent="#A855F7" title="SOFTENER" compact={c} />
    ),
  },
  'dishwash bar': {
    bgFrom: '#F1F9EC',
    bgTo: '#DCEFD2',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={192} rx={72} ry={13} />
        <ellipse cx="160" cy="148" rx="66" ry="38" fill="#16A34A" />
        <ellipse cx="160" cy="136" rx="66" ry="32" fill="#84CC16" />
        <circle cx="160" cy="136" r="14" fill="#FEF08A" />
      </g>
    ),
  },
  'dishwash liquid': {
    bgFrom: '#F3FAEC',
    bgTo: '#DDF0CE',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#84CC16" capType="squeeze" capColor="#15803D" labelBg="#FFFFFF" labelAccent="#EAB308" title="DISHWASH GEL" compact={c} />
    ),
  },
  'floor cleaner': {
    bgFrom: '#EEF7F2',
    bgTo: '#D7EAE0',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#15803D" capType="flip" capColor="#FACC15" labelBg="#FFFBEB" labelAccent="#16A34A" title="FLOOR CLEAN" compact={c} />
    ),
  },
  'toilet cleaner': {
    bgFrom: '#EEF4FA',
    bgTo: '#D6E4F2',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#1D4ED8" capType="angled" capColor="#DC2626" labelBg="#FFFFFF" labelAccent="#2563EB" title="BOWL CLEAN" compact={c} />
    ),
  },
  'glass cleaner': {
    bgFrom: '#EEF8FA',
    bgTo: '#D5ECF2',
    render: (uid, c) => (
      <CareBottle uid={uid} bottleColor="#38BDF8" capType="spray" capColor="#FFFFFF" labelBg="#FFFFFF" labelAccent="#0284C7" title="GLASS SPRAY" compact={c} />
    ),
  },
  'garbage bags': {
    bgFrom: '#F2F3F4',
    bgTo: '#DFE1E4',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={72} ry={13} />
        <rect x="92" y="108" width="136" height="68" rx="34" fill="#1F2937" />
        <ellipse cx="212" cy="142" rx="16" ry="34" fill="#374151" />
        <ellipse cx="212" cy="142" rx="6" ry="12" fill="#111827" />
        <rect x="132" y="108" width="44" height="68" fill="#0F766E" />
      </g>
    ),
  },
  'scrub pads': {
    bgFrom: '#F5F8ED',
    bgTo: '#E1EAD0',
    render: (uid, c) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={74} ry={13} />
        <rect x="96" y="104" width="128" height="44" rx="12" fill="#FACC15" />
        <rect x="96" y="144" width="128" height="30" rx="8" fill="#15803D" />
        <circle cx="122" cy="122" r="3" fill="#CA8A04" />
        <circle cx="152" cy="118" r="4" fill="#CA8A04" />
        <circle cx="186" cy="126" r="3" fill="#CA8A04" />
      </g>
    ),
  },

  // ===== 12. VEGETABLES (16) =====
  potato: {
    bgFrom: '#FAF3E7',
    bgTo: '#EBE0CC',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={78} ry={13} />
        <ellipse cx="136" cy="150" rx="54" ry="38" transform="rotate(-12 136 150)" fill="#C69C6D" />
        <ellipse cx="188" cy="136" rx="48" ry="36" transform="rotate(14 188 136)" fill="#D9B382" />
        <circle cx="120" cy="142" r="2.5" fill="#8C6239" />
        <circle cx="150" cy="160" r="2" fill="#8C6239" />
        <circle cx="188" cy="124" r="2.5" fill="#8C6239" />
        <circle cx="204" cy="148" r="2" fill="#8C6239" />
      </g>
    ),
  },
  onion: {
    bgFrom: '#FBF0F4',
    bgTo: '#EED6E0',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={198} rx={72} ry={13} />
        {/* Stem tuft */}
        <path d="M 154 78 L 160 54 L 166 78 Z" fill="#A16207" />
        <ellipse cx="160" cy="136" rx="56" ry="52" fill="#9D174D" />
        <path d="M 122 104 Q 140 136 124 176" fill="none" stroke="#F472B6" strokeWidth="2.5" opacity="0.5" />
        <path d="M 160 88 Q 166 136 160 186" fill="none" stroke="#FBCFE8" strokeWidth="2" opacity="0.45" />
        <path d="M 196 104 Q 180 136 196 174" fill="none" stroke="#831843" strokeWidth="2.5" opacity="0.5" />
      </g>
    ),
  },
  tomato: {
    bgFrom: '#FEF0EE',
    bgTo: '#F7D4CF',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={72} ry={13} />
        <circle cx="160" cy="136" r="56" fill="#DC2626" />
        <ellipse cx="138" cy="114" rx="14" ry="8" transform="rotate(-30 138 114)" fill="#FCA5A5" opacity="0.55" />
        {/* Green Calyx */}
        <path d="M 160 84 L 140 72 L 154 88 L 132 96 L 158 92 L 170 106 L 166 90 L 188 86 L 166 84 L 172 68 Z" fill="#15803D" />
      </g>
    ),
  },
  garlic: {
    bgFrom: '#F7F4F1',
    bgTo: '#E8E3DC',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={68} ry={13} />
        <path d="M 152 72 L 160 48 L 168 72 C 204 82 214 140 202 168 C 192 186 128 186 118 168 C 106 140 116 82 152 72 Z" fill="#F5F5F4" stroke="#D6D3D1" strokeWidth="2" />
        <path d="M 160 72 Q 146 132 146 180" fill="none" stroke="#D6D3D1" strokeWidth="2" />
        <path d="M 160 72 Q 174 132 174 180" fill="none" stroke="#D6D3D1" strokeWidth="2" />
      </g>
    ),
  },
  ginger: {
    bgFrom: '#FAF3E6',
    bgTo: '#EBDFC6',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={192} rx={78} ry={12} />
        <path d="M 96 146 C 92 122 120 114 138 124 C 146 96 178 96 180 124 C 204 114 232 132 222 158 C 214 176 182 174 166 164 C 146 178 104 174 96 146 Z" fill="#D4A36A" stroke="#A4743E" strokeWidth="2" />
        <path d="M 122 142 Q 134 138 142 146" fill="none" stroke="#8C5E2A" strokeWidth="2" />
        <path d="M 176 142 Q 190 136 202 146" fill="none" stroke="#8C5E2A" strokeWidth="2" />
      </g>
    ),
  },
  'green chilli': {
    bgFrom: '#EFF8EE',
    bgTo: '#D6ECD4',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={76} ry={12} />
        <g transform="rotate(-18 160 130)">
          <path d="M 96 122 Q 158 96 226 132 Q 160 138 96 122 Z" fill="#16A34A" />
          <path d="M 84 118 L 98 122" stroke="#14532D" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g transform="rotate(14 160 154)">
          <path d="M 98 148 Q 162 124 226 158 Q 158 164 98 148 Z" fill="#22C55E" />
          <path d="M 86 144 L 100 148" stroke="#14532D" strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>
    ),
  },
  brinjal: {
    bgFrom: '#F5F0F9',
    bgTo: '#E4D8EE',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={198} rx={68} ry={12} />
        <path d="M 148 70 C 122 92 110 156 132 178 C 154 198 194 188 202 156 C 210 122 184 82 164 70 Z" fill="#581C87" />
        <ellipse cx="144" cy="134" rx="10" ry="28" transform="rotate(-12 144 134)" fill="#A855F7" opacity="0.35" />
        <path d="M 140 76 Q 156 54 176 76 L 164 88 L 156 78 L 146 88 Z" fill="#15803D" />
        <path d="M 156 48 L 158 66" stroke="#15803D" strokeWidth="6" strokeLinecap="round" />
      </g>
    ),
  },
  cauliflower: {
    bgFrom: '#F2F7F2',
    bgTo: '#DFEADF',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={78} ry={13} />
        {/* Outer green leaves */}
        <path d="M 92 144 Q 108 194 160 188 Q 212 194 228 144 Q 200 132 160 150 Q 120 132 92 144 Z" fill="#16A34A" />
        {/* White florets */}
        <circle cx="160" cy="116" r="36" fill="#FAF8F2" />
        <circle cx="130" cy="128" r="26" fill="#F5F2E8" />
        <circle cx="190" cy="128" r="26" fill="#F5F2E8" />
        <circle cx="146" cy="100" r="24" fill="#FFFFFF" />
        <circle cx="176" cy="102" r="22" fill="#FFFFFF" />
      </g>
    ),
  },
  cabbage: {
    bgFrom: '#EFF7F0',
    bgTo: '#D7EAD9',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={72} ry={13} />
        <circle cx="160" cy="134" r="56" fill="#22C55E" />
        <path d="M 118 102 Q 160 134 128 180" fill="none" stroke="#86EFAC" strokeWidth="3" />
        <path d="M 202 102 Q 160 134 192 180" fill="none" stroke="#15803D" strokeWidth="3" />
        <path d="M 122 146 Q 160 112 198 146" fill="none" stroke="#BBF7D0" strokeWidth="2.5" />
      </g>
    ),
  },
  carrot: {
    bgFrom: '#FEF3EA',
    bgTo: '#F6DFCA',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={192} rx={82} ry={12} />
        <g transform="rotate(-14 160 140)">
          <path d="M 96 124 L 222 140 L 96 156 Q 82 140 96 124 Z" fill="#EA580C" />
          <path d="M 62 126 L 92 138 M 58 140 L 90 140 M 64 154 L 92 144" stroke="#16A34A" strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>
    ),
  },
  cucumber: {
    bgFrom: '#EEF7F0',
    bgTo: '#D6E9D8',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={184} rx={86} ry={12} />
        <rect x="74" y="122" width="172" height="38" rx="19" transform="rotate(-8 160 141)" fill="#15803D" />
        <line x1="94" y1="138" x2="222" y2="122" stroke="#4ADE80" strokeWidth="2.5" strokeDasharray="6 6" />
      </g>
    ),
  },
  spinach: {
    bgFrom: '#ECF7EE',
    bgTo: '#D2EAD6',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={72} ry={12} />
        <ellipse cx="142" cy="122" rx="32" ry="48" transform="rotate(-24 142 122)" fill="#15803D" />
        <ellipse cx="182" cy="126" rx="30" ry="44" transform="rotate(22 182 126)" fill="#16A34A" />
        <ellipse cx="160" cy="132" rx="28" ry="42" fill="#22C55E" />
        <line x1="160" y1="100" x2="160" y2="188" stroke="#14532D" strokeWidth="4" />
      </g>
    ),
  },
  'coriander leaves': {
    bgFrom: '#EFF8F0',
    bgTo: '#D7ECD9',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={70} ry={12} />
        <path d="M 160 184 L 160 106 M 160 156 L 130 120 M 160 152 L 192 120" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
        <circle cx="128" cy="116" r="16" fill="#22C55E" />
        <circle cx="160" cy="100" r="18" fill="#16A34A" />
        <circle cx="192" cy="116" r="16" fill="#22C55E" />
        <circle cx="144" cy="132" r="12" fill="#4ADE80" />
        <circle cx="176" cy="132" r="12" fill="#4ADE80" />
      </g>
    ),
  },
  'green peas': {
    bgFrom: '#EFF8EE',
    bgTo: '#D8ECD4',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={192} rx={80} ry={12} />
        <path d="M 88 148 Q 160 102 232 134 Q 192 178 88 148 Z" fill="#15803D" />
        <circle cx="124" cy="142" r="12" fill="#84CC16" />
        <circle cx="152" cy="136" r="13" fill="#A3E635" />
        <circle cx="180" cy="134" r="12" fill="#84CC16" />
        <circle cx="204" cy="136" r="10" fill="#A3E635" />
      </g>
    ),
  },
  'lady finger': {
    bgFrom: '#EFF7EF',
    bgTo: '#D7EAD7',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={78} ry={12} />
        <polygon points="88,128 228,118 100,152" fill="#16A34A" />
        <polygon points="94,148 232,146 102,172" fill="#22C55E" />
      </g>
    ),
  },
  pumpkin: {
    bgFrom: '#FEF4E8',
    bgTo: '#F5DFC4',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={78} ry={13} />
        <rect x="154" y="68" width="12" height="22" rx="4" fill="#3F6212" />
        <ellipse cx="124" cy="140" rx="34" ry="48" fill="#D97706" />
        <ellipse cx="196" cy="140" rx="34" ry="48" fill="#D97706" />
        <ellipse cx="160" cy="140" rx="34" ry="52" fill="#EA580C" />
      </g>
    ),
  },

  // ===== 13. FRUITS (10) =====
  apple: {
    bgFrom: '#FEF0F0',
    bgTo: '#F6D4D4',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={68} ry={13} />
        <path d="M 160 88 C 122 72 96 108 104 148 C 110 178 136 190 160 182 C 184 190 210 178 216 148 C 224 108 198 72 160 88 Z" fill="#DC2626" />
        <ellipse cx="132" cy="118" rx="11" ry="20" transform="rotate(-18 132 118)" fill="#FCA5A5" opacity="0.45" />
        <path d="M 160 88 L 164 62" stroke="#78350F" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="180" cy="70" rx="16" ry="8" transform="rotate(-24 180 70)" fill="#16A34A" />
      </g>
    ),
  },
  banana: {
    bgFrom: '#FEFBE8',
    bgTo: '#F7EFB4',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={82} ry={13} />
        <path d="M 94 146 Q 152 174 222 104 Q 204 188 94 146 Z" fill="#EAB308" />
        <path d="M 90 128 Q 156 164 218 88 Q 206 168 90 128 Z" fill="#FACC15" />
        <rect x="212" y="82" width="12" height="10" rx="3" fill="#78350F" />
      </g>
    ),
  },
  orange: {
    bgFrom: '#FEF4E6',
    bgTo: '#F7DFBA',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={72} ry={13} />
        <circle cx="160" cy="136" r="54" fill="#F97316" />
        <ellipse cx="138" cy="112" rx="12" ry="8" transform="rotate(-28 138 112)" fill="#FED7AA" opacity="0.5" />
        <ellipse cx="176" cy="78" rx="16" ry="8" transform="rotate(-18 176 78)" fill="#15803D" />
      </g>
    ),
  },
  mango: {
    bgFrom: '#FEF7E2',
    bgTo: '#F7E3AA',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={70} ry={13} />
        <path d="M 150 80 C 110 86 98 138 120 172 C 142 198 188 188 202 150 C 216 112 190 74 150 80 Z" fill="#F59E0B" />
        <path d="M 150 82 C 120 92 114 134 128 158 C 142 134 146 98 150 82 Z" fill="#EF4444" opacity="0.45" />
        <ellipse cx="178" cy="74" rx="18" ry="8" transform="rotate(-22 178 74)" fill="#15803D" />
      </g>
    ),
  },
  papaya: {
    bgFrom: '#FEF4E8',
    bgTo: '#F5DEC0',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={76} ry={13} />
        <ellipse cx="152" cy="138" rx="58" ry="44" transform="rotate(-18 152 138)" fill="#EA580C" />
        <ellipse cx="166" cy="142" rx="44" ry="30" transform="rotate(-18 166 142)" fill="#FDBA74" />
        <circle cx="156" cy="142" r="4" fill="#1C1917" />
        <circle cx="170" cy="138" r="4" fill="#1C1917" />
        <circle cx="164" cy="152" r="4" fill="#1C1917" />
      </g>
    ),
  },
  watermelon: {
    bgFrom: '#EFF7F0',
    bgTo: '#D6EAD8',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={78} ry={13} />
        <circle cx="144" cy="136" r="52" fill="#15803D" />
        <path d="M 118 92 Q 134 136 118 180 M 144 84 Q 156 136 144 188 M 170 92 Q 178 136 170 180" fill="none" stroke="#14532D" strokeWidth="5" />
        {/* Red wedge slice */}
        <path d="M 164 166 L 236 144 Q 214 194 164 166 Z" fill="#16A34A" />
        <path d="M 168 163 L 228 144 Q 208 184 168 163 Z" fill="#EF4444" />
        <circle cx="196" cy="160" r="2" fill="#1C1917" />
        <circle cx="208" cy="156" r="2" fill="#1C1917" />
      </g>
    ),
  },
  grapes: {
    bgFrom: '#F5F0F9',
    bgTo: '#E4D8EE',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={198} rx={64} ry={12} />
        <path d="M 160 60 L 160 86" stroke="#3F6212" strokeWidth="5" strokeLinecap="round" />
        {[
          [136, 102], [160, 100], [184, 104],
          [144, 124], [168, 124], [188, 126],
          [152, 146], [174, 146], [162, 168],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="15" fill={i % 2 === 0 ? '#7E22CE' : '#9333EA'} stroke="#581C87" strokeWidth="1" />
        ))}
      </g>
    ),
  },
  guava: {
    bgFrom: '#F1F8EE',
    bgTo: '#DAEBD4',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={72} ry={13} />
        <circle cx="144" cy="136" r="48" fill="#65A30D" />
        <circle cx="190" cy="150" r="36" fill="#A3E635" stroke="#65A30D" strokeWidth="4" />
        <circle cx="190" cy="150" r="26" fill="#FDA4AF" />
        <ellipse cx="164" cy="84" rx="16" ry="7" transform="rotate(-18 164 84)" fill="#15803D" />
      </g>
    ),
  },
  pomegranate: {
    bgFrom: '#FDF0F2',
    bgTo: '#F5D5DA',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={196} rx={72} ry={13} />
        {/* Crown */}
        <polygon points="146,84 152,66 160,76 168,66 174,84" fill="#9F1239" />
        <circle cx="160" cy="136" r="54" fill="#BE123C" />
        <ellipse cx="136" cy="116" rx="12" ry="8" transform="rotate(-24 136 116)" fill="#FDA4AF" opacity="0.45" />
      </g>
    ),
  },
  lemon: {
    bgFrom: '#FEFCE8',
    bgTo: '#F6F0B4',
    render: (uid) => (
      <g>
        <PedestalShadow uid={uid} y={194} rx={74} ry={13} />
        <ellipse cx="156" cy="136" rx="56" ry="42" transform="rotate(-10 156 136)" fill="#FACC15" />
        <ellipse cx="138" cy="120" rx="14" ry="7" transform="rotate(-18 138 120)" fill="#FEF9C3" opacity="0.65" />
        <ellipse cx="190" cy="92" rx="16" ry="8" transform="rotate(-24 190 92)" fill="#15803D" />
      </g>
    ),
  },
};

function findSpec(name: string, category: string): ProductSpec {
  const norm = normalizeName(name);
  if (PRODUCT_SPECS[norm]) {
    return PRODUCT_SPECS[norm];
  }
  for (const key of Object.keys(PRODUCT_SPECS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return PRODUCT_SPECS[key];
    }
  }

  // Deterministic colorful fallback for custom CSV / user-added SKUs
  const catLower = category.toLowerCase();
  const h = hashString(`${name}:${category}`);
  const palettes = [
    ['#F3F7F4', '#DDEAE1', '#0F766E'],
    ['#FEF7EA', '#F2E1BE', '#D97706'],
    ['#FAF1EC', '#ECD8CD', '#9A3412'],
    ['#EFF6F8', '#D9E8EE', '#0369A1'],
  ];
  const [bgFrom, bgTo, accent] = palettes[h % palettes.length];
  const shortTag = name.slice(0, 10).toUpperCase();

  if (catLower.includes('oil') || catLower.includes('ghee')) {
    return {
      bgFrom,
      bgTo,
      render: (uid, c) => (
        <OilBottle uid={uid} liquidColor={accent} liquidHighlight="#FDE68A" capColor="#1C1917" labelBg="#FFFFFF" labelText={shortTag} emblemColor={accent} compact={c} />
      ),
    };
  }
  if (catLower.includes('pulse') || catLower.includes('dal') || catLower.includes('lentil')) {
    return {
      bgFrom,
      bgTo,
      render: (uid, c) => (
        <IngredientBowl uid={uid} bowlFill="#44403C" bowlRim="#292524" pileMain={accent} pileLight="#FDE68A" pileDark="#78350F" style="split-dal" tag={shortTag} compact={c} />
      ),
    };
  }
  if (catLower.includes('clean') || catLower.includes('personal')) {
    return {
      bgFrom,
      bgTo,
      render: (uid, c) => (
        <CareBottle uid={uid} bottleColor={accent} capType="pump" capColor="#FFFFFF" labelBg="#FFFFFF" labelAccent={accent} title={shortTag} compact={c} />
      ),
    };
  }

  return {
    bgFrom,
    bgTo,
    render: (uid, c) => (
      <GrainPouch uid={uid} bagBody="#F5F3EC" bagFold="#E2DDD0" bandColor={accent} grainColor="#FFFDF8" badgeText={shortTag} motif="wheat" compact={c} />
    ),
  };
}

export const ProductArtwork: React.FC<ProductArtworkProps> = ({
  name,
  category,
  compact = false,
  className = 'h-full w-full',
}) => {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const spec = findSpec(name, category);

  return (
    <svg
      viewBox="0 0 320 240"
      role="img"
      aria-label={`${name} — ${category}`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor={spec.bgFrom} />
          <stop offset="100%" stopColor={spec.bgTo} />
        </radialGradient>
        <radialGradient id={`${uid}-shd`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1C1917" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1C1917" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="320" height="240" fill={`url(#${uid}-bg)`} />
      {spec.render(uid, compact)}
    </svg>
  );
};
