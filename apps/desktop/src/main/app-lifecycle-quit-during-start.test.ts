import { beforeEach, describe, expect, test, vi } from 'vitest';

import { registerAppLifecycle } from './app-lifecycle';
import { aFreshDesktop, desktop, fire } from './app-lifecycle.testkit';

vi.mock('electron', async () => (await import('./app-lifecycle.testkit')).electronFake());

/** Records what a start is told before and after the one thing it waits on. */
function answersFromAStartThat(waits: () => Promise<void>): boolean[] {
  const answers: boolean[] = [];

  registerAppLifecycle({
    start: async (stillWanted) => {
      answers.push(stillWanted());
      await waits();
      answers.push(stillWanted());
    },
    activate: () => {},
    dispose: () => {},
  });

  return answers;
}

beforeEach(() => {
  aFreshDesktop();
});

describe('a quit that arrives while the app is still starting', () => {
  test('the start is told it is no longer wanted, so it stops rather than finishing', async () => {
    let letStartFinish = (): void => {};
    const held = new Promise<void>((settle) => {
      letStartFinish = settle;
    });
    const answers = answersFromAStartThat(async () => held);

    desktop.announceReady();

    await vi.waitFor(() => {
      expect(answers).toHaveLength(1);
    });

    fire('before-quit');
    letStartFinish();

    await vi.waitFor(() => {
      expect(answers).toEqual([true, false]);
    });
  });

  test('a start that runs to the end with no quit is wanted throughout', async () => {
    const answers = answersFromAStartThat(async () => Promise.resolve());

    desktop.announceReady();

    await vi.waitFor(() => {
      expect(answers).toEqual([true, true]);
    });
  });
});
