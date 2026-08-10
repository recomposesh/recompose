import { engineLogReportSchema, engineSpendRequestSchema } from '@recompose/contracts';
import { afterEach, describe, expect, test } from 'vitest';

import { attachEngineChild } from './engine-child';
import { aParent, reportsReach } from './engine-child.testkit';
import {
  aGatewayHolding,
  aGrantAnswering,
  aLoopbackCapturing,
  aVirtualModel,
  fetchAnsweringWith,
  openedApp,
} from './gateway-app.testkit';
import { providerObservability } from './provider/provider-observability';

function aServingChild(answer: () => Response) {
  const parent = aParent();
  const capturing = aLoopbackCapturing();
  const { fetchLike } = fetchAnsweringWith(answer);

  attachEngineChild(parent.port, capturing.openListeners, fetchLike);
  parent.send({ kind: 'start', id: 'd1', gateway: aGatewayHolding(aVirtualModel()) });

  return { parent, capturing };
}

type ServingChild = ReturnType<typeof aServingChild>;

async function grantThenAnswer(child: ServingChild, model: string): Promise<void> {
  await reportsReach(child.parent, 1);

  const answering = openedApp(child.capturing).request(
    'http://127.0.0.1:8397/v1/chat/completions',
    {
      method: 'POST',
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'my diary entry' }] }),
      headers: { 'user-agent': 'curl/8.7.1' },
    },
    { incoming: { socket: { remoteAddress: '127.0.0.1' } } },
  );

  await reportsReach(child.parent, 2);

  const ask = engineSpendRequestSchema.parse(child.parent.reports[1]);

  child.parent.send(aGrantAnswering(ask.id, 'http://127.0.0.1:4242'));
  await (await answering).text();
}

function logsIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = engineLogReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

afterEach(() => {
  providerObservability().clear();
});

describe('what the parent hears once one request has been logged', () => {
  test('a request the target answered leaves as one log report carrying its row', async () => {
    const child = aServingChild(() => Response.json({ choices: [] }));

    await grantThenAnswer(child, 'fast');
    await reportsReach(child.parent, 4);

    expect(logsIn(child.parent.reports)).toMatchObject([
      { kind: 'log', row: { gateway: 'codex', virtualModel: 'fast', origin: 'provider' } },
    ]);
  });

  test('nothing the request carried rides a row to the parent', async () => {
    const child = aServingChild(() => Response.json({ choices: [] }));

    await grantThenAnswer(child, 'fast');
    await reportsReach(child.parent, 4);

    expect(JSON.stringify(logsIn(child.parent.reports))).not.toContain('my diary entry');
  });

  test('the child reads the buffer without draining it, because management drains it', async () => {
    const child = aServingChild(() => Response.json({ choices: [] }));

    await grantThenAnswer(child, 'fast');
    await reportsReach(child.parent, 4);

    expect(providerObservability().snapshot()).toHaveLength(1);
  });
});
