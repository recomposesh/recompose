import { afterEach, describe, expect, test } from 'vitest';

import { refusingGateway, rowsFrom, servingGateway } from './gateway-app-logs.testkit';
import { providerObservability } from './provider/provider-observability';

afterEach(() => {
  providerObservability().clear();
});

describe('why a failed request failed, as the drawer explains it', () => {
  const quotaRefusal = () =>
    Response.json({ error: { message: 'You exceeded your current quota.' } }, { status: 429 });

  test("a target that explained itself has its own words beside the gateway's reading", async () => {
    const rows = await rowsFrom(servingGateway(quotaRefusal));

    expect(rows.at(0)?.failure).toBe('The target is turning requests away for now.');
    expect(rows.at(0)?.diagnosis).toEqual({
      upstreamMessage: 'You exceeded your current quota.',
    });
  });

  test('a target that refused without a word leaves the row nothing to quote', async () => {
    const rows = await rowsFrom(servingGateway(() => new Response('{}', { status: 429 })));

    expect(rows.at(0)?.diagnosis).toBeUndefined();
  });

  test('a request that was served carries no reading, because nothing failed to explain', async () => {
    const rows = await rowsFrom(servingGateway(() => Response.json({ choices: [] })));

    expect(rows.at(0)?.diagnosis).toBeUndefined();
  });

  test('an answer a provider wrapped its whole body in is quoted as nothing at all', async () => {
    const wrapped = () =>
      Response.json({ error: { message: '{"messages":[{"role":"user"}]}' } }, { status: 500 });
    const rows = await rowsFrom(servingGateway(wrapped));

    expect(rows.at(0)?.diagnosis).toBeUndefined();
  });

  test('a virtual model whose target left names the model its binding pointed at', async () => {
    const rows = await rowsFrom(refusingGateway());

    expect(rows.at(0)?.diagnosis).toEqual({
      tried: [{ child: 'gpt-5-mini', why: 'has no target' }],
    });
  });

  test('a request too broken to read explains nothing, because it reached no route table', async () => {
    const rows = await rowsFrom(refusingGateway(), '{"model":');

    expect(rows.at(0)?.diagnosis).toBeUndefined();
  });
});
