import { RouterContextProvider } from '@tanstack/react-router';
import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { hideSidebar, showSidebar } from '../../shared/lib';
import { gatewaySeed, machineSeed, paintedBox } from '../../shared/testing';
import { SidebarToggle } from '../../shared/ui';
import { createQueryClient } from '../query-client';
import { createAppRouter } from '../router';
import { AppSidebar } from './-app-sidebar';

const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

const onOneGateway = { engineStates: {}, gateways: [codex] };

function bandOf(canvasElement: HTMLElement) {
  return paintedBox(canvasElement.firstElementChild?.firstElementChild);
}

const meta = preview.meta({
  beforeEach: () => {
    showSidebar();
  },
  component: AppSidebar,
  args: { away: false, band: null, onNewGateway: () => undefined },
  parameters: { bridge: onOneGateway },
  decorators: [
    (Story) => (
      <RouterContextProvider router={createAppRouter({ queryClient: createQueryClient() })}>
        <div className="flex h-96 bg-surface-content">
          <Story />
        </div>
      </RouterContextProvider>
    ),
  ],
});

/**
 * The sidebar's top inset, which clears the window controls instead of reserving toolbar height.
 *
 * @summary macOS draws its own controls over this corner, and clearing them is all the inset owes.
 * Borrowing the toolbar's height reserves eighteen more pixels for a toolbar the sidebar never
 * carries, which pushes the first group heading below where the rest of the shell expects it. The
 * band is where the control that puts the sidebar away stands, on the centre the controls take.
 */
export const SidebarClearsTheWindowControls = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('heading', { name: 'Local gateways' });

    const sidebar = canvasElement.firstElementChild?.firstElementChild;
    const heading = sidebar?.querySelector('h2');

    await expect(paintedBox(heading).top - paintedBox(sidebar).top).toBe(36);
  },
});

/**
 * The control in the sidebar's band, drawn to the centre macOS gives its own controls.
 *
 * @summary The window controls sit centred in a thirty-six pixel band, so anything sharing that
 * band and drawn to another centre reads as a mistake. The control also stands clear of the
 * corner they occupy, at the trailing edge, where nothing it could collide with is drawn.
 */
export const SidebarControlTakesTheWindowControlCentre = meta.story({
  args: { band: <SidebarToggle where="chrome" /> },
  play: async ({ canvas, canvasElement }) => {
    const drawn = paintedBox(await canvas.findByRole('button', { name: 'Sidebar' }));
    const band = bandOf(canvasElement);
    const cleared = getComputedStyle(document.documentElement).getPropertyValue(
      '--spacing-window-controls-width',
    );

    await expect((drawn.top + drawn.bottom) / 2 - band.top).toBe(18);
    await expect(drawn.left - band.left).toBeGreaterThan(Number.parseInt(cleared, 10));
  },
});

/**
 * The band on Windows, which carries the name the hidden title bar took away.
 *
 * @summary Windows floats no controls over this corner, so the band would stand empty on every
 * surface that carries a gateway, with the control alone at its far end reading as a stray. The
 * app's own name and mark fill it, which is what the title bar it replaces showed.
 */
export const BandCarriesTheAppTitleOnWindows = meta.story({
  args: { band: <SidebarToggle where="chrome" /> },
  parameters: {
    bridge: { ...onOneGateway, system: machineSeed({ windowControls: 'trailing' }) },
  },
  play: async ({ canvas, canvasElement }) => {
    const title = paintedBox(await canvas.findByText('recompose'));
    const control = paintedBox(await canvas.findByRole('button', { name: 'Sidebar' }));
    const band = bandOf(canvasElement);

    await expect(title.left - band.left).toBeLessThan(16);
    await expect(band.right - control.right).toBeLessThan(16);
    await expect(title.right).toBeLessThan(control.left);
    await expect((title.top + title.bottom) / 2 - band.top).toBeCloseTo(18, 0);
  },
});

/** The same band on macOS, where the traffic lights fill that corner and no name belongs in it. */
export const BandCarriesNoTitleOnMacOs = meta.story({
  args: { band: <SidebarToggle where="chrome" /> },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('recompose')).toBeNull();
  },
});

/**
 * The sidebar once a person has put it away, which has to take no room at all.
 *
 * @summary The slot owns whether the sidebar stands, and the width a person dragged it to only
 * says how wide it stands while it does. A width that outranked the collapse would leave the
 * sidebar painted after its control said to put it away, and the toolbar clearing the window
 * controls beside it, so the reading measures the slot rather than trusting the class. What is
 * left is the hairline the slot's own border draws, which is the surface edge rather than the
 * sidebar.
 */
export const SidebarAwayTakesNoRoom = meta.story({
  args: { away: true },
  beforeEach: () => {
    hideSidebar();
  },
  play: async ({ canvasElement }) => {
    await expect(bandOf(canvasElement).width).toBeLessThan(2);
  },
});
