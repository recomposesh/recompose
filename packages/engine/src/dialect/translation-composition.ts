import type { Dialect, TranslationRefusal } from '../refusals';
import type { TranslateResult } from './fates';

export function sameDialect(from: Dialect, to: Dialect): boolean {
  return from === to;
}

export function composeThroughHub<Hub, Out>(
  decoded: TranslateResult<Hub, TranslationRefusal>,
  encode: (hub: Hub) => TranslateResult<Out, TranslationRefusal>,
): TranslateResult<Out, TranslationRefusal> {
  if ('refusal' in decoded) return decoded;

  const encoded = encode(decoded.value);

  return 'refusal' in encoded
    ? encoded
    : { value: encoded.value, fates: [...decoded.fates, ...encoded.fates] };
}
