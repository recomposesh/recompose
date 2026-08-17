import type { ServerResponse } from 'node:http';

import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const appRoot = join(__dirname, '..');

const devFeedFile = join(appRoot, 'dev-app-update.yml');

const feedLockDir = join(appRoot, '.dev-update-feed.lock');

const LOCK_STEAL_MS = 120_000;

function artifactNameFor(version: string): string {
  if (process.platform === 'darwin') {
    return `Recompose-${version}-mac.zip`;
  }

  return process.platform === 'win32'
    ? `Recompose-${version}-setup.exe`
    : `Recompose-${version}.AppImage`;
}

function manifestFor(version: string, artifact: string, bytes: Buffer): string {
  const sha512 = createHash('sha512').update(bytes).digest('base64');

  return [
    `version: ${version}`,
    'files:',
    `  - url: ${artifact}`,
    `    sha512: ${sha512}`,
    `    size: ${String(bytes.length)}`,
    `path: ${artifact}`,
    `sha512: ${sha512}`,
    "releaseDate: '2026-08-17T00:00:00.000Z'",
  ].join('\n');
}

async function feedLockTaken(): Promise<void> {
  const deadline = Date.now() + LOCK_STEAL_MS;

  for (;;) {
    try {
      await mkdir(feedLockDir);

      return;
    } catch {
      if (Date.now() > deadline) {
        await rm(feedLockDir, { force: true, recursive: true });
      } else {
        await wait(250);
      }
    }
  }
}

type FeedStanding = {
  refusing: boolean;
  manifest: string | null;
  artifact: { name: string; bytes: Buffer } | null;
  holdingArtifact: boolean;
  checks: number;
  artifactDownloads: number;
  parked: ServerResponse[];
};

export type UpdateFeed = {
  origin: string;
  checksAnswered: () => number;
  artifactDownloads: () => number;
  refusingChecks: () => boolean;
  serveVersion: (version: string) => void;
  refuseChecks: () => void;
  holdArtifact: () => void;
  dispose: () => Promise<void>;
};

function answerCheck(standing: FeedStanding, response: ServerResponse): void {
  standing.checks += 1;

  if (standing.refusing || standing.manifest === null) {
    response.writeHead(standing.refusing ? 500 : 404).end();

    return;
  }

  response.writeHead(200, { 'content-type': 'text/yaml' }).end(standing.manifest);
}

function answerArtifact(standing: FeedStanding, response: ServerResponse): void {
  standing.artifactDownloads += 1;

  if (standing.holdingArtifact) {
    standing.parked.push(response);

    return;
  }

  response.writeHead(200, { 'content-type': 'application/octet-stream' });
  response.end(standing.artifact?.bytes);
}

function answerFeed(standing: FeedStanding, url: string, response: ServerResponse): void {
  const asked = new URL(url, 'http://feed').pathname;

  if (asked.endsWith('.yml')) {
    answerCheck(standing, response);

    return;
  }

  if (standing.artifact !== null && decodeURIComponent(asked).endsWith(standing.artifact.name)) {
    answerArtifact(standing, response);

    return;
  }

  response.writeHead(404).end();
}

async function feedServerStarted(
  standing: FeedStanding,
): Promise<{ server: Server; origin: string }> {
  const server = createServer((request, response) => {
    answerFeed(standing, request.url ?? '', response);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (address === null || typeof address === 'string') {
    throw new Error('the update feed stub could not read its own port');
  }

  return { server, origin: `http://127.0.0.1:${String(address.port)}` };
}

async function feedDropped(standing: FeedStanding, server: Server): Promise<void> {
  for (const response of standing.parked) {
    response.destroy();
  }

  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve();
    });
  });
  await rm(devFeedFile, { force: true });
  await rm(feedLockDir, { force: true, recursive: true });
}

/**
 * A release feed the scenario owns, reached through dev-app-update.yml.
 *
 * @summary electron-updater reads exactly one feed file per application path, so scenarios that
 * arm the updater serialize on a lock rather than race one file with different feeds in it.
 */
async function fakeUpdateFeed(): Promise<UpdateFeed> {
  await feedLockTaken();

  const standing: FeedStanding = {
    refusing: false,
    manifest: null,
    artifact: null,
    holdingArtifact: false,
    checks: 0,
    artifactDownloads: 0,
    parked: [],
  };

  const { server, origin } = await feedServerStarted(standing);

  await writeFile(
    devFeedFile,
    `provider: generic\nurl: ${origin}\nupdaterCacheDirName: recompose-e2e-updater\n`,
  );

  return {
    origin,
    checksAnswered: () => standing.checks,
    artifactDownloads: () => standing.artifactDownloads,
    refusingChecks: () => standing.refusing,
    serveVersion: (version) => {
      const name = artifactNameFor(version);
      const bytes = Buffer.from(`recompose ${version} stand-in artifact`);

      standing.artifact = { name, bytes };
      standing.manifest = manifestFor(version, name, bytes);
      standing.refusing = false;
    },
    refuseChecks: () => {
      standing.refusing = true;
    },
    holdArtifact: () => {
      standing.holdingArtifact = true;
    },
    dispose: async () => feedDropped(standing, server),
  };
}

export type UpdatesArrangement = {
  feed: UpdateFeed;
  env: Record<string, string>;
};

/**
 * What an updates scenario arranged before its app launches.
 *
 * @summary playwright-bdd opens every fixture a step names before the first step runs, so nothing
 * a Given does can precede the launch. The arrangement therefore reads from tags, the way the
 * seeded-usage-history tag already works, and the steps only read and adjust what stands here.
 */
function arrangedByTags(feed: UpdateFeed, tags: string[]): void {
  feed.serveVersion(tags.includes('@update-feed-serves-newer') ? '0.4.0' : '0.3.0');

  if (tags.includes('@update-feed-holds-the-download')) {
    feed.holdArtifact();
  }

  if (tags.includes('@update-feed-refuses')) {
    feed.refuseChecks();
  }
}

function feedEnvFor(tags: string[]): Record<string, string> {
  return {
    RECOMPOSE_DEV_UPDATE_FEED: tags.includes('@update-checks-fast') ? '500' : '30000',
    ...(tags.includes('@appimage-install') ? { APPIMAGE: '/tmp/Recompose.AppImage' } : {}),
  };
}

export async function updatesArrangementFor(
  filePath: string,
  tags: string[],
): Promise<UpdatesArrangement | null> {
  if (!filePath.includes(join('features', 'updates')) || !tags.includes('@update-feed')) {
    return null;
  }

  const feed = await fakeUpdateFeed();

  arrangedByTags(feed, tags);

  return { feed, env: feedEnvFor(tags) };
}
