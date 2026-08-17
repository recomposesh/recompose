import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';

const releaseArtifactContract = z.object({
  productName: z.string(),
  mac: z.object({ target: z.array(z.string()) }),
  nsis: z.looseObject({ artifactName: z.string() }),
  dmg: z.object({ artifactName: z.string() }),
  appImage: z.object({ artifactName: z.string() }),
  deb: z.object({ artifactName: z.string() }),
});

async function shippedBuilderConfig(): Promise<z.infer<typeof releaseArtifactContract>> {
  const source = await readFile(join(__dirname, '..', 'electron-builder.yml'), 'utf8');

  return releaseArtifactContract.parse(parse(source));
}

describe('the artifacts a release run ships', () => {
  it('ships the zip the update feed reads beside the dmg', async () => {
    const config = await shippedBuilderConfig();

    expect(config.mac.target).toEqual(expect.arrayContaining(['dmg', 'zip']));
  });

  it('names a distinct dmg per architecture', async () => {
    const config = await shippedBuilderConfig();

    expect(config.dmg.artifactName).toContain('${arch}');
  });

  it('keeps every artifact name free of spaces the feed would misquote', async () => {
    const config = await shippedBuilderConfig();
    const names = [
      config.productName,
      config.nsis.artifactName,
      config.dmg.artifactName,
      config.appImage.artifactName,
      config.deb.artifactName,
    ];

    for (const name of names) {
      expect(name).not.toMatch(/\s/);
    }
  });

  it('installs per user, where an update lands without elevation', async () => {
    const config = await shippedBuilderConfig();

    expect(config.nsis).not.toHaveProperty('perMachine');
  });
});
