import type {
  Account,
  GatewayConfig,
  RouteNode,
  Routing,
  VirtualModel,
} from '@recompose/contracts';

import type { BindingOutcome } from '../../lib/cable-announcements';
import type { XY } from '../../lib/canvas-positions';
import type { ModelListReading } from '../../lib/model-draft';
import type { PickerStage } from '../drop-picker/picker-stages';
import type { CanvasWorld, PickerStanding } from './canvas-standings';
import type { PickerOnCanvas } from './picker-on-canvas';

import { worldWhereWritesHang, worldWhereWritesLand } from './canvas-world.testkit';
import { pickerOnCanvas } from './picker-on-canvas';

/** Where a cable was let go, which every standing carrying its own point stands at. */
export const droppedAt: XY = { x: 120, y: 240 };

/** The kind ask a dropped cable opens, before anything is settled. */
export const kindDropped: PickerStanding = {
  step: 'kind',
  from: 'draft',
  at: droppedAt,
  origin: 'drop',
};

/** The account ask a dropped cable carries on to, still holding where it was let go. */
export const accountDropped: PickerStanding = {
  step: 'account',
  from: 'draft',
  at: droppedAt,
  origin: 'drop',
};

/** The account ask anchored to a stored child, which a pick would move rather than append. */
export const accountAnchored: PickerStanding = {
  step: 'account',
  from: 'route:pooled',
  anchor: 'target:pooled:t1',
  replacing: 't1',
};

/** The model ask a dropped cable reaches with its account settled. */
export const modelDropped: PickerStanding = {
  step: 'provider-model',
  from: 'draft',
  accountId: 'k1',
  at: droppedAt,
  origin: 'drop',
};

/** The model ask anchored to a stored child, carrying the child a pick would move. */
export const modelAnchored: PickerStanding = {
  step: 'provider-model',
  from: 'route:pooled',
  accountId: 'k1',
  anchor: 'target:pooled:t1',
  replacing: 't1',
};

/** Two stored accounts of different kinds, which the account ask groups under their headings. */
export const storedAccounts: readonly Account[] = [
  { id: 'k1', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
  { id: 'l1', provider: 'ollama', kind: 'local', address: 'http://127.0.0.1:11434' },
];

/** A canvas holding a seat for the pending card and for the stored child an ask anchors to. */
export const seatsOnTheCanvas = {
  pending: { x: 40, y: 60 },
  'target:pooled:t1': { x: 300, y: 90 },
};

/** An account that answered with two real models. */
export const modelsOffered: ModelListReading = {
  offered: ['claude-haiku-4-5', 'claude-opus-5'],
  refusal: undefined,
};

/** An account that answered with nothing, and said why. */
export const modelsRefused: ModelListReading = {
  offered: [],
  refusal: 'That account listed no models.',
};

/** A definition a person named and has bound to nothing yet. */
export const draftNobodyBound = {
  displayName: 'Steady',
  id: 'steady',
  accountId: '',
  providerModel: '',
};

/** The picker a scenario stands, which refuses to read as nothing where a scenario expects one. */
export function pickerStanding(world: CanvasWorld, models: ModelListReading): PickerOnCanvas {
  const standing = pickerOnCanvas(world, models);

  if (standing === undefined) {
    throw new Error('This scenario stands a picker on the canvas, and none came back.');
  }

  return standing;
}

function definitionIn(
  written: GatewayConfig | undefined,
  modelId: string,
): VirtualModel | undefined {
  return written?.virtualModels.find((model) => model.id === modelId);
}

/** The route node one written definition serves through. */
export function entryOf(
  written: GatewayConfig | undefined,
  modelId: string,
): RouteNode | undefined {
  const held = definitionIn(written, modelId);

  return held === undefined ? undefined : held.routing.nodes[held.routing.entry];
}

/** Every child standing under one router of a written definition, in the order it walks them. */
export function ladderUnder(
  written: GatewayConfig | undefined,
  modelId: string,
  routerId: string,
): readonly (RouteNode | undefined)[] | undefined {
  const held = definitionIn(written, modelId);

  if (held === undefined) {
    return undefined;
  }

  const router = held.routing.nodes[routerId];

  if (router?.kind !== 'router') {
    return undefined;
  }

  return router.children.map((child) => held.routing.nodes[child]);
}

/** The route table one written definition serves through. */
export function routingOf(
  written: GatewayConfig | undefined,
  modelId: string,
): Routing | undefined {
  return definitionIn(written, modelId)?.routing;
}

/** An ask walked step by step, holding everything the walk stored and said along the way. */
export type PickerWalk = {
  /** Answers whatever stands open, and stands the picker back up on what the answer left. */
  answers: (answering: (asked: PickerOnCanvas) => void, models?: ModelListReading) => void;
  /** The stage standing open, which reads as nothing once an answer closed the ask. */
  stage: () => PickerStage | undefined;
  /** Every gateway the walk stored, in the order it stored them. */
  written: GatewayConfig[];
  /** Every outcome the walk announced. */
  announced: BindingOutcome[];
};

/**
 * Walks an ask the way a person does, standing the picker back up between every answer.
 *
 * @summary The page holds one standing at a time and each answer writes the next one, so a
 * scenario about a walk several answers long has to restand the picker between them exactly as the
 * page does. Threading that here keeps each scenario about the answers rather than the restanding.
 * An answer that stood no new picker leaves the walk where it was, so a refusal reads as the ask
 * still standing rather than as the ask closing.
 */
export function walkedFrom(
  seeded: GatewayConfig,
  opened: PickerStanding,
  accounts: readonly Account[] = storedAccounts,
): PickerWalk {
  let standing: PickerStanding | undefined = opened;
  const walk: PickerWalk = {
    written: [],
    announced: [],
    stage: () => {
      if (standing === undefined) {
        return undefined;
      }

      const { world } = worldWhereWritesHang(seeded, { accounts, picker: standing });

      return pickerStanding(world, modelsOffered).stage;
    },
    answers: (answering, models = modelsOffered) => {
      const { world, record } = worldWhereWritesLand(seeded, { accounts, picker: standing });

      answering(pickerStanding(world, models));
      walk.written.push(...record.written);
      walk.announced.push(...record.announced);
      standing = record.pickers.length === 0 ? standing : record.pickers.at(-1);
    },
  };

  return walk;
}

/** Each group the picker offers, read as its heading and the ids standing under it. */
export function groupsRead(
  standing: PickerOnCanvas,
): { heading: string | undefined; ids: string[] }[] {
  return standing.groups.map((group) => ({
    heading: group.heading,
    ids: group.options.map((row) => row.id),
  }));
}
