import type { BrandMarkName, IconName } from '../../../shared/ui';

/** What a client's row is drawn with: the tool's own mark, or the glyph a tool without one stands under. */
export type ConnectLead = { mark: BrandMarkName } | { glyph: IconName };

/** Which family of tools a client belongs to, which is the group its row stands in. */
export type ClientKind = 'terminal' | 'desktop' | 'editor' | 'hand';

/**
 * Where a client joins its own paths onto the address it was given.
 *
 * @summary The gateway answers a bare origin, and clients disagree about who owns the `/v1`
 * segment. A client that appends `v1/chat/completions` needs the origin alone, and one that
 * appends `chat/completions` needs the origin plus `/v1`. Stating it per client is what keeps a
 * copied address from landing as `/v1/v1`. `whole` is for a caller that writes every path out
 * itself and so joins nothing.
 */
export type ClientReach = 'origin' | 'v1' | 'whole';

/** The facts a gateway hands its instructions, read off the stored document rather than typed. */
export type ConnectFacts = {
  /** The gateway's own name, which the sheet speaks of rather than a slug. */
  gatewayName: string;
  /** The bare origin the gateway answers on, with no path of any kind. */
  baseUrl: string;
  /** The key the gateway enforces, or nothing when it asks callers for none. */
  apiKey: string | undefined;
  /** The virtual model a client should name first, or nothing while the gateway serves none. */
  modelId: string | undefined;
};

/** One block of a client's setup: what it is for, the lines to copy, and what to know about them. */
export type ConnectStep = {
  /** What this block accomplishes, read as the step's own heading. */
  title: string;
  /** The lines a person copies, kept verbatim so what lands is what the gateway meant. */
  lines: readonly string[];
  /**
   * One sentence a person needs before or after running the block.
   *
   * @summary Every block carries one, because a block a person can paste without understanding it
   * is the one they paste into the wrong file.
   */
  note: string;
};

/** One tool recompose knows how to point at a gateway. */
export type ConnectClient = {
  /** The identity the rail selects by, which never reaches the screen. */
  id: string;
  /** The name the tool goes by on screen. */
  name: string;
  /** The mark or glyph its row leads with. */
  lead: ConnectLead;
  /** The dialect this client speaks, in the words the gateway's own routes use. */
  dialect: string;
  /** The group the row stands in. */
  kind: ClientKind;
  /** How this client joins paths onto the address it is handed. */
  reach: ClientReach;
  /**
   * Whether the client has anywhere to put a key at all.
   *
   * @summary A tool whose setup form takes an address and nothing else can never reach a gateway
   * that enforces one, and the sheet has to say so rather than hand over a key with no field.
   */
  takesKey: boolean;
  /** One line under the name saying what setting this client up amounts to. */
  intro: string;
  /** The tool's own documentation, offered rather than restated. */
  guide: { label: string; href: string };
  /** The blocks a person works through, built from the gateway standing in front of them. */
  steps: (facts: ConnectFacts) => readonly ConnectStep[];
};

const KEYLESS_STAND_IN = 'unused';

/**
 * The value a client's key field takes, which is never empty.
 *
 * @summary A gateway that enforces no key still meets clients that refuse to start without one,
 * so the instructions hand over a stand-in rather than an empty string. The note beside it says
 * the gateway checks nothing, so nobody hunts for a key that was never minted.
 */
export function presentedKey(facts: ConnectFacts): string {
  return facts.apiKey ?? KEYLESS_STAND_IN;
}

/** Whether the value in the key field is a stand-in the gateway will not check. */
export function keyIsAStandIn(facts: ConnectFacts): boolean {
  return facts.apiKey === undefined;
}

const NO_MODEL_STAND_IN = 'your-model-id';

/**
 * The model id a client sends, or the stand-in a gateway serving nothing can offer.
 *
 * @summary A gateway with no virtual model composed has no id to hand over, and a block with an
 * empty `model` field would paste as a broken request. The sheet says so beside the blocks.
 */
export function presentedModel(facts: ConnectFacts): string {
  return facts.modelId ?? NO_MODEL_STAND_IN;
}

/** The address as one client spells it, which is the origin alone or the origin plus `/v1`. */
export function addressFor(reach: ClientReach, facts: ConnectFacts): string {
  return reach === 'v1' ? `${facts.baseUrl}/v1` : facts.baseUrl;
}
