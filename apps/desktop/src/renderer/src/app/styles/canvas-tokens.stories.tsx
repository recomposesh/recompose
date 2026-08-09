import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox, paintedStyle } from '../../shared/testing';
import { Icon } from '../../shared/ui';

const nodeRoles = [
  { name: 'Gateway', detail: 'localhost:51234', tint: 'node-tint-gateway' },
  { name: 'Virtual model', detail: 'sonnet-latest', tint: 'node-tint-virtual-model' },
  { name: 'Target', detail: 'claude-sonnet-4', tint: 'node-tint-target' },
];

const cableStandings = ['resting', 'live', 'served', 'failed', 'broken', 'draft', 'pending'].map(
  (standing) => `stroke-cable-${standing}`,
);

function NodeRoles() {
  return (
    <section aria-label="Node roles" className="flex gap-4">
      {nodeRoles.map(({ name, detail, tint }) => (
        <article
          aria-label={`${name} node`}
          className={`relative flex h-20 w-40 flex-col gap-1 node-card p-3 ${tint}`}
          key={name}
        >
          <span className="text-card-title">{name}</span>
          <span className="font-mono text-mono-caption text-ink-secondary">{detail}</span>
          <span className="absolute -inset-e-1 top-port-offset port-dot" />
        </article>
      ))}
      <button aria-pressed className="size-20 node-card node-tint-target" type="button">
        Selected target
      </button>
    </section>
  );
}

function CableStandings() {
  return (
    <section aria-label="Cable standings">
      <svg aria-hidden className="h-24 w-60" viewBox="0 0 240 96">
        {cableStandings.map((standing, place) => (
          <path
            className={`binding-cable ${standing}`}
            d={`M4 ${12 + place * 20}H236`}
            key={standing}
          />
        ))}
      </svg>
    </section>
  );
}

function Ports() {
  return (
    <section aria-label="Ports" className="flex items-center gap-4 node-tint-virtual-model">
      <span className="port-dot" />
      <span className="port-dot" data-bound />
      <button
        aria-label="Add virtual model"
        className="flex size-hit-target items-center justify-center rounded-pill border border-line-strong text-ink"
        type="button"
      >
        <Icon name="plus" />
      </button>
    </section>
  );
}

function CanvasFurniture() {
  return (
    <section aria-label="Canvas furniture" className="flex items-end gap-4">
      <div className="h-minimap-height w-minimap-width rounded-canvas-card border border-line-subtle bg-canvas-card p-2 shadow-canvas-card">
        <svg aria-hidden className="size-full bg-minimap-mask" viewBox="0 0 40 20">
          <rect className="minimap-node node-tint-gateway" height="8" width="8" x="4" y="4" />
          <rect className="minimap-node-dim node-tint-target" height="8" width="8" x="20" y="4" />
        </svg>
      </div>
      <div className="flex gap-1 rounded-canvas-card border border-line-subtle bg-canvas-card p-zoom-tools font-mono text-mono-caption text-ink">
        <span className="rounded-chip bg-surface-pressed px-2 py-1">100%</span>
        <span className="px-2 py-1">Fit</span>
      </div>
    </section>
  );
}

/**
 * Every value the canvas spends, drawn once so a change to the scale shows itself.
 *
 * @summary Reach for it when a canvas token moves: the node tints, the cable standings, the port
 * dots, the pointer target, and the furniture cards all paint here, in whichever scheme the page
 * is wearing.
 */
function CanvasTokenSheet() {
  return (
    <div className="flex w-fit flex-col gap-6 bg-surface-content p-6 dot-grid">
      <NodeRoles />
      <CableStandings />
      <Ports />
      <CanvasFurniture />
    </div>
  );
}

const meta = preview.meta({ component: CanvasTokenSheet });

function forScheme(light: string, dark: string): string {
  return document.documentElement.classList.contains('scheme-dark') ? dark : light;
}

function nodeCards(canvasElement: HTMLElement): HTMLElement[] {
  return [...canvasElement.querySelectorAll<HTMLElement>('article')];
}

function drawnCables(canvasElement: HTMLElement): SVGPathElement[] {
  return [...canvasElement.querySelectorAll<SVGPathElement>('[aria-label="Cable standings"] path')];
}

function loosePorts(canvasElement: HTMLElement): HTMLElement[] {
  return [...canvasElement.querySelectorAll<HTMLElement>('[aria-label="Ports"] > span')];
}

function furniture(canvasElement: HTMLElement): HTMLElement[] {
  return [...canvasElement.querySelectorAll<HTMLElement>('[aria-label="Canvas furniture"] > div')];
}

function targetTintAt(alpha: string): string {
  const channels = forScheme('0.686275 0.321569 0.870588', '0.74902 0.352941 0.94902');

  return `color(srgb ${channels} / ${alpha})`;
}

/** The whole scale in one frame, which is what a person opens to read a token change. */
export const Basic = meta.story({});

/** Each node role wears its own tint, so a card says what it is before its label is read. */
export const NodeRolesTakeTheirTint = meta.story({
  play: async ({ canvasElement }) => {
    const tints = [
      forScheme('rgb(23, 134, 155)', 'rgb(64, 200, 224)'),
      forScheme('rgb(0, 122, 255)', 'rgb(10, 132, 255)'),
      forScheme('rgb(175, 82, 222)', 'rgb(191, 90, 242)'),
    ];

    for (const [place, card] of nodeCards(canvasElement).entries()) {
      await expect(paintedStyle(card).borderColor).toBe(tints[place]);
    }
  },
});

/** A card that names no tint keeps the accent frame the shipped stage already draws. */
export const AnUntintedCardKeepsTheAccent = meta.story({
  play: async ({ canvasElement }) => {
    const tintless = document.createElement('div');

    tintless.className = 'node-card';
    canvasElement.append(tintless);

    await expect(paintedStyle(tintless).borderColor).toBe(
      forScheme('rgb(0, 100, 210)', 'rgb(61, 155, 255)'),
    );
  },
});

/** A node's second line reads as mono at eleven, the size the template sets it in. */
export const SubtitlesReadAsElevenPixelMono = meta.story({
  play: async ({ canvasElement }) => {
    const subtitle = nodeCards(canvasElement)[0]?.querySelectorAll('span')[1];

    await expect(paintedStyle(subtitle).fontSize).toBe('11px');
    await expect(paintedStyle(subtitle).fontFamily).toContain('SF Mono');
  },
});

/** Every cable standing carries its own tint at the template's stroke. */
export const CablesPaintTheirStanding = meta.story({
  play: async ({ canvasElement }) => {
    const draft = forScheme('rgb(255, 149, 0)', 'rgb(255, 159, 10)');
    const red = forScheme('rgb(215, 0, 21)', 'rgb(255, 69, 58)');
    const standings = [
      forScheme('rgba(0, 0, 0, 0.45)', 'rgba(255, 255, 255, 0.45)'),
      forScheme('rgb(40, 205, 65)', 'rgb(50, 215, 75)'),
      forScheme('rgb(26, 158, 51)', 'rgb(50, 215, 75)'),
      red,
      red,
      draft,
      draft,
    ];
    const cables = drawnCables(canvasElement);

    await expect(cables).toHaveLength(7);

    for (const [place, cable] of cables.entries()) {
      await expect(paintedStyle(cable).stroke).toBe(standings[place]);
      await expect(paintedStyle(cable).strokeWidth).toBe('2.6px');
    }
  },
});

/** A port is a nine-pixel dot on its own ring, and a bound one fills with the node tint. */
export const PortsFillWhenTheyAreBound = meta.story({
  play: async ({ canvasElement }) => {
    const [resting, live] = loosePorts(canvasElement);

    await expect(paintedBox(resting).width).toBe(9);
    await expect(paintedStyle(resting).borderColor).toBe(
      forScheme('rgba(0, 0, 0, 0.56)', 'rgba(255, 255, 255, 0.55)'),
    );
    await expect(paintedStyle(live).backgroundColor).toBe(
      forScheme('rgb(0, 122, 255)', 'rgb(10, 132, 255)'),
    );
  },
});

/** The card's own port hangs at the offset the template measures down the card. */
export const ACardHangsItsPortAtTheTemplateOffset = meta.story({
  play: async ({ canvasElement }) => {
    const port = nodeCards(canvasElement)[0]?.querySelector('span:last-of-type');

    await expect(paintedStyle(port).top).toBe('34px');
    await expect(paintedBox(port).height).toBe(9);
  },
});

/** Anything a pointer has to hit stands on a twenty-four pixel target, the plus affordance too. */
export const ThePlusAffordanceFillsThePointerTarget = meta.story({
  play: async ({ canvas }) => {
    const plus = await canvas.findByRole('button', { name: 'Add virtual model' });
    const drawn = paintedBox(plus);

    await expect(drawn.width).toBe(24);
    await expect(drawn.height).toBe(24);
    await expect(plus.querySelector('svg')).not.toBeNull();
  },
});

/** The minimap takes the template's card: its size, its radius, its wash, and its shadow. */
export const TheMinimapTakesTheFurnitureCard = meta.story({
  play: async ({ canvasElement }) => {
    const minimap = furniture(canvasElement)[0];
    const drawn = paintedBox(minimap);

    await expect(drawn.width).toBe(172);
    await expect(drawn.height).toBe(112);
    await expect(paintedStyle(minimap).borderRadius).toBe('9px');
    await expect(paintedStyle(minimap).backgroundColor).toBe(
      forScheme('rgba(255, 255, 255, 0.92)', 'rgba(30, 30, 33, 0.92)'),
    );
    await expect(paintedStyle(minimap).boxShadow).toContain('rgba(0, 0, 0, 0.4) 0px 4px 14px 0px');
  },
});

/** The map keeps the template's undimmed look and draws each node in its own role tint. */
export const TheMinimapDrawsNodesInTheirRoleTint = meta.story({
  play: async ({ canvasElement }) => {
    const mask = furniture(canvasElement)[0]?.firstElementChild;
    const [placed, dimmed] = [...(mask?.children ?? [])];

    await expect(paintedStyle(mask).backgroundColor).toBe(
      forScheme('rgba(0, 0, 0, 0.055)', 'rgba(255, 255, 255, 0.055)'),
    );
    await expect(paintedStyle(placed).fill).toBe(
      forScheme(
        'color(srgb 0.0901961 0.52549 0.607843 / 0.85)',
        'color(srgb 0.25098 0.784314 0.878431 / 0.85)',
      ),
    );
    await expect(paintedStyle(dimmed).fill).toBe(targetTintAt('0.45'));
  },
});

/** A selected card rings and washes in its own tint, never in the standing accent. */
export const ASelectedCardRingsInItsTint = meta.story({
  play: async ({ canvas }) => {
    const selected = await canvas.findByRole('button', { name: 'Selected target', pressed: true });

    await expect(paintedStyle(selected).boxShadow).toContain(
      `${targetTintAt('0.55')} 0px 0px 0px 3.5px`,
    );
    await expect(paintedStyle(selected).backgroundColor).toBe(
      forScheme('color(srgb 0.962353 0.918588 0.984471)', 'color(srgb 0.227922 0.180392 0.265725)'),
    );
  },
});

/** The zoom cluster shares that card and pads its segments by the template's three. */
export const TheZoomClusterSharesTheCard = meta.story({
  play: async ({ canvasElement }) => {
    const cluster = furniture(canvasElement)[1];

    await expect(paintedStyle(cluster).padding).toBe('3px');
    await expect(paintedStyle(cluster).borderRadius).toBe('9px');
    await expect(paintedStyle(cluster).fontSize).toBe('11px');
  },
});
