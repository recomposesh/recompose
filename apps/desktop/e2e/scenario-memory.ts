import type { Page } from '@playwright/test';

const gatewaysInFocus = new WeakMap<Page, string>();

const providersInFocus = new WeakMap<Page, string>();

const portsAnotherProcessTook = new WeakMap<Page, number>();

export function focusGateway(page: Page, name: string): void {
  gatewaysInFocus.set(page, name);
}

/** The gateway in focus if any step named one, for a Given that seeds its own when none did. */
export function gatewayInFocusIfAny(page: Page): string | undefined {
  return gatewaysInFocus.get(page);
}

/** The gateway the scenario last acted on, which is the one its later steps talk about. */
export function focusedGateway(page: Page): string {
  const name = gatewaysInFocus.get(page);

  if (name === undefined) {
    throw new Error('no step named the gateway this scenario is about');
  }

  return name;
}

export function focusProvider(page: Page, provider: string): void {
  providersInFocus.set(page, provider);
}

/** The provider the scenario last picked out of the catalog, which its later steps talk about. */
export function focusedProvider(page: Page): string {
  const provider = providersInFocus.get(page);

  if (provider === undefined) {
    throw new Error('no step named the provider this scenario is about');
  }

  return provider;
}

const entriesInFocus = new WeakMap<Page, string>();

const vaultsBeforeARefusal = new WeakMap<Page, string>();

const warningsTheSurfaceShowed = new WeakMap<Page, string>();

const toggledMenuItems = new WeakMap<Page, string>();

/** Remembers which ticking menu item the last pick toggled, so a tick step knows what to read. */
export function rememberToggledMenuItem(page: Page, label: string): void {
  toggledMenuItems.set(page, label);
}

export function toggledMenuItem(page: Page): string {
  const item = toggledMenuItems.get(page);

  if (item === undefined) {
    throw new Error('no step picked a ticking menu item, so no tick names an item to read');
  }

  return item;
}

export function rememberKeyEntry(page: Page, entry: string): void {
  entriesInFocus.set(page, entry);
}

/** The catalog entry the scenario last picked, which is the product its later steps read. */
export function keyEntryInFocus(page: Page): string {
  const entry = entriesInFocus.get(page);

  if (entry === undefined) {
    throw new Error('no step named the catalog entry this scenario is about');
  }

  return entry;
}

export function rememberVault(page: Page, kept: string): void {
  vaultsBeforeARefusal.set(page, kept);
}

/** What the vault held before the scenario asked for a connect it expected to be refused. */
export function vaultBeforeTheRefusal(page: Page): string {
  const kept = vaultsBeforeARefusal.get(page);

  if (kept === undefined) {
    throw new Error('no step read the vault before the refusal this scenario is about');
  }

  return kept;
}

export function rememberWarning(page: Page, sentence: string): void {
  warningsTheSurfaceShowed.set(page, sentence);
}

/** What the surface warned while the key stood in the field, before the connect carried it off. */
export function warningTheSurfaceShowed(page: Page): string {
  const sentence = warningsTheSurfaceShowed.get(page);

  if (sentence === undefined) {
    throw new Error('no step read a warning off the surface in this scenario');
  }

  return sentence;
}

export function rememberTakenPort(page: Page, port: number): void {
  portsAnotherProcessTook.set(page, port);
}

export function takenPort(page: Page): number {
  const port = portsAnotherProcessTook.get(page);

  if (port === undefined) {
    throw new Error('no step took a port away from recompose');
  }

  return port;
}
