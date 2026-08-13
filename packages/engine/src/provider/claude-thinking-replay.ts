import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';
import { canonicalJson } from '../subscription/canonical-json';
import { replayableThinkingContent, restoreKimiThinkingContent } from './kimi-thinking-replay';
import { reasoningModelBase } from './reasoning-capabilities';

type ReplayInjection = { body: JsonObject; applied: boolean };
type ReplayTurn = { parts: JsonObject[]; bytes: number };
type ReplayEntry = { turns: ReplayTurn[]; bytes: number; touchedAt: number };

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_SESSION_TURNS = 64;
const MAX_SESSION_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const MAX_SESSIONS = 10_240;

export function claudeThinkingReplayModelFamily(model: string): string {
  return reasoningModelBase(model);
}

function contentParts(value: unknown): JsonObject[] | null {
  return Array.isArray(value) && value.every(isJsonObject) ? value : null;
}

function replayKey(model: string, scope: string): string {
  return `${claudeThinkingReplayModelFamily(model)}\0${scope}`;
}

function committableTurn(scope: string, content: unknown): ReplayTurn | null {
  const parts = contentParts(content);

  if (scope.trim() === '' || parts === null || !replayableThinkingContent(parts, 'other'))
    return null;

  const cloned = structuredClone(parts);
  const bytes = Buffer.byteLength(JSON.stringify(cloned));

  return bytes > MAX_SESSION_BYTES ? null : { parts: cloned, bytes };
}

function sessionBytes(turns: readonly ReplayTurn[]): number {
  return turns.reduce((total, turn) => total + turn.bytes, 0);
}

function trimmedToSessionBounds(turns: ReplayTurn[]): ReplayTurn[] {
  let trimmed = turns;

  while (trimmed.length > MAX_SESSION_TURNS || sessionBytes(trimmed) > MAX_SESSION_BYTES) {
    trimmed = trimmed.slice(1);
  }

  return trimmed;
}

function holdsTurn(turns: readonly ReplayTurn[], candidate: JsonObject[]): boolean {
  const canonical = canonicalJson(candidate);

  return turns.some((turn) => canonicalJson(turn.parts) === canonical);
}

class SessionLedger {
  readonly #sessions = new Map<string, ReplayEntry>();
  #heldBytes = 0;

  public read(key: string): ReplayEntry | undefined {
    return this.#sessions.get(key);
  }

  public write(key: string, entry: ReplayEntry): void {
    this.drop(key);
    this.#sessions.set(key, entry);
    this.#heldBytes += entry.bytes;
    this.#shrinkToBounds();
  }

  public drop(key: string): void {
    const held = this.#sessions.get(key);

    if (held === undefined) return;

    this.#heldBytes -= held.bytes;
    this.#sessions.delete(key);
  }

  public reset(): void {
    this.#sessions.clear();
    this.#heldBytes = 0;
  }

  public heldBytes(): number {
    return this.#heldBytes;
  }

  #shrinkToBounds(): void {
    while (this.#sessions.size > MAX_SESSIONS || this.#heldBytes > MAX_TOTAL_BYTES) {
      const eldest = this.#sessions.keys().next().value;

      if (typeof eldest !== 'string') return;

      this.drop(eldest);
    }
  }
}

export class ClaudeThinkingReplay {
  readonly #ledger = new SessionLedger();
  readonly #now: () => number;

  public constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  public commit(model: string, scope: string, content: unknown): boolean {
    const turn = committableTurn(scope, content);

    if (turn === null) return false;

    const key = replayKey(model, scope);
    const held = this.liveEntry(key)?.turns ?? [];
    const turns = holdsTurn(held, turn.parts) ? held : trimmedToSessionBounds([...held, turn]);

    this.#ledger.write(key, { turns, bytes: sessionBytes(turns), touchedAt: this.#now() });

    return true;
  }

  public inject(model: string, scope: string, body: JsonObject): ReplayInjection {
    const key = replayKey(model, scope);
    const entry = this.liveEntry(key);

    if (entry === undefined) return { body, applied: false };

    this.#ledger.write(key, { ...entry, touchedAt: this.#now() });

    return entry.turns.reduce<ReplayInjection>(
      (injection, turn) => {
        const restored = restoreKimiThinkingContent(injection.body, turn.parts);

        return { body: restored.body, applied: injection.applied || restored.applied };
      },
      { body, applied: false },
    );
  }

  public clear(model: string, scope: string): void {
    this.#ledger.drop(replayKey(model, scope));
  }

  public clearAll(): void {
    this.#ledger.reset();
  }

  public totalBytes(): number {
    return this.#ledger.heldBytes();
  }

  private liveEntry(key: string): ReplayEntry | undefined {
    const entry = this.#ledger.read(key);

    if (entry === undefined) return undefined;

    if (this.#now() >= entry.touchedAt + CACHE_TTL_MS) {
      this.#ledger.drop(key);

      return undefined;
    }

    return entry;
  }
}
