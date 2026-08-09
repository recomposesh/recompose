import type { EngineGateway, RequestOutcome } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { NoteTraffic } from './gateway-traffic';

import { createGatewayApp } from './gateway-app';
import {
  aCredentialedGrant,
  aGatewayHolding,
  aVirtualModel,
  fetchAnsweringWith,
  granting,
  grantsNothing,
  neverFetches,
} from './gateway-app.testkit';

type Noted = { slug: string; virtualModel: string; request: RequestOutcome };

function noting(): { noted: Noted[]; note: NoteTraffic } {
  const noted: Noted[] = [];

  return {
    noted,
    note: (slug, virtualModel, request) => {
      noted.push({ slug, virtualModel, request });
    },
  };
}

const fast = aVirtualModel();
const codex = aGatewayHolding(fast);

function servingGateway(gateway: EngineGateway, note: NoteTraffic) {
  const { fetchLike } = fetchAnsweringWith(() => Response.json({ id: 'msg_1' }));

  return createGatewayApp(
    gateway,
    granting(aCredentialedGrant()).grantFor,
    fetchLike,
    undefined,
    undefined,
    undefined,
    undefined,
    note,
  );
}

function refusingGateway(gateway: EngineGateway, note: NoteTraffic) {
  return createGatewayApp(
    gateway,
    grantsNothing,
    neverFetches,
    undefined,
    undefined,
    undefined,
    undefined,
    note,
  );
}

type GatewayApp = ReturnType<typeof createGatewayApp>;

async function ask(app: GatewayApp, path: string, body: unknown): Promise<Response> {
  return app.request(`http://127.0.0.1:8397${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const aTurn = { model: 'fast', messages: [{ role: 'user', content: 'hello' }] };

describe('a request the gateway carried through to its target', () => {
  test('the model route reports the virtual model it served', async () => {
    const { noted, note } = noting();

    await ask(servingGateway(codex, note), '/v1/messages', aTurn);

    expect(noted.map(({ slug, virtualModel }) => ({ slug, virtualModel }))).toEqual([
      { slug: 'codex', virtualModel: 'fast' },
    ]);
    expect(noted.at(0)?.request.outcome).toBe('served');
  });

  test('the report says when the request landed', async () => {
    const { noted, note } = noting();
    const before = Date.now();

    await ask(servingGateway(codex, note), '/v1/messages', aTurn);

    expect(noted.at(0)?.request.at).toBeGreaterThanOrEqual(before);
  });

  test('the token count route reports the virtual model it counted for', async () => {
    const { noted, note } = noting();

    await ask(servingGateway(codex, note), '/v1/messages/count_tokens', aTurn);

    expect(noted.map((one) => one.virtualModel)).toEqual(['fast']);
  });

  test('the compaction route reports the virtual model it compacted for', async () => {
    const { noted, note } = noting();

    await ask(servingGateway(codex, note), '/v1/responses/compact', {
      model: 'fast',
      input: [{ type: 'compaction_trigger' }],
    });

    expect(noted.map((one) => one.virtualModel)).toEqual(['fast']);
  });

  test('the image route reports the virtual model it drew with', async () => {
    const { noted, note } = noting();

    await ask(servingGateway(codex, note), '/v1/images/generations', {
      model: 'fast',
      prompt: 'a cat',
    });

    expect(noted.map((one) => one.virtualModel)).toEqual(['fast']);
  });
});

describe('a request the gateway could not carry through', () => {
  test('a virtual model whose target left is reported failed, with the status and a sentence', async () => {
    const { noted, note } = noting();

    await ask(refusingGateway(codex, note), '/v1/messages', aTurn);

    expect(noted.at(0)?.request).toMatchObject({
      outcome: 'failed',
      status: 502,
      detail: 'The gateway could not reach the target.',
    });
  });

  test('nothing the request carried rides along with the report', async () => {
    const { noted, note } = noting();

    await ask(refusingGateway(codex, note), '/v1/messages', {
      model: 'fast',
      messages: [{ role: 'user', content: 'my diary entry' }],
    });

    expect(JSON.stringify(noted)).not.toContain('my diary entry');
  });
});

describe('a request that never reached a virtual model', () => {
  test('a model nobody defined is reported nowhere, because no cable owns it', async () => {
    const { noted, note } = noting();

    await ask(refusingGateway(codex, note), '/v1/messages', { model: 'ghost', messages: [] });

    expect(noted).toEqual([]);
  });

  test('a health check is reported nowhere', async () => {
    const { noted, note } = noting();

    await servingGateway(codex, note).request('http://127.0.0.1:8397/health');

    expect(noted).toEqual([]);
  });

  test('a path the gateway serves nothing on is reported nowhere', async () => {
    const { noted, note } = noting();

    await ask(refusingGateway(codex, note), '/v1/nowhere', aTurn);

    expect(noted).toEqual([]);
  });
});

describe('a gateway nobody handed a way to report', () => {
  test('it still serves, because traffic reporting is not what a gateway is for', async () => {
    const { fetchLike } = fetchAnsweringWith(() => Response.json({ id: 'msg_1' }));
    const app = createGatewayApp(codex, granting(aCredentialedGrant()).grantFor, fetchLike);

    const answer = await ask(app, '/v1/messages', aTurn);

    expect(answer.status).toBe(200);
  });
});
