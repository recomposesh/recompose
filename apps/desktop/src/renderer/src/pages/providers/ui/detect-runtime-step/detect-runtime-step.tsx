import type { LocalRuntimeId, RuntimeReachability } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { documentedRuntimePort, runtimeAddressFor, runtimePortSchema } from '@recompose/contracts';
import { useSelector } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  refusalSentence,
  runtimeDetectionQueryOptions,
  useConnectLocalRuntime,
  withRefusal,
} from '../../../../shared/api';
import { SheetActionSlot } from '../../../../shared/ui';
import { localLeadFor, localRuntimeName } from '../../model/local-catalog';
import { portRefusal, usePortForm, type PortForm } from '../../model/runtime-port';
import { PickedIdentity } from '../picked-identity/picked-identity';
import { RuntimePortField } from '../runtime-port-field/runtime-port-field';

type DetectRuntimeStepProps = {
  /** The runtime the person picked, whose loopback host is the one place the look aims. */
  runtime: LocalRuntimeId;
  /** Runs once the account is stored, so the catalog can close behind it. */
  onConnected: () => void;
};

type Reading =
  | { face: 'looking' }
  | { face: 'reported'; reachability: RuntimeReachability }
  | { face: 'refused'; reason: string };

function readingOf(look: ReturnType<typeof useQuery<RuntimeReachability>>): Reading {
  if (look.isFetching) {
    return { face: 'looking' };
  }

  if (look.error === null && look.data !== undefined) {
    return { face: 'reported', reachability: look.data };
  }

  return { face: 'refused', reason: refusalSentence(look.error) };
}

/**
 * The version a runtime published, and nothing at all where it published none.
 *
 * @summary A runtime such as LM Studio names no version field anywhere in its surface, so the word
 * alone would stand over an empty space and claim the look came back short.
 */
function versionLine(version: string | undefined): ReactNode {
  return version === undefined ? null : (
    <p className="text-detail text-ink-secondary">Version {version}</p>
  );
}

function reportedFace(name: string, host: string, reachability: RuntimeReachability): ReactNode {
  if (reachability.verdict === 'answers') {
    return (
      <>
        <p className="text-body text-ink">
          {name} is running at {host}.
        </p>
        {versionLine(reachability.version)}
      </>
    );
  }

  if (reachability.verdict === 'unrecognized') {
    return <p className="text-body text-ink">Another server answered at {host}.</p>;
  }

  return (
    <p className="text-body text-ink">
      {name} isn&apos;t running at {host}. Start it, then check again.
    </p>
  );
}

function readingFace(name: string, host: string, reading: Reading): ReactNode {
  if (reading.face === 'looking') {
    return <p className="text-detail text-ink-secondary">Checking</p>;
  }

  if (reading.face === 'refused') {
    return <p className="text-detail text-danger-ink">{reading.reason}</p>;
  }

  return reportedFace(name, host, reading.reachability);
}

type SettleActs = {
  name: string;
  reading: Reading;
  addHeld: boolean;
  onAdd: () => void;
  onLookAgain: () => void;
};

function settleActs({ name, reading, addHeld, onAdd, onLookAgain }: SettleActs): ReactNode {
  if (reading.face === 'looking') {
    return null;
  }

  if (reading.face === 'reported' && reading.reachability.verdict === 'answers') {
    return (
      <SheetActionSlot>
        <button
          className="push-button-primary focus-ring"
          disabled={addHeld}
          onClick={onAdd}
          type="button"
        >
          Add {name}
        </button>
      </SheetActionSlot>
    );
  }

  return (
    <SheetActionSlot>
      <button className="push-button focus-ring" disabled={addHeld} onClick={onAdd} type="button">
        Add anyway
      </button>
      <button className="push-button-primary focus-ring" onClick={onLookAgain} type="button">
        Check again
      </button>
    </SheetActionSlot>
  );
}

type PortKnob = {
  form: PortForm;
  onPortChosen: (port: number) => void;
};

function pointTheLook(settled: string, onPortChosen: (port: number) => void): void {
  const chosen = runtimePortSchema.safeParse(Number(settled));

  if (chosen.success) {
    onPortChosen(chosen.data);
  }
}

function portKnob({ form, onPortChosen }: PortKnob): ReactNode {
  return (
    <div className="w-full field-box text-start">
      <RuntimePortField
        form={form}
        onCommitValue={(settled) => {
          pointTheLook(settled, onPortChosen);
        }}
      />
    </div>
  );
}

/**
 * The local connect step: it looks for the runtime on entry and reports what it found.
 *
 * @summary Reach for it under a catalog entry's local arm. No button asks permission to look,
 * because the look is a loopback read that stores nothing, and the verdict fills a slot that
 * reserved its height, so the sheet never jumps twice. The person's one knob is the port,
 * prefilled with the documented one: a port lands on Enter or on leaving the field, never on a
 * keystroke, so no look ever chases a half-typed number and the last reading holds the screen
 * while one is typed. Every sentence names the address the look actually went to. The decision
 * stays with the person: Add
 * on an answer, Check again leading on anything else, and Add anyway beside it, because adding
 * a server that will be started later is a decision too. Both adds store through the chosen port.
 */
export function DetectRuntimeStep({ runtime, onConnected }: DetectRuntimeStepProps) {
  const [lookPort, setLookPort] = useState(() => documentedRuntimePort(runtime));
  const form = usePortForm(String(documentedRuntimePort(runtime)));
  const portStands = useSelector(
    form.store,
    (state) => portRefusal(state.values.port) === undefined,
  );
  const look = useQuery(runtimeDetectionQueryOptions(runtime, lookPort));
  const connect = withRefusal(useConnectLocalRuntime());

  const name = localRuntimeName(runtime);
  const lookedAt = runtimeAddressFor(runtime, lookPort);
  const host = lookedAt.slice(lookedAt.indexOf('//') + 2);
  const reading = readingOf(look);

  const add = () => {
    connect.mutate({ runtime, port: lookPort }, { onSuccess: onConnected });
  };

  return (
    <div className="mx-auto flex w-80 flex-col items-center gap-2.5 py-4 text-center">
      <PickedIdentity lead={localLeadFor(runtime)} title={name} />
      {portKnob({ form, onPortChosen: setLookPort })}
      <div className="flex h-16 flex-col items-center justify-center gap-0.5" role="status">
        {readingFace(name, host, reading)}
      </div>
      {connect.refusal === undefined ? null : (
        <p className="text-caption text-danger-ink" role="alert">
          {connect.refusal}
        </p>
      )}
      {settleActs({
        name,
        reading,
        addHeld: connect.isPending || !portStands,
        onAdd: add,
        onLookAgain: () => {
          void look.refetch();
        },
      })}
    </div>
  );
}
