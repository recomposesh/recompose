import { describe, expect, test } from 'vitest';

import { securityKeychain } from './macos-keychain';

const A_SECRET = 'sk-ant-oat01-a-blob-that-must-never-leave-the-keychain';

const item = { service: 'recompose-parked-credentials', account: 'acc-one' };

type Ask = { command: string; args: readonly string[]; boundMs: number; input?: string };

function recordingRunner() {
  const asked: Ask[] = [];

  return {
    asked,
    run: async (command: string, args: readonly string[], boundMs: number, input?: string) => {
      asked.push({ command, args, boundMs, ...(input === undefined ? {} : { input }) });

      return Promise.resolve('');
    },
  };
}

describe('what a keychain write puts where any process can read it', () => {
  test('the argument vector never carries the credential', async () => {
    const runner = recordingRunner();

    await securityKeychain('/usr/bin/security', runner.run).write(item, A_SECRET);

    expect(runner.asked[0]?.args.join(' ')).not.toContain(A_SECRET);
  });

  test('the credential rides the standard input instead', async () => {
    const runner = recordingRunner();

    await securityKeychain('/usr/bin/security', runner.run).write(item, A_SECRET);

    expect(runner.asked[0]?.input).toContain(A_SECRET);
  });

  test('the vector carries the interactive flag and nothing else', async () => {
    const runner = recordingRunner();

    await securityKeychain('/usr/bin/security', runner.run).write(item, A_SECRET);

    expect(runner.asked[0]?.args).toEqual(['-i']);
  });
});

describe('how long a keychain act may hold the child open', () => {
  test('a write is bounded, so an unanswered prompt cannot hold it forever', async () => {
    const runner = recordingRunner();

    await securityKeychain('/usr/bin/security', runner.run).write(item, A_SECRET);

    expect(runner.asked[0]?.boundMs).toBeGreaterThan(0);
  });

  test('a read is bounded too', async () => {
    const runner = recordingRunner();

    await securityKeychain('/usr/bin/security', runner.run).read(item);

    expect(runner.asked[0]?.boundMs).toBeGreaterThan(0);
  });

  test('the bound outlasts a person reaching for the prompt', async () => {
    const runner = recordingRunner();
    const A_MINUTE = 60_000;

    await securityKeychain('/usr/bin/security', runner.run).write(item, A_SECRET);

    expect(runner.asked[0]?.boundMs).toBeGreaterThanOrEqual(A_MINUTE);
  });
});
