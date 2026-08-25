import { expect, fn, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { withSidebarSurface } from '#.storybook/sidebar-surface';

import { gatewaySeed, paintedBox, paintedStyle } from '../../../../../shared/testing';
import { GatewaySidebar } from './gateway-sidebar';

const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });
const gemini = gatewaySeed({ slug: 'gemini', displayName: 'Gemini', port: 51235 });

const meta = preview.meta({
  component: GatewaySidebar,
  args: { onDeleteGateway: fn(async () => Promise.resolve()), onNewGateway: () => {} },
  decorators: [withSidebarSurface],
});

/** Two gateways where only one serves, so the pair of marks stands side by side. */
export const MixedStates = meta.story({
  parameters: {
    bridge: {
      gateways: [codex, gemini],
      engineStates: { codex: { status: 'running' } },
    },
  },
  play: async ({ canvas }) => {
    const codexRow = await canvas.findByRole('link', { name: 'Codex Running' });

    await expect(codexRow).toBeVisible();
    await expect(await canvas.findByRole('link', { name: 'Gemini Stopped' })).toBeVisible();
    await expect(paintedStyle(codexRow.querySelector('svg')).color).toBe(
      document.documentElement.classList.contains('scheme-dark')
        ? 'rgb(64, 200, 224)'
        : 'rgb(23, 134, 155)',
    );
  },
});

/**
 * The way to a second gateway, standing at the foot of the list rather than on the heading.
 *
 * @summary A mark on the heading is easy to miss and hard to hit, so the act keeps the row it
 * had on a fresh install and simply never leaves. It names itself in every state, and it stands
 * under the gateways rather than over them, where a list puts the thing that adds to it.
 */
export const NewGatewayRowUnderTheList = meta.story({
  parameters: { bridge: { gateways: [codex] } },
  play: async ({ canvas }) => {
    const next = await canvas.findByRole('button', { name: 'New gateway…' });
    const stored = await canvas.findByRole('link', { name: 'Codex Stopped' });

    await expect(next).toHaveTextContent('New gateway…');
    await expect(paintedBox(next).top).toBeGreaterThan(paintedBox(stored).top);
  },
});

/**
 * A fresh install, where the group stands with its heading and nothing listed under it.
 *
 * @summary The heading and the way to the first gateway show before any gateway exists, so the
 * sidebar says where gateways will land rather than leaving a gap until one saves.
 */
export const NoGatewayYet = meta.story({
  parameters: { bridge: { gateways: [] } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Local gateways' })).toBeVisible();

    const next = await canvas.findByRole('button', { name: 'New gateway…' });

    await expect(canvas.queryAllByRole('link')).toHaveLength(0);
    await expect(next).toHaveTextContent('New gateway…');
    await expect(paintedStyle(next).fontWeight).toBe('500');
    await expect(paintedBox(next.querySelector('svg')).width).toBe(14);
  },
});

/** The row rhythm the reference fixes, which the shell repeats for every group it holds. */
export const RowRhythm = meta.story({
  parameters: { bridge: { gateways: [codex] } },
  play: async ({ canvas }) => {
    const heading = await canvas.findByRole('heading', { name: 'Local gateways' });
    const row = await canvas.findByRole('link', { name: 'Codex Stopped' });
    const mark = await canvas.findByRole('img', { name: 'Stopped' });

    await expect(paintedStyle(heading).fontSize).toBe('11px');
    await expect(paintedStyle(heading).fontWeight).toBe('600');
    await expect(paintedStyle(heading).padding).toBe('14px 8px 3px');

    await expect(paintedBox(row).height).toBe(28);
    await expect(paintedStyle(row).borderRadius).toBe('6px');
    await expect(paintedStyle(row).paddingLeft).toBe('8px');
    await expect(paintedStyle(row).fontSize).toBe('13px');
    await expect(paintedStyle(row).columnGap).toBe('7px');
    await expect(paintedBox(row.querySelector('svg')).width).toBe(16);

    await expect(paintedBox(mark).width).toBe(6);
    await expect(paintedBox(mark).right).toBeCloseTo(paintedBox(row).right - 8, 0);
  },
});

async function rightClicked(row: HTMLElement): Promise<void> {
  row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

  await expect(await screen.findByRole('menu')).toBeVisible();
}

/** What a deletion story needs of the canvas, which is one row looked up by what it reads as. */
type RowLookup = { findByRole: (role: string, named: { name: string }) => Promise<HTMLElement> };

/** Right-clicks the named row and picks the delete, which is where every deletion story starts. */
async function askedDeletionOf(canvas: RowLookup, row: string): Promise<void> {
  await rightClicked(await canvas.findByRole('link', { name: row }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete gateway…' }));
}

const overCodex = { bridge: { gateways: [codex] } };

/**
 * A right-click on a row offers the same delete the canvas offers over the same gateway.
 *
 * @summary Two menus over one gateway that disagree about what it can do is two apps, so the
 * delete stands here too, last and apart, worded and ordered the way the canvas words it.
 */
export const RowOffersDeletion = meta.story({
  parameters: { bridge: { gateways: [codex] } },
  play: async ({ canvas }) => {
    await rightClicked(await canvas.findByRole('link', { name: 'Codex Stopped' }));

    const acts = await screen.findAllByRole('menuitem');

    await expect(acts.map((act) => act.textContent)).toStrictEqual([
      'Start',
      'Stop',
      'Delete gateway…',
    ]);
  },
});

/** The delete asks before it acts, naming the gateway and what leaving costs. */
export const DeletionAsksFirst = meta.story({
  parameters: overCodex,
  play: async ({ args, canvas }) => {
    await askedDeletionOf(canvas, 'Codex Stopped');

    await expect(await screen.findByText('Delete the gateway "Codex"?')).toBeVisible();
    await expect(
      await screen.findByText(
        'The gateway stops serving, and its whole composition leaves this app.',
      ),
    ).toBeVisible();
    await expect(args.onDeleteGateway).not.toHaveBeenCalled();
  },
});

/** Answering the question is what deletes, and it names the row the right-click came from. */
export const ConfirmingDeletes = meta.story({
  parameters: { bridge: { gateways: [codex, gemini] } },
  play: async ({ args, canvas }) => {
    await askedDeletionOf(canvas, 'Gemini Stopped');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await expect(args.onDeleteGateway).toHaveBeenCalledWith('gemini');
  },
});

/** Cancelling leaves the gateway where it stood, which is the whole point of asking. */
export const CancellingKeepsIt = meta.story({
  parameters: overCodex,
  play: async ({ args, canvas }) => {
    await askedDeletionOf(canvas, 'Codex Stopped');
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await expect(args.onDeleteGateway).not.toHaveBeenCalled();
    await expect(await canvas.findByRole('link', { name: 'Codex Stopped' })).toBeVisible();
  },
});

/** A refused delete says why on the question rather than closing it over a gateway still there. */
export const ARefusedDeleteSaysWhy = meta.story({
  args: {
    onDeleteGateway: fn(async () => Promise.reject(new Error('The engine still holds this port.'))),
  },
  parameters: overCodex,
  play: async ({ canvas }) => {
    await askedDeletionOf(canvas, 'Codex Stopped');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await expect(await screen.findByText('The engine still holds this port.')).toBeVisible();
  },
});
