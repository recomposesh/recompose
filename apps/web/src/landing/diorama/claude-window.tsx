import { TerminalChrome } from './terminal-chrome';
import { TerminalSetup } from './terminal-setup';
import { TypedText } from './typed-text';

const LOGOMARK = ' ▐▛███▜▌\n▝▜█████▛▘\n  ▘▘ ▝▝';

export function ClaudeWindow() {
  return (
    <div className="absolute flex h-77.5 w-90 flex-col overflow-hidden rounded-xl bg-term-bg shadow-2xl backdrop-blur-sm">
      <TerminalChrome title="claude" />

      <div className="flex flex-1 flex-col px-4 pt-2 font-mono text-xs leading-relaxed">
        <TerminalSetup agent="claude" envVar="ANTHROPIC_BASE_URL" launch="claude --model fast" />

        <div
          className="mt-3 flex gap-3 rounded-lg border border-term-faint/40 p-3"
          data-story-prop="claude-welcome"
        >
          <pre className="font-mono text-annotation text-claude" style={{ lineHeight: 1.1 }}>
            {LOGOMARK}
          </pre>
          <span className="flex flex-col gap-0.5">
            <span className="text-term-ink">Claude Code v2.1</span>
            <span className="text-annotation text-term-dim">welcome back!</span>
            <span className="text-annotation text-term-dim">fast · localhost:8397/coding</span>
          </span>
        </div>

        <span
          className="mt-3 text-term-ink"
          data-story-prop="claude-ready"
          data-typed-line="claude-prompt"
        >
          <span className="text-claude">❯ </span>
          <TypedText text="refactor the router tests" />
          <span className="animate-pulse">▌</span>
        </span>

        <span className="mt-2 text-term-dim" data-story-prop="claude-working">
          ✳ refactoring…
        </span>
        <span className="text-term-ink" data-story-prop="claude-done">
          <span className="text-live">⏺ </span>router tests passing
        </span>

        <span
          className="mt-auto pb-3 text-terminal text-term-faint"
          data-story-prop="claude-status"
        >
          fast · auto mode on
        </span>
      </div>
    </div>
  );
}
