import { useState } from 'react';

import type { ConnectFacts } from '../../model/connect-facts';

import { Sheet } from '../../../../shared/ui';
import { clientNamed, connectGroups } from '../../model/connect-catalog';
import { ConnectDetail } from '../connect-detail/connect-detail';
import { ConnectRail } from '../connect-rail/connect-rail';

type ConnectSheetProps = {
  /** Whether the sheet stands on screen. */
  open: boolean;
  /** Receives the state the person asked for, including a dismissal. */
  onOpenChange: (open: boolean) => void;
  /** The gateway facts every block is written from. */
  facts: ConnectFacts;
  /** Every virtual model this gateway serves, which the pane lists and a client names. */
  models: readonly { id: string; displayName: string }[];
  /** How many requests this gateway has answered, which the standing line reads. */
  answered: number;
};

const FIRST_CLIENT = 'claude-code';

/**
 * The sheet that points any client at this gateway, one client at a time.
 *
 * @summary Reach for it from the toolbar control beside start and stop. The rail carries every
 * tool recompose knows how to point, and the pane beside it writes that tool's own setup from
 * this gateway's address, key and models, so a person copies rather than transcribes.
 */
export function ConnectSheet({ open, onOpenChange, facts, models, answered }: ConnectSheetProps) {
  const [selected, setSelected] = useState(FIRST_CLIENT);
  const [asked, setAsked] = useState('');

  return (
    <Sheet
      description={`Point a client at ${facts.baseUrl} and it reaches every model this gateway serves.`}
      footer={
        <button
          className="push-button-primary focus-ring-wide"
          onClick={() => {
            onOpenChange(false);
          }}
          type="button"
        >
          Close
        </button>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={`Connect a client to ${facts.gatewayName}`}
      width="broad"
    >
      <div className="flex h-connect-body border-t border-line-faint">
        <ConnectRail
          asked={asked}
          groups={connectGroups}
          onAsk={setAsked}
          onSelect={setSelected}
          selected={selected}
        />
        <ConnectDetail
          answered={answered}
          client={clientNamed(selected)}
          facts={facts}
          models={models}
        />
      </div>
    </Sheet>
  );
}
