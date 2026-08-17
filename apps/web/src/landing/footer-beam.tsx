export function FooterBeam() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 840 640"
      preserveAspectRatio="none"
      className="absolute inset-s-1/2 top-0 h-full -translate-x-1/2 text-stage-ink"
      style={{ width: '60%' }}
    >
      <defs>
        <linearGradient id="footer-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="0.6" stopColor="currentColor" stopOpacity="0.03" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="390,0 450,0 840,640 0,640" fill="url(#footer-beam)" />
    </svg>
  );
}
