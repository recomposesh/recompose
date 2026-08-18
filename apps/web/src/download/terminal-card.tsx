import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const brewCommand = 'brew install --cask recomposesh/tap/recompose';

export function TerminalCard() {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    void navigator.clipboard.writeText(brewCommand);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  return (
    <section className="mx-auto flex max-w-360 flex-col items-center px-16 pb-18">
      <div className="w-full max-w-220 rounded-card bg-terminal-card px-5.5 py-4.5">
        <p className="text-annotation font-medium tracking-caps text-stage-faint">
          PREFER THE TERMINAL?
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2.5">
          <code className="font-mono text-control text-fd-foreground">{brewCommand}</code>
          <button
            type="button"
            aria-label="copy the brew command"
            onClick={copyCommand}
            className="text-stage-faint transition-colors hover:text-fd-foreground"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>
    </section>
  );
}
