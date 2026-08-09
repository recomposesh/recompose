import type { EngineStates, GatewayConfig } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TrayMenuHandlers } from './tray-menu-template';

import { saveGatewayConfig } from '../storage/gateway-store';
import { hideMenuBarTray, showMenuBarTray } from './menu-bar-tray';
import { trayRepainter } from './tray-repaint';

type PaintedItem = { label?: string; enabled?: boolean; submenu?: PaintedItem[] };

const desktop = vi.hoisted((): { painted: PaintedItem[][] } => ({ painted: [] }));

vi.mock('electron', () => {
  class TrayFake {
    private destroyed = false;

    setToolTip(): void {}

    setContextMenu(menu: PaintedItem[]): void {
      desktop.painted.push(menu);
    }

    destroy(): void {
      this.destroyed = true;
    }

    isDestroyed(): boolean {
      return this.destroyed;
    }
  }

  const icon = {
    addRepresentation: () => {},
    setTemplateImage: () => {},
    toDataURL: () => 'data:image/png;base64,',
  };

  return {
    app: { isPackaged: true },
    Menu: { buildFromTemplate: (template: PaintedItem[]): PaintedItem[] => template },
    nativeImage: { createFromPath: () => icon },
    Tray: TrayFake,
  };
});

function gatewayNamed(slug: string, displayName: string, port: number): GatewayConfig {
  return {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug,
    displayName,
    port,
    virtualModels: [],
    layout: { nodes: {} },
  };
}

function trayHandlers(): TrayMenuHandlers {
  return {
    onOpenWindow: () => {},
    onOpenSettings: () => {},
    onOpenDevtools: () => {},
    onQuit: () => {},
    onStartGateway: () => {},
    onStopGateway: () => {},
    onRestartGateway: () => {},
  };
}

async function freshGatewaysDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'recompose-tray-repaint-'));
}

function paintedMenu(): PaintedItem[] {
  const menu = desktop.painted.at(-1);

  if (menu === undefined) {
    throw new Error('the tray menu was never painted');
  }

  return menu;
}

function paintedLabels(): (string | undefined)[] {
  return paintedMenu().map((item) => item.label);
}

function submenuOf(label: string): PaintedItem[] {
  const item = paintedMenu().find((candidate) => candidate.label === label);

  if (item?.submenu === undefined) {
    throw new Error(`the tray menu holds no gateway named "${label}"`);
  }

  return item.submenu;
}

function itemEnabled(submenu: PaintedItem[], label: string): boolean | undefined {
  return submenu.find((item) => item.label === label)?.enabled;
}

beforeEach(() => {
  desktop.painted = [];
  showMenuBarTray(trayHandlers());
});

afterEach(() => {
  hideMenuBarTray();
  vi.restoreAllMocks();
});

describe('repainting the menu bar from the stored gateways', () => {
  test('every stored gateway takes its own place in the tray menu', async () => {
    const gatewaysDir = await freshGatewaysDir();

    await saveGatewayConfig(gatewaysDir, gatewayNamed('personal', 'Personal', 8397));
    await saveGatewayConfig(gatewaysDir, gatewayNamed('work', 'Work', 8398));

    trayRepainter(
      () => gatewaysDir,
      () => undefined,
    )({});

    await vi.waitFor(() => {
      expect(paintedLabels()).toContain('Personal');
    });

    expect(paintedLabels()).toContain('Work');
  });

  test('a gateway the disk no longer holds leaves the tray on the next repaint', async () => {
    const gatewaysDir = await freshGatewaysDir();

    await saveGatewayConfig(gatewaysDir, gatewayNamed('personal', 'Personal', 8397));

    const repaint = trayRepainter(
      () => gatewaysDir,
      () => undefined,
    );

    repaint({});

    await vi.waitFor(() => {
      expect(paintedLabels()).toContain('Personal');
    });

    await rm(join(gatewaysDir, 'personal.json'));
    repaint({});

    await vi.waitFor(() => {
      expect(paintedLabels()).not.toContain('Personal');
    });
  });

  test('a serving gateway offers the stop its state allows rather than a start', async () => {
    const gatewaysDir = await freshGatewaysDir();

    await saveGatewayConfig(gatewaysDir, gatewayNamed('personal', 'Personal', 8397));

    const serving: EngineStates = { personal: { status: 'running' } };

    trayRepainter(
      () => gatewaysDir,
      () => undefined,
    )(serving);

    await vi.waitFor(() => {
      expect(paintedLabels()).toContain('Personal');
    });

    expect(itemEnabled(submenuOf('Personal'), 'Stop')).toBe(true);
    expect(itemEnabled(submenuOf('Personal'), 'Start')).toBe(false);
  });
});

describe('a repaint the disk refuses', () => {
  test('the refusal is written down and the tray keeps the menu it had', async () => {
    const reported: unknown[][] = [];

    vi.spyOn(console, 'error').mockImplementation((...report: unknown[]) => {
      reported.push(report);
    });

    const gatewaysDir = await freshGatewaysDir();

    await saveGatewayConfig(gatewaysDir, gatewayNamed('personal', 'Personal', 8397));

    const readable = trayRepainter(
      () => gatewaysDir,
      () => undefined,
    );

    readable({});

    await vi.waitFor(() => {
      expect(paintedLabels()).toContain('Personal');
    });

    const occupied = join(await mkdtemp(join(tmpdir(), 'recompose-tray-repaint-')), 'occupied');

    await writeFile(occupied, 'not a folder', 'utf8');
    trayRepainter(
      () => occupied,
      () => undefined,
    )({});

    await vi.waitFor(() => {
      expect(reported).toHaveLength(1);
    });

    expect(reported[0]?.[0]).toBe('recompose could not read its gateways for the menu bar');
    expect(paintedLabels()).toContain('Personal');
  });
});
