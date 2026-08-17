import { PathChip } from './path-chip';

export function LocalSection() {
  return (
    <section className="bg-stage">
      <div className="mx-auto max-w-360 px-16 py-28">
        <h2 className="text-4xl font-medium text-stage-ink">recompose has no server.</h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-stage-dim">
          everything happens on your machine. no account, no telemetry, nothing to sign into.
        </p>

        <div className="mt-16 flex items-center">
          <PathChip>
            <span className="font-serif text-sm text-stage-dim">claude code</span>
          </PathChip>
          <span className="h-0.5 max-w-35 flex-1 bg-live" />
          <PathChip className="border-gateway">
            <span className="size-1.75 rounded-full bg-live" />
            <span className="font-mono text-sm text-stage-ink">your mac · 127.0.0.1</span>
          </PathChip>
          <span className="h-0.5 max-w-35 flex-1 bg-live" />
          <PathChip>
            <span className="font-serif text-sm text-stage-dim">anthropic</span>
          </PathChip>
        </div>

        <p className="mt-8 font-serif text-sm text-stage-faint">
          the gateway is a process on your machine. quit it, and it is gone.
        </p>
      </div>
    </section>
  );
}
