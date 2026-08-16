/**
 * The address one fetch was asked for, whichever of the three shapes it arrived in.
 *
 * @summary Every reading that records what a caller reached for needs this, and each one spelling
 * it again is how two of them came to disagree about a `Request`. It lives beside the readings
 * rather than in the source, because nothing a gateway serves ever asks the question.
 */
export function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}
