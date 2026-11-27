export default function BrandMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" className="fill-fg" />
      <path
        d="M11 8v13a3 3 0 0 0 3 3h8"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-page"
      />
      <circle cx="22" cy="10" r="2.5" className="fill-page" />
    </svg>
  );
}
