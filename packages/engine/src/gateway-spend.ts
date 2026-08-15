import type { SpendGrant } from '@recompose/contracts';

export type SpendGrantContext = {
  headers: Headers;
  query: URLSearchParams;
  sessionId?: string;
};

/**
 * What one attempt is allowed to spend, asked of the parent by the node the child is about to try.
 *
 * @summary The route node is the third word on purpose: a ladder resolves a different account per
 * child, so custody is asked per attempt rather than once per request. Only the parent turns a node
 * name into a credential, which is why the child can name every child it has and hold none of them.
 */
export type SpendGrantFor = (
  slug: string,
  virtualModel: string,
  routeNode: string,
  context?: SpendGrantContext,
) => Promise<SpendGrant>;
