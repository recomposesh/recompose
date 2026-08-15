import type { Account, GatewayConfig } from '@recompose/contracts';

import { QueryClient } from '@tanstack/react-query';
import { vi } from 'vitest';

import type { BindingOutcome } from '../../lib/cable-announcements';
import type { NodePositions, XY } from '../../lib/canvas-positions';
import type { SettledDefinition } from '../../lib/model-draft';
import type { CanvasGraph } from '../../lib/node-graph';
import type { CanvasWorld, PickerStanding } from './canvas-standings';

import { dropCanvasPositions } from '../../lib/canvas-position-store';
import { leaveDrafting, startDrafting } from '../../lib/use-held-draft';

/** Everything a gesture did to the world, each act in the order it happened. */
export type CanvasRecord = {
  written: GatewayConfig[];
  announced: BindingOutcome[];
  selected: (string | undefined)[];
  pickers: (PickerStanding | undefined)[];
  asked: (string | undefined)[];
  refused: unknown[];
  moved: XY[];
};

/** What already stands on the canvas when the gesture a scenario is about arrives. */
export type CanvasStanding = {
  accounts?: readonly Account[] | undefined;
  graph?: CanvasGraph | undefined;
  seats?: NodePositions | undefined;
  picker?: PickerStanding | undefined;
  removing?: string | undefined;
  selection?: string | undefined;
};

type Answered = Parameters<CanvasWorld['define']['mutate']>[1];

type Settling = (written: GatewayConfig, answered: Answered) => void;

/** What the library hands its own callbacks beside the answer, which no canvas act reads. */
function writeContext(): { client: QueryClient; meta: undefined } {
  return { client: new QueryClient(), meta: undefined };
}

function emptyRecord(): CanvasRecord {
  return {
    written: [],
    announced: [],
    selected: [],
    pickers: [],
    asked: [],
    refused: [],
    moved: [],
  };
}

function definition(record: CanvasRecord, settling: Settling): CanvasWorld['define'] {
  return {
    mutate: (written, answered) => {
      record.written.push(written);
      settling(written, answered);
    },
    mutateAsync: async (written) => {
      record.written.push(written);

      return Promise.resolve([]);
    },
    reset: () => {},
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isError: false,
    isIdle: true,
    isPaused: false,
    isPending: false,
    isSuccess: false,
    status: 'idle',
    submittedAt: 0,
    variables: undefined,
    context: undefined,
  };
}

function canvasWorld(
  gateway: GatewayConfig,
  settling: Settling,
  standing: CanvasStanding,
): { world: CanvasWorld; record: CanvasRecord } {
  const record = emptyRecord();
  const world: CanvasWorld = {
    slug: gateway.slug,
    gateway,
    accounts: standing.accounts ?? [],
    standings: {
      selection: standing.selection,
      picker: standing.picker,
      removing: standing.removing,
      announced: undefined,
      refusal: undefined,
      select: (subject) => {
        record.selected.push(subject);
      },
      setPicker: (held) => {
        record.pickers.push(held);
      },
      movePendingTo: (at) => {
        record.moved.push(at);
      },
      setRemoving: (nodeId) => {
        record.asked.push(nodeId);
      },
      announce: (outcome) => {
        record.announced.push(outcome);
      },
      refuse: (failure) => {
        record.refused.push(failure);
      },
    },
    graph: standing.graph ?? { nodes: [], edges: [] },
    seats: standing.seats ?? {},
    define: definition(record, settling),
    dragging: { current: { inFlight: false, escaped: false } },
    view: { current: null },
  };

  return { world, record };
}

/**
 * A canvas world whose stored write lands, which is what every act after a success reads from.
 *
 * @summary A landed write is where the canvas does most of its work: the picker goes away, a born
 * card takes its seat, the draft graduates, and the live region says what became of the binding.
 * A scenario about any of those has to see the write answer, so this world answers it at once
 * rather than leaving the act half done.
 */
export function worldWhereWritesLand(
  gateway: GatewayConfig,
  standing: CanvasStanding = {},
): { world: CanvasWorld; record: CanvasRecord } {
  return canvasWorld(
    gateway,
    (written, answered) => {
      answered?.onSuccess?.([], written, undefined, writeContext());
    },
    standing,
  );
}

/** A canvas world whose stored write is refused, carrying the refusal the caller names. */
export function worldWhereWritesAreRefused(
  gateway: GatewayConfig,
  refusal: Error,
  standing: CanvasStanding = {},
): { world: CanvasWorld; record: CanvasRecord } {
  return canvasWorld(
    gateway,
    (written, answered) => {
      answered?.onError?.(refusal, written, undefined, writeContext());
    },
    standing,
  );
}

/**
 * A canvas world whose stored write never answers, so a scenario reads only what it asked for.
 *
 * @summary A write that reports nothing keeps a scenario on the document the gesture would store,
 * which is the whole reading where what a gesture costs is exactly the definition it takes out.
 */
export function worldWhereWritesHang(
  gateway: GatewayConfig,
  standing: CanvasStanding = {},
): { world: CanvasWorld; record: CanvasRecord } {
  return canvasWorld(gateway, () => {}, standing);
}

/** Stands a draft on the canvas, the way the gateway's plus or a dropped cable would. */
export function draftHeld(slug: string, held: SettledDefinition, seat: XY = { x: 0, y: 0 }): void {
  startDrafting(slug, held, seat);
}

/** Leaves this gateway holding no draft and remembering no arrangement a person dragged. */
export function canvasLeftClean(slug: string): void {
  leaveDrafting(slug);
  dropCanvasPositions(slug);
}

class Shelf implements Storage {
  private readonly held = new Map<string, string>();

  get length(): number {
    return this.held.size;
  }

  clear(): void {
    this.held.clear();
  }

  getItem(key: string): string | null {
    return this.held.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.held.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.held.delete(key);
  }

  setItem(key: string, value: string): void {
    this.held.set(key, value);
  }
}

/**
 * Puts the two browser things the canvas writes through in reach of a node scenario.
 *
 * @summary Seats are written to a shelf and a born card is looked at a frame later, and both are
 * process boundaries rather than decisions, so a node scenario stands its own. The frame never
 * arrives, which keeps the camera out of scenarios that are about what a gesture wrote.
 */
export function canvasEnvironment(): void {
  vi.stubGlobal('localStorage', new Shelf());
  vi.stubGlobal('requestAnimationFrame', () => 0);
}
