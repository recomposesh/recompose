import type { Settings } from '@recompose/contracts';

import { defaultSettings } from '@recompose/contracts';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  amendStoredSettings,
  firstRequestReporter,
  recordFirstRequestServed,
} from './settings-amend';
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

afterEach(() => {
  vi.restoreAllMocks();
});

function reportingOver(settingsFile: string): { report: () => void; reflected: Settings[] } {
  const reflected: Settings[] = [];

  return {
    reflected,
    report: firstRequestReporter(
      () => settingsFile,
      neverCorrupt,
      (settings) => {
        reflected.push(settings);
      },
    ),
  };
}

describe('telling the app about the first request a gateway served', () => {
  test('the first grant carries the amended document out to whoever reflects it', async () => {
    const file = await freshSettingsFile();

    await saveSettingsFile(file, defaultSettings());

    const { report, reflected } = reportingOver(file);

    report();

    await vi.waitFor(() => {
      expect(reflected).toHaveLength(1);
    });

    expect(reflected[0]?.firstRequestServed).toBe(true);
    expect((await loadSettingsFile(file, neverCorrupt)).firstRequestServed).toBe(true);
  });

  test('a profile that already served reflects nothing, so nobody hears it twice', async () => {
    const file = await freshSettingsFile();

    await saveSettingsFile(file, { ...defaultSettings(), firstRequestServed: true });

    const { report, reflected } = reportingOver(file);

    report();

    await expect(recordFirstRequestServed(file, neverCorrupt)).resolves.toBeNull();

    expect(reflected).toEqual([]);
  });

  test('a record the disk refuses is written down and nothing is reflected', async () => {
    const reported: unknown[][] = [];

    vi.spyOn(console, 'error').mockImplementation((...complaint: unknown[]) => {
      reported.push(complaint);
    });

    const occupied = join(await mkdtemp(join(tmpdir(), 'recompose-settings-amend-')), 'occupied');

    await writeFile(occupied, 'not a folder', 'utf8');

    const { report, reflected } = reportingOver(join(occupied, 'settings.json'));

    report();

    await vi.waitFor(() => {
      expect(reported).toHaveLength(1);
    });

    expect(reported[0]?.[0]).toBe('recompose could not write down the first served request.');
    expect(reflected).toEqual([]);
  });
});
