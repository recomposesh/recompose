import { enginePlanUsageReportSchema } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import type { ParentPort } from './parent-port';

import { attachEngineChild } from './engine-child';
import { aParent } from './engine-child.testkit';
import { aLoopbackCapturing } from './gateway-app.testkit';
import { ProviderObservability } from './provider/provider-observability';

const ACCOUNT = 'anthropic-personal';

const READ_AT = 1_700_000_000_000;

function anAttachedChild() {
  const parent = aParent();

  attachEngineChild(parent.port, aLoopbackCapturing().openListeners);

  return parent;
}

function readingsIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = enginePlanUsageReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

function anAnthropicAnswerSpending(spentShare: string): void {
  new ProviderObservability({ wallClock: () => READ_AT })
    .start({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      accountId: ACCOUNT,
      dialect: 'anthropic',
      method: 'POST',
    })
    .complete(
      200,
      new Headers({ 'anthropic-ratelimit-unified-5h-utilization': spentShare }),
      new Uint8Array(),
    );
}

describe('what the parent hears about the plan behind an account', () => {
  test('a vendor that reported its plan tells the parent what that account now reads', () => {
    const parent = anAttachedChild();

    anAnthropicAnswerSpending('0.42');

    expect(readingsIn(parent.reports)).toEqual([
      {
        kind: 'plan-usage',
        reading: {
          accountId: ACCOUNT,
          provider: 'anthropic',
          readAt: READ_AT,
          windows: [{ length: '5h', spentShare: 0.42 }],
        },
      },
    ]);
  });

  test('a further answer tells the parent the newer share, so no figure is heard once only', () => {
    const parent = anAttachedChild();

    anAnthropicAnswerSpending('0.42');
    anAnthropicAnswerSpending('0.55');

    expect(readingsIn(parent.reports).at(-1)?.reading.windows).toEqual([
      { length: '5h', spentShare: 0.55 },
    ]);
  });

  test('a lane the parent cannot hear costs the request nothing', () => {
    const parent = aParent();
    const brokenPort: ParentPort = {
      postMessage: (message) => {
        if (enginePlanUsageReportSchema.safeParse(message).success) {
          throw new Error('the parent port is gone');
        }

        parent.port.postMessage(message);
      },
      on: parent.port.on,
    };

    attachEngineChild(brokenPort, aLoopbackCapturing().openListeners);

    expect(() => {
      anAnthropicAnswerSpending('0.42');
    }).not.toThrow();
  });
});
