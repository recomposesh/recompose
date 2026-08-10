import type { IpcResponse } from '@recompose/contracts';

import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { gatewaySeed, installFakeBridge } from '../../shared/testing';
import { renderAt } from '../testing/render-app';
import { useTitleBarDoubleClick } from './use-title-bar-double-click';

const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

function zoomSpy() {
  return vi.fn<() => Promise<IpcResponse<'system:title-bar-double-click'>>>().mockResolvedValue({
    ok: true,
    value: undefined,
  });
}

function askedToZoom() {
  const asked = zoomSpy();

  installFakeBridge({ overrides: { 'system:title-bar-double-click': asked } });

  return asked;
}

async function gatewayToolbar() {
  const asked = zoomSpy();
  const screen = await renderAt('/gateways/codex', {
    gateways: [codex],
    overrides: { 'system:title-bar-double-click': asked },
  });
  const strip = screen.getByRole('toolbar', { name: 'Codex' }).element();

  return { asked, strip };
}

function Probe() {
  useTitleBarDoubleClick();

  return (
    <div className="app-drag">
      <button className="app-no-drag" type="button">
        Run
      </button>
    </div>
  );
}

function doubleClick(target: Element) {
  target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
}

test('double-clicking the bare drag region asks the window to answer the double-click', async () => {
  const asked = askedToZoom();
  const screen = await render(<Probe />);
  const bar = screen.container.querySelector('.app-drag');

  if (bar === null) {
    throw new Error('the drag region is not on screen');
  }

  doubleClick(bar);

  expect(asked).toHaveBeenCalledTimes(1);
});

test('double-clicking a control that sits in the bar is the control to answer, not the window', async () => {
  const asked = askedToZoom();
  const screen = await render(<Probe />);

  doubleClick(screen.getByRole('button', { name: 'Run' }).element());

  expect(asked).not.toHaveBeenCalled();
});

test('double-clicking the bare surface of a gateway toolbar asks the window to answer', async () => {
  const { asked, strip } = await gatewayToolbar();

  doubleClick(strip);

  expect(asked).toHaveBeenCalledTimes(1);
});

test('double-clicking any control of a gateway toolbar leaves the window alone', async () => {
  const { asked, strip } = await gatewayToolbar();

  for (const control of strip.children) {
    doubleClick(control);
  }

  expect(strip.children.length).toBeGreaterThan(0);
  expect(asked).not.toHaveBeenCalled();
});
