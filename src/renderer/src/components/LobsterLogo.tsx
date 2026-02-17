import { type CSSProperties } from 'react'

type LogoState = 'idle' | 'loading' | 'success' | 'error'

const stateStyles: Record<LogoState, CSSProperties> = {
  idle: {},
  loading: { animation: 'lobster-bounce 0.8s ease-in-out infinite' },
  success: { filter: 'drop-shadow(0 0 16px rgba(52, 211, 153, 0.5))' },
  error: { filter: 'drop-shadow(0 0 16px rgba(251, 113, 133, 0.5))', animation: 'lobster-shake 0.5s ease-in-out' }
}

export default function LobsterLogo({
  state = 'idle',
  size = 120
}: {
  state?: LogoState
  size?: number
}): React.JSX.Element {
  return (
    <>
      <style>{`
        @keyframes lobster-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-6px) rotate(-2deg); }
          70% { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes lobster-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px) rotate(-1deg); }
          40% { transform: translateX(3px) rotate(1deg); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        @keyframes claw-wave {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(-15deg); }
          70% { transform: rotate(10deg); }
        }
        @keyframes eye-blink {
          0%, 42%, 44%, 100% { transform: scaleY(1); }
          43% { transform: scaleY(0.1); }
        }
        .lobster-claw-l { animation: claw-wave 2.5s ease-in-out infinite; transform-origin: 58px 68px; }
        .lobster-claw-r { animation: claw-wave 2.5s ease-in-out infinite 0.4s; transform-origin: 102px 68px; }
        .lobster-eyes { animation: eye-blink 4s ease-in-out infinite; transform-origin: 80px 52px; }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transition: 'filter 0.4s, transform 0.4s', ...stateStyles[state] }}
      >
        {/* Soft glow behind body */}
        <ellipse cx="80" cy="92" rx="40" ry="42" fill="url(#bodyGlow)" opacity="0.3" />

        {/* Body */}
        <ellipse cx="80" cy="92" rx="30" ry="36" fill="url(#bodyGrad)" />

        {/* Belly pattern */}
        <ellipse cx="80" cy="98" rx="15" ry="19" fill="#fde1c5" opacity="0.7" />
        <ellipse cx="80" cy="102" rx="10" ry="12" fill="#feecd2" opacity="0.5" />

        {/* Head */}
        <circle cx="80" cy="56" r="22" fill="url(#bodyGrad)" />

        {/* Rosy cheeks */}
        <circle cx="65" cy="60" r="5" fill="#fda4af" opacity="0.45" />
        <circle cx="95" cy="60" r="5" fill="#fda4af" opacity="0.45" />

        {/* Eyes */}
        <g className="lobster-eyes">
          <ellipse cx="72" cy="50" rx="6" ry="6.5" fill="white" />
          <ellipse cx="88" cy="50" rx="6" ry="6.5" fill="white" />
          <circle cx="73.5" cy="49" r="3.5" fill="#1e1b3a" />
          <circle cx="89.5" cy="49" r="3.5" fill="#1e1b3a" />
          {/* Big shines */}
          <circle cx="75" cy="47.5" r="1.8" fill="white" />
          <circle cx="91" cy="47.5" r="1.8" fill="white" />
          {/* Small shines */}
          <circle cx="72" cy="51" r="0.8" fill="white" opacity="0.7" />
          <circle cx="88" cy="51" r="0.8" fill="white" opacity="0.7" />
        </g>

        {/* Happy mouth */}
        <path d="M74 60 Q80 67 86 60" stroke="#c2410c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M76 61 Q80 64 84 61" fill="#c2410c" opacity="0.3" />

        {/* Antennae */}
        <path d="M71 38 Q63 22 56 16" stroke="url(#bodyGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="55" cy="15" r="4" fill="#fb923c" />
        <circle cx="55" cy="15" r="2" fill="#fdba74" opacity="0.6" />
        <path d="M89 38 Q97 22 104 16" stroke="url(#bodyGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="105" cy="15" r="4" fill="#fb923c" />
        <circle cx="105" cy="15" r="2" fill="#fdba74" opacity="0.6" />

        {/* Left Claw */}
        <g className="lobster-claw-l">
          <path d="M52 75 Q36 62 24 56" stroke="url(#bodyGrad)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <ellipse cx="20" cy="50" rx="12" ry="8" fill="url(#clawGrad)" transform="rotate(-25 20 50)" />
          <path d="M12 47 Q20 39 27 47" stroke="#fdba74" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>

        {/* Right Claw */}
        <g className="lobster-claw-r">
          <path d="M108 75 Q124 62 136 56" stroke="url(#bodyGrad)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <ellipse cx="140" cy="50" rx="12" ry="8" fill="url(#clawGrad)" transform="rotate(25 140 50)" />
          <path d="M133 47 Q140 39 148 47" stroke="#fdba74" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>

        {/* Legs */}
        <path d="M56 100 Q44 112 36 118" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M53 110 Q41 120 34 126" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M104 100 Q116 112 124 118" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M107 110 Q119 120 126 126" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />

        {/* Tail fan */}
        <path d="M72 128 Q80 142 88 128" fill="#f97316" opacity="0.8" />
        <path d="M75 129 Q80 138 85 129" fill="#fb923c" opacity="0.5" />

        <defs>
          <radialGradient id="bodyGlow" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="clawGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
    </>
  )
}
