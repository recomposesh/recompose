import { describe, expect, test } from 'vitest';

import { applyProcessOverrides, type OverridableApp } from './process-overrides';

type AppliedOverrides = {
  paths: Record<string, string>;
  switches: Record<string, string>;
  activationPolicy: string | null;
};

function observedApp() {
  const applied: AppliedOverrides = { paths: {}, switches: {}, activationPolicy: null };

  const app: OverridableApp = {
    setPath: (name, value) => {
      applied.paths[name] = value;
    },
    commandLine: {
      appendSwitch: (key, value) => {
        applied.switches[key] = value;
      },
    },
    setActivationPolicy: (policy) => {
      applied.activationPolicy = policy;
    },
  };

  return { app, applied };
}

describe('a run the environment leaves alone', () => {
  test('touches nothing and answers no activation policy', () => {
    const { app, applied } = observedApp();

    const policy = applyProcessOverrides(app, 'darwin', {});

    expect(policy).toBeNull();
    expect(applied).toEqual({ paths: {}, switches: {}, activationPolicy: null });
  });
});

describe('a run the environment redirects', () => {
  test('moves the user data folder where the variable points', () => {
    const { app, applied } = observedApp();

    applyProcessOverrides(app, 'darwin', { RECOMPOSE_USER_DATA_DIR: '/tmp/profile' });

    expect(applied.paths).toEqual({ userData: '/tmp/profile' });
  });

  test('hands the password store through as a command line switch', () => {
    const { app, applied } = observedApp();

    applyProcessOverrides(app, 'linux', { RECOMPOSE_PASSWORD_STORE: 'basic' });

    expect(applied.switches).toEqual({ 'password-store': 'basic' });
  });

  test('a stays-back run on macOS becomes an accessory', () => {
    const { app, applied } = observedApp();

    const policy = applyProcessOverrides(app, 'darwin', { RECOMPOSE_WINDOW_STAYS_BACK: '1' });

    expect(policy).toBe('accessory');
    expect(applied.activationPolicy).toBe('accessory');
  });

  test('a stays-back run elsewhere keeps the platform default', () => {
    const { app, applied } = observedApp();

    const policy = applyProcessOverrides(app, 'linux', { RECOMPOSE_WINDOW_STAYS_BACK: '1' });

    expect(policy).toBeNull();
    expect(applied.activationPolicy).toBeNull();
  });
});
