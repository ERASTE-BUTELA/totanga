function Svg({ children, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      {children}
    </svg>
  )
}

export function IconSearch({ className = "h-5 w-5" }) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l5 5" strokeLinecap="round" />
    </Svg>
  )
}

export function IconBook({ className = "h-5 w-5" }) {
  return (
    <Svg className={className}>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 8H19" />
    </Svg>
  )
}

export function IconCalendar({ className = "h-5 w-5" }) {
  return (
    <Svg className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
    </Svg>
  )
}

export function IconPin({ className = "h-5 w-5" }) {
  return (
    <Svg className={className}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </Svg>
  )
}
