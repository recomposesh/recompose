/**
 * The shape every vendor's renewal ask travels in.
 *
 * @summary Each vendor differs in its address and its form fields and in nothing else, so the
 * envelope stands apart from the vendors rather than inside whichever one was written first.
 */
export type RefreshRequest = {
  method: 'POST';
  headers: [string, string][];
  body: string;
  signal?: AbortSignal;
};

export function formRefreshRequest(
  values: Record<string, string>,
  extraHeaders: readonly [string, string][] = [],
): RefreshRequest {
  return {
    method: 'POST',
    headers: [
      ['Content-Type', 'application/x-www-form-urlencoded'],
      ['Accept', 'application/json'],
      ...extraHeaders,
    ],
    body: new URLSearchParams(values).toString(),
  };
}
