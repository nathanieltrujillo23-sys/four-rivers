/** One source parting into four streams — the app's icon, reused wherever
 * "the whole course" needs a visual (header, certificate, course-complete
 * celebration) instead of each spot drawing its own copy. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <path d="M13 2 C13 8, 5 9, 4 24" fill="none" stroke="var(--color-river-1)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 2 C13 9, 10 12, 9 24" fill="none" stroke="var(--color-river-2)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 2 C13 9, 16 12, 17 24" fill="none" stroke="var(--color-river-3)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 2 C13 8, 21 9, 22 24" fill="none" stroke="var(--color-river-4)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
