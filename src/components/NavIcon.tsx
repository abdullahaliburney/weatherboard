export type NavIconName = 'overview' | 'about' | 'privacy' | 'terms'

const PATHS: Record<NavIconName, string> = {
  overview: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
  about: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-12.6a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2ZM10.9 11h1.7v6.2h-1.7V11Z',
  privacy: 'M12 3 5 6v5.4c0 4.2 2.8 7.6 7 9.6 4.2-2 7-5.4 7-9.6V6l-7-3Zm0 4.3a1.2 1.2 0 0 1 1.2 1.2v.6h.4c.5 0 .9.4.9.9v3c0 .5-.4.9-.9.9h-3.2c-.5 0-.9-.4-.9-.9v-3c0-.5.4-.9.9-.9h.4v-.6A1.2 1.2 0 0 1 12 7.3Z',
  terms: 'M7 3h7l4 4v14H7V3Zm6 1.8V8h3.2L13 4.8ZM9.5 12h5v1.4h-5V12Zm0 3.2h5v1.4h-5v-1.4Z',
}

/** Small, dependency-free navigation glyphs drawn from one consistent set. */
export default function NavIcon({ name }: { readonly name: NavIconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}
