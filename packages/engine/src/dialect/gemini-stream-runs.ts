import type { GeminiPart } from './gemini-wire';
import type { HubBlockDelta, HubBlockOpening, HubStreamEvent } from './hub';

type OpenRun = { index: number; kind: HubBlockOpening['kind']; sealed: boolean };

export type GeminiRunState = { open?: OpenRun; nextIndex: number };

export function producesBlock(part: GeminiPart): boolean {
  return (
    part.serverWebSearch !== undefined || part.functionCall !== undefined || part.text !== undefined
  );
}

/**
 * @summary A part carrying a signature and nothing else contributes no content, and the run it
 * arrived in ends there all the same. Letting the next part continue the open run would read one
 * run of text across a boundary the model drew.
 */
export function endsTheRun(part: GeminiPart): boolean {
  return carriesSignature(part);
}

export function continuedRun(
  state: GeminiRunState,
  part: GeminiPart,
  deltas: readonly HubBlockDelta[],
): HubStreamEvent[] | null {
  const open = state.open;

  if (open === undefined || open.sealed || open.kind !== continuationKind(part)) return null;

  const index = open.index;

  return deltas.map((delta): HubStreamEvent => ({ type: 'block-delta', index, delta }));
}

export function closedRun(state: GeminiRunState): HubStreamEvent[] {
  const open = state.open;

  if (open === undefined) return [];

  delete state.open;
  state.nextIndex = open.index + 1;

  return [{ type: 'block-close', index: open.index }];
}

export function openedRun(
  state: GeminiRunState,
  part: GeminiPart,
  opening: HubBlockOpening,
  deltas: readonly HubBlockDelta[],
): HubStreamEvent[] {
  const index = state.nextIndex;

  state.open = { index, kind: opening.kind, sealed: sealsItsRun(part) };

  return [
    { type: 'block-open', index, opening },
    ...deltas.map((delta): HubStreamEvent => ({ type: 'block-delta', index, delta })),
  ];
}

/**
 * @summary A web-search block opens under the same tool kind a function call does, so a call
 * arriving unnamed would read as that block's own continuation and append its arguments there.
 */
function sealsItsRun(part: GeminiPart): boolean {
  return carriesSignature(part) || part.serverWebSearch !== undefined;
}

function continuationKind(part: GeminiPart): HubBlockOpening['kind'] | null {
  if (part.serverWebSearch !== undefined || carriesSignature(part)) return null;
  if (part.functionCall !== undefined) return splitCallKind(part.functionCall);

  return textKind(part);
}

function splitCallKind(call: NonNullable<GeminiPart['functionCall']>): 'tool' | null {
  return call.name === '' ? 'tool' : null;
}

function textKind(part: GeminiPart): 'thinking' | 'text' {
  return part.thought === true ? 'thinking' : 'text';
}

function carriesSignature(part: GeminiPart): boolean {
  return (
    (part.thoughtSignature !== undefined && part.thoughtSignature !== '') ||
    part.responsesSignatureDirection !== undefined
  );
}
