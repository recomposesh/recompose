import { TerminalChrome } from './terminal-chrome';
import { TerminalSetup } from './terminal-setup';
import { TypedText } from './typed-text';

export function CodexWindow() {
  return (
    <div
      className="absolute flex h-70 w-90 flex-col overflow-hidden rounded-xl bg-term-bg shadow-2xl backdrop-blur-sm"
      data-story-prop="codex-window"
    >
      <TerminalChrome title="codex" />

      <div className="flex flex-1 flex-col px-4 pt-2 font-mono text-xs leading-relaxed">
        <TerminalSetup agent="codex" envVar="OPENAI_BASE_URL" launch="codex --model smart" />

        <div
          className="mt-3 flex items-center gap-3 rounded-lg border border-term-faint/40 p-3"
          data-story-prop="codex-welcome"
        >
          <span className="font-mono text-base leading-none text-term-ink">&gt;_</span>
          <span className="flex flex-col gap-0.5">
            <span className="text-term-ink">Codex CLI v2.4</span>
            <span className="text-annotation text-term-dim">smart · 127.0.0.1:8397</span>
          </span>
        </div>

        <span
          className="mt-3 text-term-ink"
          data-story-prop="codex-ready"
          data-typed-line="codex-prompt"
        >
          <span className="text-term-dim">› </span>
          <TypedText text="plan the auth migration" />
          <span className="animate-pulse">▌</span>
        </span>

        <span className="mt-2 text-term-dim" data-story-prop="codex-working">
          ✳ planning…
        </span>

        <span className="mt-auto pb-3 text-terminal text-term-faint" data-story-prop="codex-status">
          smart · full auto
        </span>
      </div>
    </div>
  );
}
