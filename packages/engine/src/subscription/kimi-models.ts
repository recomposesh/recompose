/**
 * What a Kimi subscription serves, in the names a client sends as its `model`.
 *
 * @summary Kimi publishes no catalog a caller can read at its coding origin, so recompose carries
 * the names its own request path already recognizes rather than letting the look fall through to
 * another vendor's list. Every id here is one `kimi-request` folds to an upstream model: the two
 * coding models resolve by name, and each K-family id drops its `kimi-` prefix on the way out.
 *
 * The aliases that path also honors stay out of this list. A person picks one model here, and
 * offering `k3` beside `kimi-k3` would read as two models where the gateway sees one.
 */
export const kimiSubscriptionModels = [
  'kimi-k2.7-code',
  'kimi-k2.7-code-highspeed',
  'kimi-k3',
  'kimi-k3-256k',
  'kimi-k2.6',
  'kimi-k2.5',
  'kimi-k2',
] as const;
