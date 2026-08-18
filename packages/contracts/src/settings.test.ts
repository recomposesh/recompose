import { describe, expect, test } from 'vitest';

import {
  defaultSettings,
  loadSettings,
  routableGatewayOrigin,
  SETTINGS_VERSION,
  settingsPatchSchema,
  withSettingsPatch,
} from './settings';

describe('app settings', () => {
  test('defaults: system theme, every switch off, and no request served yet', () => {
    expect(defaultSettings()).toEqual({
      schemaVersion: SETTINGS_VERSION,
      theme: 'system',
      launchAtLogin: false,
      showInMenuBar: false,
      firstRequestServed: false,
      showOnboardingChecklist: true,
      bindAddress: '127.0.0.1',
      startGatewaysOnLaunch: false,
      usageRetentionDays: 30,
    });
  });

  test('a stored settings file parses and keeps its shape', () => {
    const stored = {
      schemaVersion: SETTINGS_VERSION,
      theme: 'dark',
      launchAtLogin: true,
      showInMenuBar: true,
      firstRequestServed: true,
      showOnboardingChecklist: false,
      usageRetentionDays: 90,
    };

    expect(loadSettings(stored)).toEqual(stored);
  });

  test('a retention outside the offered windows is refused rather than rounded', () => {
    expect(() => loadSettings({ ...defaultSettings(), usageRetentionDays: 14 })).toThrow();
  });

  test('a document still naming a port is refused rather than quietly accepted', () => {
    expect(() => loadSettings({ ...defaultSettings(), enginePort: 8397 })).toThrow();
  });

  test('a document still naming a token requirement is refused rather than quietly accepted', () => {
    expect(() => loadSettings({ ...defaultSettings(), requireGatewayToken: false })).toThrow();
  });

  test('unknown keys are rejected', () => {
    expect(() => loadSettings({ ...defaultSettings(), telemetry: true })).toThrow();
  });

  test('the bind address accepts a host or IPv4 address and refuses a URL or port', () => {
    expect(settingsPatchSchema.safeParse({ bindAddress: '0.0.0.0' }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ bindAddress: 'gateway.local' }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ bindAddress: 'http://0.0.0.0' }).success).toBe(false);
    expect(settingsPatchSchema.safeParse({ bindAddress: '127.0.0.1:8397' }).success).toBe(false);
  });

  test('a missing switch is rejected rather than quietly defaulted', () => {
    const { showInMenuBar, ...withoutTheSwitch } = defaultSettings();

    expect(showInMenuBar).toBe(false);
    expect(() => loadSettings(withoutTheSwitch)).toThrow();
  });
});

describe('the origin a client reaches a gateway through', () => {
  test('a loopback bind is printed as the loopback origin', () => {
    expect(routableGatewayOrigin('127.0.0.1', 8397)).toBe('http://127.0.0.1:8397');
  });

  test('a wildcard bind is printed as the loopback origin, because nothing routes to it', () => {
    expect(routableGatewayOrigin('0.0.0.0', 8397)).toBe('http://127.0.0.1:8397');
  });

  test('a host a person named is printed as the host they named', () => {
    expect(routableGatewayOrigin('gateway.local', 8397)).toBe('http://gateway.local:8397');
  });

  test('an address on the network is printed as itself, because a client can reach it', () => {
    expect(routableGatewayOrigin('192.168.1.24', 8397)).toBe('http://192.168.1.24:8397');
  });
});

describe('a save that names only the fields it changes', () => {
  test('a named field replaces what the document held', () => {
    const stored = { ...defaultSettings(), theme: 'light' as const };

    expect(withSettingsPatch(stored, { theme: 'dark' })).toMatchObject({ theme: 'dark' });
  });

  test('a field the patch leaves out keeps what the document held', () => {
    const stored = { ...defaultSettings(), launchAtLogin: true, showInMenuBar: true };

    expect(withSettingsPatch(stored, { theme: 'dark' })).toEqual({ ...stored, theme: 'dark' });
  });

  test('a field named as undefined is left out rather than written back as nothing', () => {
    const stored = { ...defaultSettings(), launchAtLogin: true };

    expect(withSettingsPatch(stored, { launchAtLogin: undefined })).toEqual(stored);
  });

  test('a patch that names nothing leaves the document as it stands', () => {
    const stored = { ...defaultSettings(), showInMenuBar: true };

    expect(withSettingsPatch(stored, {})).toEqual(stored);
  });

  test('a patch cannot name the schema version, because only a migration moves it', () => {
    expect(settingsPatchSchema.safeParse({ theme: 'dark' }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ schemaVersion: SETTINGS_VERSION }).success).toBe(false);
  });

  test('the schema version a patch can never name survives every merge', () => {
    expect(withSettingsPatch(defaultSettings(), { theme: 'dark' }).schemaVersion).toBe(
      defaultSettings().schemaVersion,
    );
  });
});
