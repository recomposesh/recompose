import { describe, expectTypeOf, test } from 'vitest';

import type { Settings } from './index';

describe('the settings document contract', () => {
  test('the document pins itself to schema version 7', () => {
    expectTypeOf<Settings['schemaVersion']>().toEqualTypeOf<7>();
  });

  test('the retention window is one of the three offered, never a free number', () => {
    expectTypeOf<Settings['usageRetentionDays']>().toEqualTypeOf<7 | 30 | 90>();
  });

  test('the two switches the screen writes are plain booleans', () => {
    expectTypeOf<Settings['launchAtLogin']>().toEqualTypeOf<boolean>();
    expectTypeOf<Settings['showInMenuBar']>().toEqualTypeOf<boolean>();
  });

  test('the first-session records are plain booleans', () => {
    expectTypeOf<Settings['firstRequestServed']>().toEqualTypeOf<boolean>();
    expectTypeOf<Settings['showOnboardingChecklist']>().toEqualTypeOf<boolean>();
    expectTypeOf<Settings['setupWizardSettled']>().toEqualTypeOf<boolean>();
  });

  test('the global bind address is an optional host string for older documents', () => {
    expectTypeOf<Settings['bindAddress']>().toEqualTypeOf<string | undefined>();
  });

  test('the theme keeps the shape version 1 gave it', () => {
    expectTypeOf<Settings['theme']>().toEqualTypeOf<'system' | 'light' | 'dark'>();
  });

  test('the document holds the server bind address without bringing back an app-wide port', () => {
    expectTypeOf<keyof Settings>().toEqualTypeOf<
      | 'schemaVersion'
      | 'theme'
      | 'launchAtLogin'
      | 'showInMenuBar'
      | 'firstRequestServed'
      | 'showOnboardingChecklist'
      | 'setupWizardSettled'
      | 'bindAddress'
      | 'startGatewaysOnLaunch'
      | 'usageRetentionDays'
    >();
  });

  test('no field names a port, because a port belongs to one gateway', () => {
    expectTypeOf<Settings>().not.toHaveProperty('enginePort');
    expectTypeOf<Settings>().not.toHaveProperty('port');
  });

  test('no field on the document names a token, because a token belongs to one gateway', () => {
    expectTypeOf<Settings>().not.toHaveProperty('token');
    expectTypeOf<Settings>().not.toHaveProperty('gatewayToken');
    expectTypeOf<Settings>().not.toHaveProperty('requireGatewayToken');
    expectTypeOf<Settings>().not.toHaveProperty('secret');
  });
});
