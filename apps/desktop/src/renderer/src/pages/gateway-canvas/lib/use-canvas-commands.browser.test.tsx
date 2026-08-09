import type { IpcEventPayload } from '@recompose/contracts';

import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { askTheCanvas } from '../../../shared/lib';
import { CanvasCommands } from './use-canvas-commands';

type CanvasCommand = IpcEventPayload<'canvas:command'>;

const listeners = new Set<(command: CanvasCommand) => void>();

function pushCommand(command: CanvasCommand): void {
  for (const listener of listeners) {
    listener(command);
  }
}

beforeEach(() => {
  listeners.clear();
  window.recomposeEvents = {
    'engine:state': () => () => undefined,
    'accounts:changed': () => () => undefined,
    'settings:changed': () => () => undefined,
    'devtools:toggle': () => () => undefined,
    'canvas:command': (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
});

async function renderCommandedFlow(onTidy: () => void = () => {}) {
  return render(
    <div style={{ width: 640, height: 400 }}>
      <ReactFlowProvider>
        <ReactFlow defaultViewport={{ x: 0, y: 0, zoom: 1 }}>
          <CanvasCommands onTidy={onTidy} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>,
  );
}

function viewportTransform(container: HTMLElement): string {
  const viewport = container.querySelector<HTMLElement>('.react-flow__viewport');

  return viewport?.style.transform ?? '';
}

test('the zoom-in command grows the viewport', async () => {
  const screen = await renderCommandedFlow();
  const resting = viewportTransform(screen.container);

  pushCommand('zoom-in');

  await expect.poll(() => viewportTransform(screen.container)).not.toBe(resting);
});

test('the tidy command reaches the arrangement rather than the viewport', async () => {
  const asked: string[] = [];

  const screen = await renderCommandedFlow(() => {
    asked.push('tidy');
  });
  const resting = viewportTransform(screen.container);

  pushCommand('tidy');

  expect(asked).toEqual(['tidy']);
  expect(viewportTransform(screen.container)).toBe(resting);
});

test("the toolbar's tidy ask reaches the arrangement the same way the menu does", async () => {
  const asked: string[] = [];

  await renderCommandedFlow(() => {
    asked.push('tidy');
  });

  askTheCanvas('tidy');

  expect(asked).toEqual(['tidy']);
});

test('an unmounted canvas hears no ask, so a stale listener never arranges a gone stage', async () => {
  const asked: string[] = [];

  const screen = await renderCommandedFlow(() => {
    asked.push('tidy');
  });

  await screen.unmount();
  askTheCanvas('tidy');

  expect(asked).toEqual([]);
});

test('an unmounted canvas stops listening', async () => {
  const screen = await renderCommandedFlow();

  await screen.unmount();

  expect(listeners.size).toBe(0);
});
