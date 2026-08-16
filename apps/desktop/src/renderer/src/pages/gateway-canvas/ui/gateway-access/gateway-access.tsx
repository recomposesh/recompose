import type { GatewayApiKey, GatewayConfig } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { maskGatewayApiKey, mintGatewayApiKey, withGatewayApiKey } from '@recompose/contracts';
import { useState } from 'react';

import { useDefineVirtualModel } from '../../../../shared/api';
import { ConsequenceDialog, CopyButton, Switch } from '../../../../shared/ui';
import { factRow, sectionHeading } from '../subject-shell/subject-shell';

const CARRIED_IN = 'Clients send it as Authorization, x-api-key, x-goog-api-key, or ?key=';

const REACHED_WITHOUT = 'Clients reach this gateway without a key.';

const WHAT_REGENERATING_COSTS =
  'Clients using the current key stop reaching this gateway until you paste the new one.';

function noticeLine(sentence: string): ReactNode {
  return <p className="mt-2 px-1 text-caption text-ink-secondary">{sentence}</p>;
}

function noticeBox(sentence: string): ReactNode {
  return <p className="field-box px-3 py-2.5 text-detail text-ink-secondary">{sentence}</p>;
}

function requiredKeyBox(held: GatewayApiKey, onRegenerate: () => void): ReactNode {
  return (
    <>
      <div className="field-box">
        {factRow(
          'Key',
          maskGatewayApiKey(held.value),
          <CopyButton announcement="API key copied." label="Copy API key" value={held.value} />,
        )}
        <div className="flex min-h-sheet-row items-center border-t border-line-faint px-3 py-1.5">
          <button
            className="-ms-1 rounded-control focus-ring px-1 text-control font-medium text-accent-ink"
            onClick={onRegenerate}
            type="button"
          >
            Regenerate
          </button>
        </div>
      </div>
      {noticeLine(CARRIED_IN)}
    </>
  );
}

type GatewayAccessProps = {
  /** The stored gateway whose key this section reads and rewrites. */
  gateway: GatewayConfig;
};

/**
 * The gateway's own front door: whether it requires a key, which key, and how to replace one.
 *
 * @summary It stands apart from General Info because a gateway's identity and its security answer
 * different questions, and because only a section of its own has room for the line naming where a
 * client carries the key. Nothing here waits for a save: neither the switch nor the regeneration is
 * a field a person types into, so each lands the moment they act.
 *
 * Turning the requirement off keeps the stored value, so turning it back on meets the key the
 * clients already hold. Regenerating asks first, because it is the one act that breaks a credential
 * a person already handed out.
 */
export function GatewayAccess({ gateway }: GatewayAccessProps) {
  const rewrite = useDefineVirtualModel();
  const [asking, setAsking] = useState(false);
  const stored = gateway.apiKey;
  const required = stored?.required === true ? stored : undefined;

  const store = (apiKey: GatewayApiKey) => {
    rewrite.mutate(withGatewayApiKey(gateway, apiKey));
  };

  return (
    <>
      {sectionHeading(
        'Access',
        <span className="ms-auto shrink-0">
          <Switch
            checked={required !== undefined}
            label="Require an API key"
            onChangeChecked={(next) => {
              store({ value: stored?.value ?? mintGatewayApiKey(), required: next });
            }}
          />
        </span>,
      )}
      {required === undefined
        ? noticeBox(REACHED_WITHOUT)
        : requiredKeyBox(required, () => {
            setAsking(true);
          })}
      <ConsequenceDialog
        confirmLabel="Regenerate"
        heading="Regenerate this API key?"
        onCancel={() => {
          setAsking(false);
        }}
        onConfirm={() => {
          setAsking(false);
          store({ value: mintGatewayApiKey(), required: true });
        }}
        open={asking}
      >
        {WHAT_REGENERATING_COSTS}
      </ConsequenceDialog>
    </>
  );
}
