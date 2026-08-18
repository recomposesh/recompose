import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { brewInstallCommand } from '../lib/download-targets';

export function TerminalCard() {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText(brewInstallCommand).then(
      () => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 1500);
      },
      () => {
        setCopied(false);
      },
    );
  };

  return (
    <section className="mx-auto flex max-w-360 flex-col items-center px-5 pb-18 md:px-10 lg:px-16">
      <div className="w-full max-w-220 rounded-card bg-terminal-card px-5.5 py-4.5">
        <p className="text-annotation font-medium tracking-caps text-stage-faint">
          PREFER THE TERMINAL?
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2.5">
          <code className="font-mono text-control text-fd-foreground">{brewInstallCommand}</code>
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
