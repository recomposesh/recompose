export function ZedMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} style={style} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M3.13 2.75C2.92 2.75 2.75 2.92 2.75 3.13V11.38H2V3.13C2 2.5 2.5 2 3.13 2H13.17C13.67 2 13.92 2.61 13.57 2.96L7.38 9.15H9.13V8.38H9.88V9.34C9.88 9.65 9.62 9.9 9.31 9.9H6.63L5.34 11.19H11.19V6.5H11.94V11.19C11.94 11.6 11.6 11.94 11.19 11.94H4.59L3.28 13.25H12.88C13.08 13.25 13.25 13.08 13.25 12.88V4.63H14V12.88C14 13.5 13.5 14 12.88 14H2.83C2.33 14 2.08 13.39 2.43 13.04L8.59 6.88H6.88V7.63H6.13V6.69C6.13 6.38 6.38 6.13 6.69 6.13H9.34L10.66 4.81H4.81V9.5H4.06V4.81C4.06 4.4 4.4 4.06 4.81 4.06H11.41L12.72 2.75H3.13Z"
      />
    </svg>
  );
}
