import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleepFor } from 'node:timers/promises';

/**
 * The one door onto the machine's one clipboard.
 *
 * @summary `mkdir` either creates the directory or refuses, in one step the operating system will
 * not interleave, which is what makes it a lock across processes. The acceptance project runs ten
 * workers locally, so a plain variable would lock nothing: the rivals are other processes.
 */
const THE_CLIPBOARD_DOOR = join(tmpdir(), 'recompose-e2e-clipboard.lock');

/** Longer than any one clipboard scenario takes, and short enough to fail a run rather than hang it. */
const WAITS_MS = 60_000;

const LOOKS_EVERY_MS = 50;

async function opened(): Promise<boolean> {
  return mkdir(THE_CLIPBOARD_DOOR).then(
    () => true,
    () => false,
  );
}

async function closed(): Promise<void> {
  await rm(THE_CLIPBOARD_DOOR, { force: true, recursive: true });
}

/**
 * Holds the machine's clipboard for one scenario, and hands back the way to let it go.
 *
 * @summary Three scenarios copy something and read it back, and a sibling scenario writing between
 * those two steps replaces the value under the one doing the reading. Retries absorb it today,
 * which is why it reads as flake rather than as the defect it is. The value that loses the race is
 * always a well-formed value a sibling wrote, never a wrong value from the code under test.
 *
 * A worker killed mid-scenario leaves the door shut behind it, so a wait that outlasts any real
 * scenario opens it rather than letting the whole run hang on a process that is gone.
 */
export async function theClipboardIsHeld(): Promise<() => Promise<void>> {
  const until = Date.now() + WAITS_MS;

  while (!(await opened())) {
    if (Date.now() >= until) {
      await closed();

      if (!(await opened())) {
        throw new Error('the clipboard stayed held even after a stale hold was cleared');
      }

      break;
    }

    await sleepFor(LOOKS_EVERY_MS);
  }

  return closed;
}
