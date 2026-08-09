import { defaultSettings } from '@recompose/contracts';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { amendStoredSettings, recordFirstRequestServed } from './settings-amend';
import { loadSettingsFile, saveSettingsFile } from './settings-store';

const neverCorrupt = (quarantinedPath: string) => {
  throw new Error(`unexpected quarantine: ${quarantinedPath}`);
};

async function freshSettingsFile(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), 'recompose-settings-amend-')), 'settings.json');
}

describe('amending the stored settings', () => {
  test('a patch lands on disk and comes back on the next load', async () => {
    const file = await freshSettingsFile();

    await saveSettingsFile(file, defaultSettings());

    const amended = await amendStoredSettings(file, neverCorrupt, {
      showOnboardingChecklist: false,
    });

    expect(amended.showOnboardingChecklist).toBe(false);
    expect(await loadSettingsFile(file, neverCorrupt)).toEqual(amended);
  });
});

describe('recording the first served request', () => {
  test('the first record amends the document and hands it back', async () => {
    const file = await freshSettingsFile();

    await saveSettingsFile(file, defaultSettings());

    const recorded = await recordFirstRequestServed(file, neverCorrupt);

    expect(recorded?.firstRequestServed).toBe(true);
    expect((await loadSettingsFile(file, neverCorrupt)).firstRequestServed).toBe(true);
  });

  test('a profile that already served answers nothing and takes no write', async () => {
    const file = await freshSettingsFile();

    await saveSettingsFile(file, { ...defaultSettings(), firstRequestServed: true });

    expect(await recordFirstRequestServed(file, neverCorrupt)).toBeNull();
  });
});
