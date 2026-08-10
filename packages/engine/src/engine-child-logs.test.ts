import { engineLogReportSchema, engineSpendRequestSchema } from '@recompose/contracts';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { ParentPort } from './parent-port';

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
import { rowsStanding } from './gateway-logs.testkit';
import { providerObservability } from './provider/provider-observability';

function aServingChild(answer: () => Response) {
  const parent = aParent();
  const capturing = aLoopbackCapturing();
  const { fetchLike } = fetchAnsweringWith(answer);

  attachEngineChild(parent.port, capturing.openListeners, fetchLike);
  parent.send({ kind: 'start', id: 'd1', gateway: aGatewayHolding(aVirtualModel()) });

  return { parent, capturing };
}

function aChildWhoseLogLaneBroke(answer: () => Response) {
  const parent = aParent();
  const capturing = aLoopbackCapturing();
  const { fetchLike } = fetchAnsweringWith(answer);
  const brokenPort: ParentPort = {
    postMessage: (message) => {
      if (engineLogReportSchema.safeParse(message).success) {
        throw new Error('the parent port is gone');
      }

      parent.port.postMessage(message);
    },
    on: parent.port.on,
  };

  attachEngineChild(brokenPort, capturing.openListeners, fetchLike);
  parent.send({ kind: 'start', id: 'd1', gateway: aGatewayHolding(aVirtualModel()) });

  return { parent, capturing };
}

type ServingChild = ReturnType<typeof aServingChild>;

async function grantThenAnswer(child: ServingChild, model: string): Promise<Response> {
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

  const answer = await answering;

  await answer.text();

  return answer;
}

function logsIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = engineLogReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

function rowsStandingIn(reports: readonly unknown[]) {
  return rowsStanding(logsIn(reports).map(({ row }) => row));
}

afterEach(() => {
  providerObservability().clear();
});

describe('a row the parent could not be told', () => {
  test('the caller keeps its answer, and the gateway it was for is written down', async () => {
    const complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const child = aChildWhoseLogLaneBroke(() => Response.json({ choices: [] }));

    const answer = await grantThenAnswer(child, 'fast');

    expect(answer.status).toBe(200);
    expect(JSON.stringify(complaints.mock.calls)).toContain('codex');
    complaints.mockRestore();
  });
});

describe('what the parent hears once one request has been logged', () => {
  test('a request the target answered stands as one row on the parent port', async () => {
    const child = aServingChild(() => Response.json({ choices: [] }));

    await grantThenAnswer(child, 'fast');
    await reportsReach(child.parent, 5);

    expect(rowsStandingIn(child.parent.reports)).toMatchObject([
      { gateway: 'codex', virtualModel: 'fast', origin: 'provider' },
    ]);
  });

  test('nothing the request carried rides a row to the parent', async () => {
    const child = aServingChild(() => Response.json({ choices: [] }));

    await grantThenAnswer(child, 'fast');
    await reportsReach(child.parent, 5);

    expect(JSON.stringify(logsIn(child.parent.reports))).not.toContain('my diary entry');
  });

  test('the child reads the buffer without draining it, because management drains it', async () => {
    const child = aServingChild(() => Response.json({ choices: [] }));

    await grantThenAnswer(child, 'fast');
    await reportsReach(child.parent, 5);

    expect(providerObservability().snapshot()).toHaveLength(1);
  });
});
