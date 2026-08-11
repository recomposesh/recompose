import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { adoptLegacyConfigHome, resolveConfigHome } from './config-home';

describe('where the config home stands', () => {
  test('it stands at .recompose inside the home folder', () => {
    expect(resolveConfigHome({}, '/Users/ada')).toBe('/Users/ada/.recompose');
  });

  test('the end-to-end override wins outright', () => {
    expect(resolveConfigHome({ RECOMPOSE_USER_DATA_DIR: '/tmp/profile' }, '/Users/ada')).toBe(
      '/tmp/profile',
    );
  });
});

describe('adopting the documents an earlier build left behind', () => {
  async function legacyProfile(): Promise<{ legacy: string; home: string }> {
    const root = await mkdtemp(join(tmpdir(), 'recompose-adopt-'));
    const legacy = join(root, 'userData');
    const home = join(root, '.recompose');

    await mkdir(join(legacy, 'gateways'), { recursive: true });
    await writeFile(join(legacy, 'gateways', 'codex.json'), '{"slug":"codex"}', 'utf8');
    await writeFile(join(legacy, 'settings.json'), '{"theme":"dark"}', 'utf8');
    await writeFile(join(legacy, 'Cookies'), 'browser litter', 'utf8');

    return { legacy, home };
  }

  test('the owned documents move whole, and the browser litter stays behind', async () => {
    const { legacy, home } = await legacyProfile();

    await adoptLegacyConfigHome(legacy, home);

    expect(await readFile(join(home, 'settings.json'), 'utf8')).toBe('{"theme":"dark"}');
    expect(await readFile(join(home, 'gateways', 'codex.json'), 'utf8')).toBe('{"slug":"codex"}');
    expect(await readdir(legacy)).toEqual(['Cookies']);
  });

  test('adopting twice changes nothing more', async () => {
    const { legacy, home } = await legacyProfile();

    await adoptLegacyConfigHome(legacy, home);
    await adoptLegacyConfigHome(legacy, home);

    expect(await readFile(join(home, 'settings.json'), 'utf8')).toBe('{"theme":"dark"}');
  });

  test('a home already holding a document keeps its own copy', async () => {
    const { legacy, home } = await legacyProfile();

    await mkdir(home, { recursive: true });
    await writeFile(join(home, 'settings.json'), '{"theme":"light"}', 'utf8');

    await adoptLegacyConfigHome(legacy, home);

    expect(await readFile(join(home, 'settings.json'), 'utf8')).toBe('{"theme":"light"}');
  });

  test('the overridden profile adopts nothing, since both names point at one folder', async () => {
    const { legacy } = await legacyProfile();

    await adoptLegacyConfigHome(legacy, legacy);

    expect(await readFile(join(legacy, 'settings.json'), 'utf8')).toBe('{"theme":"dark"}');
  });
});
