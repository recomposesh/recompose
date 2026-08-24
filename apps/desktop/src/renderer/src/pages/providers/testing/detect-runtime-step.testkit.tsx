import type { RecomposeIpc, RuntimeReachability } from '@recompose/contracts';

import { useState } from 'react';
import { page, userEvent } from 'vitest/browser';

import type { BridgeParameters } from '../../../shared/testing';

import { renderUnderTheBridge } from '../../../shared/browser-testing';
import { DetectRuntimeStep } from '../ui/detect-runtime-step/detect-runtime-step';

function Step() {
  const [connected, setConnected] = useState(false);

  return connected ? (
    <p>The step stepped aside.</p>
  ) : (
    <DetectRuntimeStep
      onConnected={() => {
        setConnected(true);
      }}
      runtime="ollama"
    />
  );
}

export async function renderStep(parameters: BridgeParameters = {}) {
  return renderUnderTheBridge(<Step />, parameters);
}

export function lookAnsweringInTurn(...readings: readonly RuntimeReachability[]) {
  let looksTaken = 0;

  return async () => {
    const reading = readings[Math.min(looksTaken, readings.length - 1)];

    looksTaken += 1;

    if (reading === undefined) {
      throw new Error('the scripted look ran out of readings');
    }

    return Promise.resolve({ ok: true as const, value: reading });
  };
}

export function lookRecordingPorts(reading: RuntimeReachability) {
  const looked: (number | undefined)[] = [];

  const look: RecomposeIpc['accounts:detect-runtime'] = async ({ port }) => {
    looked.push(port);

    return Promise.resolve({ ok: true as const, value: reading });
  };

  return { looked, look };
}

export function lookAnsweringOnPort(
  answeringPort: number,
  version: string,
): RecomposeIpc['accounts:detect-runtime'] {
  return async ({ port }) =>
    Promise.resolve({
      ok: true as const,
      value: port === answeringPort ? { verdict: 'answers', version } : { verdict: 'unreachable' },
    });
}

export function lookRefusedAfterOne(
  first: RuntimeReachability,
): RecomposeIpc['accounts:detect-runtime'] {
  let looksTaken = 0;

  return async () => {
    looksTaken += 1;

    return looksTaken === 1
      ? Promise.resolve({ ok: true as const, value: first })
      : Promise.resolve({
          ok: false as const,
          error: {
            code: 'storage-failed' as const,
            message: 'recompose could not read the registry.',
          },
        });
  };
}

export { pressNamedControl as press } from './row-acts.testkit';

export async function commitPort(port: string) {
  await page.getByRole('textbox', { name: 'Port', exact: true }).fill(port);
  await userEvent.keyboard('{Enter}');
}

export async function typePortDraft(digits: string) {
  const field = page.getByRole('textbox', { name: 'Port', exact: true });

  await field.fill('');
  await userEvent.type(field, digits);
}

export async function walkAwayFromThePort() {
  await userEvent.tab();
}

export async function storedAccounts() {
  const registry = await window.recompose['accounts:list']();

  return registry.ok ? registry.value.accounts : [];
}
