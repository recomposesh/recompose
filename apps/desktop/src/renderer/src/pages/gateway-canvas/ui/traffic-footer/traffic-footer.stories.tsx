import type { LogRow } from '@recompose/contracts';
import type { Decorator } from '@storybook/react-vite';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { bindEngineLogsToCache } from '../../../../shared/api';
import { emitEngineLogs, paintedBox, paintedStyle } from '../../../../shared/testing';
import { TrafficFooter } from './traffic-footer';

const SLUG = 'relay';

const ANSWERED = 39;

const SLOWEST = 2;

const REFUSED = 3;

const CLIENT_APPS = 3;

const SPENT_TOKENS = 18_234;

const QUICK_MS = 900;

const SLOW_MS = 1_100;

const APART_MS = 100;

const NOTHING_SERVED: readonly LogRow[] = [];

const WIDE_PANE = 'w-[64rem]';

const TALLY_GONE_PX = 700;

const TOKENS_GONE_PX = 560;

const WINDOW_MINIMUM_PX = 479;

function hashedKey(mark: string): string {
  return `sha256:${mark.repeat(64)}`;
}

type RowStanding = {
  at: number;
  status?: number;
  tokens?: number;
  durationMs?: number;
  clientKey?: string;
};

function row(id: string, standing: RowStanding): LogRow {
  const { at, status = 200, clientKey = hashedKey('0'), ...spent } = standing;

  return {
    id,
    at,
    gateway: SLUG,
    origin: 'provider',
    method: 'POST',
    status,
    clientKey,
    ...spent,
  };
}

function answered(now: number): readonly LogRow[] {
  return Array.from({ length: ANSWERED }, (_, index) =>
    row(`answered-${String(index)}`, {
      at: now - index * APART_MS,
      durationMs: index < ANSWERED - SLOWEST ? QUICK_MS : SLOW_MS,
      tokens: index === 0 ? SPENT_TOKENS : 0,
      clientKey: hashedKey(String(index % CLIENT_APPS)),
    }),
  );
}

function refused(now: number): readonly LogRow[] {
  return Array.from({ length: REFUSED }, (_, index) =>
    row(`refused-${String(index)}`, {
      at: now - index * APART_MS,
      status: 500,
      durationMs: SLOW_MS,
    }),
  );
}

function nothingServed(): readonly LogRow[] {
  return NOTHING_SERVED;
}

function aBusyMinute(): readonly LogRow[] {
  const now = Date.now();

  return [...answered(now), ...refused(now)];
}

function RowsPushedIn({ rows }: { rows: () => readonly LogRow[] }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const stop = bindEngineLogsToCache(queryClient);

    emitEngineLogs({ kind: 'backfill', rows: rows() });

    return stop;
  }, [queryClient, rows]);

  return null;
}

function holding(rows: () => readonly LogRow[], pane: string): Decorator {
  return function PaneAroundTheStrip(Story) {
    return (
      <div className={`flex flex-col ${pane} bg-surface-content`} data-pane="">
        <RowsPushedIn rows={rows} />
        <Story />
      </div>
    );
  };
}

type StripCanvas = {
  findByText: (text: string, options: { exact: boolean; ignore?: string }) => Promise<HTMLElement>;
};

/**
 * Every cell of a loaded strip, looked up the way a reader finds one: by the label it carries.
 *
 * @summary The labels never change with the reading, so each cell is found by its label and then
 * read whole, which keeps a scenario about the numbers from restating how to reach them.
 */
async function cellsOf(canvas: StripCanvas) {
  return {
    requests: await canvas.findByText('req/min', { exact: false }),
    latency: await canvas.findByText('latency', { exact: false }),
    clients: await canvas.findByText('client app', { exact: false, ignore: '[hidden]' }),
    tokens: await canvas.findByText('tok/min', { exact: false }),
    errors: await canvas.findByText('error', { exact: false }),
    tally: await canvas.findByText('wires', { exact: false }),
  };
}

function narrowed(pane: Element | null, width: number): void {
  if (!(pane instanceof HTMLElement)) {
    throw new Error('the story rendered no pane to narrow');
  }

  pane.style.width = `${String(width)}px`;
}

function fitsItsPane(strip: Element | null): boolean {
  if (strip === null) {
    throw new Error('the story rendered no strip to measure');
  }

  return strip.scrollWidth <= strip.clientWidth;
}

const meta = preview.meta({
  component: TrafficFooter,
  args: { slug: SLUG, nodes: 5, wires: 4 },
});

const quiet = holding(nothingServed, WIDE_PANE);

const busy = holding(aBusyMinute, WIDE_PANE);

/**
 * A gateway nothing has called yet, reading zeros across the strip.
 *
 * @summary The resting state is the one a person sees most, and it stands rather than hiding, so
 * the surface they will watch under load is already in place.
 */
export const Idle = meta.story({
  decorators: [quiet],
  play: async ({ canvas }) => {
    const requests = await canvas.findByText('req/min', { exact: false });

    await expect(requests.textContent).toBe('0 req/min');
    await expect((await canvas.findByText('latency', { exact: false })).textContent).toBe(
      '0ms latency',
    );
    await expect(
      (await canvas.findByText('client app', { exact: false, ignore: '[hidden]' })).textContent,
    ).toBe('0 client apps');
    await expect((await canvas.findByText('tok/min', { exact: false })).textContent).toBe(
      '0 tok/min',
    );
    await expect((await canvas.findByText('wires', { exact: false })).textContent).toBe(
      '5 nodes · 4 wires',
    );
    await expect(canvas.queryByText('error', { exact: false })).toBeNull();
  },
});

/**
 * The rhythm the shipped band fixes: the height, the gap, the inset, and the meter type.
 *
 * @summary The reading is selectable where the rest of the app is not, because a person who reads
 * something surprising here has to be able to take it into a bug report.
 */
export const BandShape = meta.story({
  decorators: [quiet],
  play: async ({ canvas, canvasElement }) => {
    const strip = canvasElement.querySelector('footer');
    const meter = await canvas.findByText('client app', { exact: false, ignore: '[hidden]' });

    await expect(paintedBox(strip).height).toBe(38);
    await expect(paintedStyle(strip).columnGap).toBe('14px');
    await expect(paintedStyle(strip).paddingLeft).toBe('14px');
    await expect(paintedStyle(strip).borderTopWidth).toBe('1px');
    await expect(paintedStyle(strip).userSelect).toBe('text');
    await expect(paintedStyle(meter).userSelect).toBe('text');
    await expect(paintedStyle(meter).fontSize).toBe('12px');
  },
});

/**
 * A minute of served traffic, with three failures trailing the traffic side.
 *
 * @summary Reach for it to read the loaded strip: the error count arrives at the end of the
 * traffic side in the danger tint, so its arrival never shoves a neighboring cell along.
 */
export const UnderLoad = meta.story({
  decorators: [busy],
  play: async ({ canvas }) => {
    const { requests, latency, clients, tokens, errors, tally } = await cellsOf(canvas);

    await expect(requests.textContent).toBe('42 req/min');
    await expect(latency.textContent).toBe('1.1s latency');
    await expect(clients.textContent).toBe('3 client apps');
    await expect(tokens.textContent).toBe('18.2k tok/min');
    await expect(errors.textContent).toBe('3 errors');
    await expect(paintedBox(errors).left).toBeGreaterThan(paintedBox(tokens).left);
    await expect(paintedBox(errors).left).toBeLessThan(paintedBox(tally).left);
    await expect(paintedStyle(errors).color).not.toBe(paintedStyle(requests).color);
    await expect(paintedStyle(errors.querySelector('b')).color).toBe(paintedStyle(errors).color);
  },
});

/**
 * The loaded strip against a narrowing pane, shedding cells in its fixed order.
 *
 * @summary The tally leaves first, then the token rate, then the latency, and the request rate and
 * the error count are the last two standing. The narrowest pane here is the one a 720 pixel window
 * leaves beside the sidebar, which is the width the layout has to survive.
 */
export const DropOrder = meta.story({
  decorators: [busy],
  play: async ({ canvas, canvasElement }) => {
    const { requests, latency, tokens, errors, tally } = await cellsOf(canvas);
    const pane = canvasElement.querySelector('[data-pane]');
    const strip = requests.closest('footer');

    await expect(tally).toBeVisible();
    await expect(fitsItsPane(strip)).toBe(true);

    narrowed(pane, TALLY_GONE_PX);
    await expect(tally).not.toBeVisible();
    await expect(tokens).toBeVisible();
    await expect(fitsItsPane(strip)).toBe(true);

    narrowed(pane, TOKENS_GONE_PX);
    await expect(tokens).not.toBeVisible();
    await expect(latency).toBeVisible();
    await expect(fitsItsPane(strip)).toBe(true);

    narrowed(pane, WINDOW_MINIMUM_PX);
    await expect(latency).not.toBeVisible();
    await expect(requests).toBeVisible();
    await expect(errors).toBeVisible();
    await expect(fitsItsPane(strip)).toBe(true);
  },
});

/** The loaded strip in the dark scheme, where the danger tint has to hold its own ground. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  decorators: [busy],
});
