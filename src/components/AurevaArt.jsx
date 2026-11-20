export function AurevaMonogram() {
  return (
    <div className="relative inline-flex items-center justify-center w-9 h-9 select-none">
      <span className="font-luxury text-[28px] font-semibold leading-none aureva-gold-text">
        A
      </span>
      <span
        className="absolute top-0.5 right-1 w-2 h-0.5 rotate-[-32deg] rounded-full"
        style={{ background: 'linear-gradient(90deg, #D9B672, #B88E40)' }}
      />
    </div>
  )
}

export function AurevaPulseLogo() {
  return (
    <svg width="46" height="28" viewBox="0 0 46 28" fill="none" className="mx-auto">
      <defs>
        <linearGradient id="pulseGold" x1="0" y1="0" x2="46" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B88E40" />
          <stop offset="50%" stopColor="#E6C98C" />
          <stop offset="100%" stopColor="#B88E40" />
        </linearGradient>
      </defs>
      <path
        d="M5 14H10M14 9V19M18.5 6V22M23 2V26M27.5 6V22M32 9V19M36 14H41"
        stroke="url(#pulseGold)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function GoldenSilkWaves() {
  return (
    <svg
      viewBox="0 0 1200 320"
      fill="none"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-[260px] md:h-[320px]"
      style={{ opacity: 'var(--wave-opacity)' }}
    >
      <defs>
        <linearGradient id="silk1" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4AF6A" stopOpacity="0" />
          <stop offset="28%" stopColor="#DFBE78" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#F0D79E" stopOpacity="0.85" />
          <stop offset="80%" stopColor="#C89F4E" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4AF6A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="silk2" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C89F4E" stopOpacity="0" />
          <stop offset="35%" stopColor="#E8CD92" stopOpacity="0.55" />
          <stop offset="65%" stopColor="#B88E40" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#C89F4E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M-40 165 C 210 60, 420 265, 650 160 C 860 65, 1020 230, 1240 125" stroke="url(#silk1)" strokeWidth="2.2" />
      <path d="M-40 185 C 230 85, 430 275, 670 175 C 880 85, 1030 245, 1240 145" stroke="url(#silk2)" strokeWidth="1.4" />
      <path d="M-40 145 C 190 45, 410 245, 635 145 C 850 50, 1015 215, 1240 110" stroke="url(#silk2)" strokeWidth="1.1" />
      <path d="M-40 128 C 220 220, 470 55, 720 155 C 940 240, 1070 80, 1240 180" stroke="url(#silk1)" strokeWidth="1.5" />
    </svg>
  )
}
