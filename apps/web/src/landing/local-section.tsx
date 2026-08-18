import { PathChip } from './path-chip';

export function LocalSection() {
  return (
    <section className="bg-stage">
      <div className="mx-auto max-w-360 px-5 py-16 md:px-10 md:py-20 lg:px-16 lg:py-28">
        <h2 className="text-2xl font-medium text-stage-ink md:text-3xl lg:text-4xl">
          recompose has no server.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-stage-dim md:text-lg">
          everything happens on your machine. no account, no telemetry, nothing to sign into.
        </p>

        <div className="mt-10 flex flex-col items-center md:mt-16 md:flex-row">
          <PathChip>
            <span className="font-serif text-sm text-stage-dim">claude code</span>
          </PathChip>
          <span className="h-5 w-0.5 bg-live md:h-0.5 md:w-auto md:max-w-35 md:flex-1" />
          <PathChip className="border-gateway">
            <span className="size-1.75 rounded-full bg-live" />
            <span className="font-mono text-sm text-stage-ink">your mac · 127.0.0.1</span>
          </PathChip>
          <span className="h-5 w-0.5 bg-live md:h-0.5 md:w-auto md:max-w-35 md:flex-1" />
          <PathChip>
            <span className="font-serif text-sm text-stage-dim">anthropic</span>
          </PathChip>
        </div>

        <p className="mt-8 text-center font-serif text-sm text-stage-faint md:text-start">
          the gateway is a process on your machine. quit it, and it is gone.
        </p>
      </div>
    </section>
  );
}
