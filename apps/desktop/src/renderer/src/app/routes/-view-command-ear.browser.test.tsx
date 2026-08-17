import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { closeInspector, inspectorOpen, showSidebar, sidebarHidden } from '../../shared/lib';
import { emitViewCommand, installFakeBridge, reportedSurfaceToggles } from '../../shared/testing';
import { ViewCommandEar } from './-view-command-ear';

beforeEach(() => {
  localStorage.clear();
  showSidebar();
  closeInspector();
  installFakeBridge();
});

test('mounting reports the standing surfaces once, so the menu ticks start honest', async () => {
  await render(<ViewCommandEar />);

  await expect
    .poll(() => reportedSurfaceToggles())
    .toEqual([{ sidebar: true, inspector: false, modal: false }]);
});

test('the sidebar toggle flips the store and a fresh snapshot rides out', async () => {
  await render(<ViewCommandEar />);

  emitViewCommand('toggle-sidebar');

  expect(sidebarHidden()).toBe(true);
  await expect
    .poll(() => reportedSurfaceToggles().at(-1))
    .toEqual({ sidebar: false, inspector: false, modal: false });

  emitViewCommand('toggle-sidebar');

  expect(sidebarHidden()).toBe(false);
  await expect
    .poll(() => reportedSurfaceToggles().at(-1))
    .toEqual({ sidebar: true, inspector: false, modal: false });
});

test('the inspector toggle travels the same store the toolbar drives', async () => {
  await render(<ViewCommandEar />);

  emitViewCommand('toggle-inspector');

  expect(inspectorOpen()).toBe(true);
  await expect
    .poll(() => reportedSurfaceToggles().at(-1))
    .toEqual({ sidebar: true, inspector: true, modal: false });
});

test('an on-screen toggle reaches the report without any menu push', async () => {
  await render(<ViewCommandEar />);

  closeInspector();

  const before = reportedSurfaceToggles().length;

  const { toggleInspector } = await import('../../shared/lib');

  toggleInspector();

  await expect.poll(() => reportedSurfaceToggles().length).toBeGreaterThan(before);
  expect(reportedSurfaceToggles().at(-1)).toEqual({
    sidebar: true,
    inspector: true,
    modal: false,
  });
});

test('an unmounted ear reports nothing more', async () => {
  const screen = await render(<ViewCommandEar />);

  await expect.poll(() => reportedSurfaceToggles().length).toBe(1);
  await screen.unmount();

  emitViewCommand('toggle-sidebar');

  expect(reportedSurfaceToggles()).toHaveLength(1);
});
