import { GATEWAY_PORT_RANGE } from '@recompose/contracts';
import { useState } from 'react';

function chosenPort(draft: string): number | undefined {
  const port = Number(draft.trim());

  if (!Number.isInteger(port) || port < GATEWAY_PORT_RANGE.min || port > GATEWAY_PORT_RANGE.max) {
    return undefined;
  }

  return port;
}

type PortFieldProps = {
  /** The stored port the field rests on and settles back to. */
  port: number;
  /** Receives a chosen port that parsed, sits in range, and differs from the stored one. */
  onCommit: (port: number) => void;
};

/**
 * The port as one editable field, settling on blur or Enter and walking back on Escape.
 *
 * @summary A draft that fails to parse or leaves the gateway port range settles back to the
 * stored port instead of committing, so the field can never hand an impossible port on.
 */
export function PortField({ port, onCommit }: PortFieldProps) {
  const [stored, setStored] = useState(port);
  const [draft, setDraft] = useState(String(port));

  if (stored !== port) {
    setStored(port);
    setDraft(String(port));
  }

  const commit = () => {
    const next = chosenPort(draft);

    if (next === undefined) {
      setDraft(String(port));

      return;
    }

    setDraft(String(next));

    if (next !== port) {
      onCommit(next);
    }
  };

  return (
    <input
      aria-label="Port"
      className="field-control w-20 text-end font-mono"
      inputMode="numeric"
      onBlur={commit}
      onInput={(event) => {
        setDraft(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }

        if (event.key === 'Escape') {
          setDraft(String(port));
        }
      }}
      spellCheck={false}
      type="text"
      value={draft}
    />
  );
}
