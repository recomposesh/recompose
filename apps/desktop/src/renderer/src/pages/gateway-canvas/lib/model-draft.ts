import type { GatewayConfig, RouteTarget, Routing } from '@recompose/contracts';

import { mintRouteNodeId, modelAliasFromName } from '@recompose/contracts';

import type { ProviderModelList } from '../../../shared/api';
import type { BoundKind } from './binding-kinds';
import type { JudgeBinding } from './conditional-draft';
import type { RouterMode, SpreadingMode } from './routing-edits';

import { IpcResultError, refusalSentence } from '../../../shared/api';
import { gatewayDefiningJudged, judgeAnswered } from './conditional-draft';
import { routedThroughARouter } from './routing-edits';

const MALFORMED_DEFINITION_REFUSAL =
  "recompose can't store this virtual model. Check the name and the id, then try again.";

/**
 * The id a name derives to, kept in step with the name until a person edits the id by hand.
 *
 * @summary The id follows the name while it still reads as the name's derived alias, and an empty
 * id counts as following, so clearing a hand-edit lets the name drive it again. Once the id says
 * something the name would not derive, it belongs to the person, and typing the name leaves it be.
 */
export function idFollowingName(previousName: string, nextName: string, currentId: string): string {
  const following = currentId === '' || currentId === modelAliasFromName(previousName);

  return following ? modelAliasFromName(nextName) : currentId;
}

export type SettledDefinition = {
  /** The name a person gave the model, which the id derives from until a person edits it. */
  displayName: string;
  /** The id a client sends as its `model`, saved as a person saw it rather than derived again. */
  id: string;
  /** Which shape the binding takes, or nothing while the ask that offers the two stands open. */
  bindsThrough?: BoundKind | undefined;
  /** How the router spreads, or nothing while the draft has yet to answer with a router at all. */
  routerMode?: RouterMode | undefined;
  /** What reads the requests a conditional router spreads, which no other mode asks for. */
  judge?: JudgeBinding | undefined;
  /** What a person called the router, which is empty while it answers to its mode. */
  routerName?: string | undefined;
  /** The account the model reaches. */
  accountId: string;
  /** The real model that account serves. */
  providerModel: string;
};

/** A definition nobody has said anything about yet, which is what a fresh draft opens on. */
export function emptyDefinition(): SettledDefinition {
  return { displayName: '', id: '', accountId: '', providerModel: '' };
}

function targetAnswered(definition: SettledDefinition): boolean {
  return definition.accountId !== '' && definition.providerModel !== '';
}

function routingAnswered(definition: SettledDefinition): boolean {
  if (definition.bindsThrough !== 'router') {
    return targetAnswered(definition);
  }

  return definition.routerMode === 'conditional'
    ? judgeAnswered(definition.judge) && targetAnswered(definition)
    : true;
}

/**
 * Whether every answer a save needs has been given, which is what opens the button that saves.
 *
 * @summary Only blanks hold the save shut, never a wrong answer. A person who left a field alone
 * can see that for themselves, so the button saying nothing costs them nothing. A person who typed
 * an id this gateway already serves cannot see it, and a button that refuses to press would leave
 * them guessing, so that refusal waits for the press and speaks under the field it refuses.
 *
 * A router counts as a whole answer on its own, because one is born holding no child and fills by
 * cable afterwards. Its own name never counts, because a router with no name answers to its mode.
 * A conditional router is the one exception: it is born naming a judge and an else child, so the
 * save waits on both rather than offering a press the stored shape would refuse.
 */
export function draftFilledIn(definition: SettledDefinition): boolean {
  return (
    definition.displayName.trim() !== '' &&
    definition.id.trim() !== '' &&
    routingAnswered(definition)
  );
}

/**
 * The mode a router is born in, since neither ask that drops one stops to offer a dialog.
 *
 * @summary Failover is the mode a person can reason about without reading anything: the first
 * child answers and the rest stand in. Round-robin trades the prompt cache for spread, which is a
 * choice worth making on purpose in the inspector rather than one to inherit from a drop.
 */
export const BORN_ROUTER_MODE: SpreadingMode = 'failover';

function boundThroughOneNode(target: RouteTarget): Routing {
  const entry = mintRouteNodeId();

  return { entry, nodes: { [entry]: target } };
}

/** The gateway as it stands once it carries this definition too, ready for storage. */
export function gatewayDefining(gateway: GatewayConfig, settled: SettledDefinition): GatewayConfig {
  return {
    ...gateway,
    virtualModels: [
      ...gateway.virtualModels,
      {
        id: settled.id,
        displayName: settled.displayName,
        routing: boundThroughOneNode({
          kind: 'target',
          accountId: settled.accountId,
          providerModel: settled.providerModel,
        }),
      },
    ],
  };
}

/** What a definition answers to before it reaches any target, which is all a router needs. */
export type NamedDefinition = { id: string; displayName: string };

/**
 * The gateway as it stands once it carries a definition routing through a fresh router.
 *
 * @summary A person picking the router at the binding ask finishes their draft there, so the
 * definition stores with a router in the place a target would have taken and no account named yet.
 * The router holds no child, which the canvas draws as incomplete and a request refuses.
 */
export function gatewayDefiningRouted(
  gateway: GatewayConfig,
  named: NamedDefinition,
  mode: SpreadingMode,
  routerName?: string,
): GatewayConfig {
  return {
    ...gateway,
    virtualModels: [
      ...gateway.virtualModels,
      { ...named, routing: routedThroughARouter(mode, routerName) },
    ],
  };
}

/**
 * The name to store for a router, which is nothing wherever a person left the field alone.
 *
 * @summary A router with no name of its own answers to its mode, and that fallback only speaks
 * while the stored name is absent. Blanks a person typed and then erased have to reach storage as
 * absence rather than as an empty string, or the card prints nothing on its name line.
 */
function routerNamed(typed: string | undefined): string | undefined {
  const named = typed?.trim() ?? '';

  return named === '' ? undefined : named;
}

/**
 * The gateway as it stands once it carries this draft, whichever shape the draft binds through.
 *
 * @summary The cable's ask and the drawer's first step both finish a draft, and a person who
 * answered with a router in one of them meant the same thing in the other. The two stored shapes
 * differ, so which one a draft becomes is read once here rather than wherever a draft is saved.
 */
export function gatewayDefiningDraft(
  gateway: GatewayConfig,
  settled: SettledDefinition,
): GatewayConfig {
  if (settled.bindsThrough !== 'router') {
    return gatewayDefining(gateway, settled);
  }

  const named = { id: settled.id, displayName: settled.displayName };
  const mode = settled.routerMode ?? BORN_ROUTER_MODE;

  if (mode !== 'conditional') {
    return gatewayDefiningRouted(gateway, named, mode, routerNamed(settled.routerName));
  }

  return gatewayDefiningJudged(
    gateway,
    named,
    settled.judge ?? { accountId: '', providerModel: '' },
    { kind: 'target', accountId: settled.accountId, providerModel: settled.providerModel },
    routerNamed(settled.routerName),
  );
}

function reboundOnItsEntry(routing: Routing, target: RouteTarget): Routing {
  return { entry: routing.entry, nodes: { [routing.entry]: target } };
}

/**
 * The gateway as it stands once one of its virtual models reaches a different target.
 *
 * @summary A virtual model answers with one target, so a cable dragged onto another card replaces
 * the binding rather than joining it. The definition keeps its id and its name, because a person
 * rebinding is aiming the model they already named somewhere new rather than composing a second one.
 * A routed model rebinds down to that one target, taking its whole ladder with it, because a router
 * whose parent stopped naming it would leave nodes no request could reach.
 */
export function gatewayRebinding(
  gateway: GatewayConfig,
  modelId: string,
  target: RouteTarget,
): GatewayConfig {
  return {
    ...gateway,
    virtualModels: gateway.virtualModels.map((model) =>
      model.id === modelId
        ? { ...model, routing: reboundOnItsEntry(model.routing, target) }
        : model,
    ),
  };
}

/**
 * The gateway as it stands once one of its virtual models holds no target at all.
 *
 * @summary The stored shape carries no virtual model without a target, so letting a binding go
 * takes the whole definition with it and the canvas holds the name, the id, and the seat as a
 * draft card. Rebinding the draft writes the definition back, which is why unbinding costs one
 * gesture rather than a confirmation.
 */
export function gatewayReleasing(gateway: GatewayConfig, modelId: string): GatewayConfig {
  return {
    ...gateway,
    virtualModels: gateway.virtualModels.filter((model) => model.id !== modelId),
  };
}

export type DraftBinding = {
  /** The id a client asks for, which the preview reads first. */
  id: string;
  /** What the picked target reads as, or nothing while none is picked. */
  target: string | undefined;
  /** The real model picked, which is empty while none is. */
  providerModel: string;
};

/**
 * The whole binding a settled draft would serve, as one line a person can check.
 *
 * @summary The line reads in the direction a request travels: the id a client asks for, then the
 * account and the real model that answer it. A draft missing any of the three previews nothing,
 * because half a binding invites a person to believe the rest was already decided.
 */
export function servesPreview({ id, target, providerModel }: DraftBinding): string | undefined {
  if (id === '' || target === undefined || providerModel === '') {
    return undefined;
  }

  return `serves as ${id} → ${target} · ${providerModel}`;
}

/** What the Model field offers, and the sentence standing where a look answered nothing. */
export type ModelListReading = { offered: readonly string[]; refusal: string | undefined };

/**
 * What the sheet reads out of one look at a target's model list.
 *
 * @summary A look still out and a look that reached nothing both offer no id, and only the second
 * says why, so the field stays quiet while a person waits and speaks once there is something to
 * say. Nothing here falls back to a free-text model, because a binding must never name a model the
 * account cannot serve.
 */
export function modelListReading(answer: ProviderModelList | undefined): ModelListReading {
  if (answer === undefined) {
    return { offered: [], refusal: undefined };
  }

  return answer.standing === 'listed'
    ? { offered: answer.modelIds, refusal: undefined }
    : { offered: [], refusal: answer.refusal };
}

/**
 * The sentence a refused save reads as, in words about the virtual model a person was defining.
 *
 * @summary A schema refusal trades its words, because the schema writes for a developer and names
 * a path inside a document nobody typed. Everything else travels as main wrote it: a gateway the
 * rewrite could not find and a port the move lane owns are both already sentences a person can act
 * on, and rewriting them here would only put this module's guess in front of main's fact.
 */
export function refusalFromMain(failure: unknown): string {
  if (!(failure instanceof IpcResultError)) {
    return refusalSentence(failure);
  }

  return failure.code === 'validation-failed' ? MALFORMED_DEFINITION_REFUSAL : failure.message;
}
