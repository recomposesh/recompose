import type { Browser, ConsoleMessage, Page } from '@playwright/test';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import { expect } from '@playwright/test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { inheritedEnv } from './fixtures';

/** What a runner with no sandbox of its own needs, which is only ever the Linux one. */
export const noSandboxArgs = process.platform === 'linux' ? ['--no-sandbox'] : [];

const DEVTOOLS_PORT_TIMEOUT_MS = 30_000;

const RENDERER_PAGE_TIMEOUT_MS = 30_000;

const DEVTOOLS_LISTENING_PATTERN = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//;

const RENDERER_SCHEME = 'app://renderer';

/** The kinds of console line a packaged renderer is never allowed to print. */
const LOUD_KINDS = new Set(['error', 'warning']);

export async function createPackagedLaunchEnv(
  overrides: Record<string, string>,
): Promise<Record<string, string>> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'recompose-packaged-'));

  return {
    ...inheritedEnv(),
    NODE_ENV: 'production',
    ELECTRON_RENDERER_URL: '',
    RECOMPOSE_USER_DATA_DIR: userDataDir,
    ...overrides,
  };
}

export function trackChildFailure(
  child: ChildProcessWithoutNullStreams,
  operation: string,
): () => string | null {
  let failure: string | null = null;

  child.on('error', (error) => {
    failure = `${operation} failed: ${error.message}`;
  });

  return () => failure;
}

export async function waitForDevtoolsPort(
  child: ChildProcessWithoutNullStreams,
  getSpawnFailure: () => string | null,
): Promise<number> {
  let buffer = '';

  child.stdout.on('data', () => {
    return undefined;
  });
  child.stderr.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
  });

  await expect
    .poll(
      () => {
        const spawnFailure = getSpawnFailure();

        if (spawnFailure !== null) {
          throw new Error(spawnFailure);
        }

        if (child.exitCode !== null) {
          throw new Error(`devtools port wait exited early with code ${String(child.exitCode)}`);
        }

        return DEVTOOLS_LISTENING_PATTERN.test(buffer);
      },
      { timeout: DEVTOOLS_PORT_TIMEOUT_MS },
    )
    .toBe(true);

  const match = DEVTOOLS_LISTENING_PATTERN.exec(buffer);

  if (match?.[1] === undefined) {
    throw new Error('devtools listening line did not carry a port number');
  }

  return Number(match[1]);
}

export async function findRendererPage(browser: Browser): Promise<Page> {
  const rendererPages = () =>
    browser
      .contexts()
      .flatMap((context) => context.pages())
      .filter((candidate) => candidate.url().startsWith(RENDERER_SCHEME));

  await expect
    .poll(() => rendererPages().length, { timeout: RENDERER_PAGE_TIMEOUT_MS })
    .toBeGreaterThan(0);

  const renderer = rendererPages()[0];

  if (renderer === undefined) {
    throw new Error("no app://renderer page found on the packaged binary's devtools endpoint");
  }

  return renderer;
}

export async function assertNoEarlyFailure(
  detectFailure: () => string | null,
  windowMs: number,
): Promise<void> {
  const start = Date.now();

  await expect
    .poll(() => {
      const failure = detectFailure();

      if (failure !== null) {
        throw new Error(failure);
      }

      return Date.now() - start;
    })
    .toBeGreaterThan(windowMs);
}

/**
 * Everything the packaged renderer complained about from here on, in the words it used.
 *
 * @summary A canvas can stand in the document and still be broken, so the proof reads what the
 * renderer said as well as what it drew: a blocked style, a failed asset, or a thrown render all
 * arrive here rather than passing unnoticed under a page that merely rendered something.
 */
export function noiseFrom(page: Page): () => string[] {
  const heard: string[] = [];

  page.on('console', (line: ConsoleMessage) => {
    if (LOUD_KINDS.has(line.type())) {
      heard.push(`${line.type()}: ${line.text()}`);
    }
  });
  page.on('pageerror', (error: Error) => {
    heard.push(`pageerror: ${error.message}`);
  });

  return () => [...heard];
}
