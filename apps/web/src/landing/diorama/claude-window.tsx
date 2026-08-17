const LOGOMARK = ' ▐▛███▜▌\n▝▜█████▛▘\n  ▘▘ ▝▝';

export function ClaudeWindow() {
  return (
    <div className="absolute flex h-70 w-90 flex-col overflow-hidden rounded-xl bg-term-bg shadow-2xl backdrop-blur-sm">
      <div className="relative flex h-8.5 shrink-0 items-center gap-2 px-3">
        <span className="size-2.5 rounded-full bg-traffic-close" />
        <span className="size-2.5 rounded-full bg-traffic-hold" />
        <span className="size-2.5 rounded-full bg-traffic-go" />
        <span className="absolute inset-s-1/2 -translate-x-1/2 text-xs font-semibold text-term-faint">
          claude
        </span>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-2 font-mono text-xs leading-relaxed">
        <div className="flex gap-3 rounded-lg border border-term-faint/40 p-3">
          <pre className="font-mono text-annotation text-claude" style={{ lineHeight: 1.1 }}>
            {LOGOMARK}
          </pre>
          <span className="flex flex-col gap-0.5">
            <span className="text-term-ink">Claude Code v2.1</span>
            <span className="text-annotation text-term-dim">welcome back!</span>
            <span className="text-annotation text-term-dim">fast · localhost:8397/coding</span>
          </span>
        </div>

        <span className="mt-3 text-term-ink">
          <span className="text-term-dim">$ </span>export ANTHROPIC_BASE_URL=
        </span>
        <span className="ps-4 text-accent-ink">http://localhost:8397/coding</span>
        <span className="text-term-ink">
          <span className="text-term-dim">$ </span>claude --model fast
        </span>

        <span className="mt-3 text-term-ink">
          <span className="text-claude">❯ </span>refactor the router tests
          <span className="animate-pulse">▌</span>
        </span>

        <span className="mt-auto pb-3 text-terminal text-term-faint">fast · auto mode on</span>
      </div>
    </div>
  );
}
