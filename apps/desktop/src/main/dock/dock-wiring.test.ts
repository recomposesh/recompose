import { GATEWAY_CONFIG_VERSION, type GatewayConfig } from '@recompose/contracts';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { dockMenuWiring } from './dock-wiring';

type PaintedItem = { label?: string; enabled?: boolean; submenu?: PaintedItem[] };

const desktop = vi.hoisted((): { painted: PaintedItem[][] } => ({ painted: [] }));

vi.mock('electron', () => ({
  app: {
    dock: {
      setMenu: (menu: PaintedItem[]) => {
        desktop.painted.push(menu);
      },
    },
  },
  Menu: { buildFromTemplate: (template: PaintedItem[]) => template },
}));

const lifecycle = {
  onStartGateway: () => undefined,
  onStopGateway: () => undefined,
  onRestartGateway: () => undefined,
};

let gatewaysDir = '';

beforeEach(async () => {
  gatewaysDir = await mkdtemp(join(tmpdir(), 'recompose-dock-'));
  desktop.painted = [];
});

afterEach(async () => {
  await rm(gatewaysDir, { recursive: true, force: true });
});

async function storeGateway(slug: string, displayName: string): Promise<void> {
  const gateway: GatewayConfig = {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug,
    displayName,
    port: 4141,
    virtualModels: [],
    layout: { nodes: {} },
  };

  await writeFile(join(gatewaysDir, `${slug}.json`), JSON.stringify(gateway));
}

function wiringOn(platform: NodeJS.Platform, activationPolicy: 'accessory' | null) {
  return dockMenuWiring({
    platform,
    activationPolicy,
    gatewaysDir: () => gatewaysDir,
    onCorrupt: () => undefined,
    lifecycle,
    onNewGateway: () => undefined,
    onOpenSettings: () => undefined,
  });
}

describe('the Dock menu wired to the app seams', () => {
  test('an accessory run and a non-darwin run wire nothing', () => {
    expect(wiringOn('darwin', 'accessory')).toBeNull();
    expect(wiringOn('linux', null)).toBeNull();
  });

  test('a darwin run repaints the Dock from the stored gateways', async () => {
    await storeGateway('codex', 'Codex');

    const repaint = wiringOn('darwin', null);

    expect(repaint).not.toBeNull();
    repaint?.({ codex: { status: 'running' } });
    await vi.waitFor(() => {
      expect(desktop.painted).toHaveLength(1);
    });

    const [menu] = desktop.painted;

    expect(menu?.map((item) => item.label ?? 'separator')).toEqual([
      'Codex',
      'separator',
      'New Gateway…',
      'Settings…',
    ]);
  });
});
