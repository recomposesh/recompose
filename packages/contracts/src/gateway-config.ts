import { z } from 'zod';

import { type GatewayApiKey, gatewayApiKeySchema } from './gateway-api-key';
import { routingSchema } from './gateway-routing';
import { migrateDocument, type Migration } from './migration';
import { nonBlankString } from './non-blank';

export const GATEWAY_CONFIG_VERSION = 4;

export const GATEWAY_PORT_RANGE = { min: 1024, max: 65535 } as const;

/**
 * The ports recompose draws a first offer from.
 *
 * @summary The band belongs to recompose and sits below every ephemeral pool, so an address a
 * client copied still answers after a reboot (ADR-0063). It is published beside the range because
 * the offer in the main process and the range the stored document accepts have to agree, and one
 * of them holding its own copy of the numbers is how they stop agreeing.
 */
export const GATEWAY_PORT_BAND = { first: 8389, count: 48 } as const;

export const gatewayPortSchema = z.int().min(GATEWAY_PORT_RANGE.min).max(GATEWAY_PORT_RANGE.max);

const WINDOWS_DEVICE_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

const GATEWAY_SLUG_MAX_LENGTH = 63;

export const gatewaySlugSchema = z
  .string()
  .max(GATEWAY_SLUG_MAX_LENGTH, `at most ${String(GATEWAY_SLUG_MAX_LENGTH)} characters`)
  .regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9]))*$/, 'lowercase slug with single dashes')
  .refine((slug) => !WINDOWS_DEVICE_NAMES.has(slug), 'Windows reserves this name');

const FALLBACK_GATEWAY_SLUG = 'gateway';

function inBaseLetters(name: string): string {
  return name.toUpperCase().toLowerCase().normalize('NFD').replaceAll(/\p{M}/gu, '');
}

/**
 * The slug a gateway stores its file and its route under, read off the name a person gave it.
 *
 * @summary Nobody types a slug, so this is the only thing that writes one. It folds the name to
 * its base letters, joins what survives with single dashes, and stops at the hostname-label
 * bound. A name that leaves nothing behind falls back to `gateway`. A name landing on a device
 * name Windows reserves derives it unchanged, so `gatewaySlugSchema` refuses it where a person
 * can read the refusal and rename.
 */
export function slugFromName(displayName: string): string {
  const derived = inBaseLetters(displayName)
    .replaceAll(/[^a-z0-9]+/gu, '-')
    .replaceAll(/^-|-$/gu, '')
    .slice(0, GATEWAY_SLUG_MAX_LENGTH)
    .replace(/-$/u, '');

  return derived === '' ? FALLBACK_GATEWAY_SLUG : derived;
}

export const modelAliasSchema = z
  .string()
  .regex(/^[a-z0-9._-]+$/u, 'lowercase id of letters, digits, dots, underscores and dashes')
  .refine((id) => !/^[._-]|[._-]$/u.test(id), 'a model id starts and ends with a letter or digit');

/**
 * The id a client sends as its `model`, read off the name a person gave the virtual model.
 *
 * @summary Unlike the gateway slug, this keeps the dots real model names carry, so `Claude 5.6 Sol`
 * reaches a client as `claude-5.6-sol` rather than losing the dot to a dash. It folds the case
 * down, turns each run of anything outside the id charset into one dash, collapses repeated
 * separators, and trims the ends, so every id it derives is one the stored shape already accepts.
 */
export function modelAliasFromName(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/gu, '-')
    .replaceAll(/[-._]{2,}/gu, '-')
    .replace(/^[-._]/u, '')
    .replace(/[-._]$/u, '');
}

export const virtualModelSchema = z.strictObject({
  id: modelAliasSchema,
  displayName: nonBlankString,
  routing: routingSchema,
});

export type VirtualModel = z.infer<typeof virtualModelSchema>;

/**
 * The card one seat in a stored layout belongs to.
 *
 * @summary Not a gateway slug, which is what this validated before: a card id is minted by the
 * canvas as a prefix and the address it stands at, so `model:fast` and `route:fast:seat:fast` are
 * both ordinary ids and both carry the colon a slug may never hold. The tail cannot be pinned any
 * tighter here, because a route node id is any non-blank string a mint or a migration produced, and
 * restating the canvas's prefixes in this package would put the shape in two places and let them
 * drift. So the seat key is held to being named at all, and the canvas stays the one authority on
 * what it names its cards.
 */
const canvasCardIdSchema = nonBlankString;

const layoutSchema = z.strictObject({
  nodes: z.record(canvasCardIdSchema, z.strictObject({ x: z.number(), y: z.number() })),
});

export const gatewayConfigSchema = z.strictObject({
  schemaVersion: z.literal(GATEWAY_CONFIG_VERSION),
  slug: gatewaySlugSchema,
  displayName: z.string().trim().min(1),
  port: gatewayPortSchema,
  virtualModels: z
    .array(virtualModelSchema)
    .refine(
      (models) => new Set(models.map((model) => model.id)).size === models.length,
      'duplicate virtual model id',
    ),
  apiKey: gatewayApiKeySchema.optional(),
  layout: layoutSchema,
});

export type GatewayConfig = z.infer<typeof gatewayConfigSchema>;

const noStoredGatewayEverMintedAVirtualModel: Migration = {
  from: 1,
  migrate: (doc) => ({ ...doc, schemaVersion: 2 }),
};

const noStoredGatewayEverRequiredAKey: Migration = {
  from: 2,
  migrate: (doc) => ({ ...doc, schemaVersion: 3 }),
};

const storedBindingsSchema = z.array(z.unknown());

const storedDirectTargetSchema = z.looseObject({
  id: nonBlankString,
  target: z.strictObject({ accountId: nonBlankString, providerModel: nonBlankString }),
});

/**
 * The one stored binding, carried into the table a graph reads, standing under a name it keeps.
 *
 * @summary The route node id is derived from the model's own id rather than minted, because this
 * runs on every load of a document nothing rewrites. A minted id would differ between the snapshot
 * the engine holds and the lookup a request makes against the same file, and every request would
 * refuse for a target that is plainly there. Stored ids are unique within a document, and a
 * migrated table stands one node, so the derived name collides with nothing. The `seat:` prefix is
 * an opaque minted part that nothing reads for meaning, and every document already saved at version
 * 4 carries it literally with no migration left to revisit it, so it stays as written rather than
 * splitting the ids in the field into two eras.
 */
function boundThroughAOneNodeGraph(model: unknown): unknown {
  const direct = storedDirectTargetSchema.safeParse(model);

  if (!direct.success) {
    return model;
  }

  const { target, ...beyondTheTarget } = direct.data;
  const entry = `seat:${direct.data.id}`;

  return {
    ...beyondTheTarget,
    routing: { entry, nodes: { [entry]: { kind: 'target', ...target } } },
  };
}

function everyBindingStandsInAGraph(doc: Record<string, unknown>): Record<string, unknown> {
  const stored = storedBindingsSchema.safeParse(doc['virtualModels']);

  return stored.success
    ? { ...doc, virtualModels: stored.data.map(boundThroughAOneNodeGraph) }
    : doc;
}

const noStoredVirtualModelEverBoundMoreThanOneTarget: Migration = {
  from: 3,
  migrate: (doc) => ({ ...everyBindingStandsInAGraph(doc), schemaVersion: 4 }),
};

const gatewayConfigMigrations: readonly Migration[] = [
  noStoredGatewayEverMintedAVirtualModel,
  noStoredGatewayEverRequiredAKey,
  noStoredVirtualModelEverBoundMoreThanOneTarget,
];

export function loadGatewayConfig(doc: unknown): GatewayConfig {
  return gatewayConfigSchema.parse(
    migrateDocument(doc, gatewayConfigMigrations, GATEWAY_CONFIG_VERSION),
  );
}

/**
 * The gateway that now carries the key it was handed, or none.
 *
 * @summary The one place that writes the field, so taking a key off leaves an absent property rather
 * than an explicit undefined, which `exactOptionalPropertyTypes` refuses and a strict parse rejects.
 */
export function withGatewayApiKey(
  config: GatewayConfig,
  apiKey: GatewayApiKey | undefined,
): GatewayConfig {
  const { apiKey: _replaced, ...withoutKey } = config;

  return apiKey === undefined ? withoutKey : { ...withoutKey, apiKey };
}

/**
 * The key the engine is allowed to enforce, or nothing.
 *
 * @summary The single authority on the requirement, read on the way to the engine snapshot. A key the
 * gateway stores but doesn't require never leaves the parent, so the child holds no secret it must not
 * act on, and its guard mounts on presence alone.
 */
export function enforcedApiKey(config: GatewayConfig): string | undefined {
  return config.apiKey?.required === true ? config.apiKey.value : undefined;
}
