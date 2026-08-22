import type { ProxyDialect } from '../gateway-wire';
import type { SubscriptionPluginContext } from './intercepted-send';

export type SubscriptionScope = {
  sessionId: string;
  sourceDialect: ProxyDialect;
  replayScopeId: string;
  responsesLite: boolean;
  callerHeaders?: Readonly<Record<string, readonly string[]>> | undefined;
};

/**
 * Everything about this turn that a provider request reads beside the body.
 *
 * @summary The caller's own headers arrive through the turn context rather than as a parameter of
 * their own, because they belong to the same crossing every other fact here came from, and a
 * subscription send that knew the session but not the headers would be one crossing read twice.
 */
export function subscriptionScope(
  sessionId: string,
  sourceDialect: ProxyDialect,
  replayScopeId: string | undefined,
  responsesLite: boolean | undefined,
  turn: SubscriptionPluginContext | undefined,
): SubscriptionScope {
  return {
    sessionId,
    sourceDialect,
    replayScopeId: replayScopeId ?? sessionId,
    responsesLite: responsesLite === true,
    callerHeaders: turn?.crossing.requestHeaders,
  };
}
