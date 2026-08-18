import { NOTE_PATH } from '../components/note-path';

export function NoteMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 34 48" className={className} style={style} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d={NOTE_PATH} clipRule="evenodd" />
    </svg>
  );
}
