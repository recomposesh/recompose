import type { GatewayConfig, Settings } from '@recompose/contracts';

import { defaultSettings } from '@recompose/contracts';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { EngineHost } from '../engine-host/engine-host';

import { gatewayNamed, recordingHost } from '../engine-host/gateway-lifecycle.testkit';
import { contextFor } from '../engine-host/spend-grant.testkit';
import { storageContextWiring } from './storage-context-wiring';

const PROFILE = join(tmpdir(), 'recompose-storage-context');

function hostThatForgets(running: readonly string[] = []) {
  const recording = recordingHost(running);
  const forgotten: string[] = [];

  return {
    ...recording,
    host: {
      ...recording.host,
      forget: (slug: string) => {
        forgotten.push(slug);
      },
    },
    forgotten,
  };
}

function contextOver(engineHost: EngineHost) {
  const reach = contextFor(PROFILE);
  const themes: Settings['theme'][] = [];
  const loginItemWrites: boolean[] = [];
  const written: Settings[] = [];
  const noted: GatewayConfig[] = [];

  const context = storageContextWiring({
    storageReach: () => reach,
    isEncryptionAvailable: () => true,
    readLoginItem: () => true,
    settingsEffects: {
      setThemeSource: (theme) => {
        themes.push(theme);
      },
      setMenuBarVisible: () => undefined,
      setLoginItem: (enabled) => {
        loginItemWrites.push(enabled);
      },
    },
    onSettingsWritten: (settings) => {
      written.push(settings);
    },
    noteGatewayWrite: (gateway) => {
      noted.push(gateway);
    },
    platform: 'darwin',
  })(engineHost, null);

  return { context, reach, themes, loginItemWrites, written, noted };
}

describe('the storage a channel reaches through the context', () => {
  test('stands on the profile the reach opened', () => {
    const { context, reach } = contextOver(hostThatForgets().host);

    expect(context.userDataPath).toBe(reach.userDataPath);
    expect(context.homeFolder).toBe(reach.homeFolder);
  });

  test('a stored write reaches the watchers that follow the profile', () => {
    const { context, noted } = contextOver(hostThatForgets().host);
    const stored = gatewayNamed('personal', 4_000);

    context.noteGatewayWrite?.(stored);

    expect(noted).toEqual([stored]);
  });
});

describe('reading the engine behind the context', () => {
  test('only a gateway the engine reports running reads as serving', () => {
    const { context } = contextOver(hostThatForgets(['personal']).host);

    expect(context.isServing('personal')).toBe(true);
    expect(context.isServing('work')).toBe(false);
  });

  test('a change reaching every serving gateway restarts none where none serves', () => {
    const engine = hostThatForgets();
    const { context } = contextOver(engine.host);

    context.restartServingGateways?.();

    expect(engine.restarted).toEqual([]);
  });
});

describe('applying a document a person just saved', () => {
  test('the presentation and the login item the save named both take', () => {
    const { context, themes, loginItemWrites } = contextOver(hostThatForgets().host);

    context.applySettings({ ...defaultSettings(), theme: 'dark' }, true);

    expect(themes).toEqual(['dark']);
    expect(loginItemWrites).toEqual([true]);
  });

  test('a save naming no login item leaves the flag the machine holds standing', () => {
    const { context, loginItemWrites } = contextOver(hostThatForgets().host);

    context.applySettings(defaultSettings(), undefined);

    expect(loginItemWrites).toEqual([]);
  });

  test('the saved document reaches the report every window listens on', () => {
    const { context, written } = contextOver(hostThatForgets().host);
    const saved = defaultSettings();

    context.onSettingsWritten(saved);

    expect(written).toEqual([saved]);
  });
});

describe('letting a removed gateway go', () => {
  test('the engine stops it and forgets its readings', async () => {
    const engine = hostThatForgets(['personal']);
    const { context } = contextOver(engine.host);

    await context.removeGatewayRuntime?.('personal');

    expect(engine.stopped).toEqual(['personal']);
    expect(engine.forgotten).toEqual(['personal']);
  });

  test('a stop the engine refuses still leaves the readings forgotten', async () => {
    const engine = hostThatForgets(['personal']);
    const { context } = contextOver({
      ...engine.host,
      stop: async () => Promise.reject(new Error('the child would not go')),
    });

    const removing = context.removeGatewayRuntime?.('personal');

    await expect(removing).rejects.toThrow('the child would not go');
    expect(engine.forgotten).toEqual(['personal']);
  });

  test('a gateway that never served is forgotten without a stop', () => {
    const engine = hostThatForgets();
    const { context } = contextOver(engine.host);

    context.forgetGateway?.('personal');

    expect(engine.forgotten).toEqual(['personal']);
    expect(engine.stopped).toEqual([]);
  });
});
