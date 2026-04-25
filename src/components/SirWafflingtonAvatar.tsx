// Sir Wafflington the 67th — a dignified waffle aristocrat.
// Pure inline SVG so it scales perfectly at any size and inherits theme colors.

interface Props {
  size?: number;
  className?: string;
}

export const SirWafflingtonAvatar = ({ size = 48, className }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 120 140"
    width={size}
    height={(size * 140) / 120}
    className={className}
    aria-label="Sir Wafflington the 67th"
  >
    {/* Cane — held jauntily off to the right */}
    <g>
      <rect x="92" y="58" width="4" height="68" rx="2" fill="#1a1a1a" stroke="#000" strokeWidth="0.6" />
      <circle cx="94" cy="56" r="6" fill="#d4a92a" stroke="#7a5e10" strokeWidth="1" />
      <circle cx="92.5" cy="54.5" r="1.6" fill="#fbe79b" />
    </g>

    {/* Top hat */}
    <g>
      {/* Brim */}
      <ellipse cx="60" cy="40" rx="38" ry="5" fill="#0a0a0a" />
      <ellipse cx="60" cy="39" rx="38" ry="3.5" fill="#1a1a1a" />
      {/* Crown */}
      <path
        d="M30 40 Q30 8 60 6 Q90 8 90 40 Z"
        fill="#0d0d0d"
        stroke="#000"
        strokeWidth="0.8"
      />
      {/* Subtle silk highlight */}
      <path d="M36 38 Q36 14 58 10" stroke="#2a2a2a" strokeWidth="1.2" fill="none" />
      {/* Yellow hazard-stripe band */}
      <rect x="30" y="32" width="60" height="7" fill="#f5c518" />
      <g stroke="#0d0d0d" strokeWidth="2.2" opacity="0.85">
        <line x1="34" y1="32" x2="30" y2="39" />
        <line x1="42" y1="32" x2="38" y2="39" />
        <line x1="50" y1="32" x2="46" y2="39" />
        <line x1="58" y1="32" x2="54" y2="39" />
        <line x1="66" y1="32" x2="62" y2="39" />
        <line x1="74" y1="32" x2="70" y2="39" />
        <line x1="82" y1="32" x2="78" y2="39" />
        <line x1="90" y1="32" x2="86" y2="39" />
      </g>
    </g>

    {/* Waffle body */}
    <g>
      {/* Outer waffle silhouette */}
      <rect
        x="18"
        y="44"
        width="84"
        height="64"
        rx="10"
        fill="#d99a3d"
        stroke="#5e3a10"
        strokeWidth="1.6"
      />
      {/* Top crust shimmer */}
      <rect x="20" y="46" width="80" height="6" rx="6" fill="#f0c168" opacity="0.55" />

      {/* Waffle grid wells (3x3-ish) — darker pockets */}
      {[
        [27, 53], [50, 53], [73, 53],
        [27, 72], [50, 72], [73, 72],
        [27, 91], [50, 91], [73, 91],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="20"
          height="14"
          rx="3"
          fill="#a76a1f"
          stroke="#5e3a10"
          strokeWidth="0.8"
        />
      ))}

      {/* Eyes — left waffle pocket gets a black pupil */}
      <circle cx="37" cy="60" r="2.4" fill="#0d0d0d" />
      <circle cx="37.5" cy="59.3" r="0.7" fill="#fff" />

      {/* Right "eye" pocket — wears the monocle */}
      <circle cx="83" cy="60" r="2.4" fill="#0d0d0d" />
      <circle cx="83.5" cy="59.3" r="0.7" fill="#fff" />

      {/* Mouth — refined, slightly smug */}
      <path
        d="M48 82 Q60 87 72 82"
        stroke="#0d0d0d"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      {/* Tiny moustache curl */}
      <path
        d="M52 79 Q60 74 68 79"
        stroke="#3a230a"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </g>

    {/* Monocle — sits over the right eye pocket */}
    <g>
      <circle
        cx="83"
        cy="60"
        r="9"
        fill="none"
        stroke="#d4a92a"
        strokeWidth="1.8"
      />
      <circle
        cx="83"
        cy="60"
        r="9"
        fill="#9ad7ff"
        opacity="0.18"
      />
      {/* Chain dangling from monocle to bowtie */}
      <path
        d="M91 64 Q96 80 78 102"
        stroke="#d4a92a"
        strokeWidth="0.9"
        fill="none"
        strokeDasharray="1.2 1.4"
      />
    </g>

    {/* Bowtie — small yellow bowtie under the chin */}
    <g>
      <path
        d="M52 102 L60 108 L52 114 Z"
        fill="#f5c518"
        stroke="#7a5e10"
        strokeWidth="0.8"
      />
      <path
        d="M68 102 L60 108 L68 114 Z"
        fill="#f5c518"
        stroke="#7a5e10"
        strokeWidth="0.8"
      />
      <rect x="58" y="105" width="4" height="6" rx="1" fill="#7a5e10" />
    </g>

    {/* Syrup drip flourish (lower-left corner of the waffle) */}
    <g>
      <path
        d="M22 100 Q22 116 28 122 Q34 128 30 134 Q26 140 22 134 Q18 128 22 122 Z"
        fill="#7a3e0a"
        opacity="0.85"
      />
      <ellipse cx="26" cy="124" rx="2" ry="1.2" fill="#f0c168" opacity="0.6" />
    </g>
  </svg>
);
