import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { SubscriptionTools } from '../subscription-tools';

import { catalog, openProviderScreen, openProviderWays, toolBinaryFor } from '../provider-screen';
import { SIGN_IN_WAIT_MS } from '../subscription-sign-in';

/** The providers whose own tool can leave a login on the machine before recompose ever runs. */
export type MachineProvider = 'anthropic' | 'openai';

/** An hour ahead, which stands clear of the margin any renewal is decided inside. */
const FRESH_MS = 60 * 60 * 1000;

/** A minute ahead: inside the margin a renewal is decided by, and still ahead of now. */
const NEARLY_SPENT_MS = 60 * 1000;

/** The default plan each vendor's own tool reports, which a scenario may name over. */
const plansToolsReport = { anthropic: 'Max', openai: 'Pro' } as const;

/** The address a scenario means when it says the machine holds a login and names nobody. */
export const MACHINE_ADDRESS = 'dev@example.com';

export function freshExpiry(): number {
  return Date.now() + FRESH_MS;
}

/** An expiry a serving turn has to act on, rather than one it can spend as it stands. */
export function nearlySpentExpiry(): number {
  return Date.now() + NEARLY_SPENT_MS;
}

/** An expiry already behind, which is what a lapsed credential carries. */
export function spentExpiry(): number {
  return Date.now() - FRESH_MS;
}

export function machineProviderFor(provider: string): MachineProvider {
  if (provider !== 'anthropic' && provider !== 'openai') {
    throw new Error(`no ${provider} tool leaves a login on this machine`);
  }

  return provider;
}

/** What the machine's own tool signed in as, with everything a scenario leaves unsaid filled in. */
export type MachineLogin = {
  provider: string;
  signedInAs?: string;
  plan?: string;
  expiresAt?: number;
  carriesAccountCredential?: boolean;
  store?: 'keychain' | 'file';
};

/**
 * Writes the identity file Claude Code keeps beside the home rather than inside it.
 *
 * @summary The vendor keeps the address and the plan at the home's root and the credential in a
 * folder under it, and the app reads them from those two places. The planting seam writes both
 * under the folder, so a scenario naming the address it expects to see puts the identity where the
 * vendor puts it.
 */
async function identityStandsAtTheHomeRoot(
  tools: SubscriptionTools,
  signedInAs: string,
  plan: string,
): Promise<void> {
  await writeFile(
    join(tools.machineHome, '.claude.json'),
    `${JSON.stringify({ oauthAccount: { emailAddress: signedInAs }, subscriptionType: plan }, null, 2)}\n`,
    'utf8',
  );
}

/** Who the machine's own tool signed in as, and on which plan, with anything unsaid filled in. */
function identityOf(login: MachineLogin, provider: MachineProvider) {
  return {
    signedInAs: login.signedInAs ?? MACHINE_ADDRESS,
    plan: login.plan ?? plansToolsReport[provider],
  };
}

/** How the record stands: when it lapses, whether it holds an account, and where it is kept. */
function standingOf(login: MachineLogin) {
  return {
    expiresAt: login.expiresAt ?? freshExpiry(),
    carriesAccountCredential: login.carriesAccountCredential ?? true,
    ...(login.store === undefined ? {} : { store: login.store }),
  };
}

/** Stands the provider's own tool on the machine, holding the login the scenario describes. */
export async function theMachineHolds(
  tools: SubscriptionTools,
  login: MachineLogin,
): Promise<void> {
  const provider = machineProviderFor(login.provider);
  const identity = identityOf(login, provider);

  await tools.install(toolBinaryFor(provider));
  await tools.plantMachineCredential({ provider, ...identity, ...standingOf(login) });

  if (provider === 'anthropic') {
    await identityStandsAtTheHomeRoot(tools, identity.signedInAs, identity.plan);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The document a vendor's own tool wrote, read the way a person inspecting the file would. */
export async function documentAt(path: string): Promise<Record<string, unknown>> {
  const held: unknown = JSON.parse(await readFile(path, 'utf8'));

  if (!isRecord(held)) {
    throw new Error(`the record at ${path} is not the document a vendor's own tool writes`);
  }

  return held;
}

/** Where each vendor's own tool keeps its record when it keeps it in a file beside the home. */
const recordFiles = {
  anthropic: join('.claude', '.credentials.json'),
  openai: join('.codex', 'auth.json'),
} as const;

/** The file one vendor's own tool writes its record to, so a step can take it out of the way. */
export function machineRecordFile(tools: SubscriptionTools, provider: string): string {
  return join(tools.machineHome, recordFiles[machineProviderFor(provider)]);
}

const loginsTheMachineHolds = new WeakMap<Page, MachineLogin>();

/** Remembers what a step arranged, so a later step can say the same login differently. */
export function rememberMachineLogin(page: Page, login: MachineLogin): void {
  loginsTheMachineHolds.set(page, login);
}

/** The login a Given arranged on the machine, when any step arranged one at all. */
export function machineLoginIfAny(page: Page): MachineLogin | undefined {
  return loginsTheMachineHolds.get(page);
}

/** The login a Given arranged on the machine, which the scenario's later steps talk about. */
export function machineLoginHeld(page: Page): MachineLogin {
  const login = loginsTheMachineHolds.get(page);

  if (login === undefined) {
    throw new Error('no step arranged the login this scenario says the machine holds');
  }

  return login;
}

/** Arranges one machine login and remembers it, so a later step can say the same login over. */
export async function theMachineHoldsFor(
  page: Page,
  tools: SubscriptionTools,
  login: MachineLogin,
): Promise<void> {
  rememberMachineLogin(page, login);
  await theMachineHolds(tools, login);
}

/** Stands the tool on the machine with no login behind it, which is a machine holding nothing. */
export async function theMachineHoldsNoLogin(
  tools: SubscriptionTools,
  provider: string,
): Promise<void> {
  await tools.install(toolBinaryFor(machineProviderFor(provider)));
}

/** The act the found account carries, which records it without any sign-in. */
export function adoptAct(page: Page): Locator {
  return catalog(page).getByRole('button', { name: 'Connect', exact: true });
}

/** The act the catalog offers to sign in as somebody else, which stands whatever it found. */
export function signInAct(page: Page, provider: string): Locator {
  return catalog(page).getByRole('button', { name: `Sign in to ${provider}` });
}

/** What the catalog says when the tool never signed in here, which no other reading may say. */
export function anEmptyMachineReads(toolName: string): string {
  return `${toolName} has not signed in on this machine.`;
}

/** Takes the account the machine holds, which records it with no sign-in of any kind. */
export async function adoptWhatTheMachineHolds(page: Page, provider: string): Promise<void> {
  await openProviderWays(page, provider);
  await adoptAct(page).click();
  await expect(catalog(page)).toBeHidden({ timeout: SIGN_IN_WAIT_MS });
}

/** Arranges a machine login and adopts it, leaving one account the app never signed in. */
export async function subscriptionAdoptedFromTheMachine(
  page: Page,
  tools: SubscriptionTools,
  login: MachineLogin,
): Promise<void> {
  await theMachineHoldsFor(page, tools, login);
  await openProviderScreen(page, 'Subscriptions');
  await adoptWhatTheMachineHolds(page, login.provider);
}

/**
 * Hands the sign-in to the provider's own tool through whichever act the step offers.
 *
 * @summary A machine already holding an account turns the sign-in into the quieter second choice,
 * so which act a person reaches for follows what the step found. The step reads what the machine
 * says before it settles, so the wait is for whichever act ends up standing rather than for the
 * one showing first.
 */
