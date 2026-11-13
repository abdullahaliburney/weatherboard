/** Abstract sun-over-horizon mark. Decorative; the wordmark carries the name. */
export default function BrandMark({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="13" r="5.1" />
      <path d="M16 3.4v2.2M7.9 6.1l1.6 1.6M24.1 6.1l-1.6 1.6M3.4 13h2.2M26.4 13h2.2" />
      <path d="M6.2 22.6h19.6M10 26.8h12" />
    </svg>
  )
}
