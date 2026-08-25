import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { loadSettings, SETTINGS_VERSION } from './settings';

describe('a stored version 6 document, the shape written before the setup wizard existed', () => {
  test('the wizard reads as settled, so an upgrade never springs setup on a working profile', () => {
    const storedUnderVersionSix = {
      schemaVersion: 6,
      theme: 'dark',
      launchAtLogin: true,
      showInMenuBar: true,
      firstRequestServed: true,
      showOnboardingChecklist: false,
      usageRetentionDays: 90,
    };

    expect(loadSettings(storedUnderVersionSix)).toEqual({
      ...storedUnderVersionSix,
      schemaVersion: SETTINGS_VERSION,
      setupWizardSettled: true,
    });
  });

  const versionSixDocuments = fc.record({
    schemaVersion: fc.constant(6),
    theme: fc.constantFrom('system', 'light', 'dark'),
    launchAtLogin: fc.boolean(),
    showInMenuBar: fc.boolean(),
    firstRequestServed: fc.boolean(),
    showOnboardingChecklist: fc.boolean(),
    usageRetentionDays: fc.constantFrom(7, 30, 90),
  });

  test.prop([versionSixDocuments])(
    'every version 6 document keeps its choices and reads the wizard as settled',
    (storedUnderVersionSix) => {
      expect(loadSettings(storedUnderVersionSix)).toEqual({
        ...storedUnderVersionSix,
        schemaVersion: SETTINGS_VERSION,
        setupWizardSettled: true,
      });
    },
  );

  test('a document already at the current version keeps the standing it carries', () => {
    const storedUnderVersionSeven = {
      schemaVersion: SETTINGS_VERSION,
      theme: 'system',
      launchAtLogin: false,
      showInMenuBar: false,
      firstRequestServed: false,
      showOnboardingChecklist: true,
      setupWizardSettled: false,
      usageRetentionDays: 30,
    };

    expect(loadSettings(storedUnderVersionSeven)).toEqual(storedUnderVersionSeven);
  });
});

describe('a stored version 5 document, the shape written before usage was retained', () => {
  test('it gains the month of retention, keeping every choice', () => {
    const storedUnderVersionFive = {
      schemaVersion: 5,
      theme: 'dark',
      launchAtLogin: true,
      showInMenuBar: true,
      firstRequestServed: true,
      showOnboardingChecklist: false,
    };

    expect(loadSettings(storedUnderVersionFive)).toEqual({
      ...storedUnderVersionFive,
      schemaVersion: SETTINGS_VERSION,
      usageRetentionDays: 30,
      setupWizardSettled: true,
    });
  });

  const versionFiveDocuments = fc.record({
    schemaVersion: fc.constant(5),
    theme: fc.constantFrom('system', 'light', 'dark'),
    launchAtLogin: fc.boolean(),
    showInMenuBar: fc.boolean(),
    firstRequestServed: fc.boolean(),
    showOnboardingChecklist: fc.boolean(),
  });

  test.prop([versionFiveDocuments])(
    'every version 5 document keeps its choices and gains the month of retention',
    (storedUnderVersionFive) => {
      expect(loadSettings(storedUnderVersionFive)).toEqual({
        ...storedUnderVersionFive,
        schemaVersion: SETTINGS_VERSION,
        usageRetentionDays: 30,
        setupWizardSettled: true,
      });
    },
  );
});

describe('a stored version 4 document, the shape written before requests were tracked', () => {
  test('it gains the first-session records, keeping every choice', () => {
    const storedUnderVersionFour = {
      schemaVersion: 4,
      theme: 'dark',
      launchAtLogin: true,
      showInMenuBar: true,
    };

    expect(loadSettings(storedUnderVersionFour)).toEqual({
      schemaVersion: SETTINGS_VERSION,
      theme: 'dark',
      launchAtLogin: true,
      showInMenuBar: true,
      firstRequestServed: false,
      showOnboardingChecklist: true,
      usageRetentionDays: 30,
      setupWizardSettled: true,
    });
  });

  const versionFourDocuments = fc.record({
    schemaVersion: fc.constant(4),
    theme: fc.constantFrom('system', 'light', 'dark'),
    launchAtLogin: fc.boolean(),
    showInMenuBar: fc.boolean(),
  });

  test.prop([versionFourDocuments])(
    'every version 4 document keeps its choices and reads as never having served',
    (storedUnderVersionFour) => {
      expect(loadSettings(storedUnderVersionFour)).toEqual({
        ...storedUnderVersionFour,
        schemaVersion: SETTINGS_VERSION,
        firstRequestServed: false,
        showOnboardingChecklist: true,
        usageRetentionDays: 30,
        setupWizardSettled: true,
      });
    },
  );
});

describe('a stored version 3 document, the shape written while the token switch existed', () => {
  test('the retired switch is dropped rather than reported as damage', () => {
    const storedUnderVersionThree = {
      schemaVersion: 3,
      theme: 'dark',
      launchAtLogin: true,
      showInMenuBar: true,
      requireGatewayToken: false,
    };

    expect(loadSettings(storedUnderVersionThree)).toEqual({
      schemaVersion: SETTINGS_VERSION,
      theme: 'dark',
      launchAtLogin: true,
      showInMenuBar: true,
      firstRequestServed: false,
      showOnboardingChecklist: true,
      usageRetentionDays: 30,
      setupWizardSettled: true,
    });
  });

  const versionThreeDocuments = fc.record({
    schemaVersion: fc.constant(3),
    theme: fc.constantFrom('system', 'light', 'dark'),
    launchAtLogin: fc.boolean(),
    showInMenuBar: fc.boolean(),
    requireGatewayToken: fc.boolean(),
  });

  test.prop([versionThreeDocuments])(
    'every version 3 document keeps its choices and loses only the retired switch',
    (storedUnderVersionThree) => {
      const { requireGatewayToken, ...whatSurvives } = storedUnderVersionThree;

      expect(typeof requireGatewayToken).toBe('boolean');
      expect(loadSettings(storedUnderVersionThree)).toEqual({
        ...whatSurvives,
        schemaVersion: SETTINGS_VERSION,
        firstRequestServed: false,
        showOnboardingChecklist: true,
        usageRetentionDays: 30,
        setupWizardSettled: true,
      });
    },
  );
});

describe('a stored version 2 document, the shape a real profile holds', () => {
  test('the port and the token requirement are dropped rather than reported as damage', () => {
    const storedUnderVersionTwo = {
      schemaVersion: 2,
      theme: 'system',
      enginePort: 8397,
      launchAtLogin: false,
      showInMenuBar: true,
      requireGatewayToken: true,
    };

    expect(loadSettings(storedUnderVersionTwo)).toEqual({
      schemaVersion: SETTINGS_VERSION,
      theme: 'system',
      launchAtLogin: false,
      showInMenuBar: true,
      firstRequestServed: false,
      showOnboardingChecklist: true,
      usageRetentionDays: 30,
      setupWizardSettled: true,
    });
  });

  const versionTwoDocuments = fc.record({
    schemaVersion: fc.constant(2),
    theme: fc.constantFrom('system', 'light', 'dark'),
    enginePort: fc.integer({ min: 1024, max: 65535 }),
    launchAtLogin: fc.boolean(),
    showInMenuBar: fc.boolean(),
    requireGatewayToken: fc.boolean(),
  });

  test.prop([versionTwoDocuments])(
    'every version 2 document reaches the current version keeping its choices and losing both retired fields',
    (storedUnderVersionTwo) => {
      const { enginePort, requireGatewayToken, ...whatSurvives } = storedUnderVersionTwo;

      expect(enginePort).toBeGreaterThan(0);
      expect(typeof requireGatewayToken).toBe('boolean');
      expect(loadSettings(storedUnderVersionTwo)).toEqual({
        ...whatSurvives,
        schemaVersion: SETTINGS_VERSION,
        firstRequestServed: false,
        showOnboardingChecklist: true,
        usageRetentionDays: 30,
        setupWizardSettled: true,
      });
    },
  );
});

describe('a stored version 1 document', () => {
  test('it migrates through every step, keeping the theme and losing the port', () => {
    const storedUnderVersionOne = { schemaVersion: 1, theme: 'dark', enginePort: 9000 };

    expect(loadSettings(storedUnderVersionOne)).toEqual({
      schemaVersion: SETTINGS_VERSION,
      theme: 'dark',
      launchAtLogin: false,
      showInMenuBar: false,
      firstRequestServed: false,
      showOnboardingChecklist: true,
      usageRetentionDays: 30,
      setupWizardSettled: true,
    });
  });

  const versionOneDocuments = fc.record({
    schemaVersion: fc.constant(1),
    theme: fc.constantFrom('system', 'light', 'dark'),
    enginePort: fc.integer({ min: 1024, max: 65535 }),
  });

  test.prop([versionOneDocuments])(
    'every version 1 document reaches the current version with its theme intact and its switches off',
    (storedUnderVersionOne) => {
      expect(loadSettings(storedUnderVersionOne)).toEqual({
        schemaVersion: SETTINGS_VERSION,
        theme: storedUnderVersionOne.theme,
        launchAtLogin: false,
        showInMenuBar: false,
        firstRequestServed: false,
        showOnboardingChecklist: true,
        usageRetentionDays: 30,
        setupWizardSettled: true,
      });
    },
  );
});
