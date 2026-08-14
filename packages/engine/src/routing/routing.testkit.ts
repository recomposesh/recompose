import type { EngineRouteNode, EngineRouting } from '@recompose/contracts';

import type { AttemptReading } from './outcome-classification';

export function aRateLimit(coolUntilMs?: number): AttemptReading<string> {
  return coolUntilMs === undefined
    ? { kind: 'refused', status: 429, answer: 'rate limited' }
    : {
        kind: 'refused',
        status: 429,
        cooling: { coolUntilMs, promised: true },
        answer: 'rate limited',
      };
}

export function aMalformedRequest(): AttemptReading<string> {
  return { kind: 'refused', status: 400, answer: 'malformed' };
}

export function aGrantWithoutCredential(): AttemptReading<string> {
  return { kind: 'grant-missing-credential' };
}

export function aDroppedConnection(): AttemptReading<string> {
  return { kind: 'transport-failure' };
}

export function aStreamOpeningWithAnError(): AttemptReading<string> {
  return { kind: 'stream-error-before-commit', equivalentStatus: 503, answer: 'stream error' };
}

export function aBoundTarget(providerModel = 'claude-sonnet-4'): EngineRouteNode {
  return { kind: 'target', standing: { standing: 'bound', providerModel } };
}

export function aRemovedTarget(): EngineRouteNode {
  return { kind: 'target', standing: { standing: 'removed' } };
}

export function aFailoverOver(...children: readonly string[]): EngineRouteNode {
  return { kind: 'router', policy: { mode: 'failover' }, children: [...children] };
}

export function aRoundRobinOver(...children: readonly string[]): EngineRouteNode {
  return { kind: 'router', policy: { mode: 'round-robin' }, children: [...children] };
}

export function aTableEnteredAt(
  entry: string,
  nodes: Readonly<Record<string, EngineRouteNode>>,
): EngineRouting {
  return { entry, nodes: { ...nodes } };
}
