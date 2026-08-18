import { NarrationLine } from './narration-line';

export function NarrationBlock({
  act,
  bright,
  dim,
  className = '',
}: {
  act: string;
  bright: string;
  dim: string;
  className?: string;
}) {
  return (
    <p
      data-narration-act={act}
      className={`font-medium ${className}`}
      style={{ fontSize: 'clamp(24px, 3.2vw, 46px)', lineHeight: 1.05 }}
    >
      <NarrationLine text={bright} tone="text-stage-bright" />
      <NarrationLine text={dim} tone="text-stage-faint" />
    </p>
  );
}
