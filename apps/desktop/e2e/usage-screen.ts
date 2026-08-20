import type { ElectronApplication, Locator, Page } from '@playwright/test';
import type {
  AccountsDocument,
  UsageBucket,
  UsageLedger,
  UsageMeasures,
} from '@recompose/contracts';

import { expect } from '@playwright/test';
import { ACCOUNTS_VERSION, loadAccountsDocument, usageLedgerSchema } from '@recompose/contracts';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const HOUR_MS = 3_600_000;

const DAY_MS = 86_400_000;

/** How many requests the seeded prior session served inside the last day. */
export const SEEDED_DAY_REQUESTS = 3;

/** How far back the seeded prune target sits, which only a shortened window drops. */
export const SEEDED_OLD_DAYS_AGO = 20;

/** How long a step waits on figures that ride a poll or a debounced flush. */
export const USAGE_SETTLE_MS = 20_000;

function hourStart(at: number): number {
  return at - (at % HOUR_MS);
}

function measuresCounting(requests: number): UsageMeasures {
  return {
    requests,
    failed: 0,
    answered: requests,
    durationMsSum: requests * 1200,
    tokens: {
      input: requests * 40,
      output: requests * 80,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
      total: requests * 120,
    },
  };
}

function bucketAt(start: number, requests: number): UsageBucket {
  return {
    start,
    tuple: {
      gateway: 'relay',
      virtualModel: 'creative',
      provider: 'anthropic',
      providerModel: 'claude-sonnet-5',
      accountId: 'a-prior-session-account',
      accountKind: 'api-key',
    },
    measures: measuresCounting(requests),
  };
}

function seededUsageLedger(now: number): UsageLedger {
  return {
    schemaVersion: 1,
    accruedThrough: hourStart(now - 3 * HOUR_MS),
    recentRowIds: [],
    buckets: [
      bucketAt(hourStart(now - SEEDED_OLD_DAYS_AGO * DAY_MS), 5),
      bucketAt(hourStart(now - 5 * HOUR_MS), 1),
      bucketAt(hourStart(now - 3 * HOUR_MS), 2),
    ],
  };
}

/**
 * Writes a prior session's ledger into a data folder the app has not opened yet: three requests
 * inside the last day, and an older bucket only a shortened retention window drops.
 *
 * @summary The document is the app's own shape at its own schema version, written before the
 * first launch, so a scenario proves the boot's read path rather than teaching main a test-only
 * lane.
 */
export async function seededUsageHistoryWritten(userDataDir: string): Promise<void> {
  await writeFile(
    join(userDataDir, 'usage.json'),
    JSON.stringify(seededUsageLedger(Date.now())),
    'utf8',
  );
}

/** The one address both seeded plans signed in as. */
export const SEEDED_SUBSCRIPTION_ADDRESS = 'dev@example.com';

const SEEDED_PLAN_BURNS = [
  {
    accountId: 'seeded-claude',
    provider: 'anthropic',
    providerModel: 'claude-sonnet-5',
    requests: 5,
  },
  { accountId: 'seeded-codex', provider: 'openai', providerModel: 'gpt-5', requests: 2 },
] as const;

function subscriptionBucketAt(
  start: number,
  burn: (typeof SEEDED_PLAN_BURNS)[number],
): UsageBucket {
  return {
    start,
    tuple: {
      gateway: 'relay',
      virtualModel: 'creative',
      provider: burn.provider,
      providerModel: burn.providerModel,
      accountId: burn.accountId,
      accountKind: 'subscription',
    },
    measures: measuresCounting(burn.requests),
  };
}

function seededPlanRegistry(): AccountsDocument {
  return {
    schemaVersion: ACCOUNTS_VERSION,
    accounts: SEEDED_PLAN_BURNS.map(({ accountId, provider }) => ({
      id: accountId,
      provider,
      kind: 'subscription',
      label: SEEDED_SUBSCRIPTION_ADDRESS,
      provenance: 'sign-in',
    })),
  };
}

/**
 * Writes a prior session's registry and ledger where two plans burned under one address.
 *
 * @summary Both documents are the app's own shapes at their own schema versions, written before
 * the first launch, so the scenario proves the boot's read path, the quota fold in main, and the
 * strip's reading of both, rather than teaching main a test-only lane.
 */
export async function seededSubscriptionBurnWritten(userDataDir: string): Promise<void> {
  const openedAt = hourStart(Date.now() - 3 * HOUR_MS);
  const ledger: UsageLedger = {
    schemaVersion: 1,
    accruedThrough: openedAt,
    recentRowIds: [],
    buckets: SEEDED_PLAN_BURNS.map((burn) => subscriptionBucketAt(openedAt, burn)),
  };

  await writeFile(join(userDataDir, 'accounts.json'), JSON.stringify(seededPlanRegistry()), 'utf8');
  await writeFile(join(userDataDir, 'usage.json'), JSON.stringify(ledger), 'utf8');
}

/** The providers the seeded registry holds under the shared address, read straight from disk. */
export async function seededPlansOnDisk(userDataDir: string): Promise<readonly string[]> {
  const registry = loadAccountsDocument(
    JSON.parse(await readFile(join(userDataDir, 'accounts.json'), 'utf8')),
  );

  return registry.accounts
    .filter(
      (account) => account.kind === 'subscription' && account.label === SEEDED_SUBSCRIPTION_ADDRESS,
    )
    .map((account) => account.provider);
}

/** The data folder the running app reads and writes, asked from the app itself. */
export async function usageDataDirOf(app: ElectronApplication): Promise<string> {
  return app.evaluate(({ app: runningApp }) => runningApp.getPath('userData'));
}

/** The ledger document as it stands on disk right now. */
export async function ledgerOnDisk(userDataDir: string): Promise<UsageLedger> {
  const raw = await readFile(join(userDataDir, 'usage.json'), 'utf8');

  return usageLedgerSchema.parse(JSON.parse(raw));
}

/** Every request the on-disk ledger counts in buckets younger than the given age. */
export function requestsYoungerThan(ledger: UsageLedger, ageMs: number, now: number): number {
  return ledger.buckets
    .filter((bucket) => bucket.start >= now - ageMs)
    .reduce((sum, bucket) => sum + bucket.measures.requests, 0);
}

/** The start of the oldest bucket the on-disk ledger still holds. */
export function oldestBucketStart(ledger: UsageLedger): number {
  return Math.min(...ledger.buckets.map((bucket) => bucket.start));
}

/** Opens the usage screen the way a person does, through the sidebar. */
export async function openUsageScreen(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Usage' }).click();
  await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible({
    timeout: USAGE_SETTLE_MS,
  });
}

function requestsTile(page: Page): Locator {
  return page.getByRole('group', { name: 'Requests' });
}

/**
 * Waits for the requests tile to print one exact figure.
 *
 * @summary The figure is matched whole rather than as a substring, so a `1` never passes as a
 * `10`, and the wait rides out the live tick and the report's own fetch.
 */
export async function requestsTileCounts(page: Page, requests: number): Promise<void> {
  await expect(requestsTile(page).getByText(String(requests), { exact: true })).toBeVisible({
    timeout: USAGE_SETTLE_MS,
  });
}

/** The panel folding the window by gateway, which every other panel folds beside. */
export function breakdownSection(page: Page): Locator {
  return page.getByRole('region', { name: 'By gateway' });
}

/**
 * The sentence under the title, naming what the readings below it stand for.
 *
 * @summary It reads off the heading it sits under rather than off its own words, because the
 * words are the whole of what a reading about it asserts and a locator spelling them would pass
 * on its own text.
 */
export function scopeSentence(page: Page): Locator {
  return page.getByRole('heading', { level: 1, name: 'Usage' }).locator('..').locator('p');
}

/** Selects one range on the toolbar control that governs every reading. */
export async function rangeBecomes(page: Page, range: string): Promise<void> {
  await page.getByRole('radiogroup', { name: 'Range' }).getByRole('radio', { name: range }).click();
}

/**
 * Shortens usage retention through the settings screen and accepts the consequence.
 *
 * @summary The change travels the person's own lane: the Data section's control, the dialog that
 * names the history a shorter window drops, and the accept that lets the change apply.
 */
export async function retentionShortenedTo(page: Page, days: number): Promise<void> {
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const control = page.getByRole('radiogroup', { name: 'Usage retention' });

  await control.getByRole('radio', { name: `${String(days)} days` }).click();

  const consequence = page.getByRole('dialog');

  await expect(consequence).toContainText('Delete older usage history?');
  await consequence.getByRole('button', { name: 'Delete history' }).click();
  await expect(consequence).toBeHidden();
  await expect(control.getByRole('radio', { name: `${String(days)} days` })).toHaveAttribute(
    'aria-checked',
    'true',
  );
}
