import { TypedText } from './typed-text';

export function TerminalSetup({
  agent,
  envVar,
  launch,
}: {
  agent: string;
  envVar: string;
  launch: string;
}) {
  return (
    <>
      <span className="text-term-ink" data-typed-line={`${agent}-export`}>
        <span className="text-term-dim">$ </span>
        <TypedText text={`export ${envVar}=`} />
      </span>
      <span className="ps-4 text-accent-ink" data-typed-line={`${agent}-url`}>
        <TypedText text="http://localhost:8397/coding" />
      </span>
      <span
        className="text-term-ink"
        data-story-prop={`${agent}-shell`}
        data-typed-line={`${agent}-launch`}
      >
        <span className="text-term-dim">$ </span>
        <TypedText text={launch} />
      </span>
    </>
  );
}
