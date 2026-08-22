import type { SubscriptionRuntime } from './reach';

/**
 * The same subscription runtime, with every request it puts on the wire able to be taken back.
 *
 * @summary The signal rides the request rather than a parameter of its own, because one classification
 * can reach the wire several times: the first send, a resend a plugin asked for, and a retry behind a
 * refreshed credential all pass through this one send and every one of them must answer to the same
 * budget. Wrapping the runtime is also what keeps the bound out of the transport's own signature,
 * where a served turn would then have to say it wants none.
 */
export function subscriptionRuntimeBoundTo(
  runtime: SubscriptionRuntime,
  bound: AbortSignal,
): SubscriptionRuntime {
  return {
    ...runtime,
    send: async (provider, request, policy) =>
      runtime.send(provider, { ...request, signal: bound }, policy),
  };
}
