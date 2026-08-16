import type { EngineStates } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { GatewayLifecycleHandlers } from './gateway-lifecycle-submenu';

import {
  gatewayLifecycleSubmenu,
  gatewayServingIn,
  lifecycleAvailabilityFor,
} from './gateway-lifecycle-submenu';

const codex = { slug: 'codex', displayName: 'Codex' };

const icons = {
  start: { source: 'start.png', retinaSource: 'start@2x.png' },
  stop: { source: 'stop.png', retinaSource: 'stop@2x.png' },
  restart: { source: 'restart.png', retinaSource: 'restart@2x.png' },
};

function recordingHandlers(taken: string[]): GatewayLifecycleHandlers {
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
  };
}

describe('the one lifecycle enablement law', () => {
  test('a serving gateway offers stop and restart, never start', () => {
    expect(lifecycleAvailabilityFor(true)).toEqual({ start: false, stop: true, restart: true });
  });

  test('a stopped gateway offers start alone', () => {
    expect(lifecycleAvailabilityFor(false)).toEqual({ start: true, stop: false, restart: false });
  });
});

describe('whether a gateway serves in a state snapshot', () => {
  test('a running status serves', () => {
    const states: EngineStates = { codex: { status: 'running' } };

    expect(gatewayServingIn(states, 'codex')).toBe(true);
  });

  test('a stopped status does not serve', () => {
    const states: EngineStates = { codex: { status: 'stopped' } };

    expect(gatewayServingIn(states, 'codex')).toBe(false);
  });

  test('a gateway the snapshot never names does not serve', () => {
    expect(gatewayServingIn({}, 'codex')).toBe(false);
  });
});

describe('the lifecycle submenu every surface consumes', () => {
  test('with icons the rows keep the tray shape, enabled by the one law', () => {
    const submenu = gatewayLifecycleSubmenu(
      codex,
      { codex: { status: 'running' } },
      recordingHandlers([]),
      icons,
    );

    expect(submenu.map(({ label, enabled, icon }) => ({ label, enabled, icon }))).toEqual([
      { label: 'Start', enabled: false, icon: icons.start },
      { label: 'Stop', enabled: true, icon: icons.stop },
      { label: 'Restart', enabled: true, icon: icons.restart },
    ]);
  });

  test('without icons no row carries an icon at all', () => {
    const submenu = gatewayLifecycleSubmenu(codex, {}, recordingHandlers([]));

    expect(submenu.map((item) => 'icon' in item)).toEqual([false, false, false]);
    expect(submenu.map(({ label, enabled }) => ({ label, enabled }))).toEqual([
      { label: 'Start', enabled: true },
      { label: 'Stop', enabled: false },
      { label: 'Restart', enabled: false },
    ]);
  });

  test('a click hands the gateway slug to its own handler', () => {
    const taken: string[] = [];
    const submenu = gatewayLifecycleSubmenu(codex, {}, recordingHandlers(taken), icons);

    for (const item of submenu) {
      item.click?.();
    }

    expect(taken).toEqual(['start codex', 'stop codex', 'restart codex']);
  });
});
