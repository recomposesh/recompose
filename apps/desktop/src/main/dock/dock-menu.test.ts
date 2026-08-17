import type { EngineStates } from '@recompose/contracts';

import { describe, expect, test, vi } from 'vitest';

import type { TrayMenuItem } from '../tray/gateway-lifecycle-submenu';
import type { DockMenuHandlers } from './dock-menu';

import { asDockElectronMenu, buildDockMenuTemplate, dockRepainter, dockStands } from './dock-menu';

const codex = { slug: 'codex', displayName: 'Codex' };
const relay = { slug: 'relay', displayName: 'Relay' };

function recordingHandlers(taken: string[]): DockMenuHandlers {
  return {
    onStartGateway: (slug) => {
      taken.push(`start ${slug}`);
    },
    onStopGateway: (slug) => {
      taken.push(`stop ${slug}`);
    },
    onRestartGateway: (slug) => {
      taken.push(`restart ${slug}`);
    },
    onNewGateway: () => {
      taken.push('new-gateway');
    },
    onOpenSettings: () => {
      taken.push('settings');
    },
  };
}

type RowShape = { label?: string | undefined; enabled?: boolean | undefined };

function labelAndEnabled(item: TrayMenuItem): RowShape {
  return { label: item.label, enabled: item.enabled };
}

function submenuShapes(row: TrayMenuItem | undefined): RowShape[] {
  const submenu = row?.submenu ?? [];

  return submenu.map(labelAndEnabled);
}

function typeOrLabel(item: { type?: string | undefined; label?: string | undefined }): string {
  return item.type ?? item.label ?? '';
}

function firstLifecycleRow(handed: TrayMenuItem[][], paint: number): RowShape {
  const [row] = submenuShapes(handed[paint]?.[0]);

  return row ?? {};
}

describe('where a Dock stands at all', () => {
  test('a darwin run with no accessory policy owns a Dock tile', () => {
    expect(dockStands('darwin', null)).toBe(true);
  });

  test('an accessory run owns no tile, so nothing installs', () => {
    expect(dockStands('darwin', 'accessory')).toBe(false);
  });

  test('no other platform answers, whatever the policy says', () => {
    expect(dockStands('win32', null)).toBe(false);
    expect(dockStands('linux', null)).toBe(false);
  });
});

describe('the Dock menu mirrors the tray', () => {
  test('every stored gateway carries the lifecycle submenu, enabled by the one law', () => {
    const states: EngineStates = { codex: { status: 'running' } };
    const template = buildDockMenuTemplate([codex, relay], states, recordingHandlers([]));
    const [codexRow, relayRow] = template;

    expect(codexRow?.label).toBe('Codex');
    expect(submenuShapes(codexRow)).toEqual([
      { label: 'Start', enabled: false },
      { label: 'Stop', enabled: true },
      { label: 'Restart', enabled: true },
    ]);
    expect(submenuShapes(relayRow)).toEqual([
      { label: 'Start', enabled: true },
      { label: 'Stop', enabled: false },
      { label: 'Restart', enabled: false },
    ]);
  });

  test('no Dock row carries an icon', () => {
    const template = buildDockMenuTemplate([codex], {}, recordingHandlers([]));
    const rows = template.flatMap((row) => [row, ...(row.submenu ?? [])]);

    expect(rows.some((item) => 'icon' in item)).toBe(false);
  });

  test('New Gateway… and Settings… follow below a separator, because the Dock is the fallback surface', () => {
    const taken: string[] = [];
    const template = buildDockMenuTemplate([codex], {}, recordingHandlers(taken));
    const tail = template.slice(-3);

    expect(tail.map(typeOrLabel)).toEqual(['separator', 'New Gateway…', 'Settings…']);

    for (const item of tail) {
      item.click?.();
    }

    expect(taken).toEqual(['new-gateway', 'settings']);
  });

  test('zero stored gateways show the tray inert placeholder row', () => {
    const template = buildDockMenuTemplate([], {}, recordingHandlers([]));
    const [placeholder] = template;

    expect(placeholder).toEqual({ label: 'No gateways yet', enabled: false });
  });
});

describe('the electron translation', () => {
  test('rows travel whole and submenus recurse', () => {
    const template: TrayMenuItem[] = [
      { label: 'Codex', submenu: [{ label: 'Start', enabled: true, click: () => undefined }] },
      { type: 'separator' },
      { label: 'Settings…', click: () => undefined },
    ];
    const translated = asDockElectronMenu(template);

    const translatedSubmenu = translated[0]?.submenu;

    expect(translated.map(typeOrLabel)).toEqual(['Codex', 'separator', 'Settings…']);
    expect(
      Array.isArray(translatedSubmenu)
        ? translatedSubmenu.map((item) => ({ label: item.label, enabled: item.enabled }))
        : 'not a list',
    ).toEqual([{ label: 'Start', enabled: true }]);
  });
});

describe('the Dock repainter', () => {
  test('every state change re-reads the stored gateways and hands over a fresh template', async () => {
    const handed: TrayMenuItem[][] = [];
    const repaint = dockRepainter({
      listGateways: async () => Promise.resolve([codex]),
      setMenu: (template) => {
        handed.push(template);
      },
      handlers: recordingHandlers([]),
    });

    repaint({});
    repaint({ codex: { status: 'running' } });
    await vi.waitFor(() => {
      expect(handed).toHaveLength(2);
    });

    expect(handed[0]).not.toBe(handed[1]);
    expect(firstLifecycleRow(handed, 0)).toEqual({ label: 'Start', enabled: true });
    expect(firstLifecycleRow(handed, 1)).toEqual({ label: 'Start', enabled: false });
  });

  test('a failed gateway read keeps the standing menu and says what it attempted', async () => {
    const complained = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handed: TrayMenuItem[][] = [];
    const repaint = dockRepainter({
      listGateways: async () => Promise.reject(new Error('disk gone')),
      setMenu: (template) => {
        handed.push(template);
      },
      handlers: recordingHandlers([]),
    });

    repaint({});
    await vi.waitFor(() => {
      expect(complained).toHaveBeenCalledOnce();
    });

    expect(handed).toHaveLength(0);
    expect(String(complained.mock.calls[0]?.[0])).toContain('Dock');
    complained.mockRestore();
  });
});
