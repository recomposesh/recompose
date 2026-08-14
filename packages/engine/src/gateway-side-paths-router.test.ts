import { describe, expect, it } from 'vitest';

import { createGatewayApp } from './gateway-app';
import {
  aCredentialedGrant,
  aGatewayHolding,
  fetchAnsweringWith,
  granting,
  neverFetches,
} from './gateway-app.testkit';
import { aLadderOver, aRoutedModel, childRouteNode, ORIGIN } from './gateway-router.testkit';
import { prepareXAIWebSocketTarget } from './provider/xai-websocket-prepare';

function anAppServingALadder(answer: () => Response) {
  const grants = granting(aCredentialedGrant());
  const answering = fetchAnsweringWith(answer);
  const app = createGatewayApp(
    aGatewayHolding(aLadderOver('gpt-5-mini', 'claude-sonnet-4-5')),
    grants.grantFor,
    answering.fetchLike,
  );

  return { app, grants, sent: answering.sent };
}

async function askedNodeAfter(
  path: string,
  body: unknown,
  answer: () => Response = () => Response.json({ ok: true }),
): Promise<string | undefined> {
  const serving = anAppServingALadder(answer);

  await serving.app.request(`${ORIGIN}${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return serving.grants.asked.at(0)?.routeNode;
}

describe('a path that can serve only one target resolves the first the table declares', () => {
  it('counts tokens against the first declared child', async () => {
    await expect(
      askedNodeAfter(
        '/v1/messages/count_tokens',
        { model: 'fast', messages: [{ role: 'user', content: 'hello' }] },
        () => Response.json({ input_tokens: 17 }),
      ),
    ).resolves.toBe(childRouteNode(1));
  });

  it('compacts against the first declared child', async () => {
    await expect(
      askedNodeAfter('/v1/responses/compact', { model: 'fast', input: 'shrink this' }),
    ).resolves.toBe(childRouteNode(1));
  });

  it('searches the alpha channel against the first declared child', async () => {
    await expect(
      askedNodeAfter('/v1/alpha/search', { model: 'fast', query: 'routers' }),
    ).resolves.toBe(childRouteNode(1));
  });

  it('draws an image against the first declared child', async () => {
    await expect(
      askedNodeAfter('/v1/images/generations', { model: 'fast', prompt: 'a ladder' }),
    ).resolves.toBe(childRouteNode(1));
  });

  it('makes a video against the first declared child', async () => {
    await expect(
      askedNodeAfter('/v1/videos/generations', { model: 'fast', prompt: 'a ladder' }),
    ).resolves.toBe(childRouteNode(1));
  });

  it('prepares an xAI socket against the first declared child', async () => {
    const grants = granting(aCredentialedGrant('https://api.x.ai', 'xai'));

    await prepareXAIWebSocketTarget(
      aGatewayHolding(aLadderOver('grok-4', 'grok-3')),
      grants.grantFor,
      { model: 'fast' },
    );

    expect(grants.asked.at(0)?.routeNode).toBe(childRouteNode(1));
  });

  it('carries the first declared child provider model, not the virtual name', async () => {
    const grants = granting(aCredentialedGrant('https://api.x.ai', 'xai'));
    const prepared = await prepareXAIWebSocketTarget(
      aGatewayHolding(aLadderOver('grok-4', 'grok-3')),
      grants.grantFor,
      { model: 'fast' },
    );

    expect(prepared).toMatchObject({ crossing: { providerModel: 'grok-4' } });
  });
});

describe('a ladder whose first declared child lost its account refuses as a lone target would', () => {
  it('refuses to count tokens rather than reaching for a sibling', async () => {
    const grants = granting(aCredentialedGrant());
    const app = createGatewayApp(
      aGatewayHolding(
        aRoutedModel('failover', [
          { standing: 'removed' },
          { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
        ]),
      ),
      grants.grantFor,
      neverFetches,
    );
    const answer = await app.request(`${ORIGIN}/v1/messages/count_tokens`, {
      method: 'POST',
      body: JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hello' }] }),
    });

    expect(answer.status).toBe(502);
    expect(grants.asked).toHaveLength(0);
  });
});
