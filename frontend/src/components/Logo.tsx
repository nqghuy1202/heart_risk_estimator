export function Logo({
  size = 24,
  className,
  title = 'HL Care',
}: {
  size?: number
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 48 54"
      width={(size * 48) / 54}
      height={size}
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
    >
      <rect x="11" y="6" width="6" height="28" rx="0.5" />
      <rect x="31" y="6" width="6" height="28" rx="0.5" />
      <rect x="11" y="18" width="26" height="5" rx="0.5" />
      <rect x="9" y="6" width="10" height="2" rx="0.5" />
      <rect x="9" y="32" width="10" height="2" rx="0.5" />
      <rect x="29" y="6" width="10" height="2" rx="0.5" />
      <rect x="29" y="32" width="10" height="2" rx="0.5" />
      <rect x="21" y="18" width="6" height="30" rx="0.5" />
      <rect x="21" y="43" width="19" height="5" rx="0.5" />
      <rect x="38" y="40" width="2" height="8" rx="0.5" />
    </svg>
  )
}
