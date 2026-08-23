import type { LookCustody } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { copilotCatalog, copilotWireOf } from './copilot-catalog';
import { fetchAnswering } from './model-list.testkit';

const origin = 'https://api.githubcopilot.com';

const custody: Extract<LookCustody, { custody: 'subscription' }> = {
  custody: 'subscription',
  provider: 'copilot',
  accountId: 'acc-copilot',
  credential: 'a-copilot-plan-token',
  renewal: 'owning-tool',
};

const catalogBody = JSON.stringify({
  data: [
    { id: 'gpt-4.1', supported_endpoints: ['/chat/completions'] },
    { id: 'mai-code-1.1-flash', supported_endpoints: ['/responses'] },
  ],
});

function clockFrom(startMs: number) {
  let nowMs = startMs;

  return { now: () => nowMs, advance: (byMs: number) => (nowMs += byMs) };
}

describe('the wire a Copilot turn is reached on', () => {
  test('reaches a Responses-only model on Responses, as its catalog names', async () => {
    const { fetchLike } = fetchAnswering(200, catalogBody);
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await expect(copilotWireOf(deps, custody, origin, 'mai-code-1.1-flash')).resolves.toEqual({
      dialect: 'responses',
      path: '/responses',
    });
  });

  test('reaches a completions model where the catalog names that endpoint', async () => {
    const { fetchLike } = fetchAnswering(200, catalogBody);
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await expect(copilotWireOf(deps, custody, origin, 'gpt-4.1')).resolves.toEqual({
      dialect: 'chat-completions',
      path: '/chat/completions',
    });
  });

  test('asks the vendor once however many turns cross inside one window', async () => {
    const { sent, fetchLike } = fetchAnswering(200, catalogBody);
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await copilotWireOf(deps, custody, origin, 'gpt-4.1');
    await copilotWireOf(deps, custody, origin, 'mai-code-1.1-flash');

    expect(sent).toHaveLength(1);
  });

  test('reads the catalog again once the window it was read in has passed', async () => {
    const { sent, fetchLike } = fetchAnswering(200, catalogBody);
    const clock = clockFrom(0);
    const deps = { fetchLike, now: clock.now, catalog: copilotCatalog() };

    await copilotWireOf(deps, custody, origin, 'gpt-4.1');
    clock.advance(60 * 60 * 1000);
    await copilotWireOf(deps, custody, origin, 'gpt-4.1');

    expect(sent).toHaveLength(2);
  });
});

describe('a Copilot catalog that answers nothing useful', () => {
  test('keeps the completions reach for a model the catalog never named', async () => {
    const { fetchLike } = fetchAnswering(200, catalogBody);
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await expect(copilotWireOf(deps, custody, origin, 'gpt-9-unheard-of')).resolves.toEqual({
      dialect: 'chat-completions',
      path: '/chat/completions',
    });
  });

  test('keeps the completions reach where the catalog cannot be read at all', async () => {
    const { fetchLike } = fetchAnswering(500, null);
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await expect(copilotWireOf(deps, custody, origin, 'mai-code-1.1-flash')).resolves.toEqual({
      dialect: 'chat-completions',
      path: '/chat/completions',
    });
  });

  test('carries the account own credential when it reads the catalog', async () => {
    const { sent, fetchLike } = fetchAnswering(200, catalogBody);
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await copilotWireOf(deps, custody, origin, 'gpt-4.1');

    expect(new Headers(sent[0]?.init.headers).get('Authorization')).toBe(
      `Bearer ${custody.credential}`,
    );
  });
});

describe('how the Copilot catalog is read', () => {
  test('reads it at the account own origin, however that origin was spelled', async () => {
    const { sent, fetchLike } = fetchAnswering(200, catalogBody);
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await copilotWireOf(deps, custody, 'https://api.githubcopilot.com//', 'gpt-4.1');

    expect(sent[0]?.url).toBe('https://api.githubcopilot.com/models');
  });

  test('holds the read for the whole window and no longer', async () => {
    const { sent, fetchLike } = fetchAnswering(200, catalogBody);
    const clock = clockFrom(1_700_000_000_000);
    const deps = { fetchLike, now: clock.now, catalog: copilotCatalog() };

    await copilotWireOf(deps, custody, origin, 'gpt-4.1');
    clock.advance(10 * 60 * 1000 - 1);
    await copilotWireOf(deps, custody, origin, 'gpt-4.1');
    expect(sent).toHaveLength(1);

    clock.advance(1);
    await copilotWireOf(deps, custody, origin, 'gpt-4.1');
    expect(sent).toHaveLength(2);
  });

  test('reads past an entry the catalog shaped as no model at all', async () => {
    const body = JSON.stringify({
      data: [
        'not-an-entry',
        { id: 7, supported_endpoints: ['/responses'] },
        { supported_endpoints: ['/responses'] },
        { id: 'mai-code-1.1-flash', supported_endpoints: ['/responses'] },
      ],
    });
    const { fetchLike } = fetchAnswering(200, body);
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await expect(copilotWireOf(deps, custody, origin, 'mai-code-1.1-flash')).resolves.toEqual({
      dialect: 'responses',
      path: '/responses',
    });
  });

  test('keeps the completions reach where the catalog is no catalog at all', async () => {
    const { fetchLike } = fetchAnswering(200, JSON.stringify({ data: 'nothing' }));
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await expect(copilotWireOf(deps, custody, origin, 'mai-code-1.1-flash')).resolves.toEqual({
      dialect: 'chat-completions',
      path: '/chat/completions',
    });
  });
});

describe('the shape the catalog read takes on the wire', () => {
  test('reads it rather than writing to it, and refuses a redirect', async () => {
    const { sent, fetchLike } = fetchAnswering(200, catalogBody);
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await copilotWireOf(deps, custody, origin, 'gpt-4.1');

    expect(sent[0]?.init.method).toBe('GET');
    expect(sent[0]?.init.redirect).toBe('error');
  });

  test('keeps the completions reach where the read never returns at all', async () => {
    const fetchLike: typeof fetch = async () => Promise.reject(new Error('no route to host'));
    const deps = { fetchLike, now: () => 0, catalog: copilotCatalog() };

    await expect(copilotWireOf(deps, custody, origin, 'mai-code-1.1-flash')).resolves.toEqual({
      dialect: 'chat-completions',
      path: '/chat/completions',
    });
  });
});
