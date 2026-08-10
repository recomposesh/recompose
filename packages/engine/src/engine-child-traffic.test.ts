import { engineSpendRequestSchema, engineTrafficReportSchema } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

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

const fast = aVirtualModel();

function aServingChild(answer: () => Response) {
  const parent = aParent();
  const capturing = aLoopbackCapturing();
  const { fetchLike } = fetchAnsweringWith(answer);

  attachEngineChild(parent.port, capturing.openListeners, fetchLike);
  parent.send({ kind: 'start', id: 'd1', gateway: aGatewayHolding(fast) });

  return { parent, capturing };
}

async function askUnder(child: ReturnType<typeof aServingChild>, model: string): Promise<Response> {
  return openedApp(child.capturing).request('http://127.0.0.1:8397/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hello' }] }),
  });
}

function trafficIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = engineTrafficReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

async function grantThenAnswer(
  child: ReturnType<typeof aServingChild>,
  model: string,
): Promise<void> {
  await reportsReach(child.parent, 1);

  const answering = askUnder(child, model);

  await reportsReach(child.parent, 2);

  const ask = engineSpendRequestSchema.parse(child.parent.reports[1]);

  child.parent.send(aGrantAnswering(ask.id, 'http://127.0.0.1:4242'));

  await answering;
  await reportsReach(child.parent, 3);
}

describe('what the parent hears once a request through a gateway has finished', () => {
  test('a request the target answered is reported served under its gateway and model', async () => {
    const child = aServingChild(() => Response.json({ choices: [] }));

    await grantThenAnswer(child, 'fast');

    const traffic = trafficIn(child.parent.reports);

    expect(traffic.map(({ kind, slug, virtualModel }) => ({ kind, slug, virtualModel }))).toEqual([
      { kind: 'traffic', slug: 'codex', virtualModel: 'fast' },
    ]);
    expect(traffic.at(0)?.request.outcome).toBe('served');
  });

  test('a request the target turned away is reported failed with the status', async () => {
    const child = aServingChild(() => new Response('{}', { status: 429 }));

    await grantThenAnswer(child, 'fast');

    expect(trafficIn(child.parent.reports).at(0)?.request).toMatchObject({
      outcome: 'failed',
      status: 429,
    });
  });

  test('a request naming a model the gateway never held is reported nowhere', async () => {
    const child = aServingChild(() => Response.json({ choices: [] }));

    await reportsReach(child.parent, 1);
    await askUnder(child, 'ghost');

    expect(trafficIn(child.parent.reports)).toEqual([]);
  });

  test('nothing the request carried rides to the parent', async () => {
    const child = aServingChild(() => new Response('{}', { status: 500 }));

    await reportsReach(child.parent, 1);

    const answering = openedApp(child.capturing).request(
      'http://127.0.0.1:8397/v1/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify({
          model: 'fast',
          messages: [{ role: 'user', content: 'my diary entry' }],
        }),
      },
    );

    await reportsReach(child.parent, 2);

    const ask = engineSpendRequestSchema.parse(child.parent.reports[1]);

    child.parent.send(aGrantAnswering(ask.id, 'http://127.0.0.1:4242'));
    await answering;
    await reportsReach(child.parent, 3);

    expect(JSON.stringify(child.parent.reports)).not.toContain('my diary entry');
  });
});
