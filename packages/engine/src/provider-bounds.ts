/**
 * How long a provider may hold a connection saying nothing before its transport gives up on it.
 *
 * @summary Both transports measure this between body chunks rather than across the whole answer, so
 * it never shortens a reply that keeps arriving. It sits above the gateway's first-event bound so the
 * commit latch still speaks first for a target that never opens, naming the gateway, the target and
 * the virtual model. The transport answers only for silence that falls after the answer has begun.
 * The bound stands here rather than beside either client, because undici carries the credentialed
 * requests and `node-wreq` carries the subscription turns, and one silence means one number.
 */
export const providerSilenceBoundMs = 300_000;
