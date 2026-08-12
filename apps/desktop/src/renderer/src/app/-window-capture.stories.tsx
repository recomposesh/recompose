import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { RouterProvider, useRouter } from '@tanstack/react-router';

import preview from '#.storybook/preview';

import { servedAcrossTwoModels, servingBridgeWorld } from '../pages/gateway-canvas/testing';
import {
  closeInspector,
  inspectorOpen,
  logsDrawerOpen,
  toggleInspector,
  toggleLogsDrawer,
} from '../shared/lib';
import { connectedSubscription, emitEngineLogs, servedReport } from '../shared/testing';

function AppWindow() {
  const router = useRouter();

  return (
    <div className="overflow-hidden bg-surface-content" style={{ height: 900, width: 1440 }}>
      <RouterProvider router={router} />
    </div>
  );
}

function openInspector(): () => void {
  if (!inspectorOpen()) {
    toggleInspector();
  }

  return () => {
    closeInspector();
  };
}

function openLogsDrawer(): () => void {
  if (!logsDrawerOpen()) {
    toggleLogsDrawer();
  }

  return () => {
    if (logsDrawerOpen()) {
      toggleLogsDrawer();
    }
  };
}

function openBothDrawers(): () => void {
  const leaveInspector = openInspector();
  const leaveLogsDrawer = openLogsDrawer();

  return () => {
    leaveInspector();
    leaveLogsDrawer();
  };
}

const meta = preview.meta({
  component: AppWindow,
  parameters: { bridge: servingBridgeWorld },
});

export const HomeWindow = meta.story({
  parameters: {
    bridge: {
      accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [] },
      gateways: [],
      engineStates: {},
      providerModels: {},
    },
    route: '/',
  },
});

export const GatewayWindow = meta.story({ parameters: { route: '/gateways/my-gateway' } });

export const GatewayWithInspector = meta.story({
  beforeEach: openInspector,
  parameters: { route: '/gateways/my-gateway' },
});

export const GatewayWithLogs = meta.story({
  beforeEach: openLogsDrawer,
  parameters: { route: '/gateways/my-gateway' },
  play: () => {
    emitEngineLogs({ kind: 'backfill', rows: servedAcrossTwoModels });
  },
});

export const GatewayWithBothDrawers = meta.story({
  beforeEach: openBothDrawers,
  parameters: { route: '/gateways/my-gateway' },
  play: () => {
    emitEngineLogs({ kind: 'backfill', rows: servedAcrossTwoModels });
  },
});

export const GatewayVirtualModelSelected = meta.story({
  beforeEach: openInspector,
  parameters: { route: '/gateways/my-gateway' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Fast/ }));
  },
});

export const GatewayTargetSelected = meta.story({
  beforeEach: openInspector,
  parameters: { route: '/gateways/my-gateway' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Anthropic/ }));
  },
});

export const GatewayCableSelected = meta.story({
  beforeEach: openInspector,
  parameters: { route: '/gateways/my-gateway' },
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector('[data-id="cable:fast"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  },
});

export const CreateGatewayWindow = meta.story({
  parameters: { route: '/gateways/my-gateway?create=true' },
});

export const UsageWindow = meta.story({
  parameters: { bridge: { ...servingBridgeWorld, usageReport: servedReport }, route: '/usage' },
});

export const ProvidersWindow = meta.story({
  parameters: {
    bridge: { ...servingBridgeWorld, subscriptions: [connectedSubscription] },
    route: '/providers?kind=subscription',
  },
});

export const ProvidersCatalogWindow = meta.story({
  parameters: {
    bridge: { ...servingBridgeWorld, subscriptions: [connectedSubscription] },
    route: '/providers?kind=subscription',
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Add provider' }));
  },
});

export const SettingsWindow = meta.story({ parameters: { route: '/settings' } });
