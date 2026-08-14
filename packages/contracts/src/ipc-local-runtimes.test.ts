import { describe, expect, test } from 'vitest';

import { ACCOUNTS_VERSION } from './accounts';
import { ipcChannels } from './ipc';

const connectLocal = ipcChannels['accounts:connect-local'].request;

const detect = ipcChannels['accounts:detect-runtime'].request;

const check = ipcChannels['accounts:check-runtime'].request;

const storedRuntime = {
  id: 'acc-ollama',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

describe('what the local runtime channels ask for', () => {
  test('connecting a documented runtime names it and at most a port', () => {
    expect(connectLocal.parse({ runtime: 'ollama' })).toEqual({ runtime: 'ollama' });
    expect(
      connectLocal.safeParse({ runtime: 'ollama', address: 'http://127.0.0.1:11434' }).success,
    ).toBe(false);
  });

  test('no local request has a field a secret could occupy', () => {
    for (const smuggled of [{ secret: 'sk-abc' }, { key: 'sk-abc' }, { credentialRef: 'cred-1' }]) {
      expect(connectLocal.safeParse({ runtime: 'ollama', ...smuggled }).success).toBe(false);
      expect(detect.safeParse({ runtime: 'ollama', ...smuggled }).success).toBe(false);
      expect(check.safeParse({ id: storedRuntime.id, ...smuggled }).success).toBe(false);
    }
  });

  test('either look may point at another port, and no port at all means the documented one', () => {
    for (const request of [connectLocal, detect]) {
      expect(request.parse({ runtime: 'ollama', port: 9000 })).toEqual({
        runtime: 'ollama',
        port: 9000,
      });
      expect(request.parse({ runtime: 'ollama' })).toEqual({ runtime: 'ollama' });
    }
  });

  test('a port outside what a loopback server can bind is refused', () => {
    for (const request of [connectLocal, detect]) {
      for (const port of [0, 65536, 11434.5, '9000']) {
        expect(request.safeParse({ runtime: 'ollama', port }).success).toBe(false);
      }
    }
  });

  test('connecting or detecting a runtime nothing reaches is refused', () => {
    for (const request of [connectLocal, detect]) {
      expect(request.safeParse({ runtime: 'text-generation-webui' }).success).toBe(false);
      expect(request.safeParse({ runtime: '' }).success).toBe(false);
      expect(request.safeParse(undefined).success).toBe(false);
    }
  });

  test('detecting names a runtime, and checking names a stored row instead', () => {
    expect(detect.parse({ runtime: 'ollama' })).toEqual({ runtime: 'ollama' });
    expect(detect.safeParse({ id: storedRuntime.id }).success).toBe(false);
    expect(check.parse({ id: storedRuntime.id })).toEqual({ id: storedRuntime.id });
    expect(check.safeParse({ runtime: 'ollama' }).success).toBe(false);
    expect(check.safeParse({ id: '   ' }).success).toBe(false);
  });
});

describe('moving a stored runtime to another port', () => {
  const move = ipcChannels['accounts:move-runtime'].request;

  test('the move names the row it moves and the port it moves to', () => {
    const asked = { id: storedRuntime.id, port: 11435 };

    expect(move.parse(asked)).toEqual(asked);
  });

  test('a move naming no port is refused, because there is nowhere to move to', () => {
    expect(move.safeParse({ id: storedRuntime.id }).success).toBe(false);
  });

  test('a move onto a port no server can hold is refused where it is asked for', () => {
    expect(move.safeParse({ id: storedRuntime.id, port: 0 }).success).toBe(false);
    expect(move.safeParse({ id: storedRuntime.id, port: 70_000 }).success).toBe(false);
  });

  test('a move carries no address, because the app mints one from the port', () => {
    expect(
      move.safeParse({ id: storedRuntime.id, port: 11435, address: 'http://elsewhere:1' }).success,
    ).toBe(false);
  });

  test('a move names a row rather than a runtime, because only a row has somewhere to move from', () => {
    expect(move.safeParse({ runtime: 'ollama', port: 11435 }).success).toBe(false);
    expect(move.safeParse({ id: '   ', port: 11435 }).success).toBe(false);
  });

  test('the move answers the whole accounts document, the way every account act does', () => {
    const answered = {
      ok: true,
      value: { schemaVersion: ACCOUNTS_VERSION, accounts: [storedRuntime] },
    };

    expect(ipcChannels['accounts:move-runtime'].response.parse(answered)).toEqual(answered);
  });
});

describe('what a server nobody documents must name', () => {
  test('it names its own port and the name a person gave it', () => {
    const own = { runtime: 'custom', port: 9000, label: 'Bench box' };

    expect(connectLocal.parse(own)).toEqual(own);
  });

  test('a port it never named is refused, because nothing documents one to assume', () => {
    expect(connectLocal.safeParse({ runtime: 'custom', label: 'Bench box' }).success).toBe(false);
    expect(detect.safeParse({ runtime: 'custom' }).success).toBe(false);
  });

  test('a name it never carried is refused, because no project names it instead', () => {
    expect(connectLocal.safeParse({ runtime: 'custom', port: 9000 }).success).toBe(false);
  });
});

describe('what the local runtime channels answer', () => {
  test('connecting answers the whole registry, the document a connect always answers', () => {
    const registry = { schemaVersion: ACCOUNTS_VERSION, accounts: [storedRuntime] };

    expect(
      ipcChannels['accounts:connect-local'].response.parse({ ok: true, value: registry }),
    ).toEqual({ ok: true, value: registry });
  });

  test('a stored row crossing back carries no credential to smuggle one in', () => {
    const smuggled = {
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [{ ...storedRuntime, credentialRef: 'cred-1' }],
    };

    expect(
      ipcChannels['accounts:connect-local'].response.safeParse({ ok: true, value: smuggled })
        .success,
    ).toBe(false);
  });

  test('detecting and checking each answer one reading of the machine', () => {
    for (const channel of ['accounts:detect-runtime', 'accounts:check-runtime'] as const) {
      const answered = { ok: true, value: { verdict: 'answers', version: '0.5.1' } };

      expect(ipcChannels[channel].response.parse(answered)).toEqual(answered);
      expect(
        ipcChannels[channel].response.parse({ ok: true, value: { verdict: 'unreachable' } }),
      ).toEqual({ ok: true, value: { verdict: 'unreachable' } });
    }
  });

  test('a reading cannot borrow the words a key check answers with', () => {
    for (const channel of ['accounts:detect-runtime', 'accounts:check-runtime'] as const) {
      expect(
        ipcChannels[channel].response.safeParse({ ok: true, value: { verdict: 'authenticates' } })
          .success,
      ).toBe(false);
    }
  });

  test('a runtime that does not answer is a reading rather than a refusal', () => {
    const silence = { ok: true, value: { verdict: 'unreachable' } };

    expect(ipcChannels['accounts:detect-runtime'].response.parse(silence)).toEqual(silence);
  });
});
