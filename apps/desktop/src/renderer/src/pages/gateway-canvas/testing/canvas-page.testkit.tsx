import '@xyflow/react/dist/base.css';
import type { IpcEventPayload } from '@recompose/contracts';
import type { ReactElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, Suspense } from 'react';
import { expect } from 'vitest';
import { render } from 'vitest-browser-react';

import type { BridgeParameters } from '../../../shared/testing';

import {
  bindEngineJudgingToCache,
  bindEngineLogsToCache,
  bindEngineTrafficToCache,
} from '../../../shared/api';
import { closeInspector, closeLogsDrawer } from '../../../shared/lib';
import { forgetEngineLogsListeners, installFakeBridge } from '../../../shared/testing';
import { dropCanvasPositions } from '../lib/canvas-position-store';
import { leaveDrafting } from '../lib/use-held-draft';
import { GatewayCanvasPage } from '../ui/gateway-canvas-page/gateway-canvas-page';
import { servingBridgeWorld } from './gateway-canvas.testkit';

const CANVAS_FOOTING = `
[data-canvas-footing] { display: flex; width: 1280px; height: 800px; }
[data-canvas-footing] > div { display: flex; flex: 1 1 0%; min-width: 0; }
[data-canvas-footing] [data-canvas-workspace] { display: flex; flex: 1 1 0%; min-width: 0; min-height: 0; }
[data-canvas-footing] [data-canvas-column] { display: flex; flex: 1 1 0%; flex-direction: column; min-width: 0; }
[data-canvas-footing] footer { display: flex; flex-shrink: 0; align-items: center; gap: 14px; height: 38px; padding-inline: 14px; }
[data-canvas-footing] section { position: relative; display: flex; flex: 1 1 0%; min-width: 0; overflow: hidden; }
[data-canvas-footing] [data-canvas-column] > [data-logs-drawer] { flex: 0 0 auto; flex-direction: column; }
[data-canvas-footing] .pointer-events-auto { pointer-events: auto; }
[data-canvas-footing] .absolute { position: absolute; }
[data-canvas-footing] .top-0 { top: 0; }
[data-canvas-footing] .inset-s-0 { inset-inline-start: 0; }
[data-canvas-footing] .z-20 { z-index: 20; }
[data-canvas-footing] [data-panel-control] { position: relative; }
[data-canvas-footing] [data-panel-control][aria-orientation='horizontal'] { height: 8px; margin-block: -4px; }
[data-canvas-footing] .origin-top-left { transform-origin: 0 0; }
`;

const footing = document.createElement('style');

footing.textContent = CANVAS_FOOTING;
document.head.append(footing);

const escaped: unknown[] = [];

/**
 * Whether an error the page raised is the browser saying it deferred a resize round.
 *
 * @summary `ResizeObserver loop completed with undelivered notifications` is the loop guard doing
 * its job: the callback changed a size, so the browser moved the rest of that round to the next
 * frame rather than spin. Nothing is lost and nothing broke, but it reaches `window.onerror` with a
 * null `error`, so a page watching for escapes reads a benign frame boundary as a scenario that
 * failed. Any observer in the tree can raise it, and the canvas holds several.
 */
function deferredResizeRound(event: ErrorEvent): boolean {
  return event.error === null && event.message.includes('ResizeObserver loop');
}

window.addEventListener('error', (event) => {
  if (deferredResizeRound(event)) return;

  escaped.push(event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  escaped.push(event.reason);
});

/** Puts every renderer-owned canvas standing back to how a fresh session opens. */
export function freshCanvasRun(): void {
  if (escaped.length > 0) {
    const first = escaped[0];

    escaped.length = 0;

    throw new Error(`an earlier scenario let an error escape the page: ${String(first)}`);
  }

  localStorage.clear();
  dropCanvasPositions('my-gateway');
  leaveDrafting('my-gateway');
  closeLogsDrawer();
  forgetEngineLogsListeners();

  closeInspector();
}

function wrappedPage(strict: boolean, onGatewayRemoved?: () => void): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  bindEngineTrafficToCache(queryClient);
  bindEngineJudgingToCache(queryClient);
  bindEngineLogsToCache(queryClient);

  const page = (
    <div data-canvas-footing="">
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<p>Loading…</p>}>
          <GatewayCanvasPage onGatewayRemoved={onGatewayRemoved} slug="my-gateway" />
        </Suspense>
      </QueryClientProvider>
    </div>
  );

  return strict ? <StrictMode>{page}</StrictMode> : page;
}

/** Stands the fake bridge under the canvas, with the serving gateway world unless told otherwise. */
export function standCanvasBridge(parameters: BridgeParameters = {}): void {
  installFakeBridge({ ...servingBridgeWorld, ...parameters });
}

/** Renders the page onto whatever bridge stands, holding until the gateway card paints. */
export async function renderCanvasPage(
  strict = false,
  onGatewayRemoved?: () => void,
  gatewayCard: RegExp = /My Gateway/,
) {
  const screen = await render(wrappedPage(strict, onGatewayRemoved));

  await expect.element(screen.getByRole('button', { name: gatewayCard })).toBeVisible();

  return screen;
}

/**
 * The whole gateway canvas standing on the fake bridge, ready for a gesture.
 *
 * @summary Reach for it in any browser test of the assembled surface, so every scenario reads the
 * same stored world: the serving gateway, the four-kind registry, and the key account's model list.
 * A scenario that cares about a different world says so through the parameters.
 */
export async function canvasPageOn(parameters: BridgeParameters = {}, strict = false) {
  standCanvasBridge(parameters);

  return renderCanvasPage(strict);
}

type BindingAsk = { getByRole: (role: string, options?: { name?: RegExp }) => AskedOption };

type AskedOption = {
  getByRole: (role: string, options?: { name?: RegExp }) => { click: () => Promise<void> };
};

/**
 * Answers the binding ask with a target, which is the step every account pick now opens on.
 *
 * @operation A released cable asks what to bind before anything else, so a scenario about the
 * account pick says which kind it meant and then reads the accounts. The press is scoped to the
 * ask itself, because the canvas behind it stands target cards whose names read like options.
 */
export async function pickedTheTarget(screen: BindingAsk): Promise<void> {
  await screen
    .getByRole('dialog')
    .getByRole('button', { name: /Provider/ })
    .click();
}

type CanvasCommand = IpcEventPayload<'canvas:command'>;

/**
 * Stands a Canvas menu line the page can subscribe to, and hands back the push that drives it.
 *
 * @summary Reach for it after the fake bridge stands and before the page renders, because the
 * page subscribes on mount and a line installed later is one nobody listens to.
 */
export function canvasCommandLine(): (command: CanvasCommand) => void {
  const listeners = new Set<(command: CanvasCommand) => void>();

  window.recomposeEvents = {
    ...window.recomposeEvents,
    'canvas:command': (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };

  return (command) => {
    for (const listener of listeners) {
      listener(command);
    }
  };
}
