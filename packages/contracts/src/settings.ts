import { z } from 'zod';

import { migrateDocument, type Migration } from './migration';

export const SETTINGS_VERSION = 6;

export const usageRetentionDaysSchema = z.union([z.literal(7), z.literal(30), z.literal(90)]);

export type UsageRetentionDays = z.infer<typeof usageRetentionDaysSchema>;

export const DEFAULT_GATEWAY_BIND_ADDRESS = '127.0.0.1';

const EVERY_INTERFACE_BIND_ADDRESS = '0.0.0.0';

/**
 * The host a client is handed for a gateway bound to a given address.
 *
 * @summary The bind address answers which interfaces a listener accepts on, which is not the same
 * question as where a client sends. `0.0.0.0` names every interface and routes nowhere, so a
 * snippet carrying it hands out a host that cannot connect. Every other address a person can
 * store is one they chose to be reached at, so it travels as written.
 */
export function routableGatewayHost(bindAddress: string): string {
  return bindAddress === EVERY_INTERFACE_BIND_ADDRESS ? DEFAULT_GATEWAY_BIND_ADDRESS : bindAddress;
}

export function routableGatewayOrigin(bindAddress: string, port: number): string {
  return `http://${routableGatewayHost(bindAddress)}:${String(port)}`;
}

export const gatewayBindAddressSchema = z
  .string()
  .trim()
  .min(1)
  .max(253)
  .refine((address) => !/[\s/:?#]/u.test(address), 'a host name or IPv4 address');

export const settingsSchema = z.strictObject({
  schemaVersion: z.literal(SETTINGS_VERSION),
  theme: z.enum(['system', 'light', 'dark']),
  launchAtLogin: z.boolean(),
  showInMenuBar: z.boolean(),
  firstRequestServed: z.boolean(),
  showOnboardingChecklist: z.boolean(),
  bindAddress: gatewayBindAddressSchema.optional(),
  startGatewaysOnLaunch: z.boolean().optional(),
  usageRetentionDays: usageRetentionDaysSchema,
});

export type Settings = z.infer<typeof settingsSchema>;

export const settingsPatchSchema = settingsSchema.omit({ schemaVersion: true }).partial();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

/**
 * The document a patch leaves behind.
 *
 * @summary A patch names only the fields a save changes, so a field it leaves out keeps whatever
 * the document already held rather than being written back as undefined.
 */
export function withSettingsPatch(document: Settings, patch: SettingsPatch): Settings {
  const named = Object.entries(patch).filter(([, value]) => value !== undefined);

  return settingsSchema.parse({ ...document, ...Object.fromEntries(named) });
}

const addVersionTwoSwitches: Migration = {
  from: 1,
  migrate: (doc) => ({
    ...doc,
    schemaVersion: 2,
    launchAtLogin: false,
    showInMenuBar: false,
  }),
};

const retireTheAppWidePort: Migration = {
  from: 2,
  migrate: ({ enginePort: _retired, ...whatSurvives }) => ({
    ...whatSurvives,
    schemaVersion: 3,
  }),
};

const retireTheAppWideTokenRequirement: Migration = {
  from: 3,
  migrate: ({ requireGatewayToken: _retired, ...whatSurvives }) => ({
    ...whatSurvives,
    schemaVersion: 4,
  }),
};

const recordTheFirstSession: Migration = {
  from: 4,
  migrate: (doc) => ({
    ...doc,
    schemaVersion: 5,
    firstRequestServed: false,
    showOnboardingChecklist: true,
  }),
};

const keepAMonthOfUsage: Migration = {
  from: 5,
  migrate: (doc) => ({
    ...doc,
    schemaVersion: 6,
    usageRetentionDays: 30,
  }),
};

const settingsMigrations: readonly Migration[] = [
  addVersionTwoSwitches,
  retireTheAppWidePort,
  retireTheAppWideTokenRequirement,
  recordTheFirstSession,
  keepAMonthOfUsage,
];

export function loadSettings(doc: unknown): Settings {
  return settingsSchema.parse(migrateDocument(doc, settingsMigrations, SETTINGS_VERSION));
}

export function defaultSettings(): Settings {
  return {
    schemaVersion: SETTINGS_VERSION,
    theme: 'system',
    launchAtLogin: false,
    showInMenuBar: false,
    firstRequestServed: false,
    showOnboardingChecklist: true,
    bindAddress: DEFAULT_GATEWAY_BIND_ADDRESS,
    startGatewaysOnLaunch: false,
    usageRetentionDays: 30,
  };
}
