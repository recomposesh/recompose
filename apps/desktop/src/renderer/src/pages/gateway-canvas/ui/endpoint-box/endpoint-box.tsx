import type { GatewayConfig } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useState } from 'react';

import { useSetGatewayPort } from '../../../../shared/api';
import { ConsequenceDialog, CopyButton, stateMark, stateWord } from '../../../../shared/ui';
import { gatewayBaseUrl } from '../../lib/gateway-base-url';
import { PortField } from '../port-field/port-field';
import { factRow } from '../subject-shell/subject-shell';

type PortRestartAsk = {
  port: number;
  onConfirm: () => void;
  onCancel: () => void;
};

function portRestartDialog(ask: PortRestartAsk | undefined): ReactNode {
  if (ask === undefined) {
    return null;
  }

  const { port, onConfirm, onCancel } = ask;

  return (
    <ConsequenceDialog
      confirmLabel="Restart"
      heading={`Move the gateway to port ${String(port)}?`}
      onCancel={onCancel}
      onConfirm={onConfirm}
      open
    >
      The gateway is serving right now, and restarts to answer on the new port.
    </ConsequenceDialog>
  );
}

function statusRow(status: 'running' | 'stopped'): ReactNode {
  return (
    <div className="flex min-h-sheet-row items-center gap-2 border-t border-line-faint px-3 py-1.5">
      <span className="text-control text-ink">Status</span>
      <span className="ms-auto flex items-center gap-1.5 text-detail text-ink">
        <span aria-hidden className={`size-1.75 shrink-0 rounded-pill ${stateMark[status]}`} />
        {stateWord[status]}
      </span>
    </div>
  );
}

function portRow(fieldRun: number, port: number, onCommit: (port: number) => void): ReactNode {
  return (
    <div className="flex min-h-sheet-row items-center gap-2 border-t border-line-faint px-3 py-1.5">
      <span className="shrink-0 text-control text-ink">Port</span>
      <span className="ms-auto">
        <PortField key={fieldRun} onCommit={onCommit} port={port} />
      </span>
    </div>
  );
}

function portRefusal(refusal: string | undefined): ReactNode {
  return refusal === undefined ? null : (
    <p className="border-t border-line-faint px-3 py-2 text-caption text-danger-ink" role="alert">
      {refusal}
    </p>
  );
}

type EndpointBoxProps = {
  /** The stored gateway whose endpoint the box reads. */
  gateway: GatewayConfig;
  /** Whether the gateway is answering right now, which decides if a port move asks first. */
  status: 'running' | 'stopped';
  /** The address the gateway binds, which the base URL prints. */
  bindAddress: string;
};

/**
 * The endpoint facts, with the port as the one field a person edits in place.
 *
 * @summary A settled port applies at once while the gateway rests, because there is nothing to
 * interrupt. While it serves, the same edit asks first: the move restarts the engine, and a
 * restart is not a thing a blur should do unannounced.
 */
export function EndpointBox({ gateway, status, bindAddress }: EndpointBoxProps) {
  const setPort = useSetGatewayPort();
  const [asked, setAsked] = useState<number | undefined>(undefined);
  const [fieldRun, setFieldRun] = useState(0);
  const baseUrl = gatewayBaseUrl(gateway, bindAddress);

  const putTheAskAway = () => {
    setAsked(undefined);
    setFieldRun((run) => run + 1);
  };

  const commitPort = (port: number) => {
    if (status === 'running') {
      setAsked(port);

      return;
    }

    setPort.mutate({ slug: gateway.slug, port });
  };

  return (
    <div className="field-box">
      {factRow('Base URL', baseUrl, <CopyButton label="Copy base URL" value={baseUrl} />)}
      {statusRow(status)}
      {portRow(fieldRun, gateway.port, commitPort)}
      {portRefusal(setPort.refusal)}
      {portRestartDialog(
        asked === undefined
          ? undefined
          : {
              port: asked,
              onConfirm: () => {
                setPort.mutate({ slug: gateway.slug, port: asked });
                putTheAskAway();
              },
              onCancel: putTheAskAway,
            },
      )}
    </div>
  );
}
